"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import LevelUpModal from "@/components/LevelUpModal";

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [levelModal, setLevelModal] = useState({ isOpen: false, level: 1, title: "" });
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    // 检查初始登录状态
    const checkUser = async () => {
      const { data } = await supabase.auth.getSession();
      const currentUser = data?.session?.user || null;
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        fetchProfile(currentUser.id);
        performDailyCheckIn(currentUser.id);
      }
    };

    checkUser();

    // 监听认证状态变化
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUser = session?.user || null;
      setUser(currentUser);
      if (event === 'SIGNED_IN' && currentUser) {
        fetchProfile(currentUser.id);
        performDailyCheckIn(currentUser.id);
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId) => {
    const { data } = await supabase
      .from("profiles")
      .select("points, level")
      .eq("id", userId)
      .single();
    if (data) setUserProfile(data);
  };

  const performDailyCheckIn = async (userId) => {
    try {
      const res = await fetch("/api/user/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.claimed) {
          console.log("Daily login claimed:", data);
          // Update local profile state
          setUserProfile(prev => ({ ...prev, points: data.newPoints, level: data.newLevel }));
        }
        if (data.leveledUp) {
          setLevelModal({
            isOpen: true,
            level: data.newLevel,
            title: data.levelTitle
          });
          // Update local profile state
          setUserProfile(prev => ({ ...prev, points: data.newPoints, level: data.newLevel }));
        }
      }
    } catch (err) {
      console.error("Check-in failed", err);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('activeCharacterId');
    setUser(null);
    setUserProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, userProfile }}>
      {children}
      <LevelUpModal 
        isOpen={levelModal.isOpen} 
        level={levelModal.level} 
        title={levelModal.title} 
        onClose={() => setLevelModal(prev => ({ ...prev, isOpen: false }))} 
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
