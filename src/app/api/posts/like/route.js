import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    const { post_id, user_id, action } = await request.json();

    if (!user_id || !post_id) {
      return NextResponse.json({ error: "Missing user_id or post_id" }, { status: 400 });
    }

    if (action === "like") {
      // 1. Check if already liked
      const { data: existing } = await supabase
        .from("post_likes")
        .select("id")
        .eq("post_id", post_id)
        .eq("user_id", user_id)
        .single();

      if (existing) {
        return NextResponse.json({ message: "Already liked" });
      }

      // 2. Insert like
      const { error: insertError } = await supabase
        .from("post_likes")
        .insert([{ post_id, user_id }]);
      
      if (insertError) throw insertError;

      // 3. Increment count
      await supabase.rpc("increment_likes", { row_id: post_id });

    } else {
      // Unlike
      const { error: deleteError } = await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", post_id)
        .eq("user_id", user_id);
        
      if (deleteError) throw deleteError;

      // Decrement count
      await supabase.rpc("decrement_likes", { row_id: post_id });
    }
    
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Like error:", err);
    // Fallback if RPC fails or other error, still return 500 but try to handle gracefully
    // Note: You need to create the RPC functions in Supabase or use a raw query if you prefer.
    // For now, let's assume we will create the RPCs or just update directly (less safe for concurrency but works for MVP)
    
    // Alternative without RPC (Concurrency risk but simple):
    /*
    const { data: post } = await supabase.from('character_posts').select('likes_count').eq('id', post_id).single();
    const newCount = action === 'like' ? (post.likes_count || 0) + 1 : Math.max(0, (post.likes_count || 0) - 1);
    await supabase.from('character_posts').update({ likes_count: newCount }).eq('id', post_id);
    */
   
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
