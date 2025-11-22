"use client";
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import './meet.css';

export default function MeetLobby() {
  const [status, setStatus] = useState('idle'); // idle, searching, creating
  const [queueCount, setQueueCount] = useState(0);
  const [characterId, setCharacterId] = useState(null);
  const [characterName, setCharacterName] = useState('');
  const router = useRouter();
  const channelRef = useRef(null);

  const isCreatingRef = useRef(false);
  const statusRef = useRef('idle');
  const characterIdRef = useRef(null);

  // 同步 ref
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    characterIdRef.current = characterId;
  }, [characterId]);

  useEffect(() => {
    // 1. 获取当前角色
    const loadCharacter = async () => {
      // 获取当前登录用户
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let targetId = localStorage.getItem('activeCharacterId');
      let foundCharacter = null;

      // 如果本地有记录，先验证该角色是否属于当前用户
      if (targetId) {
        const { data } = await supabase
          .from('characters')
          .select('id, name, user_id')
          .eq('id', targetId)
          .single();
        
        if (data && data.user_id === user.id) {
          foundCharacter = data;
        } else {
          // 如果不属于当前用户（比如切换了账号），清除本地记录
          localStorage.removeItem('activeCharacterId');
        }
      }

      // 如果没有有效的本地记录，获取用户的第一个角色
      if (!foundCharacter) {
        const { data } = await supabase
          .from('characters')
          .select('id, name')
          .eq('user_id', user.id)
          .limit(1)
          .single();
        
        if (data) {
          foundCharacter = data;
          localStorage.setItem('activeCharacterId', data.id);
        }
      }

      // 设置状态
      if (foundCharacter) {
        setCharacterId(foundCharacter.id);
        setCharacterName(foundCharacter.name);
      }
    };
    loadCharacter();

    // 清理：组件卸载时退出队列
    return () => {
      leaveQueue();
    };
  }, []);

  const leaveQueue = async () => {
    // 只有在非匹配成功状态下才退出队列
    // 但这里很难判断是否匹配成功，简单起见，如果还在 searching 就退出
    // 由于 status 在这里可能是闭包旧值，我们不依赖它，直接尝试删除
    const currentId = characterIdRef.current;
    if (currentId) {
      await supabase.from('meet_queue').delete().eq('character_id', currentId);
    }
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  };

  const handleMeetNow = async () => {
    if (!characterId) {
      alert("请先选择或创建一个角色！");
      return;
    }

    setStatus('searching');
    isCreatingRef.current = false;

    // 1. 加入队列
    const { error } = await supabase.from('meet_queue').insert([{ character_id: characterId }]);
    if (error) {
      console.error("Join queue error:", error);
      setStatus('idle');
      return;
    }

    // 2. 监听匹配状态
    subscribeToRealtime();
    
    // 3. 检查当前队列情况
    checkQueueAndMatch();
  };

  const subscribeToRealtime = () => {
    // 清理旧的
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // 使用唯一频道名，避免冲突
    const channelName = `meet-room-${characterId}-${Date.now()}`;
    const channel = supabase.channel(channelName);

    channel
      // 监听 meet_participants 表，看自己是否被加入房间
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'meet_participants', filter: `character_id=eq.${characterId}` },
        (payload) => {
          console.log("Matched via Realtime!", payload);
          router.push(`/meet/room/${payload.new.room_id}`);
        }
      )
      // 监听 meet_queue 表，更新人数，或者触发匹配
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'meet_queue' },
        () => {
          checkQueueAndMatch();
        }
      )
      .subscribe();
      
    channelRef.current = channel;
  };

  const checkQueueAndMatch = async () => {
    // 如果正在创建中，不要重复执行
    if (isCreatingRef.current) return;

    const currentId = characterIdRef.current;
    if (!currentId) return;

    // 0. 兜底检查：如果我正在搜索，但我不在队列里了，可能是我被匹配了（但没收到 Realtime 事件）
    // 或者我被踢了。检查一下 meet_participants
    if (statusRef.current === 'searching' || statusRef.current === 'waiting_for_match') {
       const { data: participation } = await supabase
         .from('meet_participants')
         .select('room_id, joined_at')
         .eq('character_id', currentId)
         .order('joined_at', { ascending: false })
         .limit(1)
         .single();
       
       // 如果发现最近 1 分钟内加入的房间，直接跳转
       if (participation) {
          const joinTime = new Date(participation.joined_at).getTime();
          if (Date.now() - joinTime < 60000) {
             console.log("Found room via polling/fallback:", participation);
             router.push(`/meet/room/${participation.room_id}`);
             return;
          }
       }
    }

    // 获取当前队列
    const { data: queue, error } = await supabase
      .from('meet_queue')
      .select('character_id, joined_at, characters(name)')
      .order('joined_at', { ascending: true });

    if (error || !queue) return;

    setQueueCount(queue.length);

    // 匹配逻辑：如果人数 >= 2，且我是队列中最后一个人（避免并发创建），则由我来创建房间
    
    const myIndex = queue.findIndex(q => q.character_id == currentId);
    const isMeInQueue = myIndex !== -1;
    
    if (queue.length >= 2 && isMeInQueue) {
      // 简单的防冲突：只有我是队列的最后一个（最新）时，我才执行创建
      const isLast = myIndex === queue.length - 1;
      
      if (isLast) {
        isCreatingRef.current = true; // 锁定
        setStatus('creating');
        await createRoom(queue);
      } else {
        setStatus('waiting_for_match'); // 等待别人创建
      }
    }
  };

  const createRoom = async (queue) => {
    try {
      // 1. 生成场景
      const names = queue.map(q => q.characters?.name || '未知角色').join('、');
      const scene = generateScene(names);

      // 2. 创建房间
      const { data: room, error: roomError } = await supabase
        .from('meet_rooms')
        .insert([{ scene_description: scene }])
        .select()
        .single();

      if (roomError) throw roomError;

      // 3. 添加参与者
      const participants = queue.map(q => ({
        room_id: room.id,
        character_id: q.character_id
      }));

      const { error: partError } = await supabase.from('meet_participants').insert(participants);
      if (partError) throw partError;

      // 4. 清空队列 (删除这些已匹配的人)
      const idsToRemove = queue.map(q => q.character_id);
      await supabase.from('meet_queue').delete().in('character_id', idsToRemove);

      // 5. 跳转 (监听器会处理，但为了快也可以直接跳)
      router.push(`/meet/room/${room.id}`);
    } catch (err) {
      console.error("Create room failed:", err);
      setStatus('searching'); // 回退状态
      isCreatingRef.current = false; // 解锁
      alert("创建房间失败，请重试");
    }
  };

  const handleExit = async () => {
    if (status === 'creating') return; // 创建中不允许退出，防止数据不一致
    
    await leaveQueue();
    setStatus('idle');
    setQueueCount(0);
    isCreatingRef.current = false;
  };

  const generateScene = (names) => {
    const date = new Date();
    const dateStr = `${date.getFullYear()}年${date.getMonth()+1}月${date.getDate()}日`;
    
    const weathers = ['暴雪纷飞的夜晚', '阳光明媚的午后', '阴雨连绵的清晨', '迷雾笼罩的黄昏', '星光璀璨的深夜'];
    const locations = ['废弃的地铁站', '古老的图书馆门口', '熙熙攘攘的集市', '静谧的森林深处', '海边的悬崖之上'];
    
    const weather = weathers[Math.floor(Math.random() * weathers.length)];
    const location = locations[Math.floor(Math.random() * locations.length)];

    return `在 ${dateStr} 的${weather}，${location}，${names} 相遇了。`;
  };

  return (
    <div className="meet-container">
      <div className="meet-header">
        <h1 className="meet-title">MEET / 奇遇</h1>
        <p>当前角色: {characterName || '未选择'}</p>
      </div>

      <div className="meet-instructions">
        <h3>玩法说明</h3>
        <p>1. 点击 <b>MEET NOW</b> 进入临时队列。</p>
        <p>2. 当 2-4 名玩家同时加入时，触发“相遇”。</p>
        <p>3. 系统随机生成场景，你们可以在其中自由扮演。</p>
        <p>4. 你的对话与行动将自动记录到【个人事件】中。</p>
      </div>

      <div className="meet-action-area">
        {status === 'idle' && (
          <button className="meet-btn" onClick={handleMeetNow} disabled={!characterId}>
            MEET NOW
          </button>
        )}

        {status === 'searching' && (
          <div className="meet-status status-searching">
            <p>正在寻找其他冒险者...</p>
            <p>当前队列人数: {queueCount}</p>
            {queueCount === 1 && <p>还差 1 人即可开始！</p>}
          </div>
        )}

        {status === 'waiting_for_match' && (
          <div className="meet-status status-searching">
            <p>人数已满，正在创建场景...</p>
          </div>
        )}
        
        {status === 'creating' && (
          <div className="meet-status status-searching">
            <p>正在为你生成世界...</p>
          </div>
        )}

        {status !== 'idle' && status !== 'creating' && (
          <button className="meet-btn exit-btn" onClick={handleExit}>
            退出匹配
          </button>
        )}
      </div>
    </div>
  );
}
