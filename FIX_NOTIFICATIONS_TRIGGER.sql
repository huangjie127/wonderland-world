-- Fix the trigger function for relationship termination notifications
-- This fixes the "relation character_relationships does not exist" error

create or replace function notify_relationship_termination()
returns trigger as $$
declare
  target_user_id uuid;
  requester_name text;
  relationship_record record;
begin
  -- Get relationship details to find the other character
  -- Fixed: Query character_relationship_requests instead of character_relationships
  select * into relationship_record from character_relationship_requests where id = new.relationship_id;
  
  -- Determine who to notify (the one who didn't request it)
  
  -- Get Char 1 Owner (from_character_id)
  declare
    char1_owner uuid;
    char2_owner uuid;
    char1_name text;
    char2_name text;
  begin
    -- Fixed: Use from_character_id and to_character_id
    select user_id, name into char1_owner, char1_name from characters where id = relationship_record.from_character_id;
    select user_id, name into char2_owner, char2_name from characters where id = relationship_record.to_character_id;
    
    -- Check if requester is NOT char1 owner, then notify char1 owner
    -- Note: requested_by is a character_id in the termination table, but here we are comparing with user_id?
    -- Wait, let's check RELATIONSHIP_TERMINATION_SETUP.md again.
    -- requested_by bigint NOT NULL REFERENCES characters(id)
    
    -- So new.requested_by is a CHARACTER ID.
    -- But char1_owner is a USER ID.
    -- We cannot compare them directly!
    
    -- We need to find the USER ID of the requester character.
    declare
        requester_user_id uuid;
    begin
        select user_id into requester_user_id from characters where id = new.requested_by;
        
        if char1_owner != requester_user_id then
            insert into notifications (user_id, type, title, content, data)
            values (char1_owner, 'relationship_termination', '收到关系解除请求', '有人请求解除与 ' || char1_name || ' 的关系', jsonb_build_object('termination_id', new.id));
        end if;
        
        if char2_owner != requester_user_id then
            insert into notifications (user_id, type, title, content, data)
            values (char2_owner, 'relationship_termination', '收到关系解除请求', '有人请求解除与 ' || char2_name || ' 的关系', jsonb_build_object('termination_id', new.id));
        end if;
    end;
  end;
  
  return new;
end;
$$ language plpgsql security definer;
