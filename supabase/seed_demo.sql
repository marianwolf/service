-- ============================================================
-- ABEM Tischplan – TEST-SEED (nur Dev/Staging ausführen!)
-- Dummy-Profile + Zuweisung analog zur handschriftlichen
-- Original-Tabelle (plan.md Abschnitt 4).
-- ============================================================

insert into profiles (id, display_name, role) values
  ('00000000-0000-0000-0000-000000000001','Marie','staff'),
  ('00000000-0000-0000-0000-000000000002','Naomi','staff'),
  ('00000000-0000-0000-0000-000000000003','Lorita','staff'),
  ('00000000-0000-0000-0000-000000000004','Jana','staff'),
  ('00000000-0000-0000-0000-000000000005','Johanna','staff'),
  ('00000000-0000-0000-0000-000000000006','Naemi','staff'),
  ('00000000-0000-0000-0000-000000000007','Chiara','staff'),
  ('00000000-0000-0000-0000-000000000008','Jonas','staff'),
  ('00000000-0000-0000-0000-000000000009','Louis','staff'),
  ('00000000-0000-0000-0000-000000000010','Levi','staff'),
  ('00000000-0000-0000-0000-000000000011','Joah','staff'),
  ('00000000-0000-0000-0000-000000000012','Moritz','staff')
on conflict (id) do nothing;

-- Event „ABEM Mittag 12:15“ (startet heute 12:15; Zeit anpassen)
with room as (
  select id from rooms where id = '00000000-0000-0000-0000-100000000001'
)
insert into events (id, room_id, title, starts_at, ends_at)
select
  '00000000-0000-0000-0000-200000000001',
  room.id,
  'ABEM Mittag 12:15',
  date_trunc('day', now()) + interval '12 hours 15 minutes',
  date_trunc('day', now()) + interval '14 hours'
from room
on conflict (id) do nothing;

-- Tables-IDs via number auflösen (IDs sind pro Projekt anzupassen,
-- deshalb Lookup über room_id/number statt fixer UUIDs)
with room as (
  select id from rooms where id = '00000000-0000-0000-0000-100000000001'
),
seat (display_name, table_number, seat_no) as (
  -- Marie→11, Naomi→12, Lorita→13, Jana→14
  ('Marie',   11, 1),
  ('Naomi',   12, 1),
  ('Lorita',  13, 1),
  ('Jana',    14, 1),
  -- Naemi→3, Johanna→4
  ('Naemi',    3, 1),
  ('Johanna',  4, 1),
  -- Chiara→9, Jonas→8, Louis→7, Levi→6, Moritz→10
  ('Chiara',   9, 1),
  ('Jonas',    8, 1),
  ('Louis',    7, 1),
  ('Levi',     6, 1),
  ('Moritz',  10, 1),
  -- Joah→14-Bereich rechts (Platz 2 am Tisch 14)
  ('Joah',    14, 2)
)
insert into seatings (event_id, table_id, profile_id, seat_no)
select
  ev.id,
  t.id,
  p.id,
  s.seat_no
from seat s
join profiles p on p.display_name = s.display_name
join tables t on t.room_id = (select id from room) and t.number = s.table_number
join events ev on ev.id = '00000000-0000-0000-0000-200000000001'
on conflict do nothing;
