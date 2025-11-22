"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AddEventDialog({ isOpen, onClose, characterId, onEventAdded }) {
  const [content, setContent] = useState("");
  const [eventType, setEventType] = useState("worldview"); // worldview, story, mood
  const [saving, setSaving] = useState(false);

  const eventTypes = [
    { value: "worldview", label: "🌍 世界观记录", emoji: "🌍" },
    { value: "story", label: "📖 小故事", emoji: "📖" },
    { value: "mood", label: "📝 心情/日记", emoji: "📝" },
    { value: "timeline", label: "⏰ 时间线节点", emoji: "⏰" },
  ];

  const handleSubmit = async () => {
    if (!content.trim()) {
      alert("请输入事件内容");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("character_events").insert([
        {
          character_id: characterId,
          type: "SELF",
          content: `[${eventType}] ${content}`,
        },
      ]);

      if (error) throw error;

      setContent("");
      setEventType("worldview");
      if (onEventAdded) onEventAdded();
      onClose();
    } catch (err) {
      alert("添加事件失败：" + err.message);
      console.error("Error adding event:", err);
    }
    setSaving(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">📝 添加事件</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* 事件类型选择 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            事件类型
          </label>
          <div className="grid grid-cols-2 gap-2">
            {eventTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => setEventType(type.value)}
                className={`p-3 rounded-lg border-2 transition text-sm font-semibold ${
                  eventType === type.value
                    ? "border-indigo-600 bg-indigo-50"
                    : "border-gray-200 hover:border-indigo-300"
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* 内容输入 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            事件内容 *
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="描述发生了什么...（最多 500 字）"
            maxLength={500}
            rows={6}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
          <p className="text-xs text-gray-500 mt-1">
            {content.length}/500
          </p>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 font-semibold transition"
          >
            {saving ? "保存中..." : "💾 保存事件"}
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
