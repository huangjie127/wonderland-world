# 🚀 Supabase 快速设置（仅需 5 分钟）

## 第一步：进入 Supabase SQL Editor

```
https://app.supabase.com
  → 选择你的项目
  → SQL Editor (左侧菜单)
  → New Query
```

## 第二步：复制粘贴这个完整脚本

```sql
DROP TABLE IF EXISTS character_likes CASCADE;
DROP TABLE IF EXISTS character_comments CASCADE;
DROP TABLE IF EXISTS character_relations CASCADE;
DROP TABLE IF EXISTS character_albums CASCADE;
DROP TABLE IF EXISTS character_event_logs CASCADE;
DROP TABLE IF EXISTS characters CASCADE;

CREATE TABLE characters (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX characters_user_id_idx ON characters(user_id);
CREATE INDEX characters_created_at_idx ON characters(created_at);

ALTER TABLE characters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own characters"
ON characters FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own characters"
ON characters FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own characters"
ON characters FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own characters"
ON characters FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view all characters"
ON characters FOR SELECT USING (auth.role() = 'authenticated');

CREATE TABLE character_event_logs (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  character_id bigint NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE character_event_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own events" ON character_event_logs FOR SELECT
USING (character_id IN (SELECT id FROM characters WHERE user_id = auth.uid()));

CREATE POLICY "Insert own events" ON character_event_logs FOR INSERT
WITH CHECK (character_id IN (SELECT id FROM characters WHERE user_id = auth.uid()));

CREATE POLICY "Delete own events" ON character_event_logs FOR DELETE
USING (character_id IN (SELECT id FROM characters WHERE user_id = auth.uid()));

CREATE TABLE character_albums (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  character_id bigint NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE character_albums ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own albums" ON character_albums FOR SELECT
USING (character_id IN (SELECT id FROM characters WHERE user_id = auth.uid()));

CREATE POLICY "Insert own albums" ON character_albums FOR INSERT
WITH CHECK (character_id IN (SELECT id FROM characters WHERE user_id = auth.uid()));

CREATE POLICY "Delete own albums" ON character_albums FOR DELETE
USING (character_id IN (SELECT id FROM characters WHERE user_id = auth.uid()));

CREATE TABLE character_relations (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  character_id bigint NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  related_character_id bigint NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE character_relations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own relations" ON character_relations FOR SELECT
USING (character_id IN (SELECT id FROM characters WHERE user_id = auth.uid()));

CREATE POLICY "Insert own relations" ON character_relations FOR INSERT
WITH CHECK (character_id IN (SELECT id FROM characters WHERE user_id = auth.uid()));

CREATE TABLE character_comments (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  character_id bigint NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE character_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View all comments" ON character_comments FOR SELECT USING (true);

CREATE POLICY "Insert comments" ON character_comments FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE TABLE character_likes (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  character_id bigint NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(character_id, user_id)
);

ALTER TABLE character_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View likes" ON character_likes FOR SELECT USING (true);

CREATE POLICY "Insert likes" ON character_likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Delete likes" ON character_likes FOR DELETE
USING (auth.uid() = user_id);
```

## 第三步：执行脚本

1. 复制上面的整个脚本（从第一个 `--` 到最后）
2. 粘贴到 SQL 编辑器
3. 点击 **"Run"** 按钮（或按 Ctrl+Enter）
4. 等待完成（应该显示 "Success"）

## 第四步：创建 Storage Bucket

```
Supabase 控制台
  → Storage (左侧菜单)
  → Create new bucket
  → Name: avatars
  → Public: ✓ (勾选)
  → Create bucket
```

## 第五步：（可选）配置 Storage RLS

在 SQL Editor 中执行：

```sql
CREATE POLICY "Users can upload their avatars"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Public read avatars"
ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can delete their avatars"
ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

## ✅ 完成！

现在你的 Supabase 已经完全配置好了。

**验证：**
1. 进入 **Tables** 标签，应该能看到 6 张表
2. 进入 **Authentication → Policies**，应该能看到所有策略
3. 进入 **Storage**，应该能看到 `avatars` bucket

## 🧪 快速测试

进入 SQL Editor，执行：

```sql
SELECT auth.uid();

SELECT * FROM characters WHERE user_id = auth.uid();

SELECT * FROM pg_policies WHERE tablename = 'characters';
```

## 📚 遇到问题？

查看 `SUPABASE_SETUP_GUIDE.md` 的故障排除部分

