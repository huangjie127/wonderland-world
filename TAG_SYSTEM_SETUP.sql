-- ==========================================
-- 标签系统数据库脚本
-- ==========================================

-- 1. 标签表
CREATE TABLE IF NOT EXISTS tags (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#6b7280', -- 默认灰色
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. 事件-标签关联表
CREATE TABLE IF NOT EXISTS event_tags (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  event_id bigint NOT NULL REFERENCES character_events(id) ON DELETE CASCADE,
  tag_id bigint NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(event_id, tag_id) -- 防止重复关联
);

-- 3. 启用 RLS
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_tags ENABLE ROW LEVEL SECURITY;

-- 4. 安全策略

-- 所有人可以查看标签
CREATE POLICY "Public view tags" ON tags FOR SELECT USING (true);

-- 认证用户可以创建标签
CREATE POLICY "Authenticated create tags" ON tags FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- 所有人可以查看事件标签关联
CREATE POLICY "Public view event_tags" ON event_tags FOR SELECT USING (true);

-- 用户只能为自己的事件添加标签
CREATE POLICY "Users tag own events" ON event_tags FOR INSERT
WITH CHECK (
  event_id IN (
    SELECT ce.id FROM character_events ce
    JOIN characters c ON ce.character_id = c.id
    WHERE c.user_id = auth.uid()
  )
);

-- 用户只能删除自己事件的标签
CREATE POLICY "Users delete own event tags" ON event_tags FOR DELETE
USING (
  event_id IN (
    SELECT ce.id FROM character_events ce
    JOIN characters c ON ce.character_id = c.id
    WHERE c.user_id = auth.uid()
  )
);

-- 5. 索引优化
CREATE INDEX IF NOT EXISTS event_tags_event_idx ON event_tags(event_id);
CREATE INDEX IF NOT EXISTS event_tags_tag_idx ON event_tags(tag_id);
CREATE INDEX IF NOT EXISTS tags_name_idx ON tags(name);

-- 6. 预设一些常用标签（可选）
INSERT INTO tags (name, color) VALUES
  ('重要', '#ef4444'),
  ('快乐', '#fbbf24'),
  ('悲伤', '#3b82f6'),
  ('冒险', '#10b981'),
  ('日常', '#6b7280'),
  ('秘密', '#8b5cf6'),
  ('回忆', '#ec4899')
ON CONFLICT (name) DO NOTHING;
