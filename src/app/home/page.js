"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/app/providers";
import { useRouter } from "next/navigation";
import CreateCharacter from "@/components/CreateCharacter";
import "./home.css";

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [characters, setCharacters] = useState([]);
  const [stats, setStats] = useState({
    photos: 0,
    events: 0,
    relations: 0,
    avatars: 0,
  });
  const [showCreateForm, setShowCreateForm] = useState(false);

  // 重定向未登录用户
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
    }
  }, [user, authLoading, router]);

  // 加载用户的角色
  useEffect(() => {
    if (!user) return;

    const fetchCharacters = async () => {
      const { data } = await supabase
        .from("characters")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setCharacters(data || []);
      setStats({ avatars: data?.length || 0, photos: 0, events: 0, relations: 0 });
    };

    fetchCharacters();
  }, [user]);

  const handleCharacterCreated = (newCharacter) => {
    setCharacters((prev) => [newCharacter, ...prev]);
    setStats((prev) => ({ ...prev, avatars: prev.avatars + 1 }));
    setShowCreateForm(false);
  };

  if (authLoading) {
    return <div className="text-center py-8">加载中...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* 欢迎 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">欢迎, {user.email}</h1>
        <p className="text-gray-600">管理你的多角色档案库</p>
      </div>

      {/* 创建按钮 */}
      {!showCreateForm && (
        <button
          onClick={() => setShowCreateForm(true)}
          className="mb-8 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 font-semibold"
        >
          + 创建新角色
        </button>
      )}

      {/* 创建角色表单 */}
      {showCreateForm && (
        <div className="mb-8">
          <button
            onClick={() => setShowCreateForm(false)}
            className="mb-4 text-gray-600 hover:text-gray-800"
          >
            ← 取消
          </button>
          <CreateCharacter onCreated={handleCharacterCreated} />
        </div>
      )}

      {/* 角色网格 */}
      {characters.length > 0 ? (
        <div>
          <h2 className="text-2xl font-bold mb-4">我的角色 ({characters.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {characters.map((char) => (
              <Link
                key={char.id}
                href={`/archive/${char.id}`}
                className="group cursor-pointer"
              >
                <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow">
                  <div className="aspect-square bg-gray-200 overflow-hidden">
                    {char.avatar_url ? (
                      <img
                        src={char.avatar_url}
                        alt={char.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-300 text-gray-600">
                        No Image
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-800">{char.name}</h3>
                    <p className="text-sm text-gray-500 line-clamp-2">{char.tagline}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">还没有创建任何角色</p>
        </div>
      )}

      {/* 功能模块 */}
      {characters.length > 0 && (
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-4">管理</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              href="/home/avator"
              className="bg-blue-50 p-4 rounded-lg text-center hover:bg-blue-100 transition"
            >
              <div className="text-2xl mb-2">👤</div>
              <div className="font-semibold text-sm">头像设定</div>
            </Link>
            <Link
              href="/home/photos"
              className="bg-green-50 p-4 rounded-lg text-center hover:bg-green-100 transition"
            >
              <div className="text-2xl mb-2">📷</div>
              <div className="font-semibold text-sm">相册</div>
            </Link>
            <Link
              href="/home/events"
              className="bg-yellow-50 p-4 rounded-lg text-center hover:bg-yellow-100 transition"
            >
              <div className="text-2xl mb-2">📅</div>
              <div className="font-semibold text-sm">事件记录</div>
            </Link>
            <Link
              href="/home/relations"
              className="bg-purple-50 p-4 rounded-lg text-center hover:bg-purple-100 transition"
            >
              <div className="text-2xl mb-2">🔗</div>
              <div className="font-semibold text-sm">关系档案</div>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}


