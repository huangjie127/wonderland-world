"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function LikeButton({ characterId, initialCount }) {
  const [likeCount, setLikeCount] = useState(initialCount);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLike = async () => {
    setLoading(true);
    try {
      if (liked) {
        const { error } = await supabase
          .from("character_likes")
          .delete()
          .eq("character_id", characterId);
        if (error) throw error;
        setLikeCount(prev => prev - 1);
        setLiked(false);
      } else {
        const { error } = await supabase.from("character_likes").insert([{
          character_id: characterId,
        }]);
        if (error) throw error;
        setLikeCount(prev => prev + 1);
        setLiked(true);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("操作失败：" + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLike}
      disabled={loading}
      className={`px-4 py-2 rounded font-medium transition-colors ${
        liked
          ? "bg-red-600 text-white hover:bg-red-700"
          : "bg-gray-200 text-gray-800 hover:bg-gray-300"
      } disabled:opacity-50`}
    >
      ❤️ {likeCount}
    </button>
  );
}
