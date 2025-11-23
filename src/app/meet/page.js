"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import './meet.css';

export default function MeetLobby() {
  const [worlds, setWorlds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [characterId, setCharacterId] = useState(null);
  const [characterName, setCharacterName] = useState('');
  const [myCharacters, setMyCharacters] = useState([]); // 新增：存储用户的所有角色
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
      await supabase.rpc('maintain_worlds');

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
      .gt('collapse_at', new Date().toISOString()) // 只显示未过期的
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
    <div className="meet-container">
      <div className="meet-header">
        <h1 className="meet-title">🌍 探索短暂世界</h1>
        <div className="meet-subtitle">
          当前身份: 
          {myCharacters.length > 0 ? (
            <select 
              className="character-selector"
              value={characterId || ''} 
              onChange={handleCharacterSwitch}
            >
              {myCharacters.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          ) : (
            <span className="no-char-text"> 未登录 (请先创建角色)</span>
          )}
          <span className="divider">|</span> 
          这些世界终将消逝，唯有记忆永存。
        </div>
      </div>

      <div className="world-grid">
        {loading && worlds.length === 0 ? (
          <p className="loading-text">正在扫描平行宇宙...</p>
        ) : (
          worlds.map(world => (
            <div key={world.id} className="world-card">
              <div className="world-card-header">
                <h3>{world.title}</h3>
                <span className="world-timer">⏳ {world.timeLeft}</span>
              </div>
              <p className="world-desc">{world.scene_description}</p>
              <div className="world-card-footer">
                <span className="player-badge">
                  👥 {world.playerCount} / {world.max_players}
                </span>
                <button 
                  className="enter-btn"
                  onClick={() => handleEnterWorld(world.id)}
                  disabled={world.playerCount >= world.max_players}
                >
                  进入世界
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
