"use client";
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function EventViewPage() {
  const { id } = useParams();
  const router = useRouter();
  const [event, setEvent] = useState(null);
  const [character, setCharacter] = useState(null);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

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

      setEvent(eventData);
      setCharacter(eventData.characters);

      // 获取标签
      const { data: eventTags } = await supabase
        .from('event_tags')
        .select('tag_id, tags(*)')
        .eq('event_id', id);

      if (eventTags) {
        setTags(eventTags.map(et => et.tags));
      }

      // 检查是否是事件所有者
      const { data: { user } } = await supabase.auth.getUser();
      if (user && eventData.characters?.user_id === user.id) {
        setIsOwner(true);
      }

      setLoading(false);
    };

    if (id) fetchEvent();
  }, [id, router]);

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
      <div className="max-w-4xl mx-auto">
        {/* 导航 */}
        <div className="mb-6 flex items-center justify-between">
          <Link href="/home/events" className="text-blue-400 hover:underline">
            ← 返回事件列表
          </Link>
          {isOwner && (
            <Link 
              href={`/events/${id}/edit`}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
            >
              编辑事件
            </Link>
          )}
        </div>

        {/* 事件信息卡片 */}
        <div className="bg-gray-800 rounded-lg p-8 shadow-xl">
          {/* 角色信息 */}
          <div className="mb-6 pb-4 border-b border-gray-700">
            <p className="text-sm text-gray-400">
              事件所属角色: <span className="text-white font-semibold">{character?.name}</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              类型: {event.type} | 创建时间: {new Date(event.created_at).toLocaleString('zh-CN')}
            </p>
          </div>

          {/* 标签 */}
          {tags.length > 0 && (
            <div className="mb-6">
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <span
                    key={tag.id}
                    className="inline-block px-3 py-1 rounded-full text-sm"
                    style={{ backgroundColor: tag.color, color: '#fff' }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 事件内容（富文本渲染） */}
          <div className="mb-8">
            <div 
              className="prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: event.content }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
