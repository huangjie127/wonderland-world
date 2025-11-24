import { supabase } from "@/lib/supabaseClient";
import PublicCharacterView from "./PublicCharacterView";
import Link from "next/link";

// Generate Metadata for SEO and Social Sharing
export async function generateMetadata({ params }) {
  const { id } = params;
  
  const { data: character } = await supabase
    .from("characters")
    .select("name, tagline, description, avatar_url")
    .eq("id", id)
    .single();

  if (!character) {
    return {
      title: "Character Not Found - OCBase",
    };
  }

  const title = `${character.name} - OCBase`;
  const description = character.tagline || character.description?.slice(0, 150) || "Check out this character on OCBase!";
  const images = character.avatar_url ? [character.avatar_url] : [];

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images,
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images,
    },
  };
}

export default async function PublicCharacterPage({ params }) {
  const { id } = params;

  // Fetch character data
  const { data: character, error } = await supabase
    .from("characters")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !character) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">404</h1>
          <p className="text-gray-600 mb-8">Character not found</p>
          <Link href="/" className="text-indigo-600 hover:underline">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return <PublicCharacterView character={character} />;
}
