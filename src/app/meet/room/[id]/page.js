"use client";
import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import './room.css'; // 确保创建这个 CSS 文件

export default function MeetRoom() {
  const { id: roomId } = useParams();
  const router = useRouter();
  
  const [room, setRoom] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [myCharacter, setMyCharacter] = useState(null);
  
  const [chatInput, setChatInput] = useState('');
  const [actionInput, setActionInput] = useState('');
  const [timeLeft, setTimeLeft] = useState('');

  const chatEndRef = useRef(null);

  // 1. 初始化房间
  useEffect(() => {
    if (!roomId) return;

    const initRoom = async () => {
      // 获取房间详情
      const { data: roomData, error } = await supabase
        .from('meet_rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (error || !roomData) {
        alert("世界不存在或已坍塌");
        router.push('/meet');
        return;
      }

      // 检查是否坍塌
      if (new Date(roomData.collapse_at) < new Date() || roomData.status === 'collapsed') {
        alert("这个世界已经坍塌了...");
        router.push('/meet');
        return;
      }

      setRoom(roomData);

      // 获取参与者
      fetchParticipants();

      // 获取历史消息
      const { data: msgs } = await supabase
        .from('meet_messages')
        .select('*, characters(name, avatar_url)')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });
      
      if (msgs) setMessages(msgs);

      // 确定我是谁
      const myId = localStorage.getItem('activeCharacterId');
      if (myId) {
        const { data: me } = await supabase.from('characters').select('*').eq('id', myId).single();
        setMyCharacter(me);
      }
    };

    initRoom();

    // 2. 实时订阅
    console.log("Subscribing to room:", roomId);
    const channel = supabase
      .channel(`room-${roomId}`)
      // 监听新消息
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'meet_messages', filter: `room_id=eq.${roomId}` }, 
        async (payload) => {
          console.log("New message received:", payload);
          const { data: char } = await supabase.from('characters').select('name, avatar_url').eq('id', payload.new.character_id).single();
          setMessages(prev => [...prev, { ...payload.new, characters: char }]);
        }
      )
      // 监听参与者变化
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meet_participants', filter: `room_id=eq.${roomId}` }, 
        () => fetchParticipants()
      )
      .subscribe();

    // 3. 倒计时计时器
    const timer = setInterval(() => {
      if (room) {
        const diff = new Date(room.collapse_at) - new Date();
        if (diff <= 0) {
          alert("🌍 世界坍塌了。\n你被抛出了这个时空。");
          router.push('/meet');
        } else {
          const h = Math.floor(diff / 3600000);
          const m = Math.floor((diff % 3600000) / 60000);
          const s = Math.floor((diff % 60000) / 1000);
          setTimeLeft(`${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
        }
      }
    }, 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(timer);
    };
  }, [roomId, room?.collapse_at]); // 依赖 room.collapse_at 确保计时器准确

  const fetchParticipants = async () => {
    const { data } = await supabase
      .from('meet_participants')
      .select('character_id, characters(id, name, avatar_url)')
      .eq('room_id', roomId);
    
    if (data) {
      setParticipants(data.map(p => p.characters));
    }
  };

  // 自动滚动
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (type) => {
    const content = type === 'chat' ? chatInput : actionInput;
    if (!content.trim()) return;
    
    if (!myCharacter) {
      console.error("No active character found");
      alert("未找到当前角色，请重新登录或选择角色");
      return;
    }

    const { error } = await supabase.from('meet_messages').insert([{
      room_id: roomId,
      character_id: myCharacter.id,
      type,
      content
    }]);

    if (error) {
      console.error("Error sending message:", error);
      alert(`发送失败: ${error.message}`);
    } else {
      if (type === 'chat') setChatInput('');
      else setActionInput('');
    }
  };

  const handleLeave = async () => {
    if (confirm("确定要离开这个世界吗？")) {
      if (myCharacter) {
        await supabase.from('meet_participants').delete().match({ room_id: roomId, character_id: myCharacter.id });
      }
      router.push('/meet');
    }
  };

  if (!room) return <div className="loading-screen">正在进入世界...</div>;

  return (
    <div className="world-room-container">
      {/* 左栏：世界信息 */}
      <div className="world-sidebar">
        <div className="world-info-card">
          <h2>{room.title}</h2>
          <div className="collapse-timer">
            <span>💥 坍塌倒计时</span>
            <div className="timer-digits">{timeLeft}</div>
          </div>
          <p className="world-desc-text">{room.scene_description}</p>
        </div>

        <div className="participant-list">
          <h3>在线冒险者 ({participants.length})</h3>
          <div className="avatar-grid">
            {participants.map(p => (
              <div key={p.id} className="participant-item" title={p.name}>
                <div className="avatar-circle">
                  {p.avatar_url ? <img src={p.avatar_url} /> : p.name[0]}
                </div>
                <span className="participant-name">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 中栏：互动区 */}
      <div className="world-main-stage">
        <div className="messages-feed">
          {messages.map(msg => (
            <div key={msg.id} className="message-row">
              {msg.type === 'chat' ? (
                // 聊天样式 (白底气泡 + 头像)
                <div className="chat-bubble-container">
                  <div className="msg-avatar-small">
                    {msg.characters?.avatar_url ? 
                      <img src={msg.characters.avatar_url} alt={msg.characters.name} /> : 
                      msg.characters?.name[0]
                    }
                  </div>
                  <div className="chat-content-wrapper">
                    <div className="msg-sender">{msg.characters?.name}</div>
                    <div className="chat-bubble">
                      {msg.content}
                    </div>
                  </div>
                </div>
              ) : (
                // 行动样式 (灰底卡片 + 斜体)
                <div className="action-card">
                  <span className="action-icon">✨</span>
                  <span className="action-actor">{msg.characters?.name}</span>
                  <span className="action-content">{msg.content}</span>
                </div>
              )}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="interaction-bar">
          <div className="input-group chat-input-group">
            <input 
              type="text" 
              placeholder="说点什么..." 
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend('chat')}
            />
            <button onClick={() => handleSend('chat')}>发送</button>
          </div>
          <div className="input-group action-input-group">
            <input 
              type="text" 
              placeholder="描述你的行动 (如: 环顾四周...)" 
              value={actionInput}
              onChange={e => setActionInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend('action')}
            />
            <button onClick={() => handleSend('action')}>行动</button>
          </div>
        </div>
      </div>

      {/* 右栏：我的信息 */}
      <div className="world-user-panel">
        {myCharacter && (
          <div className="my-character-card">
            <div className="my-avatar-large">
              {myCharacter.avatar_url ? <img src={myCharacter.avatar_url} /> : myCharacter.name[0]}
            </div>
            <h3>{myCharacter.name}</h3>
            <button className="leave-btn" onClick={handleLeave}>离开世界</button>
          </div>
        )}
      </div>
    </div>
  );
}
