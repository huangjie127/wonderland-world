"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function LevelUpModal({ isOpen, onClose, level, title }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative bg-white rounded-2xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl transform transition-all scale-100 animate-in zoom-in-95 duration-300 border-4 border-yellow-400/30">
        {/* Background Glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-yellow-50 to-white rounded-2xl -z-10" />
        
        {/* Icon/Badge */}
        <div className="mx-auto w-24 h-24 bg-gradient-to-br from-yellow-300 to-orange-400 rounded-full flex items-center justify-center mb-6 shadow-lg ring-4 ring-white relative">
          <span className="text-4xl animate-bounce">🌟</span>
          <div className="absolute -bottom-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full border-2 border-white">
            Lv.{level}
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-800 mb-2">恭喜升级！</h2>
        <p className="text-gray-500 mb-6">
          你获得了新的称号
        </p>

        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-8">
          <span className="block text-sm text-yellow-600 font-medium mb-1">当前称号</span>
          <span className="text-xl font-bold text-yellow-800 tracking-wide">
            {title}
          </span>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all active:scale-95"
        >
          太棒了！
        </button>
        
        {/* Confetti effects could be added here */}
      </div>
    </div>,
    document.body
  );
}
