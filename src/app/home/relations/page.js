"use client";
import { useState, useEffect } from "react";
import AddRelation from "@/components/AddRelation";
import { supabase } from "@/lib/supabaseClient";

export default function RelationsPage() {
  const [characterId, setCharacterId] = useState(1);
  const [allCharacters, setAllCharacters] = useState([]);
  
  useEffect(() => {
    const fetchCharacters = async () => {
      const { data } = await supabase.from("characters").select("*");
      setAllCharacters(data || []);
    };
    fetchCharacters();
  }, []);
  
  return (
    <div className="p-6">
      <h1 className="text-xl mb-4">关系档案</h1>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">选择角色 ID</label>
        <input
          type="number"
          value={characterId}
          onChange={(e) => setCharacterId(Number(e.target.value))}
          className="border rounded px-2 py-1 w-40"
        />
      </div>
      <AddRelation characterId={characterId} allCharacters={allCharacters} />
    </div>
  );
}
