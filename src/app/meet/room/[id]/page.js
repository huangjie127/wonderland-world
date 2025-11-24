"use client";
import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import ParticleBackground from '@/components/meet/ParticleBackground';

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
  const [showSidebar, setShowSidebar] = useState(false); // Mobile sidebar toggle

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
    const channel = supabase
      .channel(`room-${roomId}`)
      // 监听新消息
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'meet_messages', filter: `room_id=eq.${roomId}` }, 
        async (payload) => {
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
  }, [roomId, room?.collapse_at]);

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

  if (!room) return (
    <div className="min-h-screen bg-[#0a0b10] flex items-center justify-center text-gray-400 font-serif tracking-widest">
      <div className="animate-pulse">正在同步位面数据...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0b10] text-gray-300 font-serif relative overflow-hidden flex flex-col md:flex-row">
      <ParticleBackground />
      
      {/* Ambient Background Effects */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-900/5 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-900/5 rounded-full blur-[100px]"></div>
      </div>

      {/* Mobile Header / Toggle */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button 
          onClick={() => setShowSidebar(!showSidebar)}
          className="p-2 bg-[#0f1016]/90 border border-gray-700 rounded-lg text-gray-300 shadow-lg backdrop-blur-md"
        >
          {showSidebar ? '✕' : '☰ 菜单'}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {showSidebar && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Left Sidebar: World Info & Guide */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-80 bg-[#0f1016]/95 backdrop-blur-xl border-r border-gray-800/50 flex flex-col transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0 md:bg-[#0f1016]/80 md:backdrop-blur-md
        ${showSidebar ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-gray-800/50 pt-16 md:pt-6">
          <h2 className="text-xl font-light text-gray-100 mb-2 tracking-widest">{room.title}</h2>
          <div className="flex items-center gap-2 text-red-400/80 text-sm font-mono mb-4">
            <span className="animate-pulse">●</span>
            <span>坍塌倒计时: {timeLeft}</span>
          </div>
          <p className="text-sm text-gray-500 leading-relaxed italic border-l-2 border-gray-700 pl-3">
            {room.scene_description}
          </p>
        </div>

        {/* Guide / Tips Section */}
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="bg-[#1a1b26]/50 border border-gray-800 rounded p-4 mb-6">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">行动指南</h3>
            <ul className="space-y-3 text-sm text-gray-500">
              <li className="flex gap-2">
                <span className="text-blue-500">♦</span>
                <span><strong className="text-gray-400">扮演:</strong> 沉浸在你的角色中，用它的语气说话。</span>
              </li>
              <li className="flex gap-2">
                <span className="text-purple-500">♦</span>
                <span><strong className="text-gray-400">互动:</strong> 观察其他灵魂，对他们的行为做出反应。</span>
              </li>
              <li className="flex gap-2">
                <span className="text-gray-500">♦</span>
                <span><strong className="text-gray-400">探索:</strong> 使用"行动"描述你在场景中的动作。</span>
              </li>
            </ul>
          </div>

          <div className="mb-6">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">在线灵魂 ({participants.length})</h3>
            <div className="grid grid-cols-4 gap-2">
              {participants.map(p => (
                <div key={p.id} className="group relative" title={p.name}>
                  <div className="w-10 h-10 rounded-full bg-gray-800 border border-gray-700 overflow-hidden group-hover:border-blue-500 transition-colors">
                    {p.avatar_url ? (
                      <img src={p.avatar_url} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">{p.name[0]}</div>
                    )}
                  </div>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-xs text-gray-300 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    {p.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-800/50 bg-[#0a0b10]/50">
          {myCharacter && (
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gray-800 border border-gray-600 overflow-hidden">
                {myCharacter.avatar_url ? <img src={myCharacter.avatar_url} className="w-full h-full object-cover" /> : null}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-300 truncate">{myCharacter.name}</div>
                <div className="text-xs text-gray-600">当前化身</div>
              </div>
            </div>
          )}
          <button 
            onClick={handleLeave}
            className="w-full py-2 border border-red-900/30 text-red-500/70 text-xs tracking-widest hover:bg-red-900/10 hover:text-red-400 transition-colors uppercase"
          >
            离开位面
          </button>
        </div>
      </div>

      {/* Main Stage: Chat & Interaction */}
      <div className="flex-1 flex flex-col relative z-10 bg-gradient-to-b from-transparent to-[#0a0b10]/80 h-[100dvh] md:h-auto">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent pt-16 md:pt-8">
          {messages.map((msg, idx) => {
            const isMe = msg.character_id === myCharacter?.id;
            return (
              <div key={msg.id} className={`flex gap-4 ${isMe ? 'flex-row-reverse' : ''} group animate-in fade-in slide-in-from-bottom-2 duration-500`}>
                {/* Avatar */}
                <div className="flex-shrink-0 mt-1">
                  <div className={`w-10 h-10 rounded-full border ${isMe ? 'border-blue-900/50' : 'border-gray-700'} bg-[#1a1b26] overflow-hidden shadow-lg`}>
                    {msg.characters?.avatar_url ? (
                      <img src={msg.characters.avatar_url} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">{msg.characters?.name?.[0]}</div>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className={`flex flex-col max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                  <span className="text-xs text-gray-600 mb-1 px-1">{msg.characters?.name}</span>
                  
                  {msg.type === 'chat' ? (
                    <div className={`px-5 py-3 rounded-2xl text-sm leading-relaxed shadow-lg backdrop-blur-sm
                      ${isMe 
                        ? 'bg-blue-900/20 border border-blue-800/30 text-gray-200 rounded-tr-sm' 
                        : 'bg-[#1a1b26]/80 border border-gray-700/50 text-gray-300 rounded-tl-sm'
                      }
                    `}>
                      {msg.content}
                    </div>
                  ) : (
                    <div className="px-5 py-3 rounded-lg bg-gray-800/30 border border-gray-700/30 text-gray-400 text-sm italic flex items-center gap-2">
                      <span className="text-yellow-500/50">✨</span>
                      <span>{msg.content}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-6 bg-[#0f1016]/90 border-t border-gray-800/50 backdrop-blur-md pb-safe">
          <div className="max-w-4xl mx-auto flex flex-col gap-3">
            {/* Chat Input */}
            <div className="flex gap-2 md:gap-3">
              <input 
                type="text" 
                className="flex-1 bg-[#1a1b26] border border-gray-700 rounded px-3 py-2 md:px-4 md:py-3 text-sm md:text-base text-gray-200 placeholder-gray-600 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 outline-none transition-all"
                placeholder="说点什么..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend('chat')}
              />
              <button 
                onClick={() => handleSend('chat')}
                className="px-4 md:px-6 bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-600 rounded transition-colors uppercase text-xs tracking-widest whitespace-nowrap"
              >
                发送
              </button>
            </div>

            {/* Action Input */}
            <div className="flex gap-2 md:gap-3">
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-[10px] md:text-xs uppercase tracking-wider">行动 |</span>
                <input 
                  type="text" 
                  className="w-full bg-[#1a1b26]/50 border border-gray-800 rounded px-3 py-2 pl-12 md:pl-16 text-xs md:text-sm text-gray-400 placeholder-gray-700 focus:border-gray-600 outline-none transition-all italic"
                  placeholder="描述动作..."
                  value={actionInput}
                  onChange={e => setActionInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend('action')}
                />
              </div>
              <button 
                onClick={() => handleSend('action')}
                className="px-4 md:px-6 bg-transparent hover:bg-gray-800 text-gray-500 border border-gray-800 rounded transition-colors uppercase text-xs tracking-widest whitespace-nowrap"
              >
                执行
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
