"use client";

import { useRef, useState, useEffect } from "react";
import html2canvas from "html2canvas";

export default function ShareCard({ 
  isOpen, 
  onClose, 
  avatarUrl, 
  username, 
  contentText, 
  contentImageUrl, 
  createdAt,
  worldTag,
  mood,
  tone
}) {
  const cardRef = useRef(null);
  const [generating, setGenerating] = useState(false);
  const [proxyAvatarUrl, setProxyAvatarUrl] = useState(null);
  const [proxyContentUrl, setProxyContentUrl] = useState(null);

  // Helper to get proxy URL
  const getProxyUrl = (url) => {
    if (!url) return null;
    // If it's already a data URL or local path, return as is
    if (url.startsWith('data:') || url.startsWith('/')) return url;
    // Otherwise use our proxy
    return `/api/proxy-image?url=${encodeURIComponent(url)}`;
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setGenerating(true);

    try {
      // Wait for images to load
      const images = cardRef.current.getElementsByTagName("img");
      await Promise.all(
        Array.from(images).map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        })
      );

      const canvas = await html2canvas(cardRef.current, {
        useCORS: true, // Enable cross-origin images (works with proxy)
        scale: 2, // Higher resolution
        backgroundColor: null, // Transparent background if needed, but we set white in CSS
        logging: false,
        allowTaint: false, 
      });

      const dataUrl = canvas.toDataURL("image/png");
      
      // Trigger download
      const link = document.createElement("a");
      link.download = `ocbase-share-${Date.now()}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      onClose();
    } catch (err) {
      console.error("Failed to generate card:", err);
      alert("生成卡片失败，请重试");
    } finally {
      setGenerating(false);
    }
  };

  // Helper to render text with blue hashtags
  const renderContent = (text) => {
    if (!text) return null;
    
    // Split by newlines to handle paragraphs
    return text.split('\n').map((line, i) => (
      <div key={i} className={i > 0 ? "mt-1" : ""}>
        {line.split(/(\s+)/).map((part, j) => {
          if (part.startsWith('#')) {
            return <span key={j} style={{ color: '#2563eb', fontWeight: 500 }}>{part}</span>;
          }
          return <span key={j}>{part}</span>;
        })}
      </div>
    ));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="min-h-full w-full flex flex-col items-center justify-center p-4 py-10">
        
        {/* Close Button (Fixed Top Right) */}
        <button 
          onClick={onClose}
          className="fixed top-4 right-4 z-[110] w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition"
        >
          ✕
        </button>

        {/* Card Preview Area */}
        <div className="relative shadow-2xl rounded-xl overflow-hidden mb-8 max-w-full">
          {/* The actual card to be captured */}
          <div 
            ref={cardRef}
            className="w-[375px] bg-[#fdfbf7] relative overflow-hidden flex flex-col"
            style={{ 
              minHeight: "600px",
              backgroundImage: "url('https://www.transparenttextures.com/patterns/cream-paper.png')",
              color: '#1f2937'
            }}
          >
            {/* Decorative Border */}
            <div className="absolute inset-0 border-[12px] border-transparent pointer-events-none z-20"
                 style={{ borderImage: "url(https://www.transparenttextures.com/patterns/rough-cloth.png) 30 round" }}>
            </div>

            {/* Watercolor Blobs (Background) */}
            <div className="absolute top-[-50px] right-[-50px] w-40 h-40 rounded-full blur-3xl" style={{ backgroundColor: 'rgba(199, 210, 254, 0.3)' }}></div>
            <div className="absolute bottom-[-50px] left-[-50px] w-40 h-40 rounded-full blur-3xl" style={{ backgroundColor: 'rgba(251, 207, 232, 0.3)' }}></div>

            {/* Header */}
            <div className="p-8 pb-4 flex items-center gap-4 z-10">
              <div 
                className="w-16 h-16 rounded-full border-4 overflow-hidden shrink-0" 
                style={{ 
                    backgroundColor: '#e5e7eb',
                    borderColor: '#ffffff',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)'
                }}
              >
                <img 
                  src={getProxyUrl(avatarUrl) || "/default-avatar.png"} 
                  alt={username} 
                  className="w-full h-full object-cover"
                  crossOrigin="anonymous"
                  onError={(e) => {
                    e.target.onerror = null; 
                    e.target.src = "/default-avatar.png";
                  }}
                />
              </div>
              <div>
                <h2 className="text-xl font-bold leading-tight" style={{ color: '#111827' }}>{username}</h2>
                <div className="text-xs mt-1 font-serif italic" style={{ color: '#6b7280' }}>
                  {new Date(createdAt).toLocaleDateString("zh-CN")} · OCbase
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-8 py-2 flex-1 z-10 flex flex-col">
              {/* Tags */}
              {(worldTag || mood || tone) && (
                <div className="flex flex-wrap gap-2 mb-4 opacity-80">
                  {worldTag && <span className="px-2 py-0.5 text-xs rounded-full border" style={{ backgroundColor: 'rgba(224, 231, 255, 0.5)', color: '#4338ca', borderColor: '#e0e7ff' }}>{worldTag}</span>}
                  {mood && <span className="px-2 py-0.5 text-xs rounded-full border" style={{ backgroundColor: 'rgba(252, 231, 243, 0.5)', color: '#be185d', borderColor: '#fce7f3' }}>#{mood}</span>}
                </div>
              )}

              {/* Text */}
              <div className="leading-relaxed font-serif text-lg whitespace-pre-wrap mb-6" style={{ color: '#374151' }}>
                {renderContent(contentText)}
              </div>

              {/* Image */}
              {contentImageUrl && (
                <div 
                    className="mb-6 rounded-lg overflow-hidden border-4 relative" 
                    style={{ 
                        backgroundColor: '#f3f4f6',
                        borderColor: '#ffffff',
                        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                    }}
                >
                  <img 
                    src={getProxyUrl(contentImageUrl)} 
                    alt="Content" 
                    className="w-full h-auto object-cover"
                    crossOrigin="anonymous"
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-8 pt-4 mt-auto z-10 text-center">
              <div className="w-full h-px mb-4" style={{ background: 'linear-gradient(to right, transparent, #d1d5db, transparent)' }}></div>
              <div className="flex items-center justify-center gap-2 font-serif" style={{ color: '#9ca3af' }}>
                <span className="text-xl">🏰</span>
                <span className="text-sm tracking-widest uppercase">OCbase · 世界的碎片</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 sticky bottom-8 z-50">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-white text-gray-700 rounded-full font-medium shadow-lg hover:bg-gray-50 transition"
          >
            关闭
          </button>
          <button
            onClick={handleDownload}
            disabled={generating}
            className="px-6 py-2 bg-indigo-600 text-white rounded-full font-medium shadow-lg hover:bg-indigo-700 transition flex items-center gap-2 disabled:opacity-70"
          >
            {generating ? (
              <>
                <span className="animate-spin">⏳</span> 生成中...
              </>
            ) : (
              <>
                <span>📥</span> 保存卡片
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
