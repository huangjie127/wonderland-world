"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/app/providers";

export default function EventDetailDialog({ isOpen, onClose, event, characterName }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [myCharacters, setMyCharacters] = useState([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // 解析事件内容
  const typeMatch = event?.content?.match(/^\[(.*?)\]/);
  const type = typeMatch ? typeMatch[1] : "记录";
  const content = event?.content?.replace(/^\[.*?\]\s*/, "") || "";
  
  let emoji = "📘";
  if (type === "worldview") emoji = "🌍";
  if (type === "story") emoji = "📖";
  if (type === "mood") emoji = "📝";
  if (type === "timeline") emoji = "⏰";

  useEffect(() => {
    if (!isOpen || !event) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. 加载该事件的评论
        const { data: commentsData } = await supabase
          .from("character_interactions")
          .select(`
            *,
            guest:characters!guest_character_id(name, avatar_url)
          `)
          .eq("event_id", event.id) // 关联特定事件
          .order("created_at", { ascending: true });

        setComments(commentsData || []);

        // 2. 加载我的角色（用于发表评论）
        if (user) {
          const { data: myChars } = await supabase
            .from("characters")
            .select("id, name")
            .eq("user_id", user.id);
          
          setMyCharacters(myChars || []);
          if (myChars?.length > 0) {
            setSelectedCharacterId(myChars[0].id);
          }
        }
      } catch (err) {
        console.error("Error loading details:", err);
      }
      setLoading(false);
    };

    fetchData();
  }, [isOpen, event, user]);

  const handleSendComment = async () => {
    if (!newComment.trim() || !selectedCharacterId) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from("character_interactions")
        .insert([
          {
            host_character_id: event.character_id, // 事件所属的角色
            guest_character_id: selectedCharacterId, // 评论者
            event_id: event.id, // 关联到具体事件
            type: "COMMENT",
            content: newComment,
          },
        ]);

      if (error) throw error;

      // 刷新评论
      const { data: newComments } = await supabase
        .from("character_interactions")
        .select(`
          *,
          guest:characters!guest_character_id(name, avatar_url)
        `)
        .eq("event_id", event.id)
        .order("created_at", { ascending: true });

      setComments(newComments || []);
      setNewComment("");
    } catch (err) {
      alert("评论失败：" + err.message);
    }
    setSending(false);
  };

  if (!isOpen || !event) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* 头部 */}
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{emoji}</span>
            <div>
              <h3 className="font-bold text-gray-800 text-lg">
                {characterName} 的{type === "worldview" ? "世界观" : type === "story" ? "故事" : "记录"}
              </h3>
              <p className="text-xs text-gray-500">
                {new Date(event.created_at).toLocaleString("zh-CN")}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-500 transition"
          >
            ✕
          </button>
        </div>

        {/* 内容滚动区 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 事件正文 */}
          <div className="prose prose-indigo max-w-none mb-8">
            <p className="text-gray-800 text-lg leading-relaxed whitespace-pre-wrap">
              {content}
            </p>
          </div>

          {/* 评论区分割线 */}
          <div className="flex items-center gap-4 mb-6">
            <div className="h-px bg-gray-200 flex-1"></div>
            <span className="text-sm font-medium text-gray-400">评论 ({comments.length})</span>
            <div className="h-px bg-gray-200 flex-1"></div>
          </div>

          {/* 评论列表 */}
          <div className="space-y-4 mb-6">
            {loading ? (
              <p className="text-center text-gray-400 py-4">加载评论中...</p>
            ) : comments.length > 0 ? (
              comments.map((comment) => (
                <div key={comment.id} className="flex gap-3 group">
                  <div className="flex-shrink-0">
                    {comment.guest?.avatar_url ? (
                      <img 
                        src={comment.guest.avatar_url} 
                        alt={comment.guest.name}
                        className="w-8 h-8 rounded-full object-cover border border-gray-200"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm">👤</div>
                    )}
                  </div>
                  <div className="flex-1 bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="font-bold text-sm text-gray-700">{comment.guest?.name}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(comment.created_at).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{comment.content}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-400 text-sm py-4 italic">
                还没有人评论，快来抢沙发~
              </p>
            )}
          </div>
        </div>

        {/* 底部评论输入框 */}
        <div className="p-4 border-t border-gray-100 bg-white">
          {myCharacters.length > 0 ? (
            <div className="flex gap-2 items-end">
              <div className="flex-shrink-0 mb-1">
                <select
                  value={selectedCharacterId}
                  onChange={(e) => setSelectedCharacterId(Number(e.target.value))}
                  className="text-xs border border-gray-300 rounded px-2 py-1 bg-gray-50 max-w-[100px] truncate"
                >
                  {myCharacters.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 relative">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="发表你的看法..."
                  rows="1"
                  className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none bg-gray-50 focus:bg-white transition"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendComment();
                    }
                  }}
                />
                <button
                  onClick={handleSendComment}
                  disabled={sending || !newComment.trim()}
                  className="absolute right-1 top-1 bottom-1 px-3 bg-indigo-600 text-white rounded-full text-sm font-bold hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center"
                >
                  {sending ? "..." : "↑"}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-center text-sm text-gray-500">
              你需要先创建一个角色才能评论
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
