"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AddComment({ characterId }) {
  const [author, setAuthor] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from("character_comments").insert([{
        character_id: characterId,
        author,
        content,
      }]);
      if (error) throw error;
      setAuthor("");
      setContent("");
      alert("评论添加成功！");
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
        value={author}
        onChange={(e) => setAuthor(e.target.value)}
        placeholder="你的名字"
        required
        className="w-full border rounded px-2 py-1"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="写评论..."
        required
        className="w-full border rounded px-2 py-1"
        rows="3"
      />
      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white rounded px-3 py-1 disabled:bg-gray-400"
      >
        {loading ? "提交中..." : "提交评论"}
      </button>
    </form>
  );
}
