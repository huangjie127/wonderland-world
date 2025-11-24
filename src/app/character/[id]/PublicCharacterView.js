"use client";

import { useRouter } from "next/navigation";
import CharacterDetail from "@/components/CharacterDetail";
import Link from "next/link";

export default function PublicCharacterView({ character }) {
  const router = useRouter();

  const handleCharacterSelect = (id) => {
    router.push(`/character/${id}`);
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-100px)]">
      <main className="flex-1 container mx-auto max-w-4xl py-4">
        <CharacterDetail 
          character={character} 
          onCharacterSelect={handleCharacterSelect}
        />
      </main>
      
      <footer className="py-8 text-center text-gray-500 text-sm border-t mt-8">
        <p className="mb-2">© {new Date().getFullYear()} OCBase. All rights reserved.</p>
        <p className="text-xs text-gray-400">
          Create your own OC world and share with friends.
        </p>
      </footer>
    </div>
  );
}
