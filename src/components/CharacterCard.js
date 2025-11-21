import Link from "next/link";

export default function CharacterCard({ character }) {
  return (
    <Link href={`/archive/${character.id}`}>
      <div className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
        <img
          src={character.avatar_url || "/placeholder.png"}
          alt={character.name}
          className="w-full h-48 object-cover"
        />
        <div className="p-4">
          <h3 className="font-semibold text-lg">{character.name}</h3>
          <p className="text-sm text-gray-500">{character.tagline}</p>
          <p className="text-sm text-gray-600 mt-2 line-clamp-2">{character.description}</p>
        </div>
      </div>
    </Link>
  );
}
