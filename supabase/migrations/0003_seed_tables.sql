-- ============================================================
-- ABEM Tischplan – Seed: Raum + 14 Tische aus „ABEM Mittag.pdf“
-- Produktion startet LEER (keine Personen-Zuweisungen!).
-- ============================================================

-- Raum „Aula ABEM“, Standardtitel wie im PDF-Titelblock
insert into rooms (id, name, title, width_m, height_m)
values ('00000000-0000-0000-0000-100000000001', 'Aula ABEM', 'ABEM Mittag 12:15', 8.4, 9.5)
on conflict (id) do nothing;

-- 14 Tische, drei Reihen (Reihenabstand 1.70 m, Reihe 1.70 m hoch,
-- Tisch 1.80 × 0.90 m): Links, Mitte, Rechts je Starter-Reihe.
with room as (
  select id from rooms where id = '00000000-0000-0000-0000-100000000001'
),
-- Reihe anlegen mit x-Position der Reihe (Meter) und Start-y (Meter)
data (number, x_m, y_m, w_m, h_m, seats, label) as (
  values
    -- Reihe links (Tische stapeln entlang y): x = 1.0
    ( 1, 1.0, 1.0, 1.8, 0.9, 8, 'Tisch 1'),
    ( 2, 1.0, 2.7, 1.8, 0.9, 8, 'Tisch 2'),
    ( 3, 1.0, 4.4, 1.8, 0.9, 8, 'Tisch 3'),
    ( 4, 1.0, 6.1, 1.8, 0.9, 8, 'Tisch 4'),
    ( 5, 1.0, 7.8, 1.8, 0.9, 8, 'Tisch 5'),
    -- Reihe mitte: x = 3.6
    ( 6, 3.6, 1.0, 1.8, 0.9, 8, 'Tisch 6'),
    ( 7, 3.6, 2.7, 1.8, 0.9, 8, 'Tisch 7'),
    ( 8, 3.6, 4.4, 1.8, 0.9, 8, 'Tisch 8'),
    ( 9, 3.6, 6.1, 1.8, 0.9, 8, 'Tisch 9'),
    (10, 3.6, 7.8, 1.8, 0.9, 8, 'Tisch 10'),
    -- Reihe rechts: x = 6.2
    (11, 6.2, 1.0, 1.8, 0.9, 8, 'Tisch 11'),
    (12, 6.2, 2.7, 1.8, 0.9, 8, 'Tisch 12'),
    (13, 6.2, 4.4, 1.8, 0.9, 8, 'Tisch 13'),
    (14, 6.2, 6.1, 1.8, 0.9, 8, 'Tisch 14')
)
insert into tables (room_id, number, label, x_m, y_m, w_m, h_m, seats)
select room.id, d.number, d.label, d.x_m, d.y_m, d.w_m, d.h_m, d.seats
from data d, room
on conflict (room_id, number) do nothing;
