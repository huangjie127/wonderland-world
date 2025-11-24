"use client";
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import CreateRoomDialog from '@/components/meet/CreateRoomDialog';
import ParticleBackground from '@/components/meet/ParticleBackground';

export default function MeetLobby() {
  const [worlds, setWorlds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [characterId, setCharacterId] = useState(null);
  const [characterName, setCharacterName] = useState('');
  const [myCharacters, setMyCharacters] = useState([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const router = useRouter();

  // 初始化
  useEffect(() => {
    const init = async () => {
      // 1. 获取用户及其角色
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // 获取该用户的所有角色
        const { data: chars } = await supabase
          .from('characters')
          .select('id, name, avatar_url')
          .eq('user_id', user.id);
        
        if (chars && chars.length > 0) {
          setMyCharacters(chars);
          
          // 尝试恢复上次选择的角色
          const localId = localStorage.getItem('activeCharacterId');
          const savedChar = chars.find(c => c.id.toString() === localId);
          
          if (savedChar) {
            setCharacterId(savedChar.id);
            setCharacterName(savedChar.name);
          } else {
            // 如果没有存档或存档无效，默认选第一个
            setCharacterId(chars[0].id);
            setCharacterName(chars[0].name);
            localStorage.setItem('activeCharacterId', chars[0].id);
          }
        }
      }

      // 2. 触发世界维护 (确保有房间)
      try {
        await supabase.rpc('maintain_worlds');
      } catch (err) {
        console.error("Failed to maintain worlds:", err);
      }

      // 3. 获取列表
      fetchWorlds();
    };

    init();

    // 4. 实时更新
    const channel = supabase
      .channel('world-lobby')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meet_rooms' }, fetchWorlds)
      .subscribe();

    // 5. 每分钟刷新一次倒计时显示
    const timer = setInterval(fetchWorlds, 60000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(timer);
    };
  }, []);

  const fetchWorlds = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('meet_rooms')
      .select(`
        id, title, scene_description, collapse_at, max_players,
        meet_participants (count)
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (data) {
      const formatted = data.map(w => ({
        ...w,
        playerCount: w.meet_participants[0]?.count || 0,
        timeLeft: calculateTimeLeft(w.collapse_at)
      }));
      setWorlds(formatted);
    }
    setLoading(false);
  };

  const calculateTimeLeft = (targetDate) => {
    const diff = new Date(targetDate) - new Date();
    if (diff <= 0) return "即将坍塌";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}小时 ${minutes}分`;
  };

  const handleEnterWorld = async (worldId) => {
    if (!characterId) return alert("请先选择角色");

    const { data, error } = await supabase.rpc('join_world', {
      p_room_id: worldId,
      p_character_id: parseInt(characterId)
    });

    if (error) {
      alert("进入失败: " + error.message);
    } else if (data.success) {
      router.push(`/meet/room/${worldId}`);
    } else {
      alert(data.message);
    }
  };

  const handleCharacterSwitch = (e) => {
    const newId = e.target.value;
    const char = myCharacters.find(c => c.id.toString() === newId);
    if (char) {
      setCharacterId(char.id);
      setCharacterName(char.name);
      localStorage.setItem('activeCharacterId', char.id);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0b10] text-gray-300 font-serif relative overflow-hidden">
      {/* Particle Background */}
      <ParticleBackground />

      {/* Ambient Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-900/10 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-900/10 rounded-full blur-[100px]"></div>
        {/* Dust particles simulation */}
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z\' fill=\'%23ffffff\' fill-opacity=\'0.05\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")' }}></div>
      </div>

      <div className="max-w-6xl mx-auto py-16 px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-light text-gray-100 mb-6 tracking-[0.2em] uppercase drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
            探索 · 虚空
          </h1>
          <div className="h-px w-32 mx-auto bg-gradient-to-r from-transparent via-gray-500 to-transparent mb-6"></div>
          
          <div className="flex items-center justify-center gap-4 text-gray-400 text-lg font-light tracking-wide">
            <span>当前化身:</span>
            {myCharacters.length > 0 ? (
              <select 
                className="bg-[#1a1b26] border border-gray-700 text-gray-200 text-sm rounded px-3 py-1 focus:ring-1 focus:ring-gray-500 focus:border-gray-500 outline-none transition-colors hover:border-gray-500"
                value={characterId || ''} 
                onChange={handleCharacterSwitch}
              >
                {myCharacters.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            ) : (
              <span className="text-red-400/80 font-medium">未登录</span>
            )}
            <span className="text-gray-700">♦</span> 
            <span className="italic opacity-80">世界终将归于沉寂，唯有灵魂永存</span>
          </div>
          
          <div className="mt-8">
            <button
              onClick={() => {
                if (!characterId) return alert("请先选择角色");
                setIsCreateDialogOpen(true);
              }}
              className="px-6 py-2 bg-blue-900/20 border border-blue-800/50 text-blue-200 text-sm tracking-widest hover:bg-blue-900/40 hover:border-blue-500 transition-all duration-300 uppercase backdrop-blur-sm"
            >
              + 构筑新位面
            </button>
          </div>
        </div>

        {/* Tips Card - Ancient Tablet Style */}
        <div className="max-w-4xl mx-auto mb-20 relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-gray-700 via-gray-500 to-gray-700 rounded-lg opacity-20 blur transition duration-1000 group-hover:opacity-40"></div>
          <div className="relative bg-[#0f1016] border border-gray-800 rounded-lg p-10 shadow-2xl">
            <div className="grid md:grid-cols-3 gap-12 divide-y md:divide-y-0 md:divide-x divide-gray-800/50">
              <div className="text-center px-4">
                <h3 className="text-xl font-medium text-gray-200 mb-4 tracking-widest uppercase">随机生成</h3>
                <p className="text-gray-500 text-base leading-relaxed font-light">
                  虚空在混沌中重组。<br/>新的位面将在不确定的时刻降临。
                </p>
              </div>
              <div className="text-center px-4 pt-8 md:pt-0">
                <h3 className="text-xl font-medium text-gray-200 mb-4 tracking-widest uppercase">限时存在</h3>
                <p className="text-gray-500 text-base leading-relaxed font-light">
                  一切皆是昙花一现。<br/>当沙漏流尽，世界即刻崩塌。
                </p>
              </div>
              <div className="text-center px-4 pt-8 md:pt-0">
                <h3 className="text-xl font-medium text-gray-200 mb-4 tracking-widest uppercase">灵魂誓约</h3>
                <p className="text-gray-500 text-base leading-relaxed font-light">
                  请铭记你的面具。<br/>勿做违背灵魂本质之举。
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* World Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {loading && worlds.length === 0 ? (
            <div className="col-span-full text-center py-32">
              <p className="text-xl text-gray-600 font-light tracking-widest animate-pulse">正在凝视深渊...</p>
            </div>
          ) : (
            worlds.map(world => (
              <div 
                key={world.id} 
                className="group relative bg-[#12131a] rounded-sm border border-gray-800 hover:border-gray-600 transition-all duration-500 flex flex-col h-full overflow-hidden"
              >
                {/* Hover Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-blue-900/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                
                <div className="p-8 flex-1 flex flex-col relative z-10">
                  <div className="flex justify-between items-start mb-6">
                    <h3 className="text-2xl font-light text-gray-100 group-hover:text-white transition-colors tracking-wide">
                      {world.title}
                    </h3>
                    <span className="inline-flex items-center px-3 py-1 text-xs font-medium text-gray-400 border border-gray-800 rounded-full bg-black/20">
                      {world.timeLeft}
                    </span>
                  </div>
                  
                  <p className="text-gray-500 mb-8 leading-relaxed font-light flex-grow border-l-2 border-gray-800 pl-4 italic">
                    {world.scene_description}
                  </p>
                  
                  <div className="pt-6 border-t border-gray-800/50 flex items-center justify-between mt-auto">
                    <span className="text-sm font-light text-gray-500 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-500 group-hover:bg-blue-400 group-hover:shadow-[0_0_8px_rgba(96,165,250,0.8)] transition-all duration-500"></span>
                      {world.playerCount} / {world.max_players} 灵魂
                    </span>
                    <button 
                      className="px-8 py-2 bg-transparent border border-gray-600 text-gray-300 text-sm tracking-widest hover:bg-gray-200 hover:text-black hover:border-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 uppercase"
                      onClick={() => handleEnterWorld(world.id)}
                      disabled={world.playerCount >= world.max_players}
                    >
                      进入
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <CreateRoomDialog 
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        characterId={characterId}
        onSuccess={() => {
          fetchWorlds();
          // Optional: Show success toast
        }}
      />
    </div>
  );
}
