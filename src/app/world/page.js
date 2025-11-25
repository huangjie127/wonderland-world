"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/app/providers";
import Link from "next/link";
import "./world.css";

export default function WorldChannelPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState({ message: "加载中...", current_channel: "..." });
  const [announcements, setAnnouncements] = useState([]);
  const [messages, setMessages] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [selectedCharId, setSelectedCharId] = useState(null);
  const [inputText, setInputText] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [sending, setSending] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false); // In real app, check user role
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState("");
  
  const chatContainerRef = useRef(null);

  // 1. Poll Channel Status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/world/status");
        if (res.ok) {
          const data = await res.json();
          setStatus(data);
        }
      } catch (err) {
        console.error("Failed to fetch status", err);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 60000); // Every 1 minute
    return () => clearInterval(interval);
  }, []);

  // 2. Fetch Data (Announcements, Messages, Characters)
  useEffect(() => {
    const fetchData = async () => {
      // Announcements
      const { data: annData } = await supabase
        .from("world_announcements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      if (annData) setAnnouncements(annData);

      // Messages (Today's)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: msgData } = await supabase
        .from("world_chat")
        .select(`
          *,
          character:characters(name, avatar_url)
        `)
        .gte("created_at", today.toISOString())
        .order("created_at", { ascending: true });
        
      if (msgData) {
        setMessages(msgData);
        scrollToBottom();
      }

      // User Characters
      if (user) {
        const { data: charData } = await supabase
          .from("characters")
          .select("id, name, avatar_url")
          .eq("user_id", user.id);
        
        if (charData) {
          setCharacters(charData);
          if (charData.length > 0) setSelectedCharId(charData[0].id);
        }
        
        // Check Admin ID from env
        const adminId = process.env.NEXT_PUBLIC_ADMIN_USER_ID;
        // Fallback to hardcoded ID if env is not set (for development)
        const HARDCODED_ADMIN_ID = 'd4f695b7-77cf-4340-b62b-443a3c166e60';
        
        if ((adminId && user.id === adminId) || user.id === HARDCODED_ADMIN_ID) {
            setIsAdmin(true);
        } else {
            setIsAdmin(false);
        }
      }
    };

    fetchData();

    const fetchMessageDetails = async (id) => {
        const { data } = await supabase
            .from("world_chat")
            .select(`*, character:characters(name, avatar_url)`)
            .eq("id", id)
            .single();
            
        if (data) {
            setMessages(prev => {
                if (prev.some(msg => msg.id === data.id)) return prev;
                return [...prev, data];
            });
            scrollToBottom();
        }
    };

    // Realtime subscription for new messages
    const channel = supabase
      .channel('world_chat')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'world_chat' }, 
        async (payload) => {
            // Fetch the full message with character details
            // The fetchMessageDetails function handles deduplication
            fetchMessageDetails(payload.new.id);
        }
      )
      .subscribe();
      
    // Realtime subscription for announcements
    const annChannel = supabase
      .channel('world_announcements')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'world_announcements' },
        (payload) => {
            setAnnouncements(prev => [payload.new, ...prev]);
        }
      )
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'world_announcements' },
        (payload) => {
            setAnnouncements(prev => prev.filter(a => a.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(annChannel);
    };
  }, [user]);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }, 100);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !user) return;
    if (!isAnonymous && !selectedCharId) {
      alert("请选择一个角色或使用匿名身份");
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase
        .from("world_chat")
        .insert([{
          content: inputText,
          user_id: user.id,
          character_id: isAnonymous ? null : selectedCharId,
          is_anonymous: isAnonymous
        }])
        .select(`*, character:characters(name, avatar_url)`)
        .single();

      if (error) throw error;
      
      // Optimistic update: Add message immediately
      if (data) {
          setMessages(prev => [...prev, data]);
          scrollToBottom();
      }
      
      setInputText("");
    } catch (err) {
      alert("发送失败: " + err.message);
    } finally {
      setSending(false);
    }
  };

  const handlePostAnnouncement = async () => {
    if (!newAnnouncement.trim()) return;
    try {
      const { error } = await supabase
        .from("world_announcements")
        .insert([{
          content: newAnnouncement,
          user_id: user.id
        }]);
      
      if (error) throw error;
      setNewAnnouncement("");
      setShowAdminPanel(false);
    } catch (err) {
      alert("发布失败: " + err.message);
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!confirm("确定要删除这条公告吗？")) return;
    try {
      const { error } = await supabase
        .from("world_announcements")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      // Local update (Realtime will also handle it if subscribed, but this is faster feedback)
      setAnnouncements(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      alert("删除失败: " + err.message);
    }
  };

  return (
    <div className="flex flex-col h-screen relative overflow-hidden font-sans text-gray-700">
      {/* Background Animation */}
      <div className="marshmallow-container">
        <div className="marshmallow-blob blob-1"></div>
        <div className="marshmallow-blob blob-2"></div>
        <div className="marshmallow-blob blob-4"></div>
      </div>

      {/* 1. Top Bar (Glass) */}
      <div className="glass-panel z-20 flex-shrink-0 h-14 flex items-center px-4 justify-between m-2 rounded-2xl">
        <div className="flex items-center gap-2">
            <h1 className="font-bold text-base tracking-wide text-gray-700">世界频道</h1>
            <span className="text-xs bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full border border-pink-200 font-medium whitespace-nowrap">
                {status.current_channel}
            </span>
            <span className="text-xs text-gray-400 hidden md:inline-block ml-2 truncate max-w-[200px] lg:max-w-none">
                {status.message}
            </span>
        </div>
        <div className="flex items-center gap-3">
            {isAdmin && (
                <button 
                    onClick={() => setShowAdminPanel(!showAdminPanel)}
                    className="text-xs bg-purple-100 text-purple-600 hover:bg-purple-200 px-3 py-1.5 rounded-full transition font-medium"
                >
                    {showAdminPanel ? "关闭" : "发布"}
                </button>
            )}
            <Link href="/home" className="text-xs bg-white/50 hover:bg-white text-gray-600 px-3 py-1.5 rounded-full transition border border-white/60 font-medium">
                返回主页
            </Link>
        </div>
      </div>

      {/* Admin Panel */}
      {showAdminPanel && (
        <div className="glass-panel mx-2 mb-2 p-3 rounded-xl animate-fade-in z-20">
            <div className="max-w-4xl mx-auto flex gap-2">
                <input
                    type="text"
                    value={newAnnouncement}
                    onChange={(e) => setNewAnnouncement(e.target.value)}
                    placeholder="输入系统公告内容..."
                    className="glass-input flex-1 rounded-lg px-3 py-1 text-sm focus:ring-2 focus:ring-pink-300 outline-none text-gray-700 placeholder-gray-400"
                />
                <button
                    onClick={handlePostAnnouncement}
                    className="px-4 py-1 bg-pink-400 text-white text-sm rounded-lg hover:bg-pink-500 shadow-sm transition"
                >
                    发布
                </button>
            </div>
        </div>
      )}

      {/* 2. Top Action Area */}
      <div className="glass-panel mx-2 mb-2 p-3 rounded-2xl shadow-sm flex-shrink-0 z-10">
        <div className="max-w-5xl mx-auto">
            {!user ? (
                <div className="text-center text-sm text-gray-500">
                    <Link href="/auth/login" className="text-pink-500 font-bold hover:underline">登录</Link> 后参与互动
                </div>
            ) : (
                <form onSubmit={handleSendMessage} className="flex flex-col md:flex-row gap-3 items-center">
                    {/* Identity Selector */}
                    <div className="flex items-center gap-1 bg-white/40 rounded-xl p-1 border border-white/50">
                        <button
                            type="button"
                            onClick={() => setIsAnonymous(false)}
                            className={`px-4 py-1.5 text-xs rounded-lg transition font-bold ${!isAnonymous ? "bg-white shadow-sm text-pink-500" : "text-gray-400 hover:text-gray-600"}`}
                        >
                            角色
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsAnonymous(true)}
                            className={`px-4 py-1.5 text-xs rounded-lg transition font-bold ${isAnonymous ? "bg-white shadow-sm text-gray-700" : "text-gray-400 hover:text-gray-600"}`}
                        >
                            匿名
                        </button>
                    </div>

                    {/* Character Dropdown */}
                    {!isAnonymous && (
                        <div className="relative min-w-[140px]">
                            <select
                                value={selectedCharId || ""}
                                onChange={(e) => setSelectedCharId(e.target.value)}
                                className="w-full appearance-none glass-input text-gray-700 py-1.5 px-3 pr-8 rounded-xl leading-tight focus:outline-none focus:ring-2 focus:ring-pink-200 text-sm font-medium cursor-pointer"
                            >
                                {characters.length === 0 && <option value="">无角色</option>}
                                {characters.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                            </div>
                        </div>
                    )}

                    {/* Input Field */}
                    <div className="flex-1 w-full flex gap-2">
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder={isAnonymous ? "悄悄说..." : "分享此刻的心情..."}
                            className="glass-input flex-1 rounded-xl px-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 placeholder-gray-400 text-gray-700"
                        />
                        <button
                            type="submit"
                            disabled={sending || (!isAnonymous && !selectedCharId)}
                            className="bg-gradient-to-r from-pink-400 to-purple-400 text-white px-5 py-1.5 rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-md whitespace-nowrap transform active:scale-95"
                        >
                            发送
                        </button>
                    </div>
                </form>
            )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden max-w-5xl mx-auto w-full px-2 pb-2 gap-3 z-10">
        
        {/* 3. Announcement Area (Cards) */}
        {announcements.length > 0 && (
            <div className="flex-shrink-0 grid grid-cols-1 md:grid-cols-2 gap-3">
                {announcements.slice(0, 2).map((ann) => (
                    <div key={ann.id} className="glass-panel p-3 rounded-2xl border-l-4 border-yellow-300 flex flex-col justify-between hover:bg-white/50 transition relative group">
                        {isAdmin && (
                            <button 
                                onClick={() => handleDeleteAnnouncement(ann.id)}
                                className="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-1"
                                title="删除公告"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        )}
                        <div className="text-sm text-gray-700 font-medium mb-1 max-h-24 overflow-y-auto pr-6 whitespace-pre-wrap">
                            {ann.content}
                        </div>
                        <div className="flex justify-between items-center mt-1">
                            <span className="text-[10px] text-yellow-600 font-bold bg-yellow-100 px-2 py-0.5 rounded-full">系统公告</span>
                            <span className="text-[10px] text-gray-400">
                                {new Date(ann.created_at).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* 4. Chat Box (Glass) */}
        <div className="flex-1 glass-panel rounded-3xl flex flex-col overflow-hidden min-h-[300px] shadow-lg">
            {/* Chat Header */}
            <div className="bg-white/30 px-5 py-3 border-b border-white/40 flex justify-between items-center flex-shrink-0 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                    <span className="text-lg">💭</span>
                    <span className="font-bold text-gray-600 text-sm">今日话题</span>
                </div>
                <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full border border-green-200 font-medium">
                    Live
                </span>
            </div>

            {/* Messages Scroll Container */}
            <div 
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-5 scroll-smooth"
            >
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                        <span className="text-5xl opacity-50">🍃</span>
                        <p className="text-sm font-medium">风很轻，云很淡，这里很安静...</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMe = user && msg.user_id === user.id;
                        const isAnon = msg.is_anonymous;
                        const charName = isAnon ? "匿名用户" : (msg.character?.name || "未知角色");
                        const avatarUrl = isAnon ? null : msg.character?.avatar_url;

                        return (
                            <div key={msg.id} className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}>
                                {/* Avatar */}
                                <div className="flex-shrink-0 mt-1">
                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center overflow-hidden border-2 border-white shadow-sm ${isAnon ? "bg-gray-100" : "bg-white"}`}>
                                        {avatarUrl ? (
                                            <img src={avatarUrl} alt={charName} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-sm">{isAnon ? "🕵️" : "👤"}</span>
                                        )}
                                    </div>
                                </div>

                                {/* Content */}
                                <div className={`flex flex-col max-w-[85%] ${isMe ? "items-end" : "items-start"}`}>
                                    <div className="flex items-center gap-2 mb-1 px-1">
                                        <span className="text-[10px] font-bold text-gray-500">{charName}</span>
                                    </div>
                                    <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm backdrop-blur-sm transition hover:scale-[1.01] ${
                                        isMe 
                                            ? "glass-bubble-me text-gray-800 rounded-tr-sm" 
                                            : "glass-bubble-other text-gray-800 rounded-tl-sm"
                                    }`}>
                                        {msg.content}
                                    </div>
                                    <span className="text-[10px] text-gray-400 mt-1 px-1 opacity-70">
                                        {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
      </div>
    </div>
  );
}
