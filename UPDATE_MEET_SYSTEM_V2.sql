-- 1. Add creator_id to meet_rooms to distinguish user rooms
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meet_rooms' AND column_name = 'creator_id') THEN
        ALTER TABLE meet_rooms ADD COLUMN creator_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 2. Add coins to characters for payment
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'characters' AND column_name = 'coins') THEN
        ALTER TABLE characters ADD COLUMN coins INTEGER DEFAULT 100;
    END IF;
END $$;

-- 3. Update maintain_worlds to keep ONLY ONE system room
CREATE OR REPLACE FUNCTION maintain_worlds()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  active_system_room_count INT;
  new_duration INTERVAL;
  random_titles TEXT[] := ARRAY[
    '破碎的浮空岛', '静谧的星光回廊', '被遗忘的地下城', '赛博朋克暗巷', 
    '永恒黄昏的海岸', '机械废墟花园', '水晶洞穴深处', '失重空间站',
    '迷雾笼罩的古堡', '深海玻璃穹顶', '废弃的游乐园', '云端之上的图书馆'
  ];
  random_descs TEXT[] := ARRAY[
    '这里重力异常，漂浮着古文明的残骸。空气中弥漫着电离子的味道。',
    '四周是无尽的星空，脚下的回廊仿佛由光织成。在这里说话会有奇特的回声。',
    '潮湿阴暗，墙壁上长满了发光的苔藓。远处传来滴水声和未知的低语。',
    '霓虹灯闪烁，雨水冲刷着金属地面。这里是法外之地，也是情报的集散地。',
    '太阳永远停留在海平面上，金色的光芒温暖而哀伤。时间仿佛在这里静止。',
    '巨大的齿轮和藤蔓纠缠在一起，生锈的机器人身上开出了鲜花。',
    '巨大的水晶簇拥着，折射出迷离的光彩。在这里，你的倒影似乎有自己的意识。',
    '一切都在漂浮。窗外是巨大的蓝色星球。这里安静得能听到心跳。',
    '古老的石墙上爬满了枯藤，雾气中隐约可见幽灵般的烛火。',
    '巨大的玻璃穹顶外是深邃的海水，发光的鱼群游过，仿佛置身梦境。',
    '旋转木马还在吱呀作响，小丑的涂鸦在月光下显得格外诡异。',
    '书架高耸入云，飞鸟在书籍间穿梭。这里收藏着所有被遗忘的故事。'
  ];
  r_index INT;
BEGIN
  -- 1. Clean up expired rooms (both system and user)
  UPDATE meet_rooms
  SET status = 'collapsed'
  WHERE status = 'active' AND collapse_at < NOW();

  -- 2. Check for active SYSTEM rooms (creator_id IS NULL)
  SELECT COUNT(*) INTO active_system_room_count 
  FROM meet_rooms 
  WHERE status = 'active' AND creator_id IS NULL;

  -- 3. If no active system room exists, create one
  IF active_system_room_count = 0 THEN
    -- Random duration 20min - 3h
    new_duration := (floor(random() * (180 - 20 + 1) + 20) || ' minutes')::INTERVAL;
    
    r_index := floor(random() * array_length(random_titles, 1) + 1);

    INSERT INTO meet_rooms (
      title, 
      scene_description, 
      status, 
      created_at, 
      collapse_at, 
      max_players,
      creator_id -- System rooms have NULL creator_id
    ) VALUES (
      random_titles[r_index],
      random_descs[r_index],
      'active',
      NOW(),
      NOW() + new_duration,
      10,
      NULL
    );
  END IF;
END;
$$;

-- 4. Function to create a user room with payment
CREATE OR REPLACE FUNCTION create_user_room(
  room_title TEXT,
  room_desc TEXT,
  duration_minutes INT,
  max_people INT,
  cost INT,
  char_id BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_coins INT;
  new_room_id BIGINT;
BEGIN
  -- Check if user owns the character
  IF NOT EXISTS (SELECT 1 FROM characters WHERE id = char_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized to use this character';
  END IF;

  -- Check balance
  SELECT coins INTO user_coins FROM characters WHERE id = char_id;
  
  IF user_coins < cost THEN
    RETURN jsonb_build_object('success', false, 'message', 'Insufficient coins');
  END IF;

  -- Deduct coins
  UPDATE characters SET coins = coins - cost WHERE id = char_id;

  -- Create room
  INSERT INTO meet_rooms (
    title,
    scene_description,
    status,
    created_at,
    collapse_at,
    max_players,
    creator_id
  ) VALUES (
    room_title,
    room_desc,
    'active',
    NOW(),
    NOW() + (duration_minutes || ' minutes')::INTERVAL,
    max_people,
    auth.uid()
  ) RETURNING id INTO new_room_id;

  RETURN jsonb_build_object('success', true, 'room_id', new_room_id, 'remaining_coins', user_coins - cost);
END;
$$;
