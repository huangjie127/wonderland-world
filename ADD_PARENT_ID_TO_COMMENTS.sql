-- Add parent_id column to post_comments (Square) and character_interactions (Guestbook)
-- This is required for the recursive reply feature.

-- 1. Add parent_id to post_comments
ALTER TABLE post_comments 
ADD COLUMN IF NOT EXISTS parent_id bigint REFERENCES post_comments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_post_comments_parent_id ON post_comments(parent_id);

-- 2. Add parent_id to character_interactions
ALTER TABLE character_interactions 
ADD COLUMN IF NOT EXISTS parent_id bigint REFERENCES character_interactions(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_character_interactions_parent_id ON character_interactions(parent_id);
