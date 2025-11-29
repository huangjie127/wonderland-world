"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/app/providers";

// Extracted CommentNode component to prevent re-creation on render
const CommentNode = ({ 
  node, 
  depth = 0, 
  replyingToId, 
  onReplyClick, 
  replyContent, 
  onReplyContentChange, 
  selectedCharId, 
  onSelectChar, 
  myCharacters, 
  onSubmitReply, 
  submitting 
}) => {
  const isReplying = replyingToId === node.id;

  return (
    <div className={`relative ${depth > 0 ? "mt-3" : "mt-4"}`}>
      {depth > 0 && (
         <div className="absolute -left-3 top-[-12px] bottom-0 w-px bg-gray-100 border-l border-gray-200"></div>
      )}

      <div className="group/item">
          <div className="flex gap-3">
              <div className="flex-shrink-0 pt-1 z-10 relative">
                  <img 
                  src={node.guest?.avatar_url || "/default-avatar.png"} 
                  alt={node.guest?.name}
                  className="w-8 h-8 rounded-full object-cover border border-gray-100"
                  />
              </div>
              <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between">
                      <div className="flex items-baseline gap-2">
                          <span className="font-bold text-gray-800 text-sm">
                              {node.guest?.name || "未知访客"}
                          </span>
                          <span className="text-xs text-gray-400">
                              {new Date(node.created_at).toLocaleString("zh-CN", {
                              month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit"
                              })}
                          </span>
                      </div>
                      <button 
                          onClick={() => onReplyClick(node.id)}
                          className="text-xs text-indigo-500 opacity-0 group-hover/item:opacity-100 transition-opacity px-2 font-medium"
                      >
                          回复
                      </button>
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed break-words mt-0.5">
                      {node.content}
                  </p>
              </div>
          </div>

          {isReplying && (
              <div className="ml-11 mt-3 animate-in slide-in-from-top-2 fade-in">
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-2 mb-2 overflow-x-auto pb-1 no-scrollbar">
                      <span className="text-xs text-gray-500 flex-shrink-0">身份:</span>
                      {myCharacters.map(char => (
                          <button
                          key={char.id}
                          onClick={() => onSelectChar(char.id)}
                          className={`flex items-center gap-1 px-2 py-1 rounded-full border text-xs transition-all flex-shrink-0 ${
                              selectedCharId === char.id 
                              ? "bg-indigo-50 border-indigo-500 text-indigo-700 ring-1 ring-indigo-500" 
                              : "border-gray-200 text-gray-600 hover:bg-white"
                          }`}
                          >
                          <img src={char.avatar_url || "/default-avatar.png"} className="w-4 h-4 rounded-full object-cover" />
                          <span>{char.name}</span>
                          </button>
                      ))}
                      </div>
                      
                      <div className="flex gap-2">
                      <input
                          type="text"
                          value={replyContent}
                          onChange={(e) => onReplyContentChange(e.target.value)}
                          placeholder={`回复 ${node.guest?.name}...`}
                          className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500"
                          autoFocus
                          onKeyDown={(e) => e.key === 'Enter' && onSubmitReply(node.id)}
                      />
                      <button
                          onClick={() => onSubmitReply(node.id)}
                          disabled={submitting}
                          className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 disabled:opacity-50"
                      >
                          发送
                      </button>
                      </div>
                  </div>
              </div>
          )}
      </div>

      {node.children && node.children.length > 0 && (
          <div className="pl-3 md:pl-4 ml-3 border-l border-gray-100">
              {node.children.map(child => (
                  <CommentNode 
                    key={child.id} 
                    node={child} 
                    depth={depth + 1}
                    replyingToId={replyingToId}
                    onReplyClick={onReplyClick}
                    replyContent={replyContent}
                    onReplyContentChange={onReplyContentChange}
                    selectedCharId={selectedCharId}
                    onSelectChar={onSelectChar}
                    myCharacters={myCharacters}
                    onSubmitReply={onSubmitReply}
                    submitting={submitting}
                  />
              ))}
          </div>
      )}
    </div>
  );
};

export default function CommentListDialog({ isOpen, onClose, hostCharacterId, hostCharacterName }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myCharacters, setMyCharacters] = useState([]);
  
  // Reply state
  const [replyingToId, setReplyingToId] = useState(null);
  const [replyContent, setReplyContent] = useState("");
  const [selectedCharId, setSelectedCharId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchComments();
      if (user) fetchMyCharacters();
    }
  }, [isOpen, hostCharacterId, user]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("character_interactions")
        .select(`
          *,
          guest:characters!guest_character_id(id, name, avatar_url)
        `)
        .eq("host_character_id", hostCharacterId)
        .is("event_id", null)
        .order("created_at", { ascending: false }); // Newest first

      if (error) throw error;
      setComments(data || []);
    } catch (err) {
      console.error("Error fetching comments:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyCharacters = async () => {
    try {
      const { data } = await supabase
        .from("characters")
        .select("id, name, avatar_url")
        .eq("user_id", user.id);
      
      if (data) {
        setMyCharacters(data);
        // If hostCharacterId is in myCharacters, select it by default (Owner replying)
        const hostChar = data.find(c => c.id === hostCharacterId);
        if (hostChar) {
          setSelectedCharId(hostChar.id);
        } else if (data.length > 0) {
          setSelectedCharId(data[0].id);
        }
      }
    } catch (err) {
      console.error("Error fetching my characters:", err);
    }
  };

  const handleReplyClick = (commentId) => {
    if (!user) return alert("请先登录");
    if (myCharacters.length === 0) return alert("您需要先创建一个角色才能回复");
    
    setReplyingToId(commentId);
    setReplyContent("");
  };

  const handleSubmitReply = async (parentId) => {
    if (!replyContent.trim()) return;
    if (!selectedCharId) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("character_interactions")
        .insert([
          {
            host_character_id: hostCharacterId,
            guest_character_id: selectedCharId,
            content: replyContent,
            parent_id: parentId,
            type: "INTERACTION"
          }
        ])
        .select(`
          *,
          guest:characters!guest_character_id(id, name, avatar_url)
        `)
        .single();

      if (error) throw error;

      // Optimistic update
      setComments(prev => [data, ...prev]);
      setReplyingToId(null);
      setReplyContent("");
    } catch (err) {
      console.error("Reply error:", err);
      alert("回复失败");
    } finally {
      setSubmitting(false);
    }
  };

  // Group comments: Recursive Tree
  const commentTree = useMemo(() => {
    const commentMap = {};
    const roots = [];

    // 1. Create nodes
    comments.forEach(c => {
      commentMap[c.id] = { ...c, children: [] };
    });

    // 2. Link children
    comments.forEach(c => {
      if (c.parent_id && commentMap[c.parent_id]) {
        commentMap[c.parent_id].children.push(commentMap[c.id]);
      } else {
        roots.push(commentMap[c.id]);
      }
    });

    // 3. Sort
    roots.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const sortChildren = (nodes) => {
      nodes.forEach(node => {
        if (node.children && node.children.length > 0) {
           node.children.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
           sortChildren(node.children);
        }
      });
    };
    sortChildren(roots);

    return roots;
  }, [comments]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-lg text-gray-800">
            💬 {hostCharacterName} 的留言板
          </h3>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-500 transition"
          >
            ✕
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {loading ? (
            <div className="text-center py-8 text-gray-400">加载中...</div>
          ) : commentTree.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p>还没有留言，快来抢沙发！</p>
            </div>
          ) : (
            commentTree.map(root => (
              <CommentNode 
                key={root.id} 
                node={root} 
                replyingToId={replyingToId}
                onReplyClick={handleReplyClick}
                replyContent={replyContent}
                onReplyContentChange={setReplyContent}
                selectedCharId={selectedCharId}
                onSelectChar={setSelectedCharId}
                myCharacters={myCharacters}
                onSubmitReply={handleSubmitReply}
                submitting={submitting}
              />
            ))
          )}
        </div>

        {/* Footer (Optional: Add new top-level comment button if needed, but usually handled by main page) */}
      </div>
    </div>
  );
}
