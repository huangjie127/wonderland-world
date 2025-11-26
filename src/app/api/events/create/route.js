import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { addPoints } from "@/lib/pointService";
import { POINT_REWARDS } from "@/lib/levelSystem";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabaseClient";

const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request) {
  const supabase = createClient(SUPABASE_URL, supabaseServiceKey || SUPABASE_ANON_KEY);

  try {
    const { character_id, title, content, image_url, type, is_public } = await request.json();

    if (!character_id || !title || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Fetch character to get user_id
    const { data: char, error: charError } = await supabase
        .from("characters")
        .select("user_id")
        .eq("id", character_id)
        .single();
        
    if (charError || !char) {
        return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }

    // Insert event
    const { data, error } = await supabase
      .from("character_events")
      .insert([{
        character_id,
        title,
        content,
        image_url: image_url || null,
        type: type || "SELF",
        is_public: is_public !== undefined ? is_public : true,
      }])
      .select()
      .single();

    if (error) throw error;

    // Award points
    const pointResult = await addPoints(char.user_id, POINT_REWARDS.EVENT, "EVENT");

    return NextResponse.json({ ...data, pointResult });
  } catch (err) {
    console.error("Event creation error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
