-- Add parent_id to character_interactions to support replies
ALTER TABLE character_interactions 
ADD COLUMN IF NOT EXISTS parent_id bigint REFERENCES character_interactions(id) ON DELETE CASCADE;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS interactions_parent_idx ON character_interactions(parent_id);
