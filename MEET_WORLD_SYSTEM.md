# 🌍 Meet 系统重构：短暂世界 (Ephemeral Worlds)

请在 Supabase SQL Editor 中运行以下 SQL 语句。这将重置 Meet 系统以支持“自动生成世界”模式。

## 1. 重构表结构

```sql
-- 1. 重置房间表
DROP TABLE IF EXISTS meet_participants CASCADE;
DROP TABLE IF EXISTS meet_messages CASCADE;
DROP TABLE IF EXISTS meet_rooms CASCADE;
DROP TABLE IF EXISTS meet_queue CASCADE; -- 不再需要队列
DROP TABLE IF EXISTS meet_control CASCADE; -- 不再需要锁

-- 2. 新建房间表 (世界)
CREATE TABLE meet_rooms (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  title TEXT NOT NULL,
  scene_description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  collapse_at TIMESTAMP WITH TIME ZONE NOT NULL, -- 坍塌时间
  max_players INT DEFAULT 20,
  status TEXT DEFAULT 'active' -- active, collapsed
);

-- 3. 重建参与者表
CREATE TABLE meet_participants (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  room_id bigint REFERENCES meet_rooms(id) ON DELETE CASCADE,
  character_id bigint REFERENCES characters(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(room_id, character_id)
);

-- 4. 重建消息表
CREATE TABLE meet_messages (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  room_id bigint REFERENCES meet_rooms(id) ON DELETE CASCADE,
  character_id bigint REFERENCES characters(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('chat', 'action')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. 启用 RLS
ALTER TABLE meet_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE meet_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE meet_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read rooms" ON meet_rooms FOR SELECT USING (true);
CREATE POLICY "Public insert rooms" ON meet_rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update rooms" ON meet_rooms FOR UPDATE USING (true);

CREATE POLICY "Public read participants" ON meet_participants FOR SELECT USING (true);
CREATE POLICY "Public insert participants" ON meet_participants FOR INSERT WITH CHECK (true);
CREATE POLICY "Public delete participants" ON meet_participants FOR DELETE USING (true);

CREATE POLICY "Public read messages" ON meet_messages FOR SELECT USING (true);
CREATE POLICY "Public insert messages" ON meet_messages FOR INSERT WITH CHECK (true);
```

## 2. 核心逻辑：世界维护函数

这个函数负责：
1. 检查并标记已过期的世界为 "collapsed"。
2. 如果活跃世界少于 5 个，自动生成新的。

```sql
CREATE OR REPLACE FUNCTION maintain_worlds()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
BEGIN
  -- 1. 清理坍塌世界 (标记状态)
  UPDATE meet_rooms 
  SET status = 'collapsed' 
  WHERE status = 'active' AND collapse_at < NOW();

  -- 2. 统计活跃世界
  SELECT count(*) INTO v_active_count FROM meet_rooms WHERE status = 'active';

  -- 3. 补充新世界 (保持 5 个)
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
$$;

-- 授权
GRANT EXECUTE ON FUNCTION maintain_worlds() TO anon;
GRANT EXECUTE ON FUNCTION maintain_worlds() TO authenticated;
GRANT EXECUTE ON FUNCTION maintain_worlds() TO service_role;
```

## 3. 辅助函数：加入世界

```sql
CREATE OR REPLACE FUNCTION join_world(p_room_id bigint, p_character_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room record;
  v_count int;
BEGIN
  -- 1. 检查房间状态
  SELECT * INTO v_room FROM meet_rooms WHERE id = p_room_id;
  
  IF v_room IS NULL OR v_room.status = 'collapsed' OR v_room.collapse_at < NOW() THEN
    RETURN jsonb_build_object('success', false, 'message', '世界已坍塌');
  END IF;

  -- 2. 检查人数
  SELECT count(*) INTO v_count FROM meet_participants WHERE room_id = p_room_id;
  
  IF v_count >= v_room.max_players THEN
    RETURN jsonb_build_object('success', false, 'message', '世界已满员');
  END IF;

  -- 3. 加入
  INSERT INTO meet_participants (room_id, character_id)
  VALUES (p_room_id, p_character_id)
  ON CONFLICT (room_id, character_id) DO NOTHING;

  RETURN jsonb_build_object('success', true, 'room_id', p_room_id);
END;
$$;

GRANT EXECUTE ON FUNCTION join_world(bigint, bigint) TO anon;
GRANT EXECUTE ON FUNCTION join_world(bigint, bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION join_world(bigint, bigint) TO service_role;
```
