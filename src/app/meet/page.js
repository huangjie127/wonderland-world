"use client";
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import CreateRoomDialog from '@/components/meet/CreateRoomDialog';

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
    <div className="min-h-screen relative overflow-hidden">
      
      <div className="max-w-6xl mx-auto py-16 px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-800 mb-6 tracking-wide font-serif">
            探索 · 虚空
          </h1>
          <div className="h-px w-32 mx-auto bg-gradient-to-r from-transparent via-gray-400 to-transparent mb-6"></div>
          
          <div className="flex items-center justify-center gap-4 text-gray-600 text-lg font-serif">
            <span>当前化身:</span>
            {myCharacters.length > 0 ? (
              <select 
                className="bg-white/60 border border-gray-300 text-gray-800 text-sm rounded-full px-4 py-1 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition-colors backdrop-blur-sm"
                value={characterId || ''} 
                onChange={handleCharacterSwitch}
              >
                {myCharacters.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            ) : (
              <span className="text-red-500 font-medium">未登录</span>
            )}
            <span className="text-gray-400">♦</span> 
            <span className="italic opacity-80">世界终将归于沉寂，唯有灵魂永存</span>
          </div>
          
          <div className="mt-8">
            <button
              onClick={() => {
                if (!characterId) return alert("请先选择角色");
                setIsCreateDialogOpen(true);
              }}
              className="px-8 py-2.5 bg-indigo-600/90 text-white text-sm tracking-widest hover:bg-indigo-700 transition-all duration-300 uppercase rounded-full shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              + 构筑新位面
            </button>
          </div>
        </div>

        {/* Tips Card - Glass Style */}
        <div className="max-w-4xl mx-auto mb-20 relative group">
          <div className="relative bg-white/60 backdrop-blur-md border border-white/60 rounded-2xl p-10 shadow-sm hover:shadow-md transition-all duration-500">
            <div className="grid md:grid-cols-3 gap-12 divide-y md:divide-y-0 md:divide-x divide-gray-200/50">
              <div className="text-center px-4">
                <h3 className="text-xl font-bold text-gray-800 mb-4 tracking-widest uppercase font-serif">随机生成</h3>
                <p className="text-gray-600 text-base leading-relaxed">
                  虚空在混沌中重组。<br/>新的位面将在不确定的时刻降临。
                </p>
              </div>
              <div className="text-center px-4 pt-8 md:pt-0">
                <h3 className="text-xl font-bold text-gray-800 mb-4 tracking-widest uppercase font-serif">限时存在</h3>
                <p className="text-gray-600 text-base leading-relaxed">
                  一切皆是昙花一现。<br/>当沙漏流尽，世界即刻崩塌。
                </p>
              </div>
              <div className="text-center px-4 pt-8 md:pt-0">
                <h3 className="text-xl font-bold text-gray-800 mb-4 tracking-widest uppercase font-serif">灵魂誓约</h3>
                <p className="text-gray-600 text-base leading-relaxed">
                  请铭记你的面具。<br/>勿做违背灵魂本质之举。
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* World Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {loading && worlds.length === 0 ? (
            <div className="col-span-full text-center py-32">
              <p className="text-xl text-gray-500 font-serif tracking-widest animate-pulse">正在凝视深渊...</p>
            </div>
          ) : (
            worlds.map(world => (
              <div 
                key={world.id} 
                className="group relative bg-white/70 backdrop-blur-sm rounded-xl border border-white/60 hover:border-indigo-200 transition-all duration-500 flex flex-col h-full overflow-hidden hover:shadow-lg hover:-translate-y-1"
              >
                <div className="p-8 flex-1 flex flex-col relative z-10">
                  <div className="flex justify-between items-start mb-6">
                    <h3 className="text-2xl font-bold text-gray-800 group-hover:text-indigo-700 transition-colors tracking-wide font-serif">
                      {world.title}
                    </h3>
                    <span className="inline-flex items-center px-3 py-1 text-xs font-medium text-indigo-600 border border-indigo-100 rounded-full bg-indigo-50">
                      {world.timeLeft}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 mb-8 leading-relaxed flex-grow border-l-2 border-indigo-100 pl-4 italic font-serif">
                    {world.scene_description}
                  </p>
                  
                  <div className="pt-6 border-t border-gray-100 flex items-center justify-between mt-auto">
                    <span className="text-sm text-gray-500 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-gray-300 group-hover:bg-indigo-400 transition-all duration-500"></span>
                      {world.playerCount} / {world.max_players} 灵魂
                    </span>
                    <button 
                      className="px-6 py-2 bg-white border border-gray-200 text-gray-600 text-sm tracking-widest hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 uppercase rounded-full font-medium shadow-sm"
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
