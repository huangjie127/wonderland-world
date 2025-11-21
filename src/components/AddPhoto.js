"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AddPhoto({ characterId }) {
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from("character_albums").insert([{
        character_id: characterId,
        image_url: imageUrl,
      }]);
      if (error) throw error;
      setImageUrl("");
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
    <form onSubmit={handleSubmit} className="border p-4 rounded mb-4 space-y-2">
      <input
        type="url"
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
        placeholder="照片URL"
        required
        className="w-full border rounded px-2 py-1"
      />
      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white rounded px-3 py-1 disabled:bg-gray-400"
      >
        {loading ? "添加中..." : "添加照片"}
      </button>
    </form>
  );
}
