"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AddEventDialog({ isOpen, onClose, characterId, onEventAdded }) {
  const [title, setTitle] = useState("");
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
      // 如果没有输入标题，自动截取内容的前10个字
      const finalTitle = title.trim() || content.trim().substring(0, 10);

      const { error } = await supabase.from("character_events").insert([
        {
          character_id: characterId,
          type: "SELF",
          title: finalTitle,
          content: `[${eventType}] ${content}`,
        },
      ]);

      if (error) throw error;

      setTitle("");
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
    <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-gray-100 flex flex-col animate-scale-in">
        <div className="p-6">
          {/* 头部 */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-800">📝 添加事件</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl transition-colors"
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

          {/* 标题输入 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              事件名称 (可选)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="如果不填，将自动截取内容前10个字"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* 内容输入 */}
          <div className="mb-6">
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
          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold transition shadow-sm btn-feedback"
            >
              {saving ? "保存中..." : "确定"}
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-white border border-gray-300 text-gray-700 py-2.5 rounded-lg hover:bg-gray-50 font-semibold transition shadow-sm btn-feedback"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
