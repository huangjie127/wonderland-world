# 📸 相册描述功能数据库配置

## 第一步：进入 Supabase SQL Editor

1. 打开 https://app.supabase.com
2. 选择你的项目
3. 左侧菜单 → **SQL Editor**
4. 点击 **New Query**

## 第二步：执行以下 SQL

复制下面的完整脚本，粘贴到 SQL 编辑器，点击 **Run**：

```sql
-- 添加 description 字段到 character_albums 表
ALTER TABLE character_albums 
ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';

-- 创建索引以加快查询
CREATE INDEX IF NOT EXISTS albums_character_id_idx ON character_albums(character_id);
```

## 第三步：验证成功

执行后应该显示 "Success"，然后：

1. 进入 **Tables** 标签
2. 点击 `character_albums` 表
3. 应该能看到新增的 `description` 字段

## ✅ 完成！

相册描述字段已添加，现在可以保存图片描述了。
