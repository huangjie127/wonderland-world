"use client";
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// 动态导入富文本编辑器（避免 SSR 问题）
const RichTextEditor = dynamic(() => import('@/components/RichTextEditor'), {
  ssr: false,
  loading: () => <div className="text-gray-400">编辑器加载中...</div>
});

const TagSelector = dynamic(() => import('@/components/TagSelector'), {
  ssr: false
});

export default function EventEditPage() {
  const { id } = useParams();
  const router = useRouter();
  const [event, setEvent] = useState(null);
  const [character, setCharacter] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      setLoading(true);

      // 获取事件详情
      const { data: eventData, error: eventError } = await supabase
        .from('character_events')
        .select('*, characters(id, name, user_id)')
        .eq('id', id)
        .single();

      if (eventError || !eventData) {
        alert("事件不存在或已被删除");
        router.push('/home/events');
        return;
      }

      // 权限检查
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || eventData.characters?.user_id !== user.id) {
        alert("您没有权限编辑此事件");
        router.push(`/events/${id}`);
        return;
      }

      setEvent(eventData);
      setCharacter(eventData.characters);
      setTitle(eventData.title || '');
      setContent(eventData.content || '');

      // 获取事件的标签
      const { data: eventTags } = await supabase
        .from('event_tags')
        .select('tag_id, tags(*)')
        .eq('event_id', id);

      if (eventTags) {
        setTags(eventTags.map(et => et.tags));
      }

      setLoading(false);
    };

    if (id) fetchEvent();
  }, [id, router]);

  const handleSave = async () => {
    if (!content.trim()) {
      alert("内容不能为空");
      return;
    }

    setSaving(true);

    // 如果没有输入标题，自动截取内容的前10个字
    const finalTitle = title.trim() || content.trim().substring(0, 10);

    const { error } = await supabase
      .from('character_events')
      .update({ 
        title: finalTitle,
        content,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      alert("保存失败: " + error.message);
      setSaving(false);
      return;
    }

    alert("保存成功！");
    router.push(`/events/${id}`);
  };

  const handleDelete = async () => {
    if (!confirm("确定要删除这个事件吗？此操作无法撤销。")) {
      return;
    }

    const { error } = await supabase
      .from('character_events')
      .delete()
      .eq('id', id);

    if (error) {
      alert("删除失败: " + error.message);
      return;
    }

    alert("事件已删除");
    // 返回到事件列表页，并带上 characterId
    router.push(`/home/events?characterId=${character.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <p className="text-gray-400">加载中...</p>
      </div>
    );
  }

  if (!event) return null;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* 导航 */}
        <div className="mb-6">
          <Link href={`/events/${id}`} className="text-blue-400 hover:underline">
            ← 取消编辑
          </Link>
        </div>

        {/* 编辑器卡片 */}
        <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden">
          {/* 头部信息 */}
          <div className="p-6 border-b border-gray-700 bg-gray-800">
            <h1 className="text-2xl font-bold text-white mb-2">编辑事件</h1>
            <p className="text-sm text-gray-400">
              角色: {character?.name} | 类型: {event.type}
            </p>
          </div>

          <div className="flex flex-col md:flex-row h-[calc(100vh-250px)]">
            {/* 左侧栏：元数据 */}
            <div className="w-full md:w-1/3 p-6 border-r border-gray-700 overflow-y-auto bg-gray-800/50">
              <div className="space-y-6">
                {/* 标题输入 */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    事件名称
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="如果不填，将自动截取内容前10个字"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* 标签选择器 */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    标签
                  </label>
                  <TagSelector 
                    eventId={parseInt(id)}
                    selectedTags={tags}
                    onChange={setTags}
                  />
                </div>

                {/* 操作按钮 */}
                <div className="pt-6 border-t border-gray-700 flex flex-col gap-3">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-6 py-3 rounded-lg font-semibold transition text-white"
                  >
                    {saving ? '保存中...' : '保存更改'}
                  </button>
                  <button
                    onClick={handleDelete}
                    className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition text-white"
                  >
                    删除事件
                  </button>
                </div>
              </div>
            </div>

            {/* 右侧栏：内容编辑 */}
            <div className="w-full md:w-2/3 p-6 overflow-y-auto bg-gray-900">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                事件内容
              </label>
              <div className="h-full pb-12">
                <RichTextEditor 
                  content={content}
                  onChange={setContent}
                  className="min-h-[500px]"
                />
                <p className="text-xs text-gray-500 mt-2">
                  💡 提示：使用工具栏进行文本格式化、插入图片等操作
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
