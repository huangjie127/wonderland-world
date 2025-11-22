"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/app/providers";
import { useRouter } from "next/navigation";
import CharacterSidebar from "@/components/CharacterSidebar";
import CharacterDetail from "@/components/CharacterDetail";
import CreateCharacter from "@/components/CreateCharacter";
import RelationshipNotifications from "@/components/RelationshipNotifications";
import "./home.css";

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [characters, setCharacters] = useState([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

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
      
      // 默认选中第一个角色
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
      }
    };

    fetchCharacters();
  }, [user]);

  const handleCharacterCreated = (newCharacter) => {
    setCharacters((prev) => [newCharacter, ...prev]);
    setSelectedCharacterId(newCharacter.id);
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
      setSelectedCharacterId(remainingCharacters.length > 0 ? remainingCharacters[0].id : null);
    }
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
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => setShowCreateForm(false)}
          className="mb-4 text-gray-600 hover:text-gray-800 font-semibold"
        >
          ← 返回
        </button>
        <CreateCharacter onCreated={handleCharacterCreated} />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 左侧导航栏 */}
      <CharacterSidebar
        characters={characters}
        selectedCharacterId={selectedCharacterId}
        onSelectCharacter={setSelectedCharacterId}
        onCreateNew={() => setShowCreateForm(true)}
        pendingCount={pendingCount}
        onShowNotifications={() => setShowNotifications(true)}
      />

      {/* 右侧内容区 */}
      <CharacterDetail 
        character={selectedCharacter} 
        onCharacterUpdated={handleCharacterUpdated}
        onCharacterDeleted={handleCharacterDeleted}
      />

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
    </div>
  );
}


