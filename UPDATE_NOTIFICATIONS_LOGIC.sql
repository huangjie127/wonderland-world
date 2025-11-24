-- Improve notification triggers to be more robust and informative

-- 1. Drop existing triggers and functions to ensure clean slate
drop trigger if exists on_relationship_request_created on character_relationship_requests;
drop function if exists notify_relationship_request;

drop trigger if exists on_relationship_termination_created on character_relationship_terminations;
drop function if exists notify_relationship_termination;

drop trigger if exists on_interaction_created on character_interactions;
drop function if exists notify_interaction;

drop trigger if exists on_like_created on character_likes;
drop function if exists notify_like;

-- 2. Re-create Relationship Request Trigger
create or replace function notify_relationship_request()
returns trigger as $$
declare
  target_user_id uuid;
  from_char_name text;
begin
  -- Get target user id
  select user_id into target_user_id from characters where id = new.to_character_id;
  -- Get from character name
  select name into from_char_name from characters where id = new.from_character_id;
  
  if target_user_id is not null then
    insert into notifications (user_id, type, title, content, data)
    values (
      target_user_id,
      'relationship_request',
      '收到新的关系申请',
      from_char_name || ' 申请与您的角色建立关系',
      jsonb_build_object('request_id', new.id, 'from_character_id', new.from_character_id, 'to_character_id', new.to_character_id)
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_relationship_request_created
  after insert on character_relationship_requests
  for each row execute procedure notify_relationship_request();

-- 3. Re-create Relationship Termination Trigger (Fixed Version)
create or replace function notify_relationship_termination()
returns trigger as $$
declare
  relationship_record record;
  requester_user_id uuid;
  char1_owner uuid;
  char2_owner uuid;
  char1_name text;
  char2_name text;
begin
  -- Get relationship details
  select * into relationship_record from character_relationship_requests where id = new.relationship_id;
  
  -- Get requester user id
  select user_id into requester_user_id from characters where id = new.requested_by;
  
  -- Get Character Owners and Names
  select user_id, name into char1_owner, char1_name from characters where id = relationship_record.from_character_id;
  select user_id, name into char2_owner, char2_name from characters where id = relationship_record.to_character_id;
  
  -- Notify the party that did NOT request the termination
  if char1_owner != requester_user_id then
      insert into notifications (user_id, type, title, content, data)
      values (
        char1_owner, 
        'relationship_termination', 
        '收到关系解除请求', 
        '有人请求解除与 ' || char1_name || ' 的关系', 
        jsonb_build_object('termination_id', new.id)
      );
  end if;
  
  if char2_owner != requester_user_id then
      insert into notifications (user_id, type, title, content, data)
      values (
        char2_owner, 
        'relationship_termination', 
        '收到关系解除请求', 
        '有人请求解除与 ' || char2_name || ' 的关系', 
        jsonb_build_object('termination_id', new.id)
      );
  end if;
  
  return new;
end;
$$ language plpgsql security definer;

create trigger on_relationship_termination_created
  after insert on character_relationship_terminations
  for each row execute procedure notify_relationship_termination();

-- 4. Re-create Interaction Trigger (Improved Content & Robustness)
create or replace function notify_interaction()
returns trigger as $$
declare
  target_user_id uuid;
  guest_user_id uuid;
  guest_name text;
  content_preview text;
begin
  -- Get host character owner (Target)
  select user_id into target_user_id from characters where id = new.host_character_id;
  
  -- Get guest character details
  select user_id, name into guest_user_id, guest_name from characters where id = new.guest_character_id;
  
  -- Create content preview (first 20 chars)
  content_preview := substring(new.content from 1 for 20);
  if length(new.content) > 20 then
    content_preview := content_preview || '...';
  end if;
  
  -- Don't notify if commenting on own character
  if target_user_id != guest_user_id then
    insert into notifications (user_id, type, title, content, data)
    values (
      target_user_id,
      'interaction',
      '收到新留言',
      guest_name || ' 留言: ' || content_preview,
      jsonb_build_object('interaction_id', new.id, 'host_character_id', new.host_character_id)
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_interaction_created
  after insert on character_interactions
  for each row execute procedure notify_interaction();

-- 5. Re-create Like Trigger
create or replace function notify_like()
returns trigger as $$
declare
  target_user_id uuid;
  char_name text;
begin
  -- Get character owner and name
  select user_id, name into target_user_id, char_name from characters where id = new.character_id;
  
  -- Don't notify self-likes
  if target_user_id != new.user_id then
    insert into notifications (user_id, type, title, content, data)
    values (
      target_user_id,
      'like',
      '收到新点赞',
      '有人点赞了您的角色 ' || char_name,
      jsonb_build_object('character_id', new.character_id)
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_like_created
  after insert on character_likes
  for each row execute procedure notify_like();
