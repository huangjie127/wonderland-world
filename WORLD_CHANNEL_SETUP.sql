-- World Channel System Tables

-- 1. System Announcements Table
CREATE TABLE IF NOT EXISTS world_announcements (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  content TEXT NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. World Chat Table
CREATE TABLE IF NOT EXISTS world_chat (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  content TEXT NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  character_id bigint REFERENCES characters(id) ON DELETE SET NULL, -- If character is deleted, keep message but lose link
  is_anonymous BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE world_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE world_chat ENABLE ROW LEVEL SECURITY;

-- Policies for Announcements
DROP POLICY IF EXISTS "Everyone can read announcements" ON world_announcements;
CREATE POLICY "Everyone can read announcements" ON world_announcements FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert announcements" ON world_announcements;
CREATE POLICY "Admins can insert announcements" ON world_announcements FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policies for Chat
DROP POLICY IF EXISTS "Everyone can read chat" ON world_chat;
CREATE POLICY "Everyone can read chat" ON world_chat FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert chat" ON world_chat;
CREATE POLICY "Users can insert chat" ON world_chat FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Indexes
CREATE INDEX IF NOT EXISTS world_chat_created_at_idx ON world_chat(created_at);
