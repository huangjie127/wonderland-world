import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { addPoints } from "@/lib/pointService";
import { POINT_REWARDS } from "@/lib/levelSystem";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabaseClient";

const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request) {
  const supabase = createClient(SUPABASE_URL, supabaseServiceKey || SUPABASE_ANON_KEY);
  
  try {
    const { post_id, user_id, content, character_id, parent_id } = await request.json();

    if (!user_id || !post_id || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Insert comment
    const { data, error } = await supabase
      .from("post_comments")
      .insert([{ 
        post_id, 
        user_id, 
        content,
        character_id: character_id || null,
        parent_id: parent_id || null
      }])
      .select()
      .single();
    
    if (error) throw error;

    // 2. Increment comment count
    await supabase.rpc("increment_comments", { row_id: post_id });

    // 3. Award points
    const pointResult = await addPoints(user_id, POINT_REWARDS.COMMENT, "COMMENT");

    return NextResponse.json({ ...data, pointResult });
  } catch (err) {
    console.error("Comment error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
