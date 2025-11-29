"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AddPhoto({ characterId }) {
  const [imageUrl, setImageUrl] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [characterName, setCharacterName] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  useEffect(() => {
    if (characterId) {
      supabase.from("characters").select("name").eq("id", characterId).single()
        .then(({ data }) => {
          if (data) setCharacterName(data.name);
        });
    }
  }, [characterId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let finalImageUrl = imageUrl;

      // 如果选择了文件，先上传到 R2
      if (file) {
        const uploadFormData = new FormData();
        uploadFormData.append("file", file);
        uploadFormData.append("watermarkText", `OCBase ${characterName}`);
        if (!isPublic) {
          uploadFormData.append("skipWatermark", "true");
        }

        const uploadRes = await fetch("/api/upload-watermark", {
          method: "POST",
          body: uploadFormData,
        });

        if (!uploadRes.ok) {
          const errorData = await uploadRes.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to upload image");
        }

        const { publicUrl } = await uploadRes.json();
        finalImageUrl = publicUrl;
      }

      if (!finalImageUrl) {
        alert("请选择照片文件或输入URL");
        setLoading(false);
        return;
      }

      const { error } = await supabase.from("character_albums").insert([{
        character_id: characterId,
        image_url: finalImageUrl,
        is_public: isPublic,
      }]);
      if (error) throw error;
      
      setImageUrl("");
      setFile(null);
      setIsPublic(true);
      alert("照片添加成功！");
      window.location.reload();
    } catch (error) {
      console.error("Error:", error);
      let extraInfo = "";
      if (file) {
        extraInfo = `\n图片格式: ${file.type || file.name || "未知"}`;
        if (file.size) {
          extraInfo += `\n图片大小: ${(file.size / 1024 / 1024).toFixed(2)}MB`;
        }
      }
      alert(`图片上传格式有误${extraInfo}\n${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border p-4 rounded mb-4 space-y-3 bg-gray-50">
      <h3 className="font-bold text-gray-700">添加新照片</h3>
      
      <div>
        <label className="block text-sm text-gray-600 mb-1">上传图片</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded file:border-0
            file:text-sm file:font-semibold
            file:bg-indigo-50 file:text-indigo-700
            hover:file:bg-indigo-100"
        />
      </div>

      <div className="flex items-center gap-2 py-1">
        <input
          type="checkbox"
          id="isPublic"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
          className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
        />
        <label htmlFor="isPublic" className="text-sm text-gray-700 select-none cursor-pointer">
          公开照片 <span className="text-gray-400 text-xs">(公开：所有人可见+水印；私密：仅自己可见+无水印)</span>
        </label>
      </div>

      <div className="text-center text-gray-400 text-xs">- 或 -</div>

      <div>
        <label className="block text-sm text-gray-600 mb-1">图片 URL</label>
        <input
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://..."
          className="w-full border rounded px-2 py-1"
          disabled={!!file}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-indigo-600 text-white rounded px-3 py-2 disabled:bg-gray-400 hover:bg-indigo-700 transition"
      >
        {loading ? "正在上传..." : "添加照片"}
      </button>
    </form>
  );
}
