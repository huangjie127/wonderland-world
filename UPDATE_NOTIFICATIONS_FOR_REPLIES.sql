-- 1. Update Notification Types to include 'comment' and 'reply'
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('relationship_request', 'relationship_termination', 'interaction', 'like', 'comment', 'reply'));

-- 2. Update notify_interaction (Guestbook) to handle replies
CREATE OR REPLACE FUNCTION notify_interaction()
RETURNS trigger AS $$
DECLARE
  target_user_id uuid;
  guest_name text;
  guest_owner_id uuid;
  parent_author_id uuid;
  host_owner_id uuid;
BEGIN
  -- Get guest name and owner (who is writing this)
  SELECT name, user_id INTO guest_name, guest_owner_id FROM characters WHERE id = NEW.guest_character_id;
  
  -- Get host character owner
  SELECT user_id INTO host_owner_id FROM characters WHERE id = NEW.host_character_id;

  -- CASE 1: It is a Reply
  IF NEW.parent_id IS NOT NULL THEN
    -- Find the author of the parent comment
    -- The parent comment's "guest_character_id" is the one who wrote it.
    SELECT c.user_id INTO parent_author_id
    FROM character_interactions ci
    JOIN characters c ON c.id = ci.guest_character_id
    WHERE ci.id = NEW.parent_id;
    
    -- Notify parent author if it's not the same person
    -- We use guest_owner_id instead of auth.uid() to be safe across contexts
    IF parent_author_id IS NOT NULL AND parent_author_id != guest_owner_id THEN
      INSERT INTO notifications (user_id, type, title, content, data)
      VALUES (
        parent_author_id,
        'reply',
        '收到新回复',
        guest_name || ' 回复了您的留言',
        jsonb_build_object('interaction_id', NEW.id, 'host_character_id', NEW.host_character_id)
      );
    END IF;

  -- CASE 2: It is a Root Comment (Guestbook entry)
  ELSE
    -- Notify host owner if it's not the same person
    IF host_owner_id != guest_owner_id THEN
      INSERT INTO notifications (user_id, type, title, content, data)
      VALUES (
        host_owner_id,
        'interaction',
        '收到新留言',
        guest_name || ' 给您的角色留言了',
        jsonb_build_object('interaction_id', NEW.id, 'host_character_id', NEW.host_character_id)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create notify_post_comment (Square)
CREATE OR REPLACE FUNCTION notify_post_comment()
RETURNS trigger AS $$
DECLARE
  commenter_name text;
  post_author_id uuid;
  parent_author_id uuid;
  post_title text;
BEGIN
  -- Get commenter name
  IF NEW.character_id IS NOT NULL THEN
    SELECT name INTO commenter_name FROM characters WHERE id = NEW.character_id;
  ELSE
    commenter_name := '有人';
  END IF;

  -- CASE 1: Reply
  IF NEW.parent_id IS NOT NULL THEN
    -- Get parent comment author
    SELECT user_id INTO parent_author_id FROM post_comments WHERE id = NEW.parent_id;
    
    IF parent_author_id IS NOT NULL AND parent_author_id != NEW.user_id THEN
      INSERT INTO notifications (user_id, type, title, content, data)
      VALUES (
        parent_author_id,
        'reply',
        '收到新回复',
        commenter_name || ' 在动态中回复了您',
        jsonb_build_object('comment_id', NEW.id, 'post_id', NEW.post_id)
      );
    END IF;

  -- CASE 2: Root Comment
  ELSE
    -- Get post author
    SELECT author_user_id, content_text INTO post_author_id, post_title FROM character_posts WHERE id = NEW.post_id;
    
    -- Truncate post title for display
    IF length(post_title) > 20 THEN
        post_title := substring(post_title from 1 for 20) || '...';
    END IF;

    IF post_author_id IS NOT NULL AND post_author_id != NEW.user_id THEN
      INSERT INTO notifications (user_id, type, title, content, data)
      VALUES (
        post_author_id,
        'comment',
        '收到新评论',
        commenter_name || ' 评论了您的动态: ' || post_title,
        jsonb_build_object('comment_id', NEW.id, 'post_id', NEW.post_id)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for post_comments
DROP TRIGGER IF EXISTS on_post_comment_created ON post_comments;
CREATE TRIGGER on_post_comment_created
  AFTER INSERT ON post_comments
  FOR EACH ROW EXECUTE PROCEDURE notify_post_comment();
