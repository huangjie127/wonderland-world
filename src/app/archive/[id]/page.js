import { supabase } from "@/lib/supabaseClient";
import CharacterDetail from "@/components/CharacterDetail";

// 强制动态渲染，确保每次访问都获取最新数据
export const dynamic = "force-dynamic";

export default async function ArchiveCharacterPage({ params }) {
  const { id } = await params;
  const { data: character } = await supabase.from("characters").select("*").eq("id", id).single();

  if (!character) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center">
        <h1 className="text-2xl font-bold text-gray-600">角色不存在</h1>
        <p className="text-gray-500 mt-2">ID: {id}</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-6">
      <CharacterDetail character={character} />
    </div>
  );
}
