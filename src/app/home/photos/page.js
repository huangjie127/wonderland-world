"use client";
import { useState } from "react";
import AddPhoto from "@/components/AddPhoto";

export default function PhotoPage() {
  const [characterId, setCharacterId] = useState(1);
  
  return (
    <div className="p-6">
      <h1 className="text-xl mb-4">相册管理</h1>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">选择角色 ID</label>
        <input
          type="number"
          value={characterId}
          onChange={(e) => setCharacterId(Number(e.target.value))}
          className="border rounded px-2 py-1 w-40"
        />
      </div>
      <AddPhoto characterId={characterId} />
    </div>
  );
}
