"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/app/providers";
import Link from "next/link";

export default function AlbumDetailPage() {
  const { characterId } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [character, setCharacter] = useState(null);
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editingDesc, setEditingDesc] = useState("");
  const [lightboxImage, setLightboxImage] = useState(null);
  const [isPublicUpload, setIsPublicUpload] = useState(true);

  const isOwner = user?.id === character?.user_id;

  useEffect(() => {
    const fetchData = async () => {
      if (!characterId || !user) return;

      try {
        // 1. Fetch Character first to determine ownership
        const { data: charData } = await supabase
            .from("characters")
            .select("*")
            .eq("id", characterId)
            .single();

        if (charData) {
            setCharacter(charData);
            const isOwner = user.id === charData.user_id;

            // 2. Fetch Albums with conditional filtering
            let query = supabase
                .from("character_albums")
                .select("*")
                .eq("character_id", characterId)
                .order("created_at", { ascending: false });
            
            if (!isOwner) {
                query = query.eq("is_public", true);
            }

            const { data: albumsData } = await query;
            if (albumsData) setAlbums(albumsData);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      }

      setLoading(false);
    };

    fetchData();
  }, [characterId, user]);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);

    const previews = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      description: "",
    }));
    setFilePreviews(previews);
  };

  const handleUpload = async () => {
    if (!selectedFiles.length || !character) return;

    setUploading(true);

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        
        // 使用新的水印上传 API
        const formData = new FormData();
        formData.append("file", file);
        formData.append("watermarkText", `OCBase ${character.name}`);
        if (!isPublicUpload) {
            formData.append("skipWatermark", "true");
        }

        const uploadRes = await fetch("/api/upload-watermark", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          const errorData = await uploadRes.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to upload image");
        }

        const { publicUrl } = await uploadRes.json();
        const imageUrl = publicUrl;

        // 创建相册记录
        const { error: insertError } = await supabase
          .from("character_albums")
          .insert([
            {
              character_id: character.id,
              image_url: imageUrl,
              description: filePreviews[i]?.description || "",
              is_public: isPublicUpload,
            },
          ]);

        if (insertError) throw insertError;
      }

      // 刷新相册列表
      let query = supabase
        .from("character_albums")
        .select("*")
        .eq("character_id", character.id)
        .order("created_at", { ascending: false });
        
      // Owner is always true here since only owner can upload
      // But for consistency let's just fetch all since we are owner
      
      const { data } = await query;

      setAlbums(data || []);
      setSelectedFiles([]);
      setFilePreviews([]);
      setIsPublicUpload(true);

      alert("上传成功！");
    } catch (err) {
      alert("上传失败：" + err.message);
      console.error("Upload error:", err);
    }

    setUploading(false);
  };

  const handleDeletePhoto = async (albumId) => {
    if (!confirm("确定删除这张照片吗？")) return;

    try {
      const { error } = await supabase
        .from("character_albums")
        .delete()
        .eq("id", albumId);

      if (error) throw error;

      setAlbums((prev) => prev.filter((a) => a.id !== albumId));
    } catch (err) {
      alert("删除失败：" + err.message);
    }
  };

  const handleEditDescription = (album) => {
    setEditingId(album.id);
    setEditingDesc(album.description || "");
  };

  const handleSaveDescription = async (albumId) => {
    try {
      const { error } = await supabase
        .from("character_albums")
        .update({ description: editingDesc })
        .eq("id", albumId);

      if (error) throw error;

      setAlbums((prev) =>
        prev.map((a) =>
          a.id === albumId ? { ...a, description: editingDesc } : a
        )
      );
      setEditingId(null);
      setEditingDesc("");
    } catch (err) {
      alert("保存失败：" + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">加载中...</p>
      </div>
    );
  }

  if (!character) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">角色不存在</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 面包屑导航 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-2 text-sm text-gray-600">
          <Link href="/home" className="hover:text-indigo-600">
            Home
          </Link>
          <span>/</span>
          <span>{character.name}</span>
          <span>/</span>
          <span className="text-gray-800 font-semibold">相册</span>
        </div>
      </div>

      {/* 头部 */}
      <div className="bg-white border-b border-gray-200 px-6 py-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{character.name} 的相册</h1>
          <p className="text-gray-600">
            共 {albums.length} 张照片
          </p>
        </div>
      </div>

      {/* 内容区 */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* 上传区域 */}
        {isOwner && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">上传新照片</h2>

            {/* 拖拽上传 */}
            <label className="block border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition relative">
              <div className="text-4xl mb-3">📷</div>
              <p className="text-gray-700 font-semibold mb-1">点击或拖拽上传照片</p>
              <p className="text-sm text-gray-500">支持多张上传，推荐尺寸 1200x800px</p>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </label>

            {/* 公开选项 */}
            {selectedFiles.length > 0 && (
                <div className="mt-4 flex items-center gap-2">
                    <input
                    type="checkbox"
                    id="isPublicUpload"
                    checked={isPublicUpload}
                    onChange={(e) => setIsPublicUpload(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <label htmlFor="isPublicUpload" className="text-sm text-gray-700 select-none cursor-pointer">
                    公开照片 <span className="text-gray-400 text-xs">(公开：所有人可见+水印；私密：仅自己可见+无水印)</span>
                    </label>
                </div>
            )}

            {/* 预览 */}
            {filePreviews.length > 0 && (
              <div className="mt-6">
                <p className="font-semibold mb-4">预览（{filePreviews.length}张）</p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filePreviews.map((item, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="relative group">
                        <img
                          src={item.preview}
                          alt="Preview"
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <button
                          onClick={() => {
                            setFilePreviews((prev) => prev.filter((_, i) => i !== idx));
                            setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
                          }}
                          className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                        >
                          ✕
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="添加描述..."
                        value={item.description}
                        onChange={(e) => {
                          const newPreviews = [...filePreviews];
                          newPreviews[idx].description = e.target.value;
                          setFilePreviews(newPreviews);
                        }}
                        className="w-full text-sm px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="mt-4 w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 font-semibold transition"
                >
                  {uploading ? "上传中..." : "确认上传"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* 相册网格 */}
        <div>
          <h2 className="text-xl font-bold mb-6">我的照片</h2>
          {albums.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {albums.map((album) => (
                <div
                  key={album.id}
                  className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:border-indigo-300 transition group"
                >
                  <div 
                    className="aspect-video bg-gray-200 overflow-hidden relative cursor-pointer"
                    onClick={() => setLightboxImage(album.image_url)}
                  >
                    <img
                      src={album.image_url}
                      alt="Album"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />

                    {/* 删除按钮 */}
                    {isOwner && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePhoto(album.id);
                        }}
                        className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition hover:bg-red-700"
                      >
                        🗑️
                      </button>
                    )}
                  </div>

                  <div className="p-4">
                    {editingId === album.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editingDesc}
                          onChange={(e) => setEditingDesc(e.target.value)}
                          placeholder="输入描述..."
                          className="w-full text-sm px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                          rows="3"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveDescription(album.id)}
                            className="flex-1 text-sm bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700 transition"
                          >
                            保存
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="flex-1 text-sm bg-gray-300 text-gray-700 px-2 py-1 rounded hover:bg-gray-400 transition"
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        {album.description ? (
                          <p className="text-sm text-gray-700 mb-2 line-clamp-2">{album.description}</p>
                        ) : (
                          <p className="text-sm text-gray-400 mb-2 italic">暂无描述</p>
                        )}
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-500">
                            {new Date(album.created_at).toLocaleDateString("zh-CN")}
                          </p>
                          {isOwner && (
                            <button
                              onClick={() => handleEditDescription(album)}
                              className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold"
                            >
                              编辑
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg">
              <p className="text-gray-500 mb-4">暂无照片</p>
              {isOwner && <p className="text-sm text-gray-400">上传第一张照片来开始记录吧</p>}
            </div>
          )}
        </div>
      </div>

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
