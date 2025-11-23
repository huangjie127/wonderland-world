"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/app/providers";
import { useRouter } from "next/navigation";

export default function CreateCharacter({ onCreated }) {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    tagline: "",
    description: "",
    avatar: null,
    avatarPreview: null,
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({
        ...prev,
        avatar: file,
        avatarPreview: URL.createObjectURL(file),
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!user) {
      setError("请先登录");
      setLoading(false);
      return;
    }

    if (!formData.name) {
      setError("角色名称不能为空");
      setLoading(false);
      return;
    }

    try {
      let avatarUrl = null;

      // 上传头像到 Storage
      if (formData.avatar) {
        setUploading(true);
        const fileExt = formData.avatar.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, formData.avatar, {
            upsert: false,
            contentType: formData.avatar.type,
          });

        if (uploadError) throw uploadError;

        // 获取公开 URL
        const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
        avatarUrl = data?.publicUrl;
        setUploading(false);
      }

      // 创建角色记录
      const { data: character, error: insertError } = await supabase
        .from("characters")
        .insert([
          {
            name: formData.name,
            tagline: formData.tagline,
            description: formData.description,
            avatar_url: avatarUrl,
            user_id: user.id,
          },
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      setFormData({
        name: "",
        tagline: "",
        description: "",
        avatar: null,
        avatarPreview: null,
      });

      if (onCreated) {
        onCreated(character);
      } else {
        router.push(`/archive/${character.id}`);
      }
    } catch (err) {
      setError(err.message || "创建角色失败");
      console.error("Create character error:", err);
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-2xl font-bold mb-6">创建新角色</h2>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* 头像上传 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">角色头像</label>
          <div className="flex items-center gap-4">
            {formData.avatarPreview && (
              <img
                src={formData.avatarPreview}
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
              <p className="text-xs text-gray-500 mt-1">推荐尺寸: 400x400px, 最大 5MB</p>
            </div>
          </div>
        </div>

        {/* 角色名称 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">角色名称 *</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="输入角色名称"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* 标语 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">标语</label>
          <input
            type="text"
            name="tagline"
            value={formData.tagline}
            onChange={handleInputChange}
            placeholder="一句话简介"
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* 描述 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="详细描述角色信息"
            rows="4"
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* 提交按钮 */}
        <button
          type="submit"
          disabled={loading || uploading}
          className="w-full bg-indigo-600 text-white font-semibold py-2 rounded hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors btn-feedback"
        >
          {uploading ? "上传头像中..." : loading ? "创建中..." : "创建角色"}
        </button>
      </div>
    </form>
  );
}
