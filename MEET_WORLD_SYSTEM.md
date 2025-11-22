# 🌍 Meet 系统完整重置脚本

请复制以下所有 SQL 代码，并在 Supabase SQL Editor 中一次性运行。
这将清除所有旧的 Meet 数据，并建立完整的“短暂世界”系统（包含记忆归档功能）。

```sql
-- ==========================================
-- 1. 清理旧表 (级联删除，彻底重置)
-- ==========================================
DROP TABLE IF EXISTS meet_messages CASCADE;
DROP TABLE IF EXISTS meet_participants CASCADE;
DROP TABLE IF EXISTS meet_rooms CASCADE;
DROP TABLE IF EXISTS meet_queue CASCADE;
DROP TABLE IF EXISTS meet_control CASCADE;

-- ==========================================
-- 2. 确保事件归档表存在 (用于存储记忆)
-- ==========================================
CREATE TABLE IF NOT EXISTS character_events (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  character_id bigint NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'SELF',
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 启用事件表 RLS
ALTER TABLE character_events ENABLE ROW LEVEL SECURITY;

-- 确保有基本的事件读取策略 (使用 DO 块避免重复创建报错)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'character_events' AND policyname = 'Public view events') THEN
        CREATE POLICY "Public view events" ON character_events FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'character_events' AND policyname = 'User manage own events') THEN
        CREATE POLICY "User manage own events" ON character_events FOR ALL USING (auth.uid() = (SELECT user_id FROM characters WHERE id = character_id));
    END IF;
END
$$;

-- ==========================================
-- 3. 新建 Meet 核心表
-- ==========================================

-- 3.1 房间表
CREATE TABLE meet_rooms (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  title TEXT NOT NULL,
  scene_description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  collapse_at TIMESTAMP WITH TIME ZONE NOT NULL,
  max_players INT DEFAULT 20,
  status TEXT DEFAULT 'active' -- active, collapsed
);

-- 3.2 参与者表
CREATE TABLE meet_participants (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  room_id bigint REFERENCES meet_rooms(id) ON DELETE CASCADE,
  character_id bigint REFERENCES characters(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(room_id, character_id)
);

-- 3.3 消息表
CREATE TABLE meet_messages (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  room_id bigint REFERENCES meet_rooms(id) ON DELETE CASCADE,
  character_id bigint REFERENCES characters(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('chat', 'action')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 4. 安全策略 (RLS)
-- ==========================================
ALTER TABLE meet_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE meet_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE meet_messages ENABLE ROW LEVEL SECURITY;

-- 允许公开读写 (简化逻辑，依靠业务层控制)
CREATE POLICY "Public read rooms" ON meet_rooms FOR SELECT USING (true);
CREATE POLICY "Public insert rooms" ON meet_rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update rooms" ON meet_rooms FOR UPDATE USING (true);

CREATE POLICY "Public read participants" ON meet_participants FOR SELECT USING (true);
CREATE POLICY "Public insert participants" ON meet_participants FOR INSERT WITH CHECK (true);
CREATE POLICY "Public delete participants" ON meet_participants FOR DELETE USING (true);

CREATE POLICY "Public read messages" ON meet_messages FOR SELECT USING (true);
CREATE POLICY "Public insert messages" ON meet_messages FOR INSERT WITH CHECK (true);

-- ==========================================
-- 5. 核心函数：维护世界 (自动生成 + 归档)
-- ==========================================
CREATE OR REPLACE FUNCTION maintain_worlds()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_active_count int;
  v_new_count int;
  v_titles text[] := ARRAY[
    '无名雪原的残响', '湖底之城：第14号穹顶', '被遗弃的天文台', '最后的蒸汽集市', 
    '永夜森林的篝火', '漂浮在云端的图书馆', '时间静止的钟楼', '深海列车的末班车',
    '赛博废墟中的花园', '巨龙陨落的山谷'
  ];
  v_descs text[] := ARRAY[
    '风雪永不停歇的荒原。未知生物的足迹消失于远方，这里似乎有某种力量在不断重置时间。',
    '巨大的玻璃穹顶下，沉睡着旧时代的文明。霓虹灯还在闪烁，但街道空无一人。',
    '这里是离星星最近的地方。望远镜依然指向深空，仿佛在等待某个永远不会回来的信号。',
    '齿轮咬合的轰鸣声掩盖了低语。这里贩卖记忆、梦境和生锈的希望。',
    '森林深处，一堆永不熄灭的篝火。传说只要靠近它，就能听见逝者的声音。'
  ];
  v_random_title text;
  v_random_desc text;
  v_random_life interval;
  v_room record;
  v_log text;
BEGIN
  -- A. 处理坍塌世界 (归档 + 标记)
  FOR v_room IN SELECT * FROM meet_rooms WHERE status = 'active' AND collapse_at < NOW() LOOP
    -- 生成对话日志
    SELECT string_agg(
        CASE 
            WHEN m.type = 'chat' THEN '🗣️ ' || c.name || ': ' || m.content
            WHEN m.type = 'action' THEN '✨ *' || c.name || ' ' || m.content || '*'
        END, 
        E'\n' ORDER BY m.created_at
    ) INTO v_log
    FROM meet_messages m
    JOIN characters c ON m.character_id = c.id
    WHERE m.room_id = v_room.id;

    -- 为所有参与者创建记忆归档
    IF v_log IS NOT NULL THEN
        INSERT INTO character_events (character_id, type, content, created_at)
        SELECT character_id, 'WORLD_ARCHIVE', '🌍 世界记忆: ' || v_room.title || E'\n\n' || v_log, NOW()
        FROM meet_participants
        WHERE room_id = v_room.id;
    END IF;

    -- 标记为坍塌
    UPDATE meet_rooms SET status = 'collapsed' WHERE id = v_room.id;
  END LOOP;

  -- B. 统计活跃世界
  SELECT count(*) INTO v_active_count FROM meet_rooms WHERE status = 'active';

  -- C. 补充新世界 (保持 5 个)
  v_new_count := 5 - v_active_count;
  
  IF v_new_count > 0 THEN
    FOR i IN 1..v_new_count LOOP
      -- 随机生成属性
      v_random_title := v_titles[1 + floor(random() * array_length(v_titles, 1))::int];
      v_random_desc := v_descs[1 + floor(random() * array_length(v_descs, 1))::int];
      -- 随机寿命: 20分钟 到 24小时
      v_random_life := (floor(random() * (24 * 60 - 20 + 1) + 20) || ' minutes')::interval;

      INSERT INTO meet_rooms (title, scene_description, collapse_at, max_players)
      VALUES (
        v_random_title, 
        v_random_desc, 
        NOW() + v_random_life,
        20
      );
    END LOOP;
  END IF;
END;
$func$;

-- ==========================================
-- 6. 辅助函数：加入世界
-- ==========================================
CREATE OR REPLACE FUNCTION join_world(p_room_id bigint, p_character_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_room record;
  v_count int;
BEGIN
  -- 检查房间状态
  SELECT * INTO v_room FROM meet_rooms WHERE id = p_room_id;
  
  IF v_room IS NULL OR v_room.status = 'collapsed' OR v_room.collapse_at < NOW() THEN
    RETURN jsonb_build_object('success', false, 'message', '世界已坍塌');
  END IF;

  -- 检查人数
  SELECT count(*) INTO v_count FROM meet_participants WHERE room_id = p_room_id;
  
  IF v_count >= v_room.max_players THEN
    RETURN jsonb_build_object('success', false, 'message', '世界已满员');
  END IF;

  -- 加入
  INSERT INTO meet_participants (room_id, character_id)
  VALUES (p_room_id, p_character_id)
  ON CONFLICT (room_id, character_id) DO NOTHING;

  RETURN jsonb_build_object('success', true, 'room_id', p_room_id);
END;
$func$;

-- ==========================================
-- 7. 授权
-- ==========================================
GRANT EXECUTE ON FUNCTION maintain_worlds() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION join_world(bigint, bigint) TO anon, authenticated, service_role;

