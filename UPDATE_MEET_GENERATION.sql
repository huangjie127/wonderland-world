-- 1. 添加字段 (如果不存在)
-- 注意：如果表已经存在且有数据，这不会影响现有数据
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meet_rooms' AND column_name = 'next_generation_delay') THEN
        ALTER TABLE meet_rooms ADD COLUMN next_generation_delay INTERVAL DEFAULT '1 hour';
    END IF;
END $$;

-- 2. 重写 maintain_worlds 函数
CREATE OR REPLACE FUNCTION maintain_worlds()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  last_room RECORD;
  new_delay INTERVAL;
  new_duration INTERVAL;
  should_create BOOLEAN := FALSE;
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
  -- 1. 清理过期房间
  UPDATE meet_rooms
  SET status = 'collapsed'
  WHERE status = 'active' AND collapse_at < NOW();

  -- 2. 检查是否需要生成新房间
  SELECT * INTO last_room FROM meet_rooms ORDER BY created_at DESC LIMIT 1;

  IF last_room IS NULL THEN
    should_create := TRUE;
  ELSE
    -- 如果当前时间 > 上次创建时间 + 延迟时间
    -- 注意：如果 next_generation_delay 为空，默认为 1 小时
    IF NOW() > (last_room.created_at + COALESCE(last_room.next_generation_delay, '1 hour'::INTERVAL)) THEN
      should_create := TRUE;
    END IF;
  END IF;

  -- 3. 生成新房间
  IF should_create THEN
    -- 随机生成 1h - 3h 的间隔 (60 - 180 分钟)
    new_delay := (floor(random() * (180 - 60 + 1) + 60) || ' minutes')::INTERVAL;
    
    -- 随机生成 20min - 3h 的持续时间 (20 - 180 分钟)
    new_duration := (floor(random() * (180 - 20 + 1) + 20) || ' minutes')::INTERVAL;
    
    -- 随机选择标题和描述
    r_index := floor(random() * array_length(random_titles, 1) + 1);

    INSERT INTO meet_rooms (
      title, 
      scene_description, 
      status, 
      created_at, 
      collapse_at, 
      max_players, 
      next_generation_delay
    ) VALUES (
      random_titles[r_index],
      random_descs[r_index],
      'active',
      NOW(),
      NOW() + new_duration,
      10, -- 默认最大人数
      new_delay
    );
  END IF;
END;
$$;
