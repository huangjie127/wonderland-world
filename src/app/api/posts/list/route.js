import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  // Use Service Key to ensure we can fetch character details (avatar) regardless of RLS
  // This is a public feed, so it's safe to expose this data
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    let query = supabase
      .from("character_posts")
      .select(`
        *,
        character:characters(id, name, avatar_url)
      `)
      .order("created_at", { ascending: false })
      .limit(50);

    if (userId) {
      query = query.eq("author_user_id", userId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
