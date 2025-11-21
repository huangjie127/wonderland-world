"use client";
import AddCharacterCard from "@/src/components/CharacterCard";

export default function AvatarPage() {
  return (
    <div className="p-6">
      <h1 className="text-xl mb-4">上传头像</h1>
      <AddCharacterCard />
    </div>
  );
}
