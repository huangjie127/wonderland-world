-- OC动态广场 (Square) 数据库结构设置

-- 1. 创建帖子表 (character_posts)
CREATE TABLE character_posts (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  character_id bigint NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  author_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  content_text TEXT NOT NULL,
  image_url TEXT,
  
  mood TEXT, -- 高兴/忧郁/冷漠/神秘/生气/厌倦
  tone TEXT, -- 温柔/高傲/傲娇/随性/疲倦/冷静
  bg_style TEXT,
  world_tag TEXT,
  
  allow_comments BOOLEAN DEFAULT true,
  likes_count INT DEFAULT 0,
  comments_count INT DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. 创建点赞表 (post_likes)
CREATE TABLE post_likes (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  post_id bigint NOT NULL REFERENCES character_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(post_id, user_id)
);

-- 3. 创建评论表 (post_comments)
CREATE TABLE post_comments (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  post_id bigint NOT NULL REFERENCES character_posts(id) ON DELETE CASCADE,
  character_id bigint REFERENCES characters(id) ON DELETE SET NULL, -- 评论者角色
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- 评论者用户
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. 启用 RLS
ALTER TABLE character_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

-- 5. RLS 策略

-- Posts: 所有人可读，认证用户可创建，作者可删除
CREATE POLICY "Everyone can view posts" ON character_posts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create posts" ON character_posts FOR INSERT WITH CHECK (auth.uid() = author_user_id);
CREATE POLICY "Users can delete their own posts" ON character_posts FOR DELETE USING (auth.uid() = author_user_id);

-- Likes: 所有人可读，认证用户可点赞/取消
CREATE POLICY "Everyone can view likes" ON post_likes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can like" ON post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike" ON post_likes FOR DELETE USING (auth.uid() = user_id);

-- Comments: 所有人可读，认证用户可评论
CREATE POLICY "Everyone can view comments" ON post_comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can comment" ON post_comments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 6. 索引优化
CREATE INDEX idx_posts_created_at ON character_posts(created_at DESC);
CREATE INDEX idx_posts_character_id ON character_posts(character_id);
