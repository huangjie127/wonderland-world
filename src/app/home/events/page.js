"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/app/providers";
import Link from "next/link";
import AddEventDialog from "@/components/AddEventDialog";

export default function EventsPage() {
  const searchParams = useSearchParams();
  const characterId = searchParams.get("characterId");
  const router = useRouter();
  const { user } = useAuth();

  const [character, setCharacter] = useState(null);
  const [events, setEvents] = useState([]);
  const [groupedEvents, setGroupedEvents] = useState({});
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [showAddEventDialog, setShowAddEventDialog] = useState(false);

  const fetchData = useCallback(async () => {
    if (!characterId) return;
    setLoading(true);
    
    // 1. Fetch Character
    const { data: charData } = await supabase
      .from("characters")
      .select("*")
      .eq("id", characterId)
      .single();
    
    if (!charData) {
        alert("Character not found");
        router.push("/home");
        return;
    }
    setCharacter(charData);
    setIsOwner(user?.id === charData.user_id);

    // 2. Fetch Events
    const { data: eventsData } = await supabase
      .from("character_events")
      .select("*")
      .eq("character_id", characterId)
      .order("created_at", { ascending: false });

    // 3. Fetch Tags for these events
    const eventIds = eventsData?.map(e => e.id) || [];
    let eventTagsData = [];
    
    if (eventIds.length > 0) {
      const { data } = await supabase
          .from("event_tags")
          .select("event_id, tags(id, name, color)")
          .in("event_id", eventIds);
      eventTagsData = data || [];
    }

    // Process data
    const eventsWithTags = (eventsData || []).map(event => {
        const tags = eventTagsData
          .filter(et => et.event_id === event.id)
          .map(et => et.tags);
        
        // Extract title
        const typeMatch = event.content.match(/^\[(.*?)\]/);
        const rawContent = event.content.replace(/^\[.*?\]\s*/, "");
        // Use stored title or fallback to first 10 chars
        const title = event.title || (rawContent.length > 10 ? rawContent.substring(0, 10) + "..." : rawContent);
        
        return {
            ...event,
            tags,
            title,
            rawContent
        };
    });

    setEvents(eventsWithTags);

    // Group by tags
    const groups = {};
    eventsWithTags.forEach(event => {
        if (event.tags && event.tags.length > 0) {
            event.tags.forEach(tag => {
                if (!groups[tag.name]) {
                    groups[tag.name] = [];
                }
                groups[tag.name].push(event);
            });
        } else {
            if (!groups["未分类"]) {
                groups["未分类"] = [];
            }
            groups["未分类"].push(event);
        }
    });
    setGroupedEvents(groups);

    // Select first event if available and none selected
    if (eventsWithTags.length > 0 && !selectedEvent) {
        setSelectedEvent(eventsWithTags[0]);
    }

    setLoading(false);
  }, [characterId, user, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading && !character) return <div className="p-8 text-center">加载中...</div>;
  if (!character) return <div className="p-8 text-center">未找到角色</div>;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
        {/* Left Sidebar: Navigation */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full shadow-sm z-10">
            <div className="p-6 border-b border-gray-200 bg-gray-50">
                <Link href="/home" className="text-sm text-gray-500 hover:text-gray-700 mb-4 block font-medium">
                    ← 返回主页
                </Link>
                
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
                        {character.avatar_url ? (
                            <img src={character.avatar_url} alt={character.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-gray-200 flex items-center justify-center text-lg">👤</div>
                        )}
                    </div>
                    <h2 className="text-lg font-bold text-gray-800 truncate">{character.name}</h2>
                </div>

                {isOwner && (
                    <button
                        onClick={() => setShowAddEventDialog(true)}
                        className="w-full py-2 px-4 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition flex items-center justify-center gap-2"
                    >
                        <span>📝</span> 记录新事件
                    </button>
                )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {Object.keys(groupedEvents).length === 0 ? (
                    <p className="text-gray-500 text-center py-4 text-sm">暂无事件</p>
                ) : (
                    Object.entries(groupedEvents).map(([tagName, groupEvents]) => (
                        <div key={tagName} className="mb-6 last:mb-0">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-2 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                                {tagName}
                            </h3>
                            <div className="space-y-0.5">
                                {groupEvents.map(event => (
                                    <button
                                        key={`${tagName}-${event.id}`}
                                        onClick={() => setSelectedEvent(event)}
                                        className={`w-full text-left px-3 py-2 text-sm transition-colors border-l-2 ${
                                            selectedEvent?.id === event.id
                                                ? "border-indigo-600 bg-indigo-50 text-indigo-700 font-medium"
                                                : "border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                        }`}
                                    >
                                        {event.title}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>

        {/* Right Content: Event Detail */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
            {selectedEvent ? (
                <div className="flex-1 overflow-y-auto p-8 md:p-12">
                    <div className="max-w-3xl mx-auto">
                        <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-100">
                            <div>
                                <div className="flex flex-wrap items-center gap-3 mb-3">
                                    <span className="text-sm text-gray-500 font-medium">
                                        {new Date(selectedEvent.created_at).toLocaleString("zh-CN", {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </span>
                                    {selectedEvent.tags && selectedEvent.tags.map(tag => (
                                        <span 
                                            key={tag.id} 
                                            className="px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                                            style={{ backgroundColor: tag.color || '#9ca3af' }}
                                        >
                                            {tag.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            
                            {isOwner && (
                                <Link
                                    href={`/events/${selectedEvent.id}/edit`}
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
                                >
                                    <span>✏️</span> 编辑
                                </Link>
                            )}
                        </div>

                        <div className="prose prose-lg prose-indigo max-w-none">
                             <div 
                                className="whitespace-pre-wrap text-gray-800 leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: selectedEvent.rawContent }}
                             />
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                    <div className="text-6xl mb-4">📖</div>
                    <p className="text-lg font-medium">选择一个事件查看详情</p>
                </div>
            )}
        </div>

        {/* Add Event Dialog */}
        <AddEventDialog
            isOpen={showAddEventDialog}
            onClose={() => setShowAddEventDialog(false)}
            characterId={character.id}
            onEventAdded={() => {
                setShowAddEventDialog(false);
                fetchData();
            }}
        />
    </div>
  );
}
