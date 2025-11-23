-- Add title column to character_events table
ALTER TABLE character_events 
ADD COLUMN IF NOT EXISTS title TEXT;

-- Update existing events to have a title based on content (first 10 chars)
UPDATE character_events 
SET title = SUBSTRING(REGEXP_REPLACE(content, '^\[.*?\]\s*', '') FROM 1 FOR 10)
WHERE title IS NULL OR title = '';
