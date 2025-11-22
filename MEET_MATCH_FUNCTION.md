# 🤝 Meet 系统数据库函数 (原子匹配逻辑)

请在 Supabase SQL Editor 中运行以下 SQL 语句，以创建服务器端的匹配逻辑。

```sql
-- 1. 创建匹配函数
-- 该函数处理：加入队列、检查现有房间、触发新房间创建
-- ⚠️ 注意：如果之前创建过，请先运行 DROP FUNCTION match_player;

CREATE OR REPLACE FUNCTION match_player(p_character_id bigint)
RETURNS bigint -- 返回 room_id (如果匹配成功)，否则返回 NULL (表示进入等待)
LANGUAGE plpgsql
SECURITY DEFINER -- 关键：允许函数绕过 RLS 权限执行
SET search_path = public -- 关键：防止搜索路径劫持
AS $$
DECLARE
  v_room_id bigint;
  v_queue_count int;
BEGIN
  -- 1. 检查是否存在“开放”的房间
  -- 条件：创建时间在 10 秒内，且人数少于 6 人
  SELECT id INTO v_room_id
  FROM meet_rooms
  WHERE created_at > NOW() - INTERVAL '10 seconds'
  AND (SELECT count(*) FROM meet_participants WHERE room_id = meet_rooms.id) < 6
  ORDER BY created_at DESC
  LIMIT 1;

  -- 如果找到开放房间，直接加入
  IF v_room_id IS NOT NULL THEN
    -- 插入参与者表
    INSERT INTO meet_participants (room_id, character_id) 
    VALUES (v_room_id, p_character_id)
    ON CONFLICT DO NOTHING; -- 防止重复加入
    
    -- 如果该用户在队列中，将其移除
    DELETE FROM meet_queue WHERE character_id = p_character_id;
    
    RETURN v_room_id;
  END IF;

  -- 2. 如果没有开放房间，先确保用户在队列中
  -- 使用 ON CONFLICT 更新时间戳，确保活跃
  INSERT INTO meet_queue (character_id) VALUES (p_character_id)
  ON CONFLICT (character_id) DO UPDATE SET joined_at = NOW();

  -- 3. 检查队列人数
  SELECT count(*) INTO v_queue_count FROM meet_queue;

  -- 4. 如果队列人数 >= 2，触发新房间创建
  IF v_queue_count >= 2 THEN
    -- 创建新房间 (先给个临时描述，后续由前端或触发器更新)
    INSERT INTO meet_rooms (scene_description) 
    VALUES ('正在生成场景...') 
    RETURNING id INTO v_room_id;
    
    -- 将队列中的所有人（包括自己）移动到新房间
    -- 注意：这里会触发 meet_participants 的 INSERT 事件，通知其他等待的客户端
    INSERT INTO meet_participants (room_id, character_id)
    SELECT v_room_id, character_id FROM meet_queue;
    
    -- 清空队列
    DELETE FROM meet_queue;
    
    RETURN v_room_id;
  END IF;

  -- 5. 如果人数不足，返回 NULL，让客户端继续等待
  RETURN NULL;
END;
$$;

-- 2. 关键：授予执行权限
-- 必须运行以下语句，否则前端会报 "function not found" 或 "permission denied"
GRANT EXECUTE ON FUNCTION match_player(bigint) TO anon;
GRANT EXECUTE ON FUNCTION match_player(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION match_player(bigint) TO service_role;
```

## 2. 验证

运行后，您可以在 SQL Editor 中看到 "Success"。
前端代码已经更新为调用此 RPC 函数。
