"use client";
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useParams, useRouter } from 'next/navigation';
import '../../meet.css'; // Reuse basic styles

export default function MeetRoom() {
  const { id: roomId } = useParams();
  const router = useRouter();
  
  const [scene, setScene] = useState('');
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [myCharacter, setMyCharacter] = useState(null);
  
  const [chatInput, setChatInput] = useState('');
  const [actionInput, setActionInput] = useState('');

  const chatEndRef = useRef(null);
  const actionEndRef = useRef(null);

  useEffect(() => {
    if (!roomId) return;

    const initRoom = async () => {
      // 1. 获取房间信息
      const { data: room } = await supabase.from('meet_rooms').select('*').eq('id', roomId).single();
      if (room) setScene(room.scene_description);

      // 2. 获取参与者
      const { data: parts } = await supabase
        .from('meet_participants')
        .select('character_id, characters(id, name, avatar_url)')
        .eq('room_id', roomId);
      
      if (parts) {
        setParticipants(parts.map(p => p.characters));
      }

      // 3. 确定我是谁
      const myId = localStorage.getItem('activeCharacterId');
      if (myId && parts) {
        const me = parts.find(p => p.characters.id == myId);
        if (me) setMyCharacter(me.characters);
      }

      // 4. 获取历史消息
      const { data: msgs } = await supabase
        .from('meet_messages')
        .select('*, characters(name, avatar_url)')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });
      
      if (msgs) setMessages(msgs);
    };

    initRoom();

    // 5. 实时订阅消息
    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'meet_messages', filter: `room_id=eq.${roomId}` },
        async (payload) => {
          // 需要补全用户信息
          const { data: char } = await supabase.from('characters').select('name, avatar_url').eq('id', payload.new.character_id).single();
          const newMsg = { ...payload.new, characters: char };
          setMessages(prev => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  // 自动滚动
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    actionEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (type) => {
    const content = type === 'chat' ? chatInput : actionInput;
    if (!content.trim() || !myCharacter) return;

    // 1. 发送到房间 (显示用)
    const { error } = await supabase.from('meet_messages').insert([{
      room_id: roomId,
      character_id: myCharacter.id,
      type,
      content
    }]);

    if (error) {
      console.error("Send error:", error);
      return;
    }

    // 2. 写入个人事件 (存档用)
    // 格式：在 Meet 房间：对露娜说“你好” / 执行行动“环顾四周”
    // 这里简单记录内容，或者根据需求格式化
    const eventContent = type === 'chat' 
      ? `在 Meet 房间：说 "${content}"`
      : `在 Meet 房间：执行行动 "${content}"`;

    await supabase.from('character_events').insert([{
      character_id: myCharacter.id,
      type: 'MEET_' + type.toUpperCase(),
      content: eventContent
    }]);

    // 清空输入
    if (type === 'chat') setChatInput('');
    else setActionInput('');
  };

  // 分离消息流
  const chatMessages = messages.filter(m => m.type === 'chat');
  const actionMessages = messages.filter(m => m.type === 'action');

  return (
    <div className="meet-room-container">
      {/* 顶部场景 */}
      <div className="scene-header">
        <h2>📜 场景描述</h2>
        <p>{scene || "加载场景中..."}</p>
        <div className="participants-list">
          <small>当前角色：</small>
          {participants.map(p => (
            <span key={p.id} className="participant-badge">{p.name}</span>
          ))}
        </div>
      </div>

      {/* 主体分栏 */}
      <div className="room-split-view">
        
        {/* 左栏：聊天 */}
        <div className="panel chat-panel">
          <div className="panel-header">💬 对话 (Chat)</div>
          <div className="messages-area">
            {chatMessages.map(msg => (
              <div key={msg.id} className={`message-bubble ${msg.character_id == myCharacter?.id ? 'my-msg' : 'other-msg'}`}>
                <div className="msg-avatar" title={msg.characters?.name}>
                  {msg.characters?.name?.[0] || '?'}
                </div>
                <div className="msg-content">
                  <div className="msg-name">{msg.characters?.name}</div>
                  <div className="msg-text">{msg.content}</div>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="input-area">
            <input 
              type="text" 
              placeholder="说点什么..." 
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend('chat')}
            />
            <button onClick={() => handleSend('chat')}>发送</button>
          </div>
        </div>

        {/* 右栏：行动 */}
        <div className="panel action-panel">
          <div className="panel-header">🎬 行动 (Action)</div>
          <div className="messages-area">
            {actionMessages.map(msg => (
              <div key={msg.id} className="action-item">
                <span className="action-actor">{msg.characters?.name}</span>
                <span className="action-text">{msg.content}</span>
              </div>
            ))}
            <div ref={actionEndRef} />
          </div>
          <div className="input-area">
            <input 
              type="text" 
              placeholder="描述你的行动 (如: 环顾四周...)" 
              value={actionInput}
              onChange={e => setActionInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend('action')}
              className="action-input"
            />
            <button onClick={() => handleSend('action')} className="action-btn">执行</button>
          </div>
        </div>

      </div>
    </div>
  );
}
