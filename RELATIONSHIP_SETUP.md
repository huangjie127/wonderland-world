# 关系系统数据库配置

在 Supabase SQL Editor 中执行以下 SQL：

```sql
-- 创建关系请求表
CREATE TABLE IF NOT EXISTS character_relationship_requests (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  from_character_id bigint NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  to_character_id bigint NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  from_role TEXT NOT NULL,
  to_role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 启用 RLS
ALTER TABLE character_relationship_requests ENABLE ROW LEVEL SECURITY;

-- RLS 策略
DROP POLICY IF EXISTS "View own relationships" ON character_relationship_requests;
CREATE POLICY "View own relationships" ON character_relationship_requests FOR SELECT
USING (
  from_character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
  OR to_character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Create relationships" ON character_relationship_requests;
CREATE POLICY "Create relationships" ON character_relationship_requests FOR INSERT
WITH CHECK (
  from_character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Update relationships" ON character_relationship_requests;
CREATE POLICY "Update relationships" ON character_relationship_requests FOR UPDATE
USING (
  to_character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
);

-- 创建索引
CREATE INDEX IF NOT EXISTS relationships_from_idx ON character_relationship_requests(from_character_id);
CREATE INDEX IF NOT EXISTS relationships_to_idx ON character_relationship_requests(to_character_id);
CREATE INDEX IF NOT EXISTS relationships_status_idx ON character_relationship_requests(status);
```

执行后，关系系统的数据库就会准备好！
