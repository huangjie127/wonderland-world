# 🤝 Meet 系统 (轻量跑团) 数据库配置

请在 Supabase SQL Editor 中运行以下 SQL 语句以初始化 Meet 系统。

## 1. 创建核心表

```sql
-- 1. 房间表 (存储场景描述和状态)
CREATE TABLE IF NOT EXISTS meet_rooms (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  scene_description TEXT NOT NULL, -- 随机生成的场景描述
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

-- 2. 房间参与者 (记录谁在哪个房间)
CREATE TABLE IF NOT EXISTS meet_participants (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  room_id bigint REFERENCES meet_rooms(id) ON DELETE CASCADE,
  character_id bigint REFERENCES characters(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(room_id, character_id)
);

-- 3. 房间消息表 (临时存储房间内的对话和行动)
-- 注意：这与 character_events 分开，用于房间内的实时显示。
-- 可以在插入此表的同时，通过触发器或前端逻辑写入 character_events。
CREATE TABLE IF NOT EXISTS meet_messages (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  room_id bigint REFERENCES meet_rooms(id) ON DELETE CASCADE,
  character_id bigint REFERENCES characters(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('chat', 'action')), -- 区分对话和行动
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. 等待队列表 (简单的匹配机制)
CREATE TABLE IF NOT EXISTS meet_queue (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  character_id bigint REFERENCES characters(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'waiting', -- waiting, matched
  UNIQUE(character_id) -- 确保每个角色只能排一个队
);
```

## 2. 启用 RLS (Row Level Security)

```sql
ALTER TABLE meet_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE meet_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE meet_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE meet_queue ENABLE ROW LEVEL SECURITY;

-- 简单起见，MVP 阶段允许公开读写 (或者您可以限制为登录用户)
-- 实际生产环境建议限制为只能读取自己所在的房间

-- Rooms
CREATE POLICY "Public read rooms" ON meet_rooms FOR SELECT USING (true);
CREATE POLICY "Public insert rooms" ON meet_rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update rooms" ON meet_rooms FOR UPDATE USING (true);

-- Participants
CREATE POLICY "Public read participants" ON meet_participants FOR SELECT USING (true);
CREATE POLICY "Public insert participants" ON meet_participants FOR INSERT WITH CHECK (true);

-- Messages
CREATE POLICY "Public read messages" ON meet_messages FOR SELECT USING (true);
CREATE POLICY "Public insert messages" ON meet_messages FOR INSERT WITH CHECK (true);

-- Queue
CREATE POLICY "Public read queue" ON meet_queue FOR SELECT USING (true);
CREATE POLICY "Public insert queue" ON meet_queue FOR INSERT WITH CHECK (true);
CREATE POLICY "Public delete queue" ON meet_queue FOR DELETE USING (true);
```

## 3. 实时订阅配置 (Realtime)

为了让聊天和匹配实时更新，需要为这些表启用 Realtime。

1. 进入 Supabase Dashboard -> **Database** -> **Replication**.
2. 找到 `supabase_realtime` publication.
3. 点击该行左侧的 **Source** (或者 Toggle 开关).
4. 确保勾选了以下表：
   - `meet_queue`
   - `meet_rooms`
   - `meet_messages`
   - `meet_participants`

或者执行 SQL:
```sql
alter publication supabase_realtime add table meet_queue;
alter publication supabase_realtime add table meet_rooms;
alter publication supabase_realtime add table meet_messages;
alter publication supabase_realtime add table meet_participants;
```
