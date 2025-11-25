"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import "./archive.css";

export default function ArchivePage() {
  const [allCharacters, setAllCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

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

  const filteredCharacters = allCharacters.filter(char => 
    char.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-8">加载中...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* 所有角色部分 */}
      <section>
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <h2 className="text-3xl font-bold text-gray-800">社区角色库</h2>
            
            {/* Search Bar */}
            <div className="relative w-full md:w-64">
                <input
                    type="text"
                    placeholder="搜索角色名..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
            </div>
        </div>

        {filteredCharacters.length === 0 && searchQuery && (
            <div className="text-center py-12 text-gray-500">
                没有找到名为 "{searchQuery}" 的角色
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredCharacters.map((char) => (
            <Link
              key={char.id}
              href={`/archive/${char.id}`}
              className="group cursor-pointer"
            >
              <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow h-full flex flex-col">
                <div className="aspect-square bg-gray-200 overflow-hidden">
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
