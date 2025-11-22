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

  // 轮询机制：作为 Realtime 的备份，防止消息丢失
  // 现在的核心逻辑已经是轮询 RPC 了，所以这个额外的轮询可以移除，或者保留作为双重保险
  // 为了代码整洁，我们移除这个旧的轮询，因为 handleMeetNow 里的 pollMatch 已经涵盖了功能
  /*
  useEffect(() => {
    let intervalId;
    if (status === 'searching' && characterId) {
      intervalId = setInterval(async () => {
        // ...
      }, 2000); 
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [status, characterId, router]);
  */

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

    // 启动轮询循环
    const pollMatch = async () => {
      if (statusRef.current !== 'searching') return;

      try {
        // 调用新的 create_or_join_match 函数
        const { data, error } = await supabase.rpc('create_or_join_match', { 
          p_character_id: parseInt(characterId) 
        });

        if (error) {
          console.error("Match RPC error:", error);
          // 不中断，继续重试，除非是严重错误
          if (error.code === 'PGRST116') { // JSON转换错误等
             // ignore
          }
        } else {
          console.log("Match status:", data);
          
          // 更新队列人数
          if (data.queue_count !== undefined) {
            setQueueCount(data.queue_count);
          }

          if (data.status === 'matched' && data.room_id) {
            setStatus('idle');
            router.push(`/meet/room/${data.room_id}`);
            return; // 结束轮询
          }
          
          // 如果是 waiting，什么都不做，继续下一次轮询
        }
      } catch (err) {
        console.error("Polling error:", err);
      }

      // 1.5秒后再次轮询
      setTimeout(pollMatch, 1500);
    };

    // 立即开始第一次
    pollMatch();

    // 设置 30秒 超时提示 (可选)
    const timeoutId = setTimeout(() => {
      if (statusRef.current === 'searching') {
        // alert("匹配时间较长，请耐心等待...");
      }
    }, 30000);
  };

  // 移除旧的 Realtime 订阅，完全依赖轮询 RPC
  // const subscribeToRealtime = ... 

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
