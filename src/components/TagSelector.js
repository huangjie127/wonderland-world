"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function TagSelector({ eventId, selectedTags = [], onChange }) {
  const [allTags, setAllTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTagName, setNewTagName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .order('name');

    if (!error && data) {
      setAllTags(data);
    }
    setLoading(false);
  };

  const handleToggleTag = async (tag) => {
    const isSelected = selectedTags.some(t => t.id === tag.id);

    if (isSelected) {
      // 移除标签
      const { error } = await supabase
        .from('event_tags')
        .delete()
        .match({ event_id: eventId, tag_id: tag.id });

      if (!error) {
        onChange(selectedTags.filter(t => t.id !== tag.id));
      }
    } else {
      // 添加标签
      const { error } = await supabase
        .from('event_tags')
        .insert({ event_id: eventId, tag_id: tag.id });

      if (!error) {
        onChange([...selectedTags, tag]);
      }
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    setCreating(true);
    const { data, error } = await supabase
      .from('tags')
      .insert({ name: newTagName.trim() })
      .select()
      .single();

    if (!error && data) {
      setAllTags([...allTags, data]);
      setNewTagName('');
      // 自动选中新创建的标签
      handleToggleTag(data);
    } else if (error?.code === '23505') {
      alert('该标签已存在');
    }

    setCreating(false);
  };

  if (loading) {
    return <div className="text-gray-400 text-sm">加载标签中...</div>;
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">
        事件标签
      </label>

      {/* 已选标签 */}
      {selectedTags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {selectedTags.map(tag => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm"
              style={{ backgroundColor: tag.color + '40', color: '#fff' }}
            >
              {tag.name}
              <button
                onClick={() => handleToggleTag(tag)}
                className="hover:bg-black hover:bg-opacity-20 rounded-full px-1"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      {/* 所有标签 */}
      <div className="bg-gray-700 rounded-lg p-3 mb-3">
        <div className="flex flex-wrap gap-2 mb-2">
          {allTags.map(tag => {
            const isSelected = selectedTags.some(t => t.id === tag.id);
            return (
              <button
                key={tag.id}
                onClick={() => handleToggleTag(tag)}
                className={`px-3 py-1 rounded-full text-sm transition ${
                  isSelected 
                    ? 'ring-2 ring-white ring-opacity-50' 
                    : 'hover:ring-1 ring-gray-400'
                }`}
                style={{ backgroundColor: tag.color, color: '#fff' }}
              >
                {tag.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* 创建新标签 */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
          placeholder="创建新标签..."
          className="flex-1 bg-gray-700 text-white rounded px-3 py-1 text-sm border border-gray-600 focus:border-blue-500 focus:outline-none"
        />
        <button
          onClick={handleCreateTag}
          disabled={creating || !newTagName.trim()}
          className="px-4 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded text-sm"
        >
          {creating ? '...' : '+ 创建'}
        </button>
      </div>
    </div>
  );
}
