"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/app/providers";
import RelationshipDialog from "./RelationshipDialog";
import RelationshipGraph from "./RelationshipGraph";
import AddEventDialog from "./AddEventDialog";
import InteractionDialog from "./InteractionDialog";

export default function CharacterDetail({ character, onCharacterUpdated, onCharacterDeleted, onCharacterSelect }) {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [relations, setRelations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showRelationDialog, setShowRelationDialog] = useState(false);
  const [showAddEventDialog, setShowAddEventDialog] = useState(false);
  const [showInteractionDialog, setShowInteractionDialog] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: "",
    tagline: "",
    description: "",
    avatar: null,
    avatarPreview: null,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!character) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);

      try {
        // 加载新的事件系统数据
        const [selfEventsData, interactionsData, albumsData] = await Promise.all([
          supabase
            .from("character_events")
            .select("*")
            .eq("character_id", character.id)
            .order("created_at", { ascending: false })
            .limit(10),
          supabase
            .from("character_interactions")
            .select("*")
            .eq("host_character_id", character.id)
            .order("created_at", { ascending: false })
            .limit(10),
          supabase
            .from("character_albums")
            .select("*")
            .eq("character_id", character.id)
            .order("created_at", { ascending: false })
            .limit(4),
        ]);

        // 合并自定义事件和互动事件，按时间排序
        const allEvents = [];
        
        (selfEventsData.data || []).forEach((evt) => {
          allEvents.push({
            ...evt,
            eventType: "SELF",
            emoji: "📘",
          });
        });

        (interactionsData.data || []).forEach((interaction) => {
          allEvents.push({
            ...interaction,
            eventType: "INTERACTION",
            emoji: "🌟",
          });
        });

        allEvents.sort(
          (a, b) =>
            new Date(b.created_at) - new Date(a.created_at)
        );

        setEvents(allEvents.slice(0, 8)); // 显示最多 8 条
        setAlbums(albumsData.data || []);
      } catch (err) {
        console.error("Error fetching character data:", err);
      }

      setLoading(false);
    };

    fetchData();
  }, [character?.id]);

  // 初始化编辑表单
  const handleEditClick = () => {
    setEditFormData({
      name: character.name,
      tagline: character.tagline || "",
      description: character.description || "",
      avatar: null,
      avatarPreview: character.avatar_url,
    });
    setIsEditing(true);
    setError("");
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditFormData((prev) => ({
        ...prev,
        avatar: file,
        avatarPreview: URL.createObjectURL(file),
      }));
    }
  };

  const handleSaveEdit = async () => {
    if (!editFormData.name.trim()) {
      setError("角色名称不能为空");
      return;
    }

    setSaving(true);
    setError("");

    try {
      let newAvatarUrl = character.avatar_url;

      // 上传新头像（如果选择了）
      if (editFormData.avatar) {
        const fileExt = editFormData.avatar.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, editFormData.avatar, {
            upsert: false,
            contentType: editFormData.avatar.type,
          });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
        newAvatarUrl = data?.publicUrl;
      }

      // 更新角色信息
      const { error: updateError } = await supabase
        .from("characters")
        .update({
          name: editFormData.name,
          tagline: editFormData.tagline,
          description: editFormData.description,
          avatar_url: newAvatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", character.id);

      if (updateError) throw updateError;

      // 通知父组件更新
      if (onCharacterUpdated) {
        onCharacterUpdated({
          ...character,
          name: editFormData.name,
          tagline: editFormData.tagline,
          description: editFormData.description,
          avatar_url: newAvatarUrl,
        });
      }

      setIsEditing(false);
    } catch (err) {
      setError(err.message || "更新失败");
      console.error("Update error:", err);
    }

    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm("确定要删除这个角色吗？所有相关数据（事件、相册等）也会被删除。")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("characters")
        .delete()
        .eq("id", character.id);

      if (error) throw error;

      if (onCharacterDeleted) {
        onCharacterDeleted(character.id);
      }
    } catch (err) {
      alert("删除失败：" + err.message);
      console.error("Delete error:", err);
    }
  };

  const handleRelationshipSubmit = async (relationshipData) => {
    try {
      const { error } = await supabase
        .from("character_relationship_requests")
        .insert([
          {
            from_character_id: relationshipData.from_character_id,
            to_character_id: relationshipData.to_character_id,
            from_role: relationshipData.from_role,
            to_role: relationshipData.to_role,
            status: "pending",
          },
        ]);

      if (error) throw error;

      alert("关系申请已发送！");
      setShowRelationDialog(false);
    } catch (err) {
      alert("发送失败：" + err.message);
      console.error("Relationship error:", err);
    }
  };

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

  // 编辑模式
  if (isEditing) {
    return (
      <div className="flex-1 bg-white overflow-y-auto p-6">
        <div className="max-w-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">编辑角色信息</h2>
            <button
              onClick={() => setIsEditing(false)}
              className="text-gray-600 hover:text-gray-800 text-2xl"
            >
              ✕
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {/* 头像 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                角色头像
              </label>
              <div className="flex items-center gap-4">
                {editFormData.avatarPreview && (
                  <img
                    src={editFormData.avatarPreview}
                    alt="Preview"
                    className="w-32 h-32 object-cover rounded-lg border-2 border-gray-200"
                  />
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-indigo-50 file:text-indigo-700
                      hover:file:bg-indigo-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    留空保持原头像，选择新文件替换
                  </p>
                </div>
              </div>
            </div>

            {/* 角色名称 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                角色名称 *
              </label>
              <input
                type="text"
                name="name"
                value={editFormData.name}
                onChange={handleEditInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* 标语 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                标语
              </label>
              <input
                type="text"
                name="tagline"
                value={editFormData.tagline}
                onChange={handleEditInputChange}
                placeholder="一句话简介"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* 描述 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                描述
              </label>
              <textarea
                name="description"
                value={editFormData.description}
                onChange={handleEditInputChange}
                placeholder="详细描述角色信息"
                rows="6"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 font-semibold transition"
              >
                {saving ? "保存中..." : "保存更改"}
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 font-semibold transition"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold transition"
              >
                🗑️ 删除
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 查看模式
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
          <button
            onClick={handleEditClick}
            className="px-4 py-2 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-gray-100 transition flex-shrink-0"
          >
            ✏️ 编辑
          </button>

          {/* Connect 按钮 */}
          <button
            onClick={() => setShowRelationDialog(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition flex-shrink-0"
          >
            🔗 Connect
          </button>
        </div>
      </div>

      {/* 关系对话框 */}
      <RelationshipDialog
        isOpen={showRelationDialog}
        onClose={() => setShowRelationDialog(false)}
        onSubmit={handleRelationshipSubmit}
        targetCharacterId={character.id}
        targetCharacterName={character.name}
      />

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
            <h2 className="text-xl font-bold text-gray-800">📖 事件 & 留言</h2>
            <div className="flex gap-2">
              {character.user_id === user?.id && (
                <button
                  onClick={() => setShowAddEventDialog(true)}
                  className="text-sm px-3 py-1 bg-indigo-100 text-indigo-600 rounded hover:bg-indigo-200 font-semibold"
                >
                  📝 记录
                </button>
              )}
              <button
                onClick={() => setShowInteractionDialog(true)}
                className="text-sm px-3 py-1 bg-purple-100 text-purple-600 rounded hover:bg-purple-200 font-semibold"
              >
                💬 留言
              </button>
            </div>
          </div>

          {events.length > 0 ? (
            <div className="space-y-3">
              {events.map((event, idx) => {
                const isSelfEvent = event.eventType === "SELF";
                return (
                  <div key={event.id} className="flex gap-3">
                    {/* 时间线 */}
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className={`w-3 h-3 rounded-full border-2 border-white ${
                        isSelfEvent ? "bg-indigo-500" : "bg-purple-500"
                      }`}></div>
                      {idx < events.length - 1 && (
                        <div className="w-0.5 h-10 bg-gray-300 my-1"></div>
                      )}
                    </div>

                    {/* 事件卡片 */}
                    <div className="pb-3 flex-1 bg-gray-50 rounded-lg p-3 border-l-4 border-gray-300 hover:border-indigo-400 transition">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {isSelfEvent ? (
                            <>
                              <h3 className="font-semibold text-gray-800">
                                {event.emoji} {event.type ? `【${event.type}】` : "记录"}
                              </h3>
                              <p className="text-sm text-gray-700 mt-1 leading-relaxed">
                                {event.content}
                              </p>
                            </>
                          ) : (
                            <>
                              <h3 className="font-semibold text-purple-700">
                                {event.emoji} 有人来访
                              </h3>
                              <p className="text-sm text-gray-700 mt-1 leading-relaxed italic">
                                "{event.content}"
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(event.created_at).toLocaleDateString("zh-CN")}
                      </p>
                    </div>
                  </div>
                );
              })}
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

        {/* 关系图谱 */}
        <div>
          <RelationshipGraph
            characterId={character.id}
            characterName={character.name}
            characterAvatar={character.avatar_url}
            onCharacterSelect={onCharacterSelect}
          />
        </div>
      </div>

      {/* 事件对话框 */}
      <AddEventDialog
        isOpen={showAddEventDialog}
        onClose={() => setShowAddEventDialog(false)}
        characterId={character.id}
        characterName={character.name}
        onEventAdded={() => {
          setShowAddEventDialog(false);
          fetchData();
        }}
      />

      {/* 互动对话框 */}
      <InteractionDialog
        isOpen={showInteractionDialog}
        onClose={() => setShowInteractionDialog(false)}
        hostCharacterId={character.id}
        hostCharacterName={character.name}
        onInteractionAdded={() => {
          setShowInteractionDialog(false);
          fetchData();
        }}
      />
    </div>
  );
}
