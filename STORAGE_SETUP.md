# 📦 Supabase Storage 设置指南

## 第一步：创建存储桶 (Bucket)

1. 打开 https://app.supabase.com
2. 选择你的项目
3. 左侧菜单 → **Storage**
4. 点击 **New Bucket**
5. 填写信息：
   - **Name**: `event-images`
   - **Public**: ✅ 勾选（允许公开访问）
6. 点击 **Create Bucket**

## 第二步：配置存储策略 (Policies)

点击刚创建的 `event-images` 存储桶，然后点击 **Policies** 标签，添加以下策略：

### 1. 允许所有人上传图片

```sql
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'event-images');
```

### 2. 允许所有人查看图片

```sql
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'event-images');
```

### 3. 允许用户删除自己上传的图片

```sql
CREATE POLICY "Users can delete own images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'event-images' AND auth.uid()::text = owner);
```

## 第三步：获取存储桶 URL

上传成功后，图片的公开访问 URL 格式为：

```
https://[YOUR_PROJECT_REF].supabase.co/storage/v1/object/public/event-images/[FILE_PATH]
```

示例：
```
https://rjvyiyogcwgvwzchglko.supabase.co/storage/v1/object/public/event-images/user123/image.jpg
```

## ✅ 完成！

现在你可以在前端使用 Supabase 客户端上传图片到这个存储桶了。
