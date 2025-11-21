# Supabase 数据库配置指南

## 🔐 Part 1: RLS (行级安全) 策略设置

### 什么是 RLS？
RLS (Row Level Security) 确保用户只能访问属于自己的数据。这是安全关键的配置。

---

## 第一步：在 Supabase 中创建 characters 表

### 1.1 进入 SQL 编辑器

```
Supabase 控制台
  → SQL Editor
  → 新建 Query
```

### 1.2 创建 characters 表

复制以下 SQL 并执行：

```sql
-- 创建 characters 表
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

-- 创建索引提高查询性能
CREATE INDEX characters_user_id_idx ON characters(user_id);
CREATE INDEX characters_created_at_idx ON characters(created_at);
```

**说明：**
- `id`: 自增主键
- `user_id`: 外键，关联 auth.users 表，用户删除时级联删除其角色
- `name`: 角色名称
- `tagline`: 标语
- `description`: 详细描述
- `avatar_url`: 头像 URL
- `created_at`, `updated_at`: 时间戳

---

## 第二步：启用 RLS

### 2.1 打开 RLS

```
Supabase 控制台
  → Authentication (认证)
  → Policies (策略)
```

或在 SQL 编辑器中执行：

```sql
-- 启用 RLS
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
```

---

## 第三步：创建 RLS 策略

### 方法 A：使用 SQL (推荐)

在 SQL Editor 中执行以下策略：

#### **策略 1: 用户只能看到自己的角色**

```sql
CREATE POLICY "Users can view their own characters"
ON characters
FOR SELECT
USING (auth.uid() = user_id);
```

**说明：**
- `FOR SELECT`: 应用于 SELECT 查询
- `USING (auth.uid() = user_id)`: 条件 - 只有拥有者可以查看

#### **策略 2: 用户只能插入自己的角色**

```sql
CREATE POLICY "Users can insert their own characters"
ON characters
FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

**说明：**
- `FOR INSERT`: 应用于 INSERT 操作
- `WITH CHECK`: 插入时检查条件

#### **策略 3: 用户只能更新自己的角色**

```sql
CREATE POLICY "Users can update their own characters"
ON characters
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

**说明：**
- `USING`: 检查更新前的数据
- `WITH CHECK`: 检查更新后的数据

#### **策略 4: 用户只能删除自己的角色**

```sql
CREATE POLICY "Users can delete their own characters"
ON characters
FOR DELETE
USING (auth.uid() = user_id);
```

#### **策略 5: 所有认证用户可以查看所有角色（社区库）**

```sql
CREATE POLICY "Authenticated users can view all characters"
ON characters
FOR SELECT
USING (auth.role() = 'authenticated');
```

---

### 方法 B：使用 Supabase 控制台图形界面

#### **步骤 1: 进入 Auth 设置**

```
Dashboard
  → Authentication (左侧菜单)
  → Policies (或 RLS)
```

#### **步骤 2: 选择表**

找到 `characters` 表，点击 "New Policy" 或 "Add Policy"

#### **步骤 3: 配置策略**

**为 SELECT 创建策略:**

```
Policy name: Users can view their own characters
Policy target: characters table
Statement: SELECT
Check: auth.uid() = user_id
```

点击 "Review" → "Save policy"

**重复上述步骤创建其他 4 个策略**

---

## 第四步：创建其他相关表

### 4.1 character_event_logs 表（事件记录）

```sql
CREATE TABLE character_event_logs (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  character_id bigint NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE character_event_logs ENABLE ROW LEVEL SECURITY;

-- RLS 策略
CREATE POLICY "Users can view events of their characters"
ON character_event_logs
FOR SELECT
USING (
  character_id IN (
    SELECT id FROM characters WHERE user_id = auth.uid()
  )
  OR
  EXISTS (SELECT 1 FROM characters WHERE id = character_id AND user_id = auth.uid())
);

CREATE POLICY "Users can insert events to their characters"
ON character_event_logs
FOR INSERT
WITH CHECK (
  character_id IN (
    SELECT id FROM characters WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their events"
ON character_event_logs
FOR DELETE
USING (
  character_id IN (
    SELECT id FROM characters WHERE user_id = auth.uid()
  )
);
```

### 4.2 character_albums 表（相册）

```sql
CREATE TABLE character_albums (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  character_id bigint NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE character_albums ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view albums of their characters"
ON character_albums
FOR SELECT
USING (
  character_id IN (
    SELECT id FROM characters WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert albums to their characters"
ON character_albums
FOR INSERT
WITH CHECK (
  character_id IN (
    SELECT id FROM characters WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their albums"
ON character_albums
FOR DELETE
USING (
  character_id IN (
    SELECT id FROM characters WHERE user_id = auth.uid()
  )
);
```

### 4.3 character_relations 表（关系档案）

```sql
CREATE TABLE character_relations (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  character_id bigint NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  related_character_id bigint NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE character_relations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view relations of their characters"
ON character_relations
FOR SELECT
USING (
  character_id IN (
    SELECT id FROM characters WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert relations to their characters"
ON character_relations
FOR INSERT
WITH CHECK (
  character_id IN (
    SELECT id FROM characters WHERE user_id = auth.uid()
  )
);
```

### 4.4 character_comments 表（评论）

```sql
CREATE TABLE character_comments (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  character_id bigint NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE character_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view comments"
ON character_comments
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert comments"
ON character_comments
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can delete their comments"
ON character_comments
FOR DELETE
USING (character_id IN (SELECT id FROM characters WHERE user_id = auth.uid()));
```

### 4.5 character_likes 表（点赞）

```sql
CREATE TABLE character_likes (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  character_id bigint NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(character_id, user_id)
);

ALTER TABLE character_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view likes"
ON character_likes
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert likes"
ON character_likes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their likes"
ON character_likes
FOR DELETE
USING (auth.uid() = user_id);
```

---

## 第五步：配置 Storage RLS（头像存储）

### 5.1 创建 avatars bucket

```
Supabase 控制台
  → Storage (左侧菜单)
  → Create a new bucket
```

**配置：**
- Name: `avatars`
- Public: ✓ (勾选 - 允许公开读取)

### 5.2 为 Storage 设置 RLS 策略

在 SQL 编辑器执行：

```sql
-- 允许用户上传到自己的文件夹
CREATE POLICY "Users can upload to their own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 允许所有人读取 avatars bucket（因为它是公开的）
CREATE POLICY "Public read access for avatars"
ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');

-- 允许用户删除自己的文件
CREATE POLICY "Users can delete their own avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

---

## 📋 完整检查清单

### Supabase 控制台

- [ ] **SQL Editor**: 执行所有表创建语句
- [ ] **Authentication**: 已启用邮箱认证
- [ ] **Storage**: 创建了 `avatars` bucket
- [ ] **RLS Policies**: 
  - [ ] characters 表有 5 个策略
  - [ ] character_event_logs 表有 3 个策略
  - [ ] character_albums 表有 3 个策略
  - [ ] character_relations 表有 2 个策略
  - [ ] character_comments 表有 3 个策略
  - [ ] character_likes 表有 3 个策略

### 代码中

- [ ] `.env.local` 包含 Supabase URL 和 key
- [ ] `supabaseClient.js` 已配置
- [ ] 所有表的查询已更新（如果需要）

---

## 🧪 测试 RLS

### 测试用户隔离

```javascript
// 用户 A 创建角色
await supabase
  .from('characters')
  .insert({ name: 'Alice', user_id: userA.id });

// 用户 B 尝试查看用户 A 的角色（应该失败）
const { data, error } = await supabase
  .from('characters')
  .select('*')
  .eq('user_id', userA.id);

console.log(error); // 应该有权限错误
```

### 使用 Supabase 的 SQL 查询编辑器测试

```
Supabase 控制台
  → SQL Editor
  → 选择 authenticated 或 anonymous 角色
  → 执行查询
```

---

## 🔧 故障排除

### 问题 1: 插入时出错 "new row violates row-level security policy"

**原因**: 未正确设置 `user_id`

**解决**: 确保在代码中设置正确的 `user_id`：

```javascript
const { data: { user } } = await supabase.auth.getUser();

await supabase
  .from('characters')
  .insert({
    name: formData.name,
    user_id: user.id,  // 确保这里正确
    // ... 其他字段
  });
```

### 问题 2: 无法看到数据

**原因**: RLS 策略过于严格

**解决**: 检查策略中的条件是否正确：

```sql
-- 查看当前用户 ID
SELECT auth.uid();

-- 检查数据
SELECT * FROM characters WHERE user_id = auth.uid();
```

### 问题 3: 公开浏览社区库时无权限

**原因**: 需要额外的策略允许浏览

**解决**: 添加策略：

```sql
-- 允许已认证用户查看所有角色
CREATE POLICY "Authenticated users can view all characters for community"
ON characters
FOR SELECT
USING (auth.role() = 'authenticated');
```

---

## 📚 有用的 SQL 查询

### 查看所有策略

```sql
SELECT * FROM pg_policies WHERE tablename = 'characters';
```

### 禁用 RLS (开发用，生产不推荐)

```sql
ALTER TABLE characters DISABLE ROW LEVEL SECURITY;
```

### 删除所有策略

```sql
DROP POLICY IF EXISTS "policy_name" ON characters;
```

---

## 🚀 最佳实践

1. **始终在生产环境启用 RLS** - 保护用户数据
2. **为每个操作创建独立策略** - SELECT、INSERT、UPDATE、DELETE
3. **定期审查策略** - 检查是否有漏洞
4. **在代码中验证权限** - 不要仅依赖 RLS
5. **备份数据** - 使用 Supabase 的备份功能
6. **测试策略** - 用不同用户账户测试

