"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import "./home.css";

export default function HomePage() {
  const [stats, setStats] = useState({
    photos: 0,
    events: 0,
    relations: 0,
    avatars: 0,
  });

  useEffect(() => {
    const load = async () => {
      let { count: photos } = await supabase.from("photos").select("*", { count: "exact", head: true });
      let { count: events } = await supabase.from("events").select("*", { count: "exact", head: true });
      let { count: relations } = await supabase.from("relations").select("*", { count: "exact", head: true });
      let { count: avatars } = await supabase.from("characters").select("*", { count: "exact", head: true });

      setStats({ photos, events, relations, avatars });
    };

    load();
  }, []);

  const blocks = [
    { id: 1, label: `头像设定 (${stats.avatars})`, size: "small", href: "/home/avatar" },
    { id: 2, label: `相册 (${stats.photos})`, size: "large", href: "/home/photos" },
    { id: 3, label: `事件记录 (${stats.events})`, size: "medium", href: "/home/events" },
    { id: 4, label: `关系档案 (${stats.relations})`, size: "medium", href: "/home/relations" },
  ];

  return (
    <div className="home-container">
      {blocks.map((block) => (
        <Link key={block.id} href={block.href} className={`block ${block.size}`}>
          <span className="label">{block.label}</span>
        </Link>
      ))}
    </div>
  );
}


