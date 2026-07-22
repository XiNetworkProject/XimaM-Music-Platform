-- Keep the native messaging inbox current without foreground polling.
alter table public.message_requests replica identity full;
alter table public.friendships replica identity full;
alter table public.user_blocks replica identity full;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['message_requests', 'friendships', 'user_blocks']
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end
$$;
