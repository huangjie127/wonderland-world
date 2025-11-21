"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AddEvent({ characterId }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from("character_event_logs").insert([{
        character_id: characterId,
        title,
        content,
        image_url: imageUrl || null,
      }]);
      if (error) throw error;
      setTitle("");
      setContent("");
      setImageUrl("");
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
    <form onSubmit={handleSubmit} className="border p-4 rounded mb-4 space-y-2">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="事件标题"
        required
        className="w-full border rounded px-2 py-1"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="事件描述"
        required
        className="w-full border rounded px-2 py-1"
        rows="3"
      />
      <input
        type="url"
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
        placeholder="图片URL (可选)"
        className="w-full border rounded px-2 py-1"
      />
      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white rounded px-3 py-1 disabled:bg-gray-400"
      >
        {loading ? "添加中..." : "添加事件"}
      </button>
    </form>
  );
}
