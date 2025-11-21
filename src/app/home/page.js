"use client";

import Link from "next/link";
import "./home.css";

export default function HomePage() {
  const blocks = [
    { id: 1, label: "头像设定", size: "small", href: "/home/avatar" },
    { id: 2, label: "相册", size: "large", href: "/home/photos" },
    { id: 3, label: "事件记录", size: "medium", href: "/home/events" },
    { id: 4, label: "关系档案", size: "medium", href: "/home/relations" },
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

