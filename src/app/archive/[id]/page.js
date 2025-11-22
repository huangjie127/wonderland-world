import { supabase } from "@/lib/supabaseClient";
import CharacterDetail from "@/components/CharacterDetail";

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

export default async function ArchiveCharacterPage({ params }) {
  const { id } = await params;
  const { data: character } = await supabase.from("characters").select("*").eq("id", id).single();

  if (!character) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center">
        <h1 className="text-2xl font-bold text-gray-600">角色不存在</h1>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-6">
      <CharacterDetail character={character} />
    </div>
  );
}
