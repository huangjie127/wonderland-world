# 🔗 关系系统数据库配置

## 第一步：进入 Supabase SQL Editor

1. 打开 https://app.supabase.com
2. 选择你的项目
3. 左侧菜单 → **SQL Editor**
4. 点击 **New Query**

## 第二步：执行以下 SQL

复制下面的完整脚本，粘贴到 SQL 编辑器，点击 **Run**：

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

-- 删除旧策略（如果存在）
DROP POLICY IF EXISTS "View own relationships" ON character_relationship_requests;
DROP POLICY IF EXISTS "Create relationships" ON character_relationship_requests;
DROP POLICY IF EXISTS "Update relationships" ON character_relationship_requests;

-- RLS 策略 1: 查看关系
CREATE POLICY "View own relationships" ON character_relationship_requests FOR SELECT
USING (
  from_character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
  OR to_character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
);

-- RLS 策略 2: 创建关系申请
CREATE POLICY "Create relationships" ON character_relationship_requests FOR INSERT
WITH CHECK (
  from_character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
);

-- RLS 策略 3: 更新关系申请（对方确认）
CREATE POLICY "Update relationships" ON character_relationship_requests FOR UPDATE
USING (
  to_character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
);

-- 创建索引优化查询
CREATE INDEX IF NOT EXISTS relationships_from_idx ON character_relationship_requests(from_character_id);
CREATE INDEX IF NOT EXISTS relationships_to_idx ON character_relationship_requests(to_character_id);
CREATE INDEX IF NOT EXISTS relationships_status_idx ON character_relationship_requests(status);
```

## 第三步：验证成功

执行后应该显示 "Success"，然后：

1. 进入 **Tables** 标签
2. 应该能看到新表 `character_relationship_requests`
3. 进入 **Authentication → Policies**
4. 应该能看到 3 个新的 RLS 策略

## ✅ 完成！

数据库配置就绪，现在可以使用关系系统了。

