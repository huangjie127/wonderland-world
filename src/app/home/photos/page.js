"use client";
import AddPhoto from "@/src/components/AddPhoto";

export default function PhotoPage() {
  return (
    <div className="p-6">
      <h1 className="text-xl mb-4">相册管理</h1>
      <AddPhoto />
    </div>
  );
}
