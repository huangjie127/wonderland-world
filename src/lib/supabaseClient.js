import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://rjvyiyogcwgvwzchglko.supabase.co";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqdnlpeW9nY3dndnd6Y2hnbGtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MjMyNDcsImV4cCI6MjA3OTI5OTI0N30.bb_YGU3KdS-ZyErVhWSa3q9fnQF4kf8fbyL5XPEE-gQ";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
