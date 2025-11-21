"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import "./archive.css";

export default function ArchivePage() {
  const [characters, setCharacters] = useState([]);
  const [hoveredId, setHoveredId] = useState(null);

  useEffect(() => {
    const fetchCharacters = async () => {
      const { data } = await supabase
        .from("characters")
        .select("*, photos(*), events(*)")
        .order("created_at", { ascending: true });
      setCharacters(data);
    };
    fetchCharacters();
  }, []);

  return (
    <div className="archive-container">
      {characters.map((char) => (
        <div
          key={char.id}
          className="archive-card"
          onMouseEnter={() => setHoveredId(char.id)}
          onMouseLeave={() => setHoveredId(null)}
        >
          <img src={char.avatar_url} alt={char.name} className="archive-avatar" />
          <p className="archive-name">{char.name}</p>

          {hoveredId === char.id && (
            <div className="archive-hover">
              <p>相册: {char.photos?.length || 0}</p>
              <p>事件: {char.events?.length || 0}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
