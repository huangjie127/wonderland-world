# 📔 事件系统数据库配置

## 第一步：进入 Supabase SQL Editor

1. 打开 https://app.supabase.com
2. 选择你的项目
3. 左侧菜单 → **SQL Editor**
4. 点击 **New Query**

## 第二步：执行以下 SQL

复制下面的完整脚本，粘贴到 SQL 编辑器，点击 **Run**：

```sql
-- 创建事件系统表

-- 1. 自定义事件表 (SELF EVENTS)
CREATE TABLE IF NOT EXISTS character_events (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  character_id bigint NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'SELF', -- SELF
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. 角色互动事件表 (INTERACTION EVENTS)
CREATE TABLE IF NOT EXISTS character_interactions (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  host_character_id bigint NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  guest_character_id bigint NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'INTERACTION', -- INTERACTION
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 启用 RLS

ALTER TABLE character_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_interactions ENABLE ROW LEVEL SECURITY;

-- RLS 策略 - character_events

-- 用户可以查看自己角色的事件
CREATE POLICY "View own character events" ON character_events FOR SELECT
USING (
  character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
);

-- 用户只能添加自己角色的事件
CREATE POLICY "Create own character events" ON character_events FOR INSERT
WITH CHECK (
  character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
);

-- 用户只能编辑自己的事件
CREATE POLICY "Update own events" ON character_events FOR UPDATE
USING (
  character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
);

-- 用户只能删除自己的事件
CREATE POLICY "Delete own events" ON character_events FOR DELETE
USING (
  character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
);

-- RLS 策略 - character_interactions

-- 主角色所有者或访客所有者可以查看互动事件
CREATE POLICY "View character interactions" ON character_interactions FOR SELECT
USING (
  host_character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
  OR guest_character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
);

-- 访客所有者可以创建互动事件
CREATE POLICY "Create interactions" ON character_interactions FOR INSERT
WITH CHECK (
  guest_character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
);

-- 创建索引以加快查询
CREATE INDEX IF NOT EXISTS events_character_idx ON character_events(character_id);
CREATE INDEX IF NOT EXISTS events_created_at_idx ON character_events(created_at);
CREATE INDEX IF NOT EXISTS interactions_host_idx ON character_interactions(host_character_id);
CREATE INDEX IF NOT EXISTS interactions_guest_idx ON character_interactions(guest_character_id);
CREATE INDEX IF NOT EXISTS interactions_created_at_idx ON character_interactions(created_at);
```

## 第三步：验证成功

执行后应该显示 "Success"，然后：

1. 进入 **Tables** 标签
2. 应该能看到两个新表：
   - `character_events` - 自定义事件
   - `character_interactions` - 互动事件
3. 进入 **Authentication → Policies** 查看 RLS 策略

## ✅ 完成！

事件系统数据库配置完成。
