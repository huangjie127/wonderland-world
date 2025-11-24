"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/app/providers";

export default function LikeButton({ characterId, ownerId }) {
  const { user } = useAuth();
  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Check if current user is the owner
  const isOwner = user?.id === ownerId;

  useEffect(() => {
    const fetchLikeStatus = async () => {
      try {
        // Get total count
        const { count, error: countError } = await supabase
          .from("character_likes")
          .select("*", { count: "exact", head: true })
          .eq("character_id", characterId);
        
        if (countError) throw countError;
        setLikeCount(count || 0);

        // Get user like status if logged in
        if (user) {
          const { data, error: likeError } = await supabase
            .from("character_likes")
            .select("id")
            .eq("character_id", characterId)
            .eq("user_id", user.id)
            .single();
          
          if (likeError && likeError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
             console.error("Error checking like status:", likeError);
          }
          setIsLiked(!!data);
        }
      } catch (err) {
        console.error("Error fetching likes:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLikeStatus();
  }, [characterId, user]);

  const handleToggleLike = async () => {
    if (!user) return; 
    if (isOwner) return; 
    if (actionLoading) return;

    setActionLoading(true);
    const previousLiked = isLiked;
    const previousCount = likeCount;

    // Optimistic update
    setIsLiked(!previousLiked);
    setLikeCount(previousLiked ? previousCount - 1 : previousCount + 1);

    try {
      if (previousLiked) {
        // Unlike
        const { error } = await supabase
          .from("character_likes")
          .delete()
          .eq("character_id", characterId)
          .eq("user_id", user.id);
        
        if (error) throw error;
      } else {
        // Like
        const { error } = await supabase
          .from("character_likes")
          .insert([
            { character_id: characterId, user_id: user.id }
          ]);
        
        if (error) throw error;
      }
    } catch (err) {
      console.error("Error toggling like:", err);
      // Revert on error
      setIsLiked(previousLiked);
      setLikeCount(previousCount);
      alert("操作失败，请重试");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="w-16 h-9 bg-white/20 animate-pulse rounded-lg"></div>;
  }

  return (
    <button
      onClick={handleToggleLike}
      disabled={isOwner || !user || actionLoading}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg font-semibold transition-all flex-shrink-0
        ${isLiked 
          ? "bg-pink-500 text-white shadow-md hover:bg-pink-600" 
          : "bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm"
        }
        ${(isOwner || !user) ? "cursor-default opacity-90" : "cursor-pointer active:scale-95"}
      `}
      title={isOwner ? "不能给自己点赞哦" : (isLiked ? "取消点赞" : "点赞")}
    >
      <span className={`text-lg leading-none ${isLiked ? "scale-110" : ""} transition-transform`}>
        {isLiked ? "❤️" : "🤍"}
      </span>
      <span className="leading-none">{likeCount}</span>
    </button>
  );
}
