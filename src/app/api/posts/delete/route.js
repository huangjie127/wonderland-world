import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    const { post_id, user_id } = await request.json();

    if (!post_id || !user_id) {
      return NextResponse.json({ error: "Missing post_id or user_id" }, { status: 400 });
    }

    // 1. Verify ownership
    const { data: post, error: fetchError } = await supabase
      .from("character_posts")
      .select("author_user_id")
      .eq("id", post_id)
      .single();

    if (fetchError || !post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.author_user_id !== user_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // 2. Delete post
    const { error: deleteError } = await supabase
      .from("character_posts")
      .delete()
      .eq("id", post_id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
