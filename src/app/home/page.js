"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/app/providers";
import { useRouter } from "next/navigation";
import CharacterSidebar from "@/components/CharacterSidebar";
import CharacterDetail from "@/components/CharacterDetail";
import CreateCharacter from "@/components/CreateCharacter";
import RelationshipNotifications from "@/components/RelationshipNotifications";
import TerminationNotifications from "@/components/TerminationNotifications";
import "./home.css";

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [characters, setCharacters] = useState([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showTerminations, setShowTerminations] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [terminationCount, setTerminationCount] = useState(0);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  
  // Mobile View State
  const [mobileView, setMobileView] = useState("list"); // 'list' | 'detail'

  // 重定向未登录用户
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
    }
  }, [user, authLoading, router]);

  // 加载用户的角色
  useEffect(() => {
    if (!user) return;

    const fetchCharacters = async () => {
      const { data } = await supabase
        .from("characters")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setCharacters(data || []);
      
      // 默认选中第一个角色 (Desktop only logic ideally, but fine for now)
      if (data && data.length > 0 && !selectedCharacterId) {
        setSelectedCharacterId(data[0].id);
      }

      // 检查待确认的关系请求
      if (data && data.length > 0) {
        const charIds = data.map((c) => c.id);
        const { data: requests } = await supabase
          .from("character_relationship_requests")
          .select("id")
          .in("to_character_id", charIds)
          .eq("status", "pending");
        
        setPendingCount(requests?.length || 0);

        // 检查待确认的解除请求
        const { data: terminations } = await supabase
          .from("character_relationship_terminations")
          .select("id")
          .eq("status", "pending");
        
        // 过滤出与我相关的解除请求
        const relatedTerminations = terminations?.filter((term) => {
          // 需要通过 relationship_id 查找相关的关系
          // 简化方法：假设所有待处理的解除都可能与我相关
          return term.requested_by !== undefined;
        }) || [];
        
        setTerminationCount(relatedTerminations.length);
      }

      // 检查未读通知
      const { count: unreadCount } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      
      setUnreadMsgCount(unreadCount || 0);
    };

    fetchCharacters();
  }, [user]);

  const handleCharacterCreated = (newCharacter) => {
    setCharacters((prev) => [newCharacter, ...prev]);
    setSelectedCharacterId(newCharacter.id);
    setMobileView("detail"); // Switch to detail view on mobile
    setShowCreateForm(false);
  };

  const handleCharacterUpdated = (updatedCharacter) => {
    setCharacters((prev) =>
      prev.map((c) => (c.id === updatedCharacter.id ? updatedCharacter : c))
    );
    setSelectedCharacterId(updatedCharacter.id);
  };

  const handleCharacterDeleted = (deletedCharacterId) => {
    setCharacters((prev) => prev.filter((c) => c.id !== deletedCharacterId));
    
    // 如果删除的是当前选中的角色，选择下一个
    if (selectedCharacterId === deletedCharacterId) {
      const remainingCharacters = characters.filter((c) => c.id !== deletedCharacterId);
      if (remainingCharacters.length > 0) {
          setSelectedCharacterId(remainingCharacters[0].id);
      } else {
          setSelectedCharacterId(null);
          setMobileView("list"); // Go back to list if no characters
      }
    }
  };

  const handleCharacterSelect = (id) => {
      setSelectedCharacterId(id);
      setMobileView("detail");
  };

  const selectedCharacter = characters.find((c) => c.id === selectedCharacterId);

  if (authLoading) {
    return <div className="text-center py-8">加载中...</div>;
  }

  if (!user) {
    return null;
  }

  // 如果显示创建表单
  if (showCreateForm) {
    return (
      <div className="max-w-4xl mx-auto p-4 pb-20">
        <button
          onClick={() => setShowCreateForm(false)}
          className="mb-4 text-gray-600 hover:text-gray-800 font-semibold flex items-center gap-1"
        >
          <span>←</span> 返回
        </button>
        <CreateCharacter onCreated={handleCharacterCreated} />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)] md:h-screen bg-gray-50 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
      {/* 左侧导航栏 */}
      <div className={`${mobileView === 'detail' ? 'hidden md:flex' : 'flex'} w-full md:w-auto flex-col h-full`}>
        <CharacterSidebar
            characters={characters}
            selectedCharacterId={selectedCharacterId}
            onSelectCharacter={handleCharacterSelect}
            onCreateNew={() => setShowCreateForm(true)}
            pendingCount={pendingCount}
            terminationCount={terminationCount}
            unreadMsgCount={unreadMsgCount}
            onShowNotifications={() => setShowNotifications(true)}
            onShowTerminations={() => setShowTerminations(true)}
            onOpenMailbox={() => {
                setUnreadMsgCount(0);
            }}
        />
      </div>

      {/* 右侧内容区 */}
      <div className={`${mobileView === 'list' ? 'hidden md:flex' : 'flex'} flex-1 h-full overflow-hidden`}>
        <CharacterDetail 
            character={selectedCharacter} 
            onCharacterUpdated={handleCharacterUpdated}
            onCharacterDeleted={handleCharacterDeleted}
            onCharacterSelect={handleCharacterSelect}
            onBack={() => setMobileView("list")} // Pass back handler
        />
      </div>

      {/* 关系通知对话框 */}
      <RelationshipNotifications
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        onUpdate={() => {
          // 刷新待确认计数
          if (characters.length > 0) {
            const charIds = characters.map((c) => c.id);
            supabase
              .from("character_relationship_requests")
              .select("id")
              .in("to_character_id", charIds)
              .eq("status", "pending")
              .then(({ data }) => {
                setPendingCount(data?.length || 0);
              });
          }
        }}
      />

      {/* 解除关系通知对话框 */}
      <TerminationNotifications
        isOpen={showTerminations}
        onClose={() => setShowTerminations(false)}
        onUpdate={() => {
          // 刷新解除请求计数
          setTerminationCount(0);
        }}
      />
    </div>
  );
}


