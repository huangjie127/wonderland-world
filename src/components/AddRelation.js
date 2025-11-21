"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AddRelation({ characterId, allCharacters }) {
  const [relatedCharacterId, setRelatedCharacterId] = useState("");
  const [relationType, setRelationType] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from("character_relations").insert([{
        character_id: characterId,
        related_character_id: parseInt(relatedCharacterId),
        relation_type: relationType,
      }]);
      if (error) throw error;
      setRelatedCharacterId("");
      setRelationType("");
      alert("关系添加成功！");
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
      <select
        value={relatedCharacterId}
        onChange={(e) => setRelatedCharacterId(e.target.value)}
        required
        className="w-full border rounded px-2 py-1"
      >
        <option value="">选择相关角色</option>
        {allCharacters?.map(c => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <input
        type="text"
        value={relationType}
        onChange={(e) => setRelationType(e.target.value)}
        placeholder="关系类型 (如：朋友、敌人、家人)"
        required
        className="w-full border rounded px-2 py-1"
      />
      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white rounded px-3 py-1 disabled:bg-gray-400"
      >
        {loading ? "添加中..." : "添加关系"}
      </button>
    </form>
  );
}
