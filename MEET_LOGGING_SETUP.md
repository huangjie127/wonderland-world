# 🔄 Meet 系统进阶配置 (日志归档与触发器)

请在 Supabase SQL Editor 中运行以下 SQL 语句，以实现自动将聊天记录归档到个人事件中。

```sql
-- 1. 修改 character_events 表，增加 room_id 字段以关联房间
ALTER TABLE character_events 
ADD COLUMN IF NOT EXISTS room_id bigint REFERENCES meet_rooms(id) ON DELETE SET NULL;

-- 2. 创建触发器函数：当有新消息时，自动同步到所有参与者的事件记录中
CREATE OR REPLACE FUNCTION handle_new_meet_message()
RETURNS TRIGGER AS $$
DECLARE
  v_participant RECORD;
  v_scene TEXT;
  v_formatted_line TEXT;
  v_sender_name TEXT;
  v_action_prefix TEXT;
BEGIN
  -- 获取发送者名字
  SELECT name INTO v_sender_name FROM characters WHERE id = NEW.character_id;
  
  -- 格式化文本
  -- 如果是 chat: [HH:MM] Name: Content
  -- 如果是 action: [HH:MM] *Name Content*
  IF NEW.type = 'action' THEN
    v_formatted_line := '[' || to_char(NEW.created_at, 'HH24:MI') || '] *' || v_sender_name || ' ' || NEW.content || '*';
  ELSE
    v_formatted_line := '[' || to_char(NEW.created_at, 'HH24:MI') || '] ' || v_sender_name || ': ' || NEW.content;
  END IF;
  
  -- 获取场景描述（用于创建新事件时的标题）
  SELECT scene_description INTO v_scene FROM meet_rooms WHERE id = NEW.room_id;

  -- 遍历房间内的所有参与者
  FOR v_participant IN SELECT character_id FROM meet_participants WHERE room_id = NEW.room_id LOOP
    
    -- 检查该用户是否已经有这个房间的日志事件
    IF EXISTS (SELECT 1 FROM character_events WHERE character_id = v_participant.character_id AND room_id = NEW.room_id AND type = 'MEET_LOG') THEN
      -- 如果有，追加内容
      UPDATE character_events 
      SET content = content || E'\n' || v_formatted_line,
          updated_at = NOW()
      WHERE character_id = v_participant.character_id AND room_id = NEW.room_id AND type = 'MEET_LOG';
    ELSE
      -- 如果没有，创建新事件
      INSERT INTO character_events (character_id, type, content, room_id)
      VALUES (v_participant.character_id, 'MEET_LOG', '📜 奇遇记录\n场景: ' || v_scene || E'\n\n' || v_formatted_line, NEW.room_id);
    END IF;
    
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. 绑定触发器
DROP TRIGGER IF EXISTS on_meet_message_insert ON meet_messages;

CREATE TRIGGER on_meet_message_insert
AFTER INSERT ON meet_messages
FOR EACH ROW
EXECUTE FUNCTION handle_new_meet_message();
```

## 验证

运行成功后，每当您在 Meet 房间发送消息，`character_events` 表中对应的记录就会自动更新。
