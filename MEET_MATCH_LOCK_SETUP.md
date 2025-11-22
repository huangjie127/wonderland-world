# 🔒 Meet 系统：锁机制匹配方案 (最终版)

请在 Supabase SQL Editor 中运行以下 SQL 语句。这将重构匹配系统，使用“匹配池 + 全局锁”机制。

## 1. 重置与创建表结构

```sql
-- 1. 清理旧函数 (防止冲突)
DROP FUNCTION IF EXISTS match_player;
DROP FUNCTION IF EXISTS create_or_join_match;

-- 2. 确保 meet_queue (waiting_pool) 结构正确
-- 我们复用 meet_queue 表，但确保它有唯一约束
CREATE TABLE IF NOT EXISTS meet_queue (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  character_id bigint REFERENCES characters(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(character_id)
);

-- 3. 创建控制表 (match_control)
CREATE TABLE IF NOT EXISTS meet_control (
  id int PRIMARY KEY,
  is_locked boolean DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 初始化控制行 (只存一行)
INSERT INTO meet_control (id, is_locked) VALUES (1, false) ON CONFLICT (id) DO NOTHING;

-- 4. 确保 RLS 策略允许访问
ALTER TABLE meet_control ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read control" ON meet_control FOR SELECT USING (true);
CREATE POLICY "Public update control" ON meet_control FOR UPDATE USING (true);
```

## 2. 创建核心匹配函数 (RPC)

```sql
CREATE OR REPLACE FUNCTION create_or_join_match(p_character_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- 权限提升
SET search_path = public
AS $$
DECLARE
  v_is_locked boolean;
  v_queue_count int;
  v_room_id bigint;
  v_existing_room_id bigint;
BEGIN
  -- =================================================
  -- 步骤 0: 幂等性检查 (我是否已经在房间里了？)
  -- =================================================
  -- 检查最近 5 分钟内加入的房间
  SELECT room_id INTO v_existing_room_id
  FROM meet_participants
  WHERE character_id = p_character_id
  AND joined_at > NOW() - INTERVAL '5 minutes'
  ORDER BY joined_at DESC
  LIMIT 1;

  IF v_existing_room_id IS NOT NULL THEN
    -- 如果已经在房间里，直接返回成功，前端会跳转
    RETURN jsonb_build_object('status', 'matched', 'room_id', v_existing_room_id);
  END IF;

  -- =================================================
  -- 步骤 A: 检查锁状态
  -- =================================================
  SELECT is_locked INTO v_is_locked FROM meet_control WHERE id = 1;
  
  IF v_is_locked THEN
    -- 如果被锁，说明正在生成房间，稍后重试
    RETURN jsonb_build_object('status', 'waiting', 'message', 'System is locking, please wait...');
  END IF;

  -- =================================================
  -- 步骤 B: 加入匹配池 (Upsert)
  -- =================================================
  INSERT INTO meet_queue (character_id, joined_at)
  VALUES (p_character_id, NOW())
  ON CONFLICT (character_id) DO UPDATE SET joined_at = NOW();

  -- =================================================
  -- 步骤 C: 检查池子人数
  -- =================================================
  SELECT count(*) INTO v_queue_count FROM meet_queue;

  IF v_queue_count < 2 THEN
    -- 人数不足，继续等待
    RETURN jsonb_build_object('status', 'waiting', 'message', 'Waiting for more players (' || v_queue_count || '/2)...');
  
  ELSE
    -- =================================================
    -- 步骤 D: 人数足够，尝试获取锁并创建房间
    -- =================================================
    
    -- 尝试原子更新锁状态 (CAS: Compare And Swap)
    UPDATE meet_control SET is_locked = true, updated_at = NOW() 
    WHERE id = 1 AND is_locked = false;
    
    IF NOT FOUND THEN
       -- 刚才这一瞬间被别人锁了，我退回去继续等
       RETURN jsonb_build_object('status', 'waiting', 'message', 'Race condition, retrying...');
    END IF;

    -- === 🔒 临界区开始 (只有获得锁的请求能执行) ===
    
    BEGIN
      -- 1. 创建房间
      INSERT INTO meet_rooms (scene_description) 
      VALUES ('正在生成场景...') 
      RETURNING id INTO v_room_id;

      -- 2. 选取前 4 名玩家 (按加入时间排序)
      -- 使用 CTE 捕获被选中的人
      WITH selected_users AS (
        SELECT character_id 
        FROM meet_queue 
        ORDER BY joined_at ASC 
        LIMIT 4
      ),
      -- 3. 将他们加入房间
      inserted_participants AS (
        INSERT INTO meet_participants (room_id, character_id)
        SELECT v_room_id, character_id FROM selected_users
        RETURNING character_id
      )
      -- 4. 从队列中移除这些人
      DELETE FROM meet_queue 
      WHERE character_id IN (SELECT character_id FROM selected_users);

      -- 5. 解锁
      UPDATE meet_control SET is_locked = false WHERE id = 1;
      
    EXCEPTION WHEN OTHERS THEN
      -- 异常处理：确保死锁或错误时释放锁
      UPDATE meet_control SET is_locked = false WHERE id = 1;
      RAISE;
    END;
    
    -- === 🔓 临界区结束 ===

    -- 检查我自己是否在刚才创建的房间里 (可能我排第5个，没被选上)
    IF EXISTS (SELECT 1 FROM meet_participants WHERE room_id = v_room_id AND character_id = p_character_id) THEN
        RETURN jsonb_build_object('status', 'matched', 'room_id', v_room_id);
    ELSE
        RETURN jsonb_build_object('status', 'waiting', 'message', 'Queue full, waiting for next batch...');
    END IF;

  END IF;
END;
$$;

-- 3. 授权
GRANT EXECUTE ON FUNCTION create_or_join_match(bigint) TO anon;
GRANT EXECUTE ON FUNCTION create_or_join_match(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION create_or_join_match(bigint) TO service_role;
