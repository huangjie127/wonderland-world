"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import CharacterDetail from "@/components/CharacterDetail";
import { useParams } from "next/navigation";

export default function ArchiveCharacterPage() {
  const params = useParams();
  const id = params?.id;
  const [character, setCharacter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;

    const fetchCharacter = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("characters")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;
        setCharacter(data);
      } catch (err) {
        console.error("Error fetching character:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCharacter();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center">
        <p className="text-gray-500">加载中...</p>
      </div>
    );
  }

  if (error || !character) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center">
        <h1 className="text-2xl font-bold text-gray-600">角色不存在</h1>
        <p className="text-gray-500 mt-2">ID: {id}</p>
        {error && <p className="text-red-400 text-sm mt-2">Error: {error}</p>}
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
    <div className="relative z-10 max-w-5xl mx-auto py-6 px-4">
      <CharacterDetail character={character} />
    </div>
    </div>
  );
}
