"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AddEvent({ characterId }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
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
        const fileName = `events/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

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

      const { error } = await supabase.from("character_event_logs").insert([{
        character_id: characterId,
        title,
        content,
        image_url: finalImageUrl || null,
      }]);
      if (error) throw error;
      
      setTitle("");
      setContent("");
      setImageUrl("");
      setFile(null);
      alert("事件添加成功！");
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
      <h3 className="font-bold text-gray-700">记录新事件</h3>
      
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="事件标题"
        required
        className="w-full border rounded px-2 py-2"
      />
      
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="事件描述..."
        required
        className="w-full border rounded px-2 py-2"
        rows="3"
      />

      <div>
        <label className="block text-sm text-gray-600 mb-1">配图 (可选)</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded file:border-0
            file:text-sm file:font-semibold
            file:bg-indigo-50 file:text-indigo-700
            hover:file:bg-indigo-100 mb-2"
        />
        <input
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="或输入图片 URL"
          className="w-full border rounded px-2 py-1 text-sm"
          disabled={!!file}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-indigo-600 text-white rounded px-3 py-2 disabled:bg-gray-400 hover:bg-indigo-700 transition"
      >
        {loading ? "正在保存..." : "添加事件"}
      </button>
    </form>
  );
}
