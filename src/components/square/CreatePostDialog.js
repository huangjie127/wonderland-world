"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

const MOODS = ["高兴", "忧郁", "冷漠", "神秘", "生气", "厌倦"];
const TONES = ["温柔", "高傲", "傲娇", "随性", "疲倦", "冷静"];

export default function CreatePostDialog({ isOpen, onClose, user, characters, onPostCreated, initialContent = "" }) {
  const [loading, setLoading] = useState(false);
  
  // Form Data
  const [selectedCharId, setSelectedCharId] = useState(null);
  const [mood, setMood] = useState("");
  const [tone, setTone] = useState("");
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [worldTag, setWorldTag] = useState("");
  const [allowComments, setAllowComments] = useState(true);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setMood("");
      setTone("");
      setContent(initialContent);
      setImageFile(null);
      setImagePreview(null);
      setWorldTag(""); 
      setAllowComments(true);

      // Auto-select character if only one
      if (characters.length === 1) {
        setSelectedCharId(characters[0].id);
      } else if (characters.length > 0 && !selectedCharId) {
        setSelectedCharId(characters[0].id); 
      }
    }
  }, [isOpen, characters, initialContent]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!selectedCharId) return alert("请选择一个角色");
    if (!content.trim()) return alert("请输入内容");
    setLoading(true);

    try {
      let imageUrl = null;

      // Upload Image if exists
      if (imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);
        formData.append("watermarkText", "OCBase"); // Optional watermark
        
        const uploadRes = await fetch("/api/upload-watermark", {
          method: "POST",
          body: formData,
        });
        
        if (uploadRes.ok) {
          const data = await uploadRes.json();
          imageUrl = data.publicUrl;
        }
      }

      // Create Post
      const res = await fetch("/api/posts/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: selectedCharId,
          content_text: content,
          image_url: imageUrl,
          mood,
          tone,
          world_tag: worldTag,
          allow_comments: allowComments,
        }),
      });

      if (!res.ok) {
        let errorMsg = "发布失败";
        try {
            const errorData = await res.json();
            errorMsg = errorData.error || errorMsg;
        } catch (e) {
            errorMsg = `服务器错误 (${res.status})`;
        }
        throw new Error(errorMsg);
      }

      const newPost = await res.json();
      onPostCreated(newPost);
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full h-full md:h-auto md:max-w-2xl md:rounded-2xl flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 md:fade-in md:zoom-in duration-200">
        
        {/* Header */}
        <div className="px-4 py-3 md:px-6 md:py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
          <h3 className="font-bold text-gray-800 text-lg">发布动态</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl p-2 -mr-2">&times;</button>
        </div>

        {/* Body - Single Page Form */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6">
          
          {/* 1. Character Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 md:mb-3">我是...</label>
            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
              {characters.map(char => (
                <button
                  key={char.id}
                  onClick={() => setSelectedCharId(char.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-full border transition-all flex-shrink-0 ${
                    selectedCharId === char.id 
                      ? "bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500" 
                      : "border-gray-200 bg-white active:bg-gray-50"
                  }`}
                >
                  <img src={char.avatar_url || "/default-avatar.png"} className="w-8 h-8 rounded-full object-cover" />
                  <span className={`text-sm font-medium ${selectedCharId === char.id ? "text-indigo-700" : "text-gray-600"}`}>
                    {char.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Content Editor */}
          <div className="space-y-2">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="此刻在想什么？..."
              className="w-full h-32 md:h-32 p-3 md:p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-base leading-relaxed transition-shadow appearance-none"
            />
          </div>
            
            {/* Image Preview Area */}
            {imagePreview && (
              <div className="mt-3 relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden group shrink-0">
                <img src={imagePreview} className="w-full h-full object-cover" />
                <button 
                  onClick={() => { setImageFile(null); setImagePreview(null); }}
                  className="absolute top-2 right-2 bg-black/60 text-white w-8 h-8 rounded-full flex items-center justify-center active:bg-black/80 transition"
                >
                  &times;
                </button>
              </div>
            )}

          {/* 3. Tools Bar (Mood, Tone, Image, Tag) */}
          <div className="space-y-4 bg-gray-50 p-3 md:p-4 rounded-xl border border-gray-100">
            
            {/* Mood & Tone Selectors */}
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">情绪 Mood</label>
                <div className="flex flex-wrap gap-2">
                  {MOODS.map(m => (
                    <button
                      key={m}
                      onClick={() => setMood(m === mood ? "" : m)}
                      className={`px-2.5 py-1.5 rounded-md text-xs border transition ${mood === m ? "bg-pink-100 border-pink-300 text-pink-700" : "bg-white border-gray-200 text-gray-600 active:bg-gray-50"}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">语气 Tone</label>
                <div className="flex flex-wrap gap-2">
                  {TONES.map(t => (
                    <button
                      key={t}
                      onClick={() => setTone(t === tone ? "" : t)}
                      className={`px-2.5 py-1.5 rounded-md text-xs border transition ${tone === t ? "bg-purple-100 border-purple-300 text-purple-700" : "bg-white border-gray-200 text-gray-600 active:bg-gray-50"}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="h-px bg-gray-200 my-2"></div>

            {/* Bottom Tools */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {/* Add Image Button */}
                <label className="cursor-pointer flex items-center gap-1.5 text-gray-600 active:text-indigo-600 transition px-2 py-1 rounded active:bg-indigo-50">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                  <span className="text-sm font-medium">图片</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>

                {/* World Tag Input */}
                <div className="flex items-center gap-1.5 text-gray-600 px-2 py-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path></svg>
                  <input 
                    type="text" 
                    value={worldTag}
                    onChange={(e) => setWorldTag(e.target.value)}
                    placeholder="添加标签..." 
                    className="bg-transparent border-none focus:ring-0 text-sm w-24 placeholder-gray-400"
                  />
                </div>
              </div>

              {/* Allow Comments Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">允许评论</span>
                <button
                  onClick={() => setAllowComments(!allowComments)}
                  className={`w-8 h-4 rounded-full transition-colors relative ${allowComments ? "bg-green-500" : "bg-gray-300"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 bg-white w-3 h-3 rounded-full transition-transform ${allowComments ? "translate-x-4" : "translate-x-0"}`} />
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex justify-end bg-white shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <button 
            onClick={handleSubmit} 
            disabled={loading}
            className="bg-indigo-600 text-white px-8 py-2.5 rounded-xl font-bold shadow-md active:bg-indigo-700 active:shadow-lg transform active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 w-full md:w-auto justify-center"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                发布中...
              </>
            ) : (
              "发布动态"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
