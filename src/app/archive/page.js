"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import "./archive.css";

export default function ArchivePage() {
  const [allCharacters, setAllCharacters] = useState([]);
  const [loading, setLoading] = useState(true);

  // 加载所有角色
  useEffect(() => {
    const fetchCharacters = async () => {
      setLoading(true);
      // 获取所有角色（用于社区浏览）
      const { data: allChars } = await supabase
        .from("characters")
        .select("*")
        .order("created_at", { ascending: false });

      setAllCharacters(allChars || []);
      setLoading(false);
    };

    fetchCharacters();
  }, []);

  if (loading) {
    return <div className="text-center py-8">加载中...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
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
              <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow h-full flex flex-col">
                <div className="aspect-square bg-gray-200 overflow-hidden relative">
                  {char.avatar_url ? (
                    <img
                      src={char.avatar_url}
                      alt={char.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-300 to-gray-400">
                      <span className="text-gray-600 text-4xl">👤</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300" />
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="text-lg font-bold text-gray-800 line-clamp-1 mb-1">
                    {char.name}
                  </h3>
                  <p className="text-sm text-gray-500 line-clamp-2 mb-3 flex-1">
                    {char.tagline || "暂无简介"}
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-400 mt-auto pt-3 border-t border-gray-100">
                    <span>作者: {char.user_id?.substring(0, 6)}...</span>
                    <span className="text-indigo-500 font-medium group-hover:translate-x-1 transition-transform">
                      查看主页 →
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {allCharacters.length === 0 && (
        <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <p className="text-gray-500 text-lg mb-4">还没有任何角色收录</p>
          <Link
            href="/home"
            className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition shadow-md"
          >
            去创建第一个角色
          </Link>
        </div>
      )}
    </div>
  );
}
