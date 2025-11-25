-- Restrict Announcements to Specific Admin User

-- 1. Drop the old policy that allowed all authenticated users
DROP POLICY IF EXISTS "Admins can insert announcements" ON world_announcements;

-- 2. Create a new strict policy
-- Replace 'your-user-uuid-here' with your actual Supabase User UUID
-- You can find this in Supabase Dashboard -> Authentication -> Users
CREATE POLICY "Admins can insert announcements" 
ON world_announcements 
FOR INSERT 
WITH CHECK (
  auth.uid() = 'd4f695b7-77cf-4340-b62b-443a3c166e60'::uuid
);

-- 3. Optional: Allow admin to delete announcements
CREATE POLICY "Admins can delete announcements" 
ON world_announcements 
FOR DELETE 
USING (
  auth.uid() = 'd4f695b7-77cf-4340-b62b-443a3c166e60'::uuid
);
