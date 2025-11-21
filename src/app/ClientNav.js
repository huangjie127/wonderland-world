"use client";

import Link from "next/link";

export default function ClientNav() {
  return (
    <nav className="bg-gray-100 p-4 flex gap-4">
      <Link className="font-semibold" href="/home">创建角色</Link>
      <Link className="font-semibold" href="/archive">档案馆</Link>
    </nav>
  );
}
