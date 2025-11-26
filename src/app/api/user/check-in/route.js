import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { addPoints } from "@/lib/pointService";
import { POINT_REWARDS } from "@/lib/levelSystem";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabaseClient";

const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(
  SUPABASE_URL,
  supabaseServiceKey || SUPABASE_ANON_KEY
);

export async function POST(request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    // Check last login reward
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("last_login_reward")
      .eq("id", userId)
      .single();

    if (error) throw error;

    const now = new Date();
    const lastReward = profile.last_login_reward ? new Date(profile.last_login_reward) : null;

    // Check if already claimed today (simple date comparison)
    // We use UTC dates for simplicity or server local time. 
    // Ideally we should use the user's timezone, but for simplicity we'll use server time (UTC usually).
    const isSameDay = lastReward && 
      lastReward.getUTCFullYear() === now.getUTCFullYear() &&
      lastReward.getUTCMonth() === now.getUTCMonth() &&
      lastReward.getUTCDate() === now.getUTCDate();

    if (isSameDay) {
      return NextResponse.json({ claimed: false, message: "Already claimed today" });
    }

    // Award points
    const result = await addPoints(userId, POINT_REWARDS.LOGIN, "LOGIN");

    // Update last_login_reward timestamp
    await supabaseAdmin
      .from("profiles")
      .update({ last_login_reward: now.toISOString() })
      .eq("id", userId);

    return NextResponse.json({ 
      claimed: true, 
      ...result 
    });

  } catch (error) {
    console.error("Check-in error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
