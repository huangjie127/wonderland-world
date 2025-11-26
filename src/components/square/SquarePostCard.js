"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function SquarePostCard({ post, currentUserId, onDelete }) {
  const [likes, setLikes] = useState(post.likes_count || 0);
  const [isLiked, setIsLiked] = useState(false); // In real app, check if user liked
  const [isAnimating, setIsAnimating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("确定要删除这条动态吗？")) return;
    setIsDeleting(true);
    try {
        const res = await fetch("/api/posts/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ post_id: post.id, user_id: currentUserId }),
        });
        if (res.ok) {
            if (onDelete) onDelete(post.id);
        } else {
            alert("删除失败");
        }
    } catch (err) {
        alert("删除出错");
    } finally {
        setIsDeleting(false);
    }
  };

  const handleLike = async () => {
    if (!currentUserId) return alert("请先登录");
    
    // Optimistic Update
    const newIsLiked = !isLiked;
    setIsLiked(newIsLiked);
    setLikes(prev => newIsLiked ? prev + 1 : prev - 1);
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300);

    // API Call
    try {
      await fetch("/api/posts/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            post_id: post.id, 
            user_id: currentUserId,
            action: newIsLiked ? "like" : "unlike" 
        }),
      });
    } catch (err) {
      console.error("Like failed", err);
      // Revert
      setIsLiked(!newIsLiked);
      setLikes(prev => !newIsLiked ? prev + 1 : prev - 1);
    }
  };

  // Comments Logic
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [myCharacters, setMyCharacters] = useState([]);
  const [selectedCommentCharId, setSelectedCommentCharId] = useState(null);

  const loadComments = async () => {
    if (commentsLoaded) return;
    try {
      const res = await fetch(`/api/posts/comment/list?postId=${post.id}`);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
        setCommentsLoaded(true);
      }
    } catch (err) {
      console.error("Failed to load comments", err);
    }
  };

  const loadMyCharacters = async () => {
    if (!currentUserId || myCharacters.length > 0) return;
    const { data } = await supabase
        .from("characters")
        .select("id, name, avatar_url")
        .eq("user_id", currentUserId);
    if (data) {
        setMyCharacters(data);
        if (data.length > 0) setSelectedCommentCharId(data[0].id);
    }
  };

  const toggleComments = () => {
    if (!showComments) {
        loadComments();
        loadMyCharacters();
    }
    setShowComments(!showComments);
  };

  const handleSubmitComment = async () => {
    if (!currentUserId) return alert("请先登录");
    if (!newComment.trim()) return;
    if (!selectedCommentCharId) return alert("请选择一个角色进行评论");
    
    setCommentLoading(true);
    try {
        const res = await fetch("/api/posts/comment/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                post_id: post.id,
                user_id: currentUserId,
                content: newComment,
                character_id: selectedCommentCharId
            }),
        });

        if (res.ok) {
            const savedComment = await res.json();
            
            // Find character info for optimistic update
            const charInfo = myCharacters.find(c => c.id === selectedCommentCharId);

            setComments([...comments, {
                ...savedComment,
                character: charInfo // Inject character info immediately
            }]);
            setNewComment("");
        }
    } catch (err) {
        alert("评论失败");
    } finally {
        setCommentLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4 relative group hover:shadow-md transition-all duration-300">
      {/* Top decorative line */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200 opacity-0 group-hover:opacity-100 transition-opacity"></div>
      
      <div className="p-3 md:p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-3 relative">
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-full overflow-hidden bg-gray-200 border border-gray-100 shrink-0">
            <img src={post.character?.avatar_url || "/default-avatar.png"} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-gray-900 truncate text-sm md:text-base">{post.character?.name || "未知角色"}</h4>
              {post.world_tag && (
                <span className="text-[10px] px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100 truncate max-w-[80px] md:max-w-[100px]">
                  {post.world_tag}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
              <span>{new Date(post.created_at).toLocaleString()}</span>
              {(post.mood || post.tone) && <span>•</span>}
              {post.mood && <span className="text-pink-500">#{post.mood}</span>}
              {post.tone && <span className="text-purple-500">#{post.tone}</span>}
            </div>
          </div>
          
          {/* Delete Button (Only for author) */}
          {currentUserId && post.author_user_id === currentUserId && (
            <button 
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-gray-300 active:text-red-500 md:hover:text-red-500 transition-colors p-2 -mr-2"
                title="删除动态"
            >
                {isDeleting ? "..." : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                )}
            </button>
          )}
        </div>

        {/* Content */}
        <div className="mb-3">
          <div className="text-gray-800 leading-relaxed whitespace-pre-wrap text-sm md:text-base break-words">
            {post.content_text.startsWith("#") ? (
                <>
                    <span className="text-blue-500">{post.content_text.split("\n")[0]}</span>
                    {post.content_text.includes("\n") && (
                        <span>{post.content_text.substring(post.content_text.indexOf("\n"))}</span>
                    )}
                </>
            ) : (
                post.content_text
            )}
          </div>
        </div>

        {/* Image */}
        {post.image_url && (
          <div className="mb-3 rounded-lg md:rounded-xl overflow-hidden bg-gray-50 border border-gray-100">
            <img src={post.image_url} alt="Post content" className="w-full h-auto max-h-[300px] md:max-h-[400px] object-contain" />
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center gap-6 pt-2 border-t border-gray-50">
          <button 
            onClick={handleLike}
            className={`flex items-center gap-1.5 text-sm font-medium transition-colors py-1 ${isLiked ? "text-pink-500" : "text-gray-400 active:text-pink-500 md:hover:text-pink-500"}`}
          >
            <span className={`text-lg transform transition-transform ${isAnimating ? "scale-125" : "scale-100"}`}>
              {isLiked ? "❤️" : "🤍"}
            </span>
            <span>{likes}</span>
          </button>

          <button 
            onClick={toggleComments}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-400 active:text-indigo-500 md:hover:text-indigo-500 transition-colors py-1"
          >
            <span className="text-lg">💬</span>
            <span>{post.comments_count || comments.length || 0}</span>
          </button>
        </div>

        {/* Comments Section */}
        {showComments && (
            <div className="mt-3 pt-3 border-t border-gray-100 animate-in fade-in slide-in-from-top-2">
                <div className="space-y-3 mb-3 max-h-60 overflow-y-auto custom-scrollbar">
                    {comments.length === 0 ? (
                        <p className="text-center text-xs text-gray-400 py-2">暂无评论，快来抢沙发~</p>
                    ) : (
                        comments.map(comment => (
                            <div key={comment.id} className="flex gap-2 text-sm items-start">
                                <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-200 flex-shrink-0 mt-0.5">
                                    <img src={comment.character?.avatar_url || "/default-avatar.png"} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0 break-words">
                                    <span className="font-bold text-gray-700 mr-2">
                                        {comment.character?.name || "未知角色"}:
                                    </span>
                                    <span className="text-gray-600">{comment.content}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                
                <div className="flex flex-col gap-2">
                    {/* Character Selector for Comment */}
                    {myCharacters.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                            {myCharacters.map(char => (
                                <button
                                    key={char.id}
                                    onClick={() => setSelectedCommentCharId(char.id)}
                                    className={`flex items-center gap-1 px-2 py-1 rounded-full border text-xs transition-all flex-shrink-0 ${
                                        selectedCommentCharId === char.id 
                                        ? "bg-indigo-50 border-indigo-500 text-indigo-700 ring-1 ring-indigo-500" 
                                        : "border-gray-200 text-gray-600 active:bg-gray-50"
                                    }`}
                                >
                                    <img src={char.avatar_url || "/default-avatar.png"} className="w-4 h-4 rounded-full object-cover" />
                                    <span>{char.name}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder={selectedCommentCharId ? `以 ${myCharacters.find(c => c.id === selectedCommentCharId)?.name} 的身份评论...` : "写下你的评论..."}
                            className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            onKeyDown={(e) => e.key === 'Enter' && handleSubmitComment()}
                        />
                        <button 
                            onClick={handleSubmitComment}
                            disabled={commentLoading}
                            className="text-indigo-600 font-medium text-sm px-2 disabled:opacity-50 whitespace-nowrap"
                        >
                            发送
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
