"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/app/providers";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BigQuestionBox from "@/components/square/BigQuestionBox";
import CreatePostDialog from "@/components/square/CreatePostDialog";
import SquarePostCard from "@/components/square/SquarePostCard";

export default function SquarePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState([]);
  const [myPosts, setMyPosts] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [initialPrompt, setInitialPrompt] = useState("");
  const [loading, setLoading] = useState(true);

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
    <div className="min-h-screen bg-gray-50 pb-[calc(5rem+env(safe-area-inset-bottom))]">
      
      {/* 2. Big Question Box */}
      <BigQuestionBox 
        onOpen={handleOpenCreate} 
        hasCharacter={characters.length > 0} 
      />

      {/* 3. Main Content Grid */}
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Dynamic Pool */}
        <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4 px-2">
            <h2 className="text-lg font-bold text-gray-700">最新动态</h2>
            <button onClick={() => window.location.reload()} className="text-sm text-indigo-500 active:text-indigo-700 md:hover:underline">刷新</button>
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
                />
                ))}
            </div>
            )}
        </div>

        {/* Right Column: My Records */}
        <div className="hidden lg:block">
            <div className="sticky top-6">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-50 bg-gray-50/50">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <span>📒</span> 我的足迹
                        </h3>
                    </div>
                    
                    <div className="p-4 max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar">
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

      {/* Create Dialog */}
      <CreatePostDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        user={user}
        characters={characters}
        onPostCreated={handlePostCreated}
        initialContent={initialPrompt}
      />
    </div>
  );
}
