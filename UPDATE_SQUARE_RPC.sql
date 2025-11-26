
-- Increment Likes Function
create or replace function increment_likes(row_id bigint)
returns void
language plpgsql
security definer
as $$
begin
  update character_posts
  set likes_count = likes_count + 1
  where id = row_id;
end;
$$;

-- Decrement Likes Function
create or replace function decrement_likes(row_id bigint)
returns void
language plpgsql
security definer
as $$
begin
  update character_posts
  set likes_count = greatest(0, likes_count - 1)
  where id = row_id;
end;
$$;

-- Increment Comments Function
create or replace function increment_comments(row_id bigint)
returns void
language plpgsql
security definer
as $$
begin
  update character_posts
  set comments_count = comments_count + 1
  where id = row_id;
end;
$$;
