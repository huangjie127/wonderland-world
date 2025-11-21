"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/app/providers";
import { useRouter } from "next/navigation";
import Link from "next/link";
import "./archive.css";

export default function ArchivePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [userCharacters, setUserCharacters] = useState([]);
  const [allCharacters, setAllCharacters] = useState([]);
  const [selectedCharId, setSelectedCharId] = useState(null);
  const scrollContainerRef = useRef(null);

  // 重定向未登录用户
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
    }
  }, [user, authLoading, router]);

  // 加载用户的角色和所有角色
  useEffect(() => {
    const fetchCharacters = async () => {
      // 获取当前用户的角色
      const { data: userChars } = await supabase
        .from("characters")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setUserCharacters(userChars || []);
      if (userChars && userChars.length > 0) {
        setSelectedCharId(userChars[0].id);
      }

      // 获取所有角色（可选，用于社区浏览）
      const { data: allChars } = await supabase
        .from("characters")
        .select("*")
        .order("created_at", { ascending: false });

      setAllCharacters(allChars || []);
    };

    if (user) {
      fetchCharacters();
    }
  }, [user]);

  const scroll = (direction) => {
    const container = scrollContainerRef.current;
    if (container) {
      const scrollAmount = 300;
      container.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  if (authLoading) {
    return <div className="text-center py-8">加载中...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* 我的角色部分 */}
      {userCharacters.length > 0 && (
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-6">我的角色</h2>
          <div className="relative">
            <button
              onClick={() => scroll("left")}
              className="absolute left-0 top-1/2 -translate-y-1/2 -ml-12 z-10 bg-gray-800 text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-900"
            >
              ←
            </button>

            <div
              ref={scrollContainerRef}
              className="flex gap-6 overflow-x-auto scroll-smooth pb-4"
              style={{ scrollBehavior: "smooth" }}
            >
              {userCharacters.map((char) => (
                <Link
                  key={char.id}
                  href={`/archive/${char.id}`}
                  className="flex-shrink-0 w-64 group cursor-pointer"
                >
                  <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                    <div className="aspect-square bg-gray-200 overflow-hidden">
                      {char.avatar_url ? (
                        <img
                          src={char.avatar_url}
                          alt={char.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-300 to-gray-400">
                          <span className="text-gray-600">无头像</span>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="text-xl font-bold text-gray-800 line-clamp-1">
                        {char.name}
                      </h3>
                      <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                        {char.tagline}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">点击查看详情</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <button
              onClick={() => scroll("right")}
              className="absolute right-0 top-1/2 -translate-y-1/2 -mr-12 z-10 bg-gray-800 text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-900"
            >
              →
            </button>
          </div>
        </section>
      )}

      {/* 所有角色部分 */}
      <section>
        <h2 className="text-3xl font-bold mb-6">社区角色库</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {allCharacters.map((char) => (
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
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-300 to-gray-400">
                      <span className="text-gray-600">无头像</span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-800 line-clamp-1">
                    {char.name}
                  </h3>
                  <p className="text-sm text-gray-500 line-clamp-2">{char.tagline}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    作者: {char.user_id?.substring(0, 8)}...
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {allCharacters.length === 0 && userCharacters.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600 text-lg">还没有任何角色，去创建一个吧！</p>
          <Link
            href="/home"
            className="mt-4 inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
          >
            创建角色
          </Link>
        </div>
      )}
    </div>
  );
}
