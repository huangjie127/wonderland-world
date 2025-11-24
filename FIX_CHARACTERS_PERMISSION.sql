-- ==========================================
-- 修复角色创建权限 (RLS Policies)
-- ==========================================

-- 1. 确保 RLS 已启用
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;

-- 2. 清理旧策略（防止重复或冲突）
DROP POLICY IF EXISTS "Users can view their own characters" ON characters;
DROP POLICY IF EXISTS "Users can insert their own characters" ON characters;
DROP POLICY IF EXISTS "Users can update their own characters" ON characters;
DROP POLICY IF EXISTS "Users can delete their own characters" ON characters;
DROP POLICY IF EXISTS "Authenticated users can view all characters" ON characters;
DROP POLICY IF EXISTS "Public view characters" ON characters;

-- 3. 重新创建策略

-- 策略 A: 查看 (SELECT)
-- 允许所有已登录用户查看所有角色（用于社交、浏览）
CREATE POLICY "Authenticated users can view all characters"
ON characters FOR SELECT
USING (auth.role() = 'authenticated');

-- 策略 B: 创建 (INSERT)
-- 允许用户创建角色，但必须确保 user_id 是自己
CREATE POLICY "Users can insert their own characters"
ON characters FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 策略 C: 更新 (UPDATE)
-- 只允许用户修改属于自己的角色
CREATE POLICY "Users can update their own characters"
ON characters FOR UPDATE
USING (auth.uid() = user_id);

-- 策略 D: 删除 (DELETE)
-- 只允许用户删除属于自己的角色
CREATE POLICY "Users can delete their own characters"
ON characters FOR DELETE
USING (auth.uid() = user_id);

-- 4. 验证
-- 执行完后，应该可以在 Supabase 的 Authentication -> Policies 中看到这 4 条策略
