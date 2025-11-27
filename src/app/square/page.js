"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/app/providers";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BigQuestionBox from "@/components/square/BigQuestionBox";
import CreatePostDialog from "@/components/square/CreatePostDialog";
import SquarePostCard from "@/components/square/SquarePostCard";
import ShareCard from "@/components/square/ShareCard";

const BackgroundDecoration = () => (
  <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
    {/* Top Left Blob */}
    <div className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] bg-gradient-to-br from-indigo-100/40 to-purple-100/40 rounded-full blur-3xl animate-pulse-slow" />
    {/* Bottom Right Blob */}
    <div className="absolute top-[20%] -right-[10%] w-[60vw] h-[60vw] bg-gradient-to-bl from-pink-100/30 to-yellow-50/30 rounded-full blur-3xl" />
    {/* Grid Pattern */}
    <div className="absolute inset-0 opacity-[0.03]" 
         style={{ 
             backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', 
             backgroundSize: '24px 24px' 
         }} 
    />
  </div>
);

export default function SquarePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState([]);
  const [myPosts, setMyPosts] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [initialPrompt, setInitialPrompt] = useState("");
  const [loading, setLoading] = useState(true);
  const [sharePost, setSharePost] = useState(null);

  // Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      // 1. Posts
      const res = await fetch("/api/posts/list");
      if (res.ok) {
        const postData = await res.json();
        setPosts(postData);
      }

      // 2. User Characters & My Posts (if logged in)
      if (user) {
        const { data: charData } = await supabase
          .from("characters")
          .select("id, name, avatar_url")
          .eq("user_id", user.id);
        setCharacters(charData || []);

        const myRes = await fetch(`/api/posts/list?userId=${user.id}`);
        if (myRes.ok) {
            const myPostData = await myRes.json();
            setMyPosts(myPostData);
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [user]);

  const handleOpenCreate = (prompt) => {
    if (!user) {
      router.push("/auth/login");
      return;
    }
    if (characters.length === 0) {
      if (confirm("您还没有角色，是否去创建？")) {
        router.push("/home");
      }
      return;
    }

    // Ensure prompt is a string (it might be an event object if called from button)
    let content = (typeof prompt === 'string') ? prompt : "";
    if (content) {
        content = `#${content}`;
    }

    setInitialPrompt(content);
    setShowCreateDialog(true);
  };

  const handlePostCreated = (newPost) => {
    // Optimistic update: Add to top and scroll
    setPosts(prev => [newPost, ...prev]);
    setMyPosts(prev => [newPost, ...prev]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePostDeleted = (postId) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
    setMyPosts(prev => prev.filter(p => p.id !== postId));
  };

  return (
    <div className="min-h-screen bg-transparent pb-[calc(5rem+env(safe-area-inset-bottom))] relative">
      <BackgroundDecoration />
      
      {/* 2. Big Question Box */}
      <div className="relative z-10">
      <BigQuestionBox 
        onOpen={handleOpenCreate} 
        hasCharacter={characters.length > 0} 
      />

      {/* 3. Main Content Grid */}
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Dynamic Pool */}
        <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6 px-2">
                <div className="relative">
                    <h2 className="text-xl font-bold text-gray-800 relative z-10 pl-2">
                        <span className="text-2xl mr-2">✨</span>最新动态
                    </h2>
                    <div className="absolute bottom-1 left-0 w-full h-3 bg-yellow-200/60 -skew-x-12 -z-0 rounded-sm"></div>
                </div>
                <button onClick={() => window.location.reload()} className="text-sm bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100 text-indigo-500 active:text-indigo-700 hover:shadow-md transition-all flex items-center gap-1">
                    <span>🔄</span> 刷新
                </button>
            </div>

            {loading ? (
            <div className="text-center py-12 text-gray-400">加载中...</div>
            ) : posts.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200 mx-2 md:mx-0">
                <p className="text-gray-500 mb-4">广场还很空旷...</p>
                <button onClick={handleOpenCreate} className="text-indigo-600 font-bold active:text-indigo-800 md:hover:underline">
                发布第一条动态
                </button>
            </div>
            ) : (
            <div className="space-y-4">
                {posts.map(post => (
                <SquarePostCard 
                    key={post.id} 
                    post={post} 
                    currentUserId={user?.id} 
                    onDelete={handlePostDeleted}
                    onShare={setSharePost}
                />
                ))}
            </div>
            )}
        </div>

        {/* Right Column: My Records */}
        <div className="hidden lg:block">
            <div className="sticky top-6">
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-indigo-50 overflow-hidden relative group hover:shadow-md transition-all duration-300">
                    {/* Decorative Tape */}
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-8 bg-indigo-100/50 rotate-2 border-l border-r border-white/50 backdrop-blur-md z-10"></div>

                    <div className="p-4 border-b border-indigo-50 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 flex items-center justify-between">
                        <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                            <span className="text-xl">📒</span> 我的足迹
                        </h3>
                        <div className="flex gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-indigo-300/50"></div>
                            <div className="w-2 h-2 rounded-full bg-pink-300/50"></div>
                            <div className="w-2 h-2 rounded-full bg-yellow-300/50"></div>
                        </div>
                    </div>
                    
                    <div className="p-4 max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
                        {!user ? (
                            <div className="text-center py-8 text-gray-400 text-sm">
                                <p className="mb-2">登录后查看我的动态</p>
                                <Link href="/auth/login" className="text-indigo-600 hover:underline">去登录</Link>
                            </div>
                        ) : myPosts.length === 0 ? (
                            <div className="text-center py-12 text-gray-400 text-sm">
                                <p>还没有发布过动态哦</p>
                                <button onClick={() => handleOpenCreate()} className="text-indigo-600 hover:underline mt-2">
                                    去发布
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {myPosts.map(post => (
                                    <div key={post.id} className="transform scale-95 origin-top">
                                        <SquarePostCard 
                                            post={post} 
                                            currentUserId={user?.id} 
                                            onDelete={handlePostDeleted}
                                            onShare={setSharePost}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>

      </div>
      </div>

      {/* Create Dialog */}
      <CreatePostDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        user={user}
        characters={characters}
        onPostCreated={handlePostCreated}
        initialContent={initialPrompt}
      />

      {/* Share Card Modal - Rendered at root level to avoid transform issues */}
      {sharePost && (
        <ShareCard 
          isOpen={!!sharePost}
          onClose={() => setSharePost(null)}
          avatarUrl={sharePost.character?.avatar_url}
          username={sharePost.character?.name}
          contentText={sharePost.content_text}
          contentImageUrl={sharePost.image_url}
          createdAt={sharePost.created_at}
          worldTag={sharePost.world_tag}
          mood={sharePost.mood}
          tone={sharePost.tone}
        />
      )}
    </div>
  );
}
