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

    // 设置 15秒 超时提示
    const timeoutId = setTimeout(() => {
      if (statusRef.current === 'searching') {
        alert("这15秒中的世界似乎只有您在探索...");
      }
    }, 15000);

    try {
      // 调用数据库的原子匹配函数
      const { data: roomId, error } = await supabase.rpc('match_player', { 
        p_character_id: characterId 
      });

      if (error) {
        clearTimeout(timeoutId); // 出错清除定时器
        console.error("Match error:", error);
        setStatus('idle');
        alert("匹配服务暂时不可用");
        return;
      }

      // 情况 A: 函数直接返回了房间号
      if (roomId) {
        clearTimeout(timeoutId); // 成功清除定时器
        console.log("Direct match!", roomId);
        router.push(`/meet/room/${roomId}`);
        return;
      }

      // 情况 B: 返回 NULL，说明我进入了队列
      console.log("Queued, waiting for others...");
      subscribeToRealtime(timeoutId); // 传递定时器ID以便在回调中清理(虽然回调里很难清理，但跳转会卸载组件)

    } catch (err) {
      clearTimeout(timeoutId);
      console.error("System error:", err);
      setStatus('idle');
    }
  };

  const subscribeToRealtime = (timeoutId) => {
    // 清理旧的
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // 监听 meet_participants 表
    const channel = supabase
      .channel(`meet-wait-${characterId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'meet_participants', filter: `character_id=eq.${characterId}` },
        (payload) => {
          console.log("System pulled me into room!", payload);
          if (timeoutId) clearTimeout(timeoutId); // 尝试清理
          router.push(`/meet/room/${payload.new.room_id}`);
        }
      )
      .subscribe();
      
    channelRef.current = channel;
  };

  // 移除旧的 checkQueueAndMatch 和 createRoom 函数，因为逻辑已经移交给了数据库
  // 仅保留必要的辅助函数

  const handleExit = async () => {
    if (status === 'creating') return; 
    
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
