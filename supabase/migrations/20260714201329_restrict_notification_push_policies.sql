drop policy if exists "Service role full access push" on public.push_subscriptions;
create policy "Service role full access push" on public.push_subscriptions
  for all to service_role
  using (true)
  with check (true);

drop policy if exists "push_subs_own_read" on public.push_subscriptions;
create policy "push_subs_own_read" on public.push_subscriptions
  for select to authenticated
  using ((select auth.uid()) = user_id);
