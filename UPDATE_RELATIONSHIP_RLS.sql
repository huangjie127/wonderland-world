-- 更新关系表的 RLS 策略，允许所有用户查看已确立的关系

-- 1. 删除旧的查看策略
DROP POLICY IF EXISTS "View own relationships" ON character_relationship_requests;

-- 2. 创建新的查看策略
-- 允许查看的情况：
-- a. 关系状态是 'accepted' (已确立的关系对所有人可见)
-- b. 用户是关系的当事人（发起方或接收方的拥有者，用于查看 pending/rejected 状态）
CREATE POLICY "View relationships" ON character_relationship_requests FOR SELECT
USING (
  status = 'accepted'
  OR
  from_character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
  OR 
  to_character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
);
