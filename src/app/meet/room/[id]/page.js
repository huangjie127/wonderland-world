"use client";
import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';


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
    <div className="min-h-screen relative overflow-hidden flex flex-col md:flex-row">
      
      {/* Mobile Header / Toggle */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button 
          onClick={() => setShowSidebar(!showSidebar)}
          className="p-2 bg-white/80 border border-white/50 rounded-lg text-gray-600 shadow-lg backdrop-blur-md"
        >
          {showSidebar ? '✕' : '☰ 菜单'}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {showSidebar && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Left Sidebar: World Info & Guide */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-80 bg-white/80 backdrop-blur-xl border-r border-white/50 flex flex-col transition-transform duration-300 ease-in-out shadow-xl
        md:relative md:translate-x-0 md:bg-white/40 md:backdrop-blur-md md:shadow-none
        ${showSidebar ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-white/50 pt-16 md:pt-6">
          <h2 className="text-xl font-bold text-gray-800 mb-2 tracking-wide font-serif">{room.title}</h2>
          <div className="flex items-center gap-2 text-red-500/80 text-sm font-mono mb-4">
            <span className="animate-pulse">●</span>
            <span>坍塌倒计时: {timeLeft}</span>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed italic border-l-2 border-indigo-200 pl-3 font-serif">
            {room.scene_description}
          </p>
        </div>

        {/* Guide / Tips Section */}
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="bg-white/50 border border-white/60 rounded-xl p-4 mb-6 shadow-sm">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">行动指南</h3>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex gap-2">
                <span className="text-indigo-500">♦</span>
                <span><strong className="text-gray-700">扮演:</strong> 沉浸在你的角色中，用它的语气说话。</span>
              </li>
              <li className="flex gap-2">
                <span className="text-purple-500">♦</span>
                <span><strong className="text-gray-700">互动:</strong> 观察其他灵魂，对他们的行为做出反应。</span>
              </li>
              <li className="flex gap-2">
                <span className="text-gray-400">♦</span>
                <span><strong className="text-gray-700">探索:</strong> 使用"行动"描述你在场景中的动作。</span>
              </li>
            </ul>
          </div>

          <div className="mb-6">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">在线灵魂 ({participants.length})</h3>
            <div className="grid grid-cols-4 gap-2">
              {participants.map(p => (
                <div key={p.id} className="group relative" title={p.name}>
                  <div className="w-10 h-10 rounded-full bg-white border border-white/60 overflow-hidden group-hover:border-indigo-400 transition-colors shadow-sm">
                    {p.avatar_url ? (
                      <img src={p.avatar_url} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">{p.name[0]}</div>
                    )}
                  </div>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-xs text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg">
                    {p.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-white/50 bg-white/30">
          {myCharacter && (
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-white border border-white/60 overflow-hidden shadow-sm">
                {myCharacter.avatar_url ? <img src={myCharacter.avatar_url} className="w-full h-full object-cover" /> : null}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-800 font-medium truncate">{myCharacter.name}</div>
                <div className="text-xs text-gray-500">当前化身</div>
              </div>
            </div>
          )}
          <button 
            onClick={handleLeave}
            className="w-full py-2 border border-red-200 text-red-500/80 text-xs tracking-widest hover:bg-red-50 hover:text-red-600 transition-colors uppercase rounded-lg font-medium"
          >
            离开位面
          </button>
        </div>
      </div>

      {/* Main Stage: Chat & Interaction */}
      <div className="flex-1 flex flex-col relative z-10 h-[100dvh] md:h-auto">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent pt-16 md:pt-8">
          {messages.map((msg, idx) => {
            const isMe = msg.character_id === myCharacter?.id;
            return (
              <div key={msg.id} className={`flex gap-4 ${isMe ? 'flex-row-reverse' : ''} group animate-in fade-in slide-in-from-bottom-2 duration-500`}>
                {/* Avatar */}
                <div className="flex-shrink-0 mt-1">
                  <div className={`w-10 h-10 rounded-full border ${isMe ? 'border-indigo-200' : 'border-white'} bg-white overflow-hidden shadow-md`}>
                    {msg.characters?.avatar_url ? (
                      <img src={msg.characters.avatar_url} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">{msg.characters?.name?.[0]}</div>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className={`flex flex-col max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                  <span className="text-xs text-gray-500 mb-1 px-1">{msg.characters?.name}</span>
                  
                  {msg.type === 'chat' ? (
                    <div className={`px-5 py-3 rounded-2xl text-sm leading-relaxed shadow-sm backdrop-blur-sm
                      ${isMe 
                        ? 'bg-indigo-600/90 text-white rounded-tr-sm shadow-indigo-200' 
                        : 'bg-white/80 border border-white/60 text-gray-700 rounded-tl-sm shadow-gray-200'
                      }
                    `}>
                      {msg.content}
                    </div>
                  ) : (
                    <div className="px-5 py-3 rounded-lg bg-white/40 border border-white/50 text-gray-600 text-sm italic flex items-center gap-2 shadow-sm">
                      <span className="text-yellow-500">✨</span>
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
        <div className="p-4 md:p-6 bg-white/60 border-t border-white/50 backdrop-blur-md pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
          <div className="max-w-4xl mx-auto flex flex-col gap-3">
            {/* Chat Input */}
            <div className="flex gap-2 md:gap-3">
              <input 
                type="text" 
                className="flex-1 bg-white/80 border border-white/60 rounded-lg px-3 py-2 md:px-4 md:py-3 text-sm md:text-base text-gray-800 placeholder-gray-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none transition-all shadow-sm"
                placeholder="说点什么..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend('chat')}
              />
              <button 
                onClick={() => handleSend('chat')}
                className="px-4 md:px-6 bg-indigo-600 hover:bg-indigo-700 text-white border border-transparent rounded-lg transition-all uppercase text-xs tracking-widest whitespace-nowrap font-medium shadow-md hover:shadow-lg hover:-translate-y-0.5"
              >
                发送
              </button>
            </div>

            {/* Action Input */}
            <div className="flex gap-2 md:gap-3">
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] md:text-xs uppercase tracking-wider font-medium">行动 |</span>
                <input 
                  type="text" 
                  className="w-full bg-white/50 border border-white/60 rounded-lg px-3 py-2 pl-12 md:pl-16 text-xs md:text-sm text-gray-600 placeholder-gray-400 focus:border-gray-300 outline-none transition-all italic shadow-sm"
                  placeholder="描述动作..."
                  value={actionInput}
                  onChange={e => setActionInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend('action')}
                />
              </div>
              <button 
                onClick={() => handleSend('action')}
                className="px-4 md:px-6 bg-transparent hover:bg-white/50 text-gray-500 border border-gray-300 rounded-lg transition-colors uppercase text-xs tracking-widest whitespace-nowrap font-medium"
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
