"use client";
import AddEvent from "@/src/components/AddEvent";

export default function EventPage() {
  return (
    <div className="p-6">
      <h1 className="text-xl mb-4">添加事件记录</h1>
      <AddEvent />
    </div>
  );
}
