"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/app/providers";
import RelationshipDialog from "./RelationshipDialog";
import RelationshipGraph from "./RelationshipGraph";
import AddEventDialog from "./AddEventDialog";
import InteractionDialog from "./InteractionDialog";
import CommentListDialog from "./CommentListDialog";
import ImageCropper from "./ImageCropper";
import LikeButton from "./LikeButton";

export default function CharacterDetail({ character, onCharacterUpdated, onCharacterDeleted, onCharacterSelect, onBack }) {
  const { user } = useAuth();
  const isOwner = user?.id === character?.user_id;
  
  const [selfEvents, setSelfEvents] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [relations, setRelations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showRelationDialog, setShowRelationDialog] = useState(false);
  const [showAddEventDialog, setShowAddEventDialog] = useState(false);
  const [showInteractionDialog, setShowInteractionDialog] = useState(false);
  const [showCommentListDialog, setShowCommentListDialog] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [tempAvatarSrc, setTempAvatarSrc] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null); // Lightbox state
  const [activeTab, setActiveTab] = useState("events"); // events | interactions
  const [editFormData, setEditFormData] = useState({
    name: "",
    tagline: "",
    description: "",
    avatar: null,
    avatarPreview: null,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchData = async () => {
    if (!character) return;
    setLoading(true);

    try {
      // 构建查询
      let eventsQuery = supabase
        .from("character_events")
        .select("*")
        .eq("character_id", character.id)
        .order("created_at", { ascending: false })
        .limit(3);

      let albumsQuery = supabase
        .from("character_albums")
        .select("*")
        .eq("character_id", character.id)
        .order("created_at", { ascending: false })
        .limit(4);

      // 如果不是拥有者，只显示公开内容
      // 注意：user 可能为 null (未登录)，此时 isOwner 为 false，正确
      const isOwner = user?.id === character?.user_id;
      if (!isOwner) {
        eventsQuery = eventsQuery.eq("is_public", true);
        albumsQuery = albumsQuery.eq("is_public", true);
      }

      // 加载新的事件系统数据
      const [selfEventsData, interactionsData, albumsData] = await Promise.all([
        eventsQuery,
        supabase
          .from("character_interactions")
          .select(`
            *,
            guest:characters!guest_character_id(name, avatar_url)
          `)
          .eq("host_character_id", character.id)
          .is("event_id", null) // 只获取留言板内容，不获取事件评论
          .order("created_at", { ascending: false })
          .limit(3), // 只获取最新的3条作为预览
        albumsQuery,
      ]);

      setSelfEvents(selfEventsData.data || []);
      setInteractions(interactionsData.data || []);
      setAlbums(albumsData.data || []);
    } catch (err) {
      console.error("Error fetching character data:", err);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    setIsEditing(false);
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
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setTempAvatarSrc(reader.result);
        setShowCropper(true);
      });
      reader.readAsDataURL(file);
      // Reset input value so same file can be selected again
      e.target.value = null;
    }
  };

  const handleCropComplete = (croppedBlob) => {
    if (croppedBlob) {
      const file = new File([croppedBlob], "avatar.jpg", { type: "image/jpeg" });
      setEditFormData((prev) => ({
        ...prev,
        avatar: file,
        avatarPreview: URL.createObjectURL(croppedBlob),
      }));
    }
    setShowCropper(false);
    setTempAvatarSrc(null);
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
        const file = editFormData.avatar;
        
        const uploadFormData = new FormData();
        uploadFormData.append("file", file);
        uploadFormData.append("watermarkText", `OCBase ${editFormData.name}`);

        const uploadRes = await fetch("/api/upload-watermark", {
          method: "POST",
          body: uploadFormData,
        });

        if (!uploadRes.ok) {
          const errorData = await uploadRes.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to upload image");
        }

        const { publicUrl } = await uploadRes.json();
        newAvatarUrl = publicUrl;
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
      // 如果是自己的角色，直接通过；否则为 pending
      const status = isOwner ? "accepted" : "pending";
      
      const { error } = await supabase
        .from("character_relationship_requests")
        .insert([
          {
            from_character_id: relationshipData.from_character_id,
            to_character_id: relationshipData.to_character_id,
            from_role: relationshipData.from_role,
            to_role: relationshipData.to_role,
            status: status,
          },
        ]);

      if (error) throw error;

      alert(isOwner ? "关系已建立！" : "关系申请已发送！");
      setShowRelationDialog(false);
      // 刷新数据以显示新关系
      fetchData();
    } catch (err) {
      alert("操作失败：" + err.message);
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
      <div className="flex-1 bg-white/90 backdrop-blur-sm overflow-y-auto p-6 rounded-xl shadow-sm">
        <div className="max-w-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold font-serif text-gray-800">编辑角色信息</h2>
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
                    className="w-32 h-32 object-cover rounded border border-gray-200"
                  />
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded file:border file:border-gray-300
                      file:text-sm file:font-semibold
                      file:bg-white file:text-gray-700
                      hover:file:bg-gray-50"
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
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="flex-1 bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 disabled:bg-gray-400 font-semibold transition"
              >
                {saving ? "保存中..." : "保存更改"}
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="flex-1 bg-gray-200 text-gray-800 py-2 rounded hover:bg-gray-300 font-semibold transition"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-semibold transition"
              >
                🗑️ 删除
              </button>
            </div>
          </div>
        </div>

        {/* 图片裁剪器 - 必须包含在编辑模式的渲染中 */}
        {showCropper && tempAvatarSrc && (
          <ImageCropper
            imageSrc={tempAvatarSrc}
            onCropComplete={handleCropComplete}
            onCancel={() => {
              setShowCropper(false);
              setTempAvatarSrc(null);
            }}
          />
        )}
      </div>
    );
  }

  // 查看模式
  return (
    <div className="flex-1 bg-white/80 backdrop-blur-md overflow-y-auto pb-20 md:pb-0 rounded-xl shadow-sm border border-white/50">
      {/* 头部 - 角色信息 */}
      <div className="bg-gradient-to-r from-pink-100/80 via-purple-100/80 to-indigo-100/80 text-gray-800 p-6 relative">
        {/* Mobile Back Button */}
        <button 
            onClick={onBack}
            className="md:hidden absolute top-4 left-4 text-gray-600 p-2 hover:bg-white/40 rounded-full z-10"
        >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
        </button>

        <div className="flex flex-col md:flex-row gap-6 items-center md:items-start pt-8 md:pt-0">
          {/* 头像 */}
          <div className="w-32 h-32 rounded-2xl overflow-hidden flex-shrink-0 border-4 border-white/50 shadow-lg">
            {character.avatar_url ? (
              <img
                src={character.avatar_url}
                alt={character.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-white/50 text-2xl">
                👤
              </div>
            )}
          </div>

          {/* 基本信息 */}
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl font-bold font-serif mb-2 text-gray-900">{character.name}</h1>
            <p className="text-lg text-gray-700 mb-4 font-serif italic">{character.tagline || "无标语"}</p>
            <p className="text-sm text-gray-500">
              创建于 {new Date(character.created_at).toLocaleDateString("zh-CN")}
            </p>
          </div>
          
          {/* Actions Row for Mobile (below info) or Desktop (right side) */}
          <div className="flex flex-wrap justify-center gap-2 mt-2 md:mt-0">
             {/* 编辑按钮 */}
            {isOwner && (
                <button
                onClick={handleEditClick}
                className="px-4 py-2 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-gray-100 transition flex-shrink-0 shadow-sm"
                >
                ✏️ 编辑
                </button>
            )}

            {/* Connect 按钮 */}
            {user && (
                <button
                onClick={() => setShowRelationDialog(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition flex-shrink-0 shadow-sm border border-purple-400"
                >
                🔗 Connect
                </button>
            )}

            {/* 点赞按钮 */}
            <LikeButton characterId={character.id} ownerId={character.user_id} />
          </div>
        </div>
      </div>

      {/* 关系对话框 */}
      <RelationshipDialog
        isOpen={showRelationDialog}
        onClose={() => setShowRelationDialog(false)}
        onSubmit={handleRelationshipSubmit}
        targetCharacterId={character.id}
        targetCharacterName={character.name}
        isTargetOwner={isOwner}
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

        {/* 事件与留言板块 */}
        <div>
          <div className="flex items-center justify-between mb-4 border-b border-gray-200">
            <div className="flex gap-6">
              <button
                onClick={() => setActiveTab("events")}
                className={`pb-3 font-bold text-lg transition ${
                  activeTab === "events"
                    ? "text-indigo-600 border-b-2 border-indigo-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                📖 个人事件
              </button>
              <button
                onClick={() => setActiveTab("interactions")}
                className={`pb-3 font-bold text-lg transition ${
                  activeTab === "interactions"
                    ? "text-purple-600 border-b-2 border-purple-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                💬 访客留言
              </button>
            </div>
            
            <div>
              {activeTab === "interactions" && (
                <button
                  onClick={() => setShowInteractionDialog(true)}
                  className="text-sm px-3 py-1 bg-purple-100 text-purple-600 rounded hover:bg-purple-200 font-semibold"
                >
                  💬 我要留言
                </button>
              )}
            </div>
          </div>

          {/* 个人事件列表 */}
          {activeTab === "events" && (
            <div className="mt-2">
              {selfEvents.length > 0 ? (
                <>
                  {selfEvents.map((event) => {
                    // 提取类型和内容
                    const typeMatch = event.content.match(/^\[(.*?)\]/);
                    const type = typeMatch ? typeMatch[1] : "记录";
                    const rawContent = event.content.replace(/^\[.*?\]\s*/, "");
                    // 优先使用 title，否则截取内容
                    const title = event.title || (rawContent.length > 20 
                      ? rawContent.substring(0, 20) + "..." 
                      : rawContent);

                    // 根据类型选择 emoji
                    let emoji = "📘";
                    if (type === "worldview") emoji = "🌍";
                    if (type === "story") emoji = "📖";
                    if (type === "mood") emoji = "📝";
                    if (type === "timeline") emoji = "⏰";

                    return (
                      <div
                        key={event.id}
                        className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 group hover:bg-gray-50 rounded px-2 -mx-2 transition-all duration-200 hover:scale-[1.01]"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-lg leading-none flex-shrink-0 opacity-80" title={type}>{emoji}</span>
                          <span className="text-sm text-gray-700 truncate group-hover:text-indigo-600 transition-colors">
                            {title}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400 flex-shrink-0 ml-4 font-mono">
                          {new Date(event.created_at).toLocaleDateString("zh-CN")}
                        </span>
                      </div>
                    );
                  })}
                  {user && (
                    <div className="text-center pt-2">
                      <Link 
                        href={`/home/events?characterId=${character.id}`}
                        className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        点击查看更多
                      </Link>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  <p className="text-gray-500 text-sm">暂无个人事件记录</p>
                  {character.user_id === user?.id && (
                    <Link 
                      href={`/home/events?characterId=${character.id}`}
                      className="mt-2 inline-block text-indigo-600 text-sm font-semibold hover:underline"
                    >
                      前往事件簿添加记录
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 访客留言板 */}
          {activeTab === "interactions" && (
            <div className="mt-2">
              {interactions.length > 0 ? (
                <div className="space-y-2">
                  {interactions.map((interaction) => (
                    <div 
                      key={interaction.id} 
                      onClick={() => setShowCommentListDialog(true)}
                      className="flex gap-3 py-3 border-b border-gray-100 last:border-0 group hover:bg-gray-50 px-2 -mx-2 rounded transition-all duration-200 hover:scale-[1.01] cursor-pointer"
                    >
                      {/* 访客头像 */}
                      <div className="flex-shrink-0 pt-1">
                        {interaction.guest?.avatar_url ? (
                          <img 
                            src={interaction.guest.avatar_url} 
                            alt={interaction.guest.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-400">
                            👤
                          </div>
                        )}
                      </div>
                      
                      {/* 留言内容 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between mb-1">
                          <span className="font-medium text-sm text-gray-900 truncate">
                            {interaction.guest?.name || "未知访客"}
                          </span>
                          <span className="text-xs text-gray-400 font-mono flex-shrink-0 ml-2">
                            {new Date(interaction.created_at).toLocaleString("zh-CN", {
                              month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit"
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed break-words line-clamp-2">
                          {interaction.content}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  <button
                    onClick={() => setShowCommentListDialog(true)}
                    className="w-full py-3 text-center text-indigo-600 font-medium text-sm bg-indigo-50 hover:bg-indigo-100 rounded-lg transition mt-4"
                  >
                    查看全部留言 / 回复
                  </button>
                </div>
              ) : (
                <div className="text-center py-12 border border-dashed border-gray-200 rounded-lg bg-gray-50">
                  <p className="text-gray-400 text-sm mb-2">还没有人来留言...</p>
                  <button
                    onClick={() => setShowInteractionDialog(true)}
                    className="text-indigo-600 font-semibold text-sm hover:underline"
                  >
                    成为第一个访客
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 相册预览 */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">相册</h2>
            {albums.length > 0 && user && (
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
                <div
                  key={album.id}
                  className="relative group cursor-pointer"
                  onClick={() => setLightboxImage(album.image_url)}
                >
                  <div className="aspect-square rounded-lg overflow-hidden bg-gray-200">
                    <img
                      src={album.image_url}
                      alt="Album"
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                  </div>
                </div>
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
              {isOwner && (
                <Link
                  href={`/home/albums/${character.id}`}
                  className="text-indigo-600 hover:text-indigo-700 font-semibold text-sm"
                >
                  上传第一张照片 →
                </Link>
              )}
            </div>
          )}
        </div>

        {/* 关系图谱 */}
        {user ? (
          <div>
            <RelationshipGraph
              characterId={character.id}
              characterName={character.name}
              characterAvatar={character.avatar_url}
              onCharacterSelect={onCharacterSelect}
              isOwner={isOwner}
            />
          </div>
        ) : (
          <div className="bg-white/50 backdrop-blur-sm rounded-xl p-12 text-center border border-white/60 shadow-sm">
            <div className="text-4xl mb-3">🕸️</div>
            <p className="text-gray-600 font-medium mb-2">登录后查看角色关系图谱</p>
            <p className="text-sm text-gray-500 mb-4">探索角色之间错综复杂的羁绊</p>
            <Link 
              href="/auth/login" 
              className="inline-block px-6 py-2 bg-indigo-600/90 text-white rounded-lg font-semibold hover:bg-indigo-700 transition shadow-sm"
            >
              立即登录
            </Link>
          </div>
        )}
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
          fetchData(); // 刷新数据
        }}
      />

      {/* 留言列表弹窗 */}
      <CommentListDialog
        isOpen={showCommentListDialog}
        onClose={() => setShowCommentListDialog(false)}
        hostCharacterId={character.id}
        hostCharacterName={character.name}
      />

      {/* 图片裁剪器 */}
      {showCropper && tempAvatarSrc && (
        <ImageCropper
          imageSrc={tempAvatarSrc}
          onCropComplete={handleCropComplete}
          onCancel={() => {
            setShowCropper(false);
            setTempAvatarSrc(null);
          }}
        />
      )}

      {/* Lightbox */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button 
            className="absolute top-4 right-4 text-white text-4xl hover:text-gray-300"
            onClick={() => setLightboxImage(null)}
          >
            &times;
          </button>
          <img 
            src={lightboxImage} 
            alt="Full size" 
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}
    </div>
  );
}
