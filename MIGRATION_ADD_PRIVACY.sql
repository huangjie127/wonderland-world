-- 1. 增加隐私控制字段
ALTER TABLE character_albums ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE;
ALTER TABLE character_events ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE;

-- 2. 更新相册 (Albums) 的 RLS 策略
-- 为了确保"私密"内容真的不可见，我们需要更新数据库的安全策略
-- 注意：请根据您实际的策略名称调整 DROP 语句，或者在 Supabase 后台手动删除旧的 SELECT 策略

-- 尝试删除可能存在的旧策略 (名称可能不同，请检查)
DROP POLICY IF EXISTS "Public view albums" ON character_albums;
DROP POLICY IF EXISTS "Everyone can view albums" ON character_albums;
DROP POLICY IF EXISTS "Users can view albums of their characters" ON character_albums;

-- 创建新策略：拥有者可见所有，其他人仅可见公开
CREATE POLICY "View albums: Owner all, Public only is_public"
ON character_albums FOR SELECT
USING (
  -- 如果是拥有者 (通过关联 characters 表检查 user_id)
  (SELECT user_id FROM characters WHERE id = character_albums.character_id) = auth.uid()
  OR
  -- 或者 是公开的
  is_public = true
);

-- 3. 更新事件 (Events) 的 RLS 策略
DROP POLICY IF EXISTS "Public view events" ON character_events;
DROP POLICY IF EXISTS "Everyone can view events" ON character_events;
DROP POLICY IF EXISTS "Users can view events of their characters" ON character_events;

CREATE POLICY "View events: Owner all, Public only is_public"
ON character_events FOR SELECT
USING (
  (SELECT user_id FROM characters WHERE id = character_events.character_id) = auth.uid()
  OR
  is_public = true
);
