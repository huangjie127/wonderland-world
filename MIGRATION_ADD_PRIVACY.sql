-- Add is_public column to character_albums
ALTER TABLE character_albums ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE;

-- Add is_public column to character_events
ALTER TABLE character_events ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE;
