-- ============================================================
-- ABEM Tischplan – Row Level Security (plan.md Abschnitt 5)
-- ============================================================

alter table profiles enable row level security;
alter table rooms enable row level security;
alter table tables enable row level security;
alter table events enable row level security;
alter table seatings enable row level security;

-- profiles: lesbar für alle angemeldeten; schreibbar nur der eigene Datensatz
create policy "profiles_select_all_authenticated" on profiles
  for select to authenticated using (true);

create policy "profiles_insert_self" on profiles
  for insert to authenticated with check (id = auth.uid());

create policy "profiles_update_self" on profiles
  for update to authenticated using (id = auth.uid())
  with check (id = auth.uid());

-- Admin-Helfer: role meines eigenen Profils
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from profiles where id = auth.uid() and role = 'admin') $$;

-- rooms / tables: lesen für alle angemeldeten, schreiben nur Admins
create policy "rooms_select_authenticated" on rooms
  for select to authenticated using (true);
create policy "rooms_write_admin" on rooms
  for all to authenticated using (is_admin()) with check (is_admin());

create policy "tables_select_authenticated" on tables
  for select to authenticated using (true);
create policy "tables_write_admin" on tables
  for all to authenticated using (is_admin()) with check (is_admin());

-- events: lesen für alle angemeldeten, schreiben nur Admins
create policy "events_select_authenticated" on events
  for select to authenticated using (true);
create policy "events_write_admin" on events
  for all to authenticated using (is_admin()) with check (is_admin());

-- seatings:
--   staff  – eigene Zeile anlegen/ändern/löschen
--   admin  – alle Zeilen verwalten
create policy "seatings_select_authenticated" on seatings
  for select to authenticated using (true);

create policy "seatings_insert_admin_or_self" on seatings
  for insert to authenticated
  with check (profile_id = auth.uid() or is_admin());

create policy "seatings_update_admin_or_self" on seatings
  for update to authenticated
  using (profile_id = auth.uid() or is_admin())
  with check (profile_id = auth.uid() or is_admin());

create policy "seatings_delete_admin_or_self" on seatings
  for delete to authenticated
  using (profile_id = auth.uid() or is_admin());

-- ============================================================
-- Trigger: on_auth_user_created → Profile-Zeile automatisch anlegen
-- ============================================================
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      split_part(coalesce(new.email, 'Neue Person'), '@', 1),
      'Neue Person'
    ),
    coalesce(nullif(new.raw_user_meta_data ->> 'avatar_url', ''), null)
  )
  on conflict (id) do nothing;
  return new; -- Onboarding: Name wird danach im Profil nachgetragen
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- Realtime: Postgres Changes auf seatings + tables (+ events)
-- ============================================================
alter publication supabase_realtime add table seatings;
alter publication supabase_realtime add table tables;
alter publication supabase_realtime add table events;
alter table seatings replica identity full;
alter table tables replica identity full;
