"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AvatarPage() {
  const [avatarUrl, setAvatarUrl] = useState("");
  const [characterId, setCharacterId] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase
        .from("characters")
        .update({ avatar_url: avatarUrl })
        .eq("id", characterId);
      if (error) throw error;
      alert("头像更新成功！");
      setAvatarUrl("");
    } catch (error) {
      console.error("Error:", error);
      alert("更新失败：" + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-xl mb-4">上传头像</h1>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium mb-1">角色 ID</label>
          <input
            type="number"
            value={characterId}
            onChange={(e) => setCharacterId(Number(e.target.value))}
            className="w-full border rounded px-2 py-1"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">头像 URL</label>
          <input
            type="url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://example.com/avatar.jpg"
            required
            className="w-full border rounded px-2 py-1"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white rounded px-4 py-2 disabled:bg-gray-400"
        >
          {loading ? "更新中..." : "更新头像"}
        </button>
      </form>
    </div>
  );
}
