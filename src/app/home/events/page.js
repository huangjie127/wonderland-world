"use client";
import { useState } from "react";
import AddEvent from "@/components/AddEvent";

export default function EventPage() {
  const [characterId, setCharacterId] = useState(1);
  
  return (
    <div className="p-6">
      <h1 className="text-xl mb-4">添加事件记录</h1>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">选择角色 ID</label>
        <input
          type="number"
          value={characterId}
          onChange={(e) => setCharacterId(Number(e.target.value))}
          className="border rounded px-2 py-1 w-40"
        />
      </div>
      <AddEvent characterId={characterId} />
    </div>
  );
}
