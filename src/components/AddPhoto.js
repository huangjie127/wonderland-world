"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AddPhoto({ characterId }) {
  const [imageUrl, setImageUrl] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let finalImageUrl = imageUrl;

      // 如果选择了文件，先上传到 R2
      if (file) {
        const fileExt = file.name.split(".").pop();
        const fileName = `albums/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

        // 1. 获取预签名 URL
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: fileName,
            contentType: file.type,
          }),
        });

        if (!uploadRes.ok) throw new Error("Failed to get upload URL");

        const { uploadUrl, publicUrl } = await uploadRes.json();

        // 2. 上传文件
        const putRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!putRes.ok) throw new Error("Failed to upload image");

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
      }]);
      if (error) throw error;
      
      setImageUrl("");
      setFile(null);
      alert("照片添加成功！");
      window.location.reload();
    } catch (error) {
      console.error("Error:", error);
      alert("添加失败：" + error.message);
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
