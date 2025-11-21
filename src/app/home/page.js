"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function HomePage() {
  const [formData, setFormData] = useState({
    name: "",
    tagline: "",
    description: "",
    avatar_url: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from("characters").insert([formData]);
      if (error) throw error;
      alert("角色创建成功！");
      setFormData({ name: "", tagline: "", description: "", avatar_url: "" });
    } catch (error) {
      console.error("Error:", error);
      alert("创建失败：" + error.message);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">创建新角色</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">角色名称</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full border rounded px-3 py-2"
            placeholder="输入角色名称"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">标签</label>
          <input
            type="text"
            name="tagline"
            value={formData.tagline}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
            placeholder="角色标签"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">描述</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
            rows="4"
            placeholder="角色描述"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">头像URL</label>
          <input
            type="url"
            name="avatar_url"
            value={formData.avatar_url}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
            placeholder="https://example.com/avatar.jpg"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 text-white rounded px-4 py-2 font-medium hover:bg-blue-700"
        >
          创建角色
        </button>
      </form>
    </div>
  );
}
