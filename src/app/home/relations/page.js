"use client";

import { useEffect, useState } from "react";
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import CreateCharacter from "@/src/components/CreateCharacter";
import Link from "next/link";
import "./home.css";

export default function HomePage() {
  const [user, setUser] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [currentCharId, setCurrentCharId] = useState(null);
  const [stats, setStats] = useState({
    photos: 0,
    events: 0,
    relations: 0,
    avatars: 0,
  });

  // 获取当前登录用户
  useEffect(() => {
    supabase.auth.getSession().then((res) => setUser(res?.data?.session?.user));
  }, []);

  // 获取用户创建的角色列表
  useEffect(() => {
    if (!user) return;
    const fetchCharacters = async () => {
      const { data } = await supabase
        .from("characters")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      setCharacters(data);
      if (data.length) setCurrentCharId(data[0].id); // 默认选第一个角色
    };
    fetchCharacters();
  }, [user]);

  const currentCharacter = characters.find((c) => c.id === currentCharId);

  // 获取当前角色统计数据
  useEffect(() => {
    if (!currentCharacter) return;

    const loadStats = async () => {
      const { count: photos } = await supabase
        .from("photos")
        .select("*", { count: "exact", head: true, filter: { character_id: currentCharacter.id } });
      const { count: events } = await supabase
        .from("events")
        .select("*", { count: "exact", head: true, filter: { character_id: currentCharacter.id } });
      const { count: relations } = await supabase
        .from("relations")
        .select("*", { count: "exact", head: true, filter: { character_id: currentCharacter.id } });
      setStats({ photos, events, relations, avatars: 1 });
    };

    loadStats();
  }, [currentCharacter]);

  const handleCharacterCreated = (char) => {
    setCharacters((prev) => [...prev, char]);
    setCurrentCharId(char.id);
  };

  if (!user) return <div className="flex justify-center items-center h-screen">请先登录...</div>;

  // 没有角色时显示创建角色窗口
  if (!characters.length) {
    return <CreateCharacter userId={user.id} onCreated={handleCharacterCreated} />;
  }

  const blocks = [
    { id: 1, label: `头像 (${stats.avatars})`, size: "small", href: "/home/avatar" },
    { id: 2, label: `相册 (${stats.photos})`, size: "large", href: "/home/photos" },
    { id: 3, label: `事件 (${stats.events})`, size: "medium", href: "/home/events" },
    { id: 4, label: `关系 (${stats.relations})`, size: "medium", href: "/home/relations" },
  ];

  return (
    <div>
      {/* 角色切换下拉 */}
      <div className="flex items-center gap-4 p-4">
        <select
          value={currentCharId}
          onChange={(e) => setCurrentCharId(Number(e.target.value))}
          className="border px-2 py-1"
        >
          {characters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {currentCharacter && (
          <div className="flex items-center gap-2">
            <img
              src={currentCharacter.avatar_url}
              alt={currentCharacter.name}
              className="w-16 h-16 object-cover rounded border-2 border-black"
            />
            <h2 className="text-xl font-bold">{currentCharacter.name}</h2>
          </div>
        )}
      </div>

      <div className="home-container">
        {blocks.map((block) => (
          <Link key={block.id} href={block.href} className={`block ${block.size}`}>
            <span className="label">{block.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

