# 🔗 关系解除功能数据库配置

## 第一步：进入 Supabase SQL Editor

1. 打开 https://app.supabase.com
2. 选择你的项目
3. 左侧菜单 → **SQL Editor**
4. 点击 **New Query**

## 第二步：执行以下 SQL

复制下面的完整脚本，粘贴到 SQL 编辑器，点击 **Run**：

```sql
-- 创建关系解除申请表
CREATE TABLE IF NOT EXISTS character_relationship_terminations (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  relationship_id bigint NOT NULL REFERENCES character_relationship_requests(id) ON DELETE CASCADE,
  requested_by bigint NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending/accepted/rejected
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 启用 RLS
ALTER TABLE character_relationship_terminations ENABLE ROW LEVEL SECURITY;

-- 删除旧策略（如果存在）
DROP POLICY IF EXISTS "View termination requests" ON character_relationship_terminations;
DROP POLICY IF EXISTS "Create termination requests" ON character_relationship_terminations;
DROP POLICY IF EXISTS "Handle termination requests" ON character_relationship_terminations;

-- RLS 策略 1: 查看解除请求
CREATE POLICY "View termination requests" ON character_relationship_terminations FOR SELECT
USING (
  requested_by IN (SELECT id FROM characters WHERE user_id = auth.uid())
  OR relationship_id IN (
    SELECT id FROM character_relationship_requests 
    WHERE from_character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
    OR to_character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
  )
);

-- RLS 策略 2: 创建解除申请
CREATE POLICY "Create termination requests" ON character_relationship_terminations FOR INSERT
WITH CHECK (
  requested_by IN (SELECT id FROM characters WHERE user_id = auth.uid())
);

-- RLS 策略 3: 处理解除申请（对方确认/拒绝）
CREATE POLICY "Handle termination requests" ON character_relationship_terminations FOR UPDATE
USING (
  relationship_id IN (
    SELECT id FROM character_relationship_requests 
    WHERE (from_character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
      AND to_character_id != (SELECT requested_by FROM character_relationship_terminations WHERE id = character_relationship_terminations.id))
    OR (to_character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
      AND from_character_id != (SELECT requested_by FROM character_relationship_terminations WHERE id = character_relationship_terminations.id))
  )
);

-- 创建索引优化查询
CREATE INDEX IF NOT EXISTS terminations_relationship_idx ON character_relationship_terminations(relationship_id);
CREATE INDEX IF NOT EXISTS terminations_requested_by_idx ON character_relationship_terminations(requested_by);
CREATE INDEX IF NOT EXISTS terminations_status_idx ON character_relationship_terminations(status);
```

## 第三步：验证成功

执行后应该显示 "Success"，然后：

1. 进入 **Tables** 标签
2. 应该能看到新表 `character_relationship_terminations`
3. 进入 **Authentication → Policies**
4. 应该能看到 3 个新的 RLS 策略

## ✅ 完成！

关系解除系统数据库配置完成。
