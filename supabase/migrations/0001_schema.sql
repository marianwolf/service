-- ============================================================
-- ABEM Tischplan – Schema (plan.md Abschnitt 4)
-- ============================================================

-- 4.1 Profile
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 50),
  nickname text,
  avatar_url text,
  role text not null default 'staff' check (role in ('staff','admin')),
  created_at timestamptz default now()
);

-- 4.2 Räume (aktuell 1: „ABEM“-Raum aus dem PDF)
create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,                    -- z. B. „Aula ABEM“
  title text,                            -- z. B. „ABEM Mittag 12:15“ als Standardtitel
  width_m numeric,
  height_m numeric,
  created_at timestamptz default now()
);

-- 4.3 Tische (fixe Geometrie aus dem Tischplan-PDF)
create table if not exists tables (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  number int not null,                   -- 1–14
  label text,                            -- z. B. „Tisch 1“
  x_m numeric not null,
  y_m numeric not null,
  w_m numeric default 1.80,
  h_m numeric default 0.90,
  seats int not null default 8,
  unique (room_id, number)
);

-- 4.4 Zeitfenster: es gibt nur EINE Schicht („ABEM Mittag 12:15“)
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  created_by uuid references profiles(id)
);

-- 4.5 Zuweisung: Person sitzt an einem Platz
create table if not exists seatings (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  table_id uuid not null references tables(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  seat_no int not null default 1,
  note text,
  created_at timestamptz default now(),
  unique (event_id, table_id, seat_no),
  unique (event_id, profile_id)          -- eine Person = ein Platz pro Event
);

-- Indizes für die typischen App-Queries
create index if not exists idx_tables_room on tables (room_id);
create index if not exists idx_seatings_event on seatings (event_id, table_id);
create index if not exists idx_events_room on events (room_id);
