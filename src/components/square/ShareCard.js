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
            className="w-[375px] relative overflow-hidden flex flex-col"
            style={{ 
              minHeight: "600px",
              backgroundColor: '#fdfbf7',
              color: '#1f2937'
            }}
          >
            {/* GRIS Style Background: Watercolor Clouds */}
            <div className="absolute inset-0 z-0" style={{
                background: 'linear-gradient(180deg, #fff1f2 0%, #fdfbf7 50%, #f0f9ff 100%)', // Pale pink -> Cream -> Pale Blue
            }}></div>

            {/* Watercolor Blob 1 (Teal/Blue) - Top Right */}
            <div className="absolute top-[-10%] right-[-20%] w-[400px] h-[400px] rounded-full z-0"
                style={{
                    background: 'radial-gradient(circle, rgba(204,251,241,0.4) 0%, rgba(204,251,241,0) 70%)',
                    filter: 'blur(60px)'
                }}
            ></div>

            {/* Watercolor Blob 2 (Pink/Rose) - Bottom Left */}
            <div className="absolute bottom-[10%] left-[-10%] w-[350px] h-[350px] rounded-full z-0"
                style={{
                    background: 'radial-gradient(circle, rgba(253,164,175,0.2) 0%, rgba(253,164,175,0) 70%)',
                    filter: 'blur(50px)'
                }}
            ></div>

            {/* Geometric Sun/Moon (GRIS signature) - Centered & Subtle */}
            <div className="absolute top-[12%] left-1/2 -translate-x-1/2 w-56 h-56 rounded-full z-0"
                style={{
                    backgroundColor: 'rgba(255,255,255,0.6)',
                    boxShadow: '0 0 40px rgba(255,255,255,0.8)'
                }}
            ></div>
            
            {/* Vertical Line - Structure */}
            <div className="absolute top-8 bottom-8 left-8 w-px z-0" 
                 style={{ 
                     background: 'linear-gradient(180deg, transparent, rgba(31, 41, 55, 0.1), transparent)' 
                 }}>
            </div>

            {/* Plants (SVG) - Bottom Left */}
            <div className="absolute bottom-0 left-0 z-0 opacity-30 pointer-events-none" style={{ width: '160px', height: '160px' }}>
                <svg viewBox="0 0 100 100" fill="none" stroke="#4b5563" strokeWidth="0.5" style={{ width: '100%', height: '100%' }}>
                     {/* Stem 1 */}
                     <path d="M20 100 Q 25 70 10 40" />
                     <circle cx="10" cy="40" r="2" fill="#4b5563" stroke="none" opacity="0.6" />
                     {/* Stem 2 */}
                     <path d="M20 100 Q 35 60 45 30" />
                     <circle cx="45" cy="30" r="3" fill="#4b5563" stroke="none" opacity="0.6" />
                     {/* Stem 3 */}
                     <path d="M20 100 Q 10 80 0 60" />
                     <circle cx="0" cy="60" r="1.5" fill="#4b5563" stroke="none" opacity="0.6" />
                </svg>
            </div>
            
            {/* Plants (SVG) - Bottom Right */}
            <div className="absolute bottom-0 right-0 z-0 opacity-30 pointer-events-none" style={{ width: '140px', height: '140px', transform: 'scaleX(-1)' }}>
                <svg viewBox="0 0 100 100" fill="none" stroke="#4b5563" strokeWidth="0.5" style={{ width: '100%', height: '100%' }}>
                     <path d="M80 100 Q 70 60 90 30" />
                     <circle cx="90" cy="30" r="2.5" fill="#4b5563" stroke="none" opacity="0.6" />
                     <path d="M80 100 Q 90 70 100 50" />
                     <circle cx="100" cy="50" r="2" fill="#4b5563" stroke="none" opacity="0.6" />
                </svg>
            </div>

            {/* Header */}
            <div className="p-8 pb-4 flex items-center gap-4 z-10 relative">
              <div 
                className="w-14 h-14 rounded-full overflow-hidden shrink-0" 
                style={{ 
                    border: '1px solid rgba(0,0,0,0.1)',
                    backgroundColor: '#f3f4f6'
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
                <h2 className="text-lg font-bold tracking-wide" style={{ color: '#374151', fontFamily: 'serif' }}>{username}</h2>
                <div className="text-[10px] mt-1 tracking-widest uppercase opacity-60" style={{ color: '#4b5563' }}>
                  {new Date(createdAt).toLocaleDateString("zh-CN").replace(/\//g, '.')}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-8 py-2 flex-1 z-10 flex flex-col relative">
              {/* Tags - Minimalist */}
              {(worldTag || mood || tone) && (
                <div className="flex flex-wrap gap-2 mb-6 opacity-70">
                  {worldTag && <span className="px-2 py-0.5 text-[10px] border rounded-sm" style={{ backgroundColor: 'transparent', borderColor: '#c7d2fe', color: '#3730a3' }}>{worldTag}</span>}
                  {mood && <span className="px-2 py-0.5 text-[10px] border rounded-sm" style={{ backgroundColor: 'transparent', borderColor: '#fbcfe8', color: '#9d174d' }}>#{mood}</span>}
                </div>
              )}

              {/* Text - Elegant Serif */}
              <div className="leading-loose font-serif text-base whitespace-pre-wrap mb-8" style={{ color: '#1f2937' }}>
                {renderContent(contentText)}
              </div>

              {/* Image - Clean Frame */}
              {contentImageUrl && (
                <div 
                    className="mb-8 overflow-hidden relative" 
                    style={{ 
                        boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)'
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

            {/* Footer - Minimalist */}
            <div className="p-8 pt-4 mt-auto z-10 text-center relative">
              <div className="flex flex-col items-center justify-center gap-2" style={{ color: '#9ca3af' }}>
                <div className="w-1 h-8 mb-2" style={{ backgroundColor: '#e0e7ff' }}></div>
                <span className="text-[10px] tracking-[0.3em] uppercase font-serif">Wonderland · OCbase</span>
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
