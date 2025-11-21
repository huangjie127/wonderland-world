// app/archive/page.js
import { supabase } from "@/lib/supabaseClient";
import CharacterCard from "@/components/CharacterCard";

export default async function ArchivePage() {
  const { data: characters } = await supabase.from("characters").select("*").order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">档案馆</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {characters?.map(c => (
          <CharacterCard key={c.id} character={c} />
        ))}
      </div>
    </div>
  );
}
