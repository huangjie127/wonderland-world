// app/archive/[id]/page.js
import { supabase } from "@/lib/supabaseClient";
import AddEvent from "@/components/AddEvent";
import AddPhoto from "@/components/AddPhoto";
import AddRelation from "@/components/AddRelation";
import AddComment from "@/components/AddComment";
import LikeButton from "@/components/LikeButton";

export async function generateStaticParams() {
  try {
    const { data: characters } = await supabase
      .from("characters")
      .select("id")
      .limit(100);
    
    return (characters || []).map((character) => ({
      id: String(character.id),
    }));
  } catch (error) {
    console.error("Error generating static params:", error);
    return [];
  }
}

export default async function CharacterDetail({ params }) {
  const id = Number(params.id);
  const { data: character } = await supabase.from("characters").select("*").eq("id", id).single();

  if (!character) {
    return (
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold">角色不存在</h1>
      </div>
    );
  }

  // fetch events, albums, relations, comments, likes count, and all characters for relations dropdown
  const [{ data: events }, { data: albums }, { data: relations }, { data: comments }, { data: likes }, { data: allChars }] = await Promise.all([
    supabase.from("character_event_logs").select("*").eq("character_id", id).order("created_at", { ascending: false }),
    supabase.from("character_albums").select("*").eq("character_id", id).order("created_at", { ascending: false }),
    supabase.from("character_relations").select("*, related:related_character_id (*)").eq("character_id", id),
    supabase.from("character_comments").select("*").eq("character_id", id).order("created_at", { ascending: false }),
    supabase.from("character_likes").select("id").eq("character_id", id),
    supabase.from("characters").select("*").order("created_at", { ascending: false })
  ]);

  const likeCount = (likes || []).length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex gap-4 items-center">
        <img src={character.avatar_url || "/placeholder.png"} alt="" className="w-28 h-28 rounded-full object-cover" />
        <div>
          <h1 className="text-2xl font-bold">{character.name}</h1>
          <p className="text-sm text-gray-500">{character.tagline}</p>
          <p className="mt-2">{character.description}</p>
        </div>
      </div>

      <LikeButton characterId={id} initialCount={likeCount} />

      <section>
        <h2 className="text-lg font-semibold">事件记录</h2>
        <AddEvent characterId={id} />
        <div className="mt-4 space-y-3">
          {events?.map(ev => (
            <div key={ev.id} className="border p-3 rounded">
              <div className="text-sm text-gray-400">{new Date(ev.created_at).toLocaleString()}</div>
              <h3 className="font-semibold">{ev.title}</h3>
              <p>{ev.content}</p>
              {ev.image_url && <img src={ev.image_url} className="mt-2 max-h-64 object-cover" />}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">相册</h2>
        <AddPhoto characterId={id} />
        <div className="mt-3 grid grid-cols-3 gap-2">
          {albums?.map(a => (
            <img key={a.id} src={a.image_url} className="w-full h-24 object-cover rounded" />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">关系档案</h2>
        <AddRelation characterId={id} allCharacters={allChars || []} />
        <div className="mt-3 space-y-2">
          {relations?.map(r => (
            <div key={r.id} className="p-2 border rounded flex items-center gap-3">
              <img src={r.related?.avatar_url || "/placeholder.png"} className="w-10 h-10 rounded-full object-cover" />
              <div>
                <div className="font-semibold">{r.related?.name}</div>
                <div className="text-sm text-gray-500">{r.relation_type}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">评论</h2>
        <AddComment characterId={id} />
        <div className="mt-3 space-y-3">
          {comments?.map(c => (
            <div key={c.id} className="border p-3 rounded">
              <div className="text-sm text-gray-500">{c.author} · {new Date(c.created_at).toLocaleString()}</div>
              <p className="mt-1">{c.content}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
