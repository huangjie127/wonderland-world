"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function CharacterDetail({ character }) {
  const [events, setEvents] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [relations, setRelations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!character) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);

      try {
        const [eventsData, albumsData, relationsData] = await Promise.all([
          supabase
            .from("character_event_logs")
            .select("*")
            .eq("character_id", character.id)
            .order("created_at", { ascending: false })
            .limit(5),
          supabase
            .from("character_albums")
            .select("*")
            .eq("character_id", character.id)
            .order("created_at", { ascending: false })
            .limit(4),
          supabase
            .from("character_relations")
            .select("*")
            .eq("character_id", character.id)
            .limit(3),
        ]);

        setEvents(eventsData.data || []);
        setAlbums(albumsData.data || []);
        setRelations(relationsData.data || []);
      } catch (err) {
        console.error("Error fetching character data:", err);
      }

      setLoading(false);
    };

    fetchData();
  }, [character?.id]);

  if (!character) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">选择一个角色查看详情</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">加载中...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white overflow-y-auto">
      {/* 头部 - 角色信息 */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6">
        <div className="flex gap-6 items-start">
          {/* 头像 */}
          <div className="w-32 h-32 rounded-lg overflow-hidden flex-shrink-0 border-4 border-white shadow-lg">
            {character.avatar_url ? (
              <img
                src={character.avatar_url}
                alt={character.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-400 text-2xl">
                👤
              </div>
            )}
          </div>

          {/* 基本信息 */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{character.name}</h1>
            <p className="text-lg opacity-90 mb-4">{character.tagline || "无标语"}</p>
            <p className="text-sm opacity-75">
              创建于 {new Date(character.created_at).toLocaleDateString("zh-CN")}
            </p>
          </div>

          {/* 编辑按钮 */}
          <button className="px-4 py-2 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-gray-100 transition flex-shrink-0">
            编辑
          </button>
        </div>
      </div>

      {/* 内容区 */}
      <div className="p-6 space-y-8 max-w-4xl">
        {/* 描述 */}
        {character.description && (
          <div>
            <h2 className="text-xl font-bold mb-3 text-gray-800">简介</h2>
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {character.description}
            </p>
          </div>
        )}

        {/* 事件时间轴 */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">事件记录</h2>
            {events.length > 0 && (
              <button className="text-sm text-indigo-600 hover:text-indigo-700 font-semibold">
                查看全部 →
              </button>
            )}
          </div>

          {events.length > 0 ? (
            <div className="space-y-4">
              {events.map((event, idx) => (
                <div key={event.id} className="flex gap-4">
                  {/* 时间线 */}
                  <div className="flex flex-col items-center">
                    <div className="w-4 h-4 rounded-full bg-indigo-600 border-2 border-white"></div>
                    {idx < events.length - 1 && (
                      <div className="w-0.5 h-12 bg-gray-300 my-2"></div>
                    )}
                  </div>

                  {/* 事件内容 */}
                  <div className="pb-4 flex-1">
                    <h3 className="font-semibold text-gray-800">{event.title}</h3>
                    {event.content && (
                      <p className="text-sm text-gray-600 mt-1">{event.content}</p>
                    )}
                    {event.image_url && (
                      <img
                        src={event.image_url}
                        alt={event.title}
                        className="w-full h-32 object-cover rounded-lg mt-2"
                      />
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(event.created_at).toLocaleDateString("zh-CN")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">暂无事件记录</p>
          )}
        </div>

        {/* 相册预览 */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">相册</h2>
            {albums.length > 0 && (
              <Link
                href={`/home/albums/${character.id}`}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-semibold"
              >
                进入相册 →
              </Link>
            )}
          </div>

          {albums.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {albums.slice(0, 4).map((album) => (
                <Link
                  key={album.id}
                  href={`/home/albums/${character.id}`}
                  className="relative group cursor-pointer"
                >
                  <div className="aspect-square rounded-lg overflow-hidden bg-gray-200">
                    <img
                      src={album.image_url}
                      alt="Album"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                </Link>
              ))}

              {albums.length > 4 && (
                <Link
                  href={`/home/albums/${character.id}`}
                  className="aspect-square rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition cursor-pointer"
                >
                  <span className="text-gray-600 font-semibold">
                    +{albums.length - 4}
                  </span>
                </Link>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <p className="text-gray-500 mb-4">暂无相册</p>
              <Link
                href={`/home/albums/${character.id}`}
                className="text-indigo-600 hover:text-indigo-700 font-semibold text-sm"
              >
                上传第一张照片 →
              </Link>
            </div>
          )}
        </div>

        {/* 关系档案预览 */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">关系档案</h2>
            {relations.length > 0 && (
              <button className="text-sm text-indigo-600 hover:text-indigo-700 font-semibold">
                查看全部 →
              </button>
            )}
          </div>

          {relations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {relations.map((relation) => (
                <div
                  key={relation.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🔗</span>
                    <div>
                      <p className="font-semibold text-gray-800">
                        关系: {relation.relation_type}
                      </p>
                      <p className="text-sm text-gray-600">
                        角色 ID: {relation.related_character_id}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">暂无关系记录</p>
          )}
        </div>
      </div>
    </div>
  );
}
