import { createClient } from "@supabase/supabase-js";
import { getLevelInfo, LEVEL_THRESHOLDS } from "./levelSystem";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabaseClient";

// Initialize a service role client for admin operations
// We prefer the Service Role Key to bypass RLS for secure point updates.
// If not available, we fall back to Anon Key (which might fail if RLS blocks it).
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(
  SUPABASE_URL,
  supabaseServiceKey || SUPABASE_ANON_KEY
);

if (!supabaseServiceKey) {
  console.warn("⚠️ SUPABASE_SERVICE_ROLE_KEY is missing. Point updates may fail due to RLS.");
}

export async function addPoints(userId, amount, actionType) {
  if (!userId) return null;

  try {
    // 1. Get current profile
    const { data: profile, error: fetchError } = await supabaseAdmin
      .from("profiles")
      .select("points, level")
      .eq("id", userId)
      .single();

    if (fetchError) {
      console.error("Error fetching profile for points:", fetchError);
      return null;
    }

    const currentPoints = profile.points || 0;
    const currentLevel = profile.level || 1;
    const newPoints = currentPoints + amount;

    // 2. Calculate new level
    const newLevelInfo = getLevelInfo(newPoints);
    const newLevel = newLevelInfo.level;

    // 3. Update profile
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({
        points: newPoints,
        level: newLevel,
      })
      .eq("id", userId);

    if (updateError) {
      console.error("Error updating points:", updateError);
      return null;
    }

    // 4. Log the action (optional, fire and forget)
    await supabaseAdmin.from("point_logs").insert({
      user_id: userId,
      amount,
      action_type: actionType,
    });

    // 5. Return result
    return {
      success: true,
      pointsAdded: amount,
      newPoints,
      newLevel,
      leveledUp: newLevel > currentLevel,
      levelTitle: newLevelInfo.title,
    };
  } catch (error) {
    console.error("Error in addPoints:", error);
    return null;
  }
}
