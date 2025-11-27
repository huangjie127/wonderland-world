-- Add parent_id to post_comments to support replies
ALTER TABLE post_comments 
ADD COLUMN IF NOT EXISTS parent_id bigint REFERENCES post_comments(id) ON DELETE CASCADE;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS post_comments_parent_idx ON post_comments(parent_id);