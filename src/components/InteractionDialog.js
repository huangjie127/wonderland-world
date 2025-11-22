"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/app/providers";

export default function InteractionDialog({ isOpen, onClose, hostCharacterId, hostCharacterName, onInteractionAdded }) {
  const { user } = useAuth();
  const [myCharacters, setMyCharacters] = useState([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState(null);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !user) return;

    const fetchMyCharacters = async () => {
      const { data } = await supabase
        .from("characters")
        .select("id, name, avatar_url")
        .eq("user_id", user.id);

      setMyCharacters(data || []);
      if (data && data.length > 0 && !selectedCharacterId) {
        setSelectedCharacterId(data[0].id);
      }
    };

    fetchMyCharacters();
  }, [isOpen, user]);

  const handleSubmit = async () => {
    if (!content.trim() || !selectedCharacterId) {
      alert("请填写完整的留言信息");
      return;
    }

    setSaving(true);
    try {
      const guestChar = myCharacters.find((c) => c.id === selectedCharacterId);
      
      // 创建互动事件
      const { error } = await supabase.from("character_interactions").insert([
        {
          host_character_id: hostCharacterId,
          guest_character_id: selectedCharacterId,
          type: "INTERACTION",
          content: content,
        },
      ]);

      if (error) throw error;

      setContent("");
      if (onInteractionAdded) onInteractionAdded();
      onClose();
    } catch (err) {
      alert("留言失败：" + err.message);
      console.error("Error adding interaction:", err);
    }
    setSaving(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">💬 给 {hostCharacterName} 留言</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* 选择发言者 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            你的角色 *
          </label>
          {myCharacters.length > 0 ? (
            <select
              value={selectedCharacterId || ""}
              onChange={(e) => setSelectedCharacterId(Number(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {myCharacters.map((char) => (
                <option key={char.id} value={char.id}>
                  {char.name}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-gray-500 text-sm">你还没有创建任何角色</p>
          )}
        </div>

        {/* 留言内容 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            留言内容 *
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`以 ${myCharacters[0]?.name || "你的角色"} 的身份对 ${hostCharacterName} 说...`}
            maxLength={500}
            rows={6}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
          <p className="text-xs text-gray-500 mt-1">
            {content.length}/500
          </p>
        </div>

        {/* 提示 */}
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-700">
            💡 <span className="font-semibold">提示：</span>你的留言会出现在 {hostCharacterName} 的事件时间线中
          </p>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={saving || !selectedCharacterId}
            className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 font-semibold transition"
          >
            {saving ? "发送中..." : "💌 发送留言"}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 font-semibold transition"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
