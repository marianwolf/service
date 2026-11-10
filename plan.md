# Plan: „ABEM Tischplan“ – Dynamische Tischplan-Software für die Gastronomie

> Plattformen: **Android, iOS und Web** (eine Codebasis) · Backend: **Supabase** · Referenz: `ABEM Mittag.pdf` (Tischplan mit 14 Tischen)

---

## 1. Vision & Ziel

Eine dynamische Web-/App-Software, die den Tischplan des Gastraums (Aula/Mensa „ABEM“) digital abbildet. Sie wird **intern vom Personal/Orga-Team** genutzt:

- Tischplan des Raums live auf jedem Gerät (Handy, Tablet, Web) sichtbar und editierbar
- Jede Person meldet sich mit **Google-Konto oder Apple-Konto** an
- Bei der ersten Anmeldung trägt die Person **ihren eigenen Namen** ein
- Personen werden (von sich selbst oder der Orga) an **Tische/Plätze** zugewiesen
- Alle Änderungen erscheinen dank **Realtime-Sync** sofort auf allen Geräten
- Zeitfenster als **eine einzige Schicht-Anzeige** („ABEM Mittag 12:15“ im Header – kein separates Abend-Event)

**Nicht-Ziel:** Gast-Reservierung von außen, Bestellsystem, Zahlungen.

---

## 2. Tech-Stack

| Bereich | Technologie | Begründung |
| --- | --- | --- |
| App-Framework | **Expo (React Native + Expo Router)**, TypeScript | eine Codebasis für Android, iOS, Web |
| Styling | **NativeWind** (Tailwind für RN) | konsistentes, schnelles Styling auf allen Plattformen |
| Backend | **Supabase** | Postgres-DB, Auth (Google/Apple OAuth), Realtime, Storage, RLS |
| State/Data | TanStack Query + supabase-js | Caching, Mutationen, Realtime-Subscription |
| Formulare | react-hook-form + zod | Validierung (z. B. Namensfeld) |
| Deployment Web | Vercel / EAS (web export) | schnelle Iteration |
| Builds | **EAS Build** (Android/iOS), OTA-Updates via EAS Update |  |

### Supabase-Dienste im Einsatz

1. **Auth**: OAuth über Google & Apple (`signInWithOAuth`), danach Profil anlegen
2. **Postgres + RLS**: alle Daten mit Row-Level-Security geschützt
3. **Realtime**: Postgres Changes für Live-Tischplan
4. **Storage** (optional): Uploaded des Raumplans/Logos

---

## 3. Authentifizierung & Profil

### Ablauf

1. Start → „Anmelden mit Google“ / „Anmelden mit Apple“
2. Nach erfolgreichem OAuth: Prüfen, ob `profiles`-Zeile existiert
3. Falls nicht → **Onboarding-Screen „Dein Name“**:
   - Pflichtfeld _Anzeigename_ (z. B. „Marie K.“)
   - Optional: Spitzname, Avatar (aus OAuth oder Upload)
   - Der Name kann jederzeit im Profil bearbeitet werden
4. Rollen:
   - `staff` (Standard): darf sich selbst zuordnen, Plan lesen
   - `admin` (Orga-Leitung): darf Tische (inkl. Drag&Drop-Layout), Schicht und Einteilungen verwalten
   - **Der erste Admin wird manuell im Supabase-Dashboard** gesetzt (Table Editor → `profiles` → `role = 'admin'`); weitere Admins kann ein bestehender Admin im Profil-Bereich ernennen (später)

### Hinweise

- **Apple-Sign-in** ist für den App Store Pflicht, wenn Google-Sign-in angeboten wird
- Web + Native: Deep-Link-Redirect über `exp://` bzw. Custom Scheme konfigurieren
- Google OAuth: Redirect-URLs in Google Cloud Console + Supabase hinterlegen
- Apple OAuth: Services-ID + Key in Apple Developer Portal, Secret aus `p8` generieren

---

## 4. Datenmodell (Supabase / Postgres)

```sql
-- 4.1 Profile
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 50),
  nickname text,
  avatar_url text,
  role text not null default 'staff' check (role in ('staff','admin')),
  created_at timestamptz default now()
);

-- 4.2 Räume (aktuell 1: „ABEM“-Raum aus dem PDF)
create table rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,                    -- z. B. „Aula ABEM“
  title text,                            -- z. B. „ABEM Mittag 12:15“ als Standardtitel
  width_m numeric, height_m numeric,     -- Raumgröße in Metern (aus Plan)
  created_at timestamptz default now()
);

-- 4.3 Tische (fixe Geometrie aus dem Tischplan-PDF)
create table tables (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  number int not null,                   -- 1–14
  label text,                            -- z. B. „Tisch 1“
  x_m numeric not null, y_m numeric not null,   -- Position im Raum (Meter)
  w_m numeric default 1.80, h_m numeric default 0.90,
  seats int not null default 8,
  unique (room_id, number)
);

-- 4.4 Zeitfenster: es gibt nur EINE Schicht („ABEM Mittag 12:15“),
--     kein Abend-Event; vereinfachtes Schema
create table events (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  title text not null,                   -- „ABEM Mittag 12:15“
  starts_at timestamptz not null,
  ends_at timestamptz,
  created_by uuid references profiles(id)
);
-- Konvention: die App zeigt immer genau das aktive/letzte Event;
-- ein Schicht-Wechsel (z. B. Abend) ist später optional erweiterbar

-- 4.5 Zuweisung: Person sitzt an einem Platz
create table seatings (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  table_id uuid not null references tables(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  seat_no int not null default 1,        -- Platznummer am Tisch
  note text,
  created_at timestamptz default now(),
  unique (event_id, table_id, seat_no),
  unique (event_id, profile_id)          -- eine Person = ein Platz pro Event
);
```

### Seed-Daten: 14 Tische aus „ABEM Mittag.pdf“

Layout aus dem Grundriss (Maße in Metern; drei Tischreihen):

| Reihe  | Tische                                  | x (ca.) | Termine/Labels im Original               |
| ------ | --------------------------------------- | ------- | ---------------------------------------- |
| Links  | 1, 2, 3, 4, 5                           | 1.0     | Naemi, Johanna, Moritz (handschriftlich) |
| Mitte  | 6, 7, 8, 9, 10                          | 3.6     | Levi, Louis, Jonas, Chiara               |
| Rechts | 11, 12, 13, 14                          | 6.2     | Marie, Naomi, Lorita, Jana               |
| Extra  | „Joah“ (Einzel-Label, Kopfzeile rechts) | 6.2     | Joah                                     |

Konvention fürs Rendering: jede Tabellen-Reihe ist 1.70 m hoch, Reihenabstand 1.70 m, Tischbreite 1.80 m, Tiefe 0.90 m (Werte aus der Zeichnung).

**Entscheidung:** In Produktion startet der Plan **leer** (nur Tische geseedet, keine Personen-Zuweisungen). Für Tests/ Entwicklung gibt es einen separaten Demo-Seed (nur in Dev/Staging ausführen):

```sql
-- TEST-SEED (nur Dev/Staging): handschriftliche Namen aus dem PDF
-- (Marie, Naomi, Lorita, Jana, Johanna, Naemi, Chiara, Jonas, Louis,
--  Levi, Joah, Moritz) als Dummy-Profile + Zuweisungen anhand der
-- Original-Tabelle als Erst-Belegung (IDs sind pro Projekt anzupassen)
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
-- seatings-Zuweisung dann analog zur Original-Tabelle (Marie→Tisch 11,
-- Naomi→12, Lorita→13, Jana→14, Naemi→3, Johanna→4, Chiara→9,
-- Jonas→8, Louis→7, Levi→6, Joah→Tisch 14-Bereich rechts, Moritz→10)

---

## 5. Security (Row Level Security)

- `profiles`: Nur der eigene Datensatz ist schreibbar; lesbar für alle angemeldeten
- `rooms / tables`: nur Admins schreiben; alle angemeldeten lesen
- `events`: nur Admins schreiben
- `seatings`:
  - `staff` darf eigene Zeile anlegen/ändern/löschen
  - `admin` darf alle Zeilen verwalten
- Trigger: `on_auth_user_created` → automatisch `profiles`-Zeile anlegen (Name wird beim Onboarding nachgetragen)

---

## 6. App-Struktur (Expo Router)

```

app/ _layout.tsx // Session-Provider, Deep-Linking (auth)/ login.tsx // Google-/Apple-Button onboarding.tsx // „Dein Name“ (erste Anmeldung) (tabs)/ index.tsx // 🪑 Tischplan (Floor Plan, Haupt-Screen) list.tsx // Listenansicht: Tische + Personen profile.tsx // Profil: Name ändern, Abmelden settings/[eventId].tsx // Admin: die eine Schicht verwalten (Titel/Zeit) admin/ rooms.tsx // Admin: Tische per Drag&Drop verschieben (Web-first, Mobile: Press-Drag) lib/ supabase.ts // Client (supabase-js) schema.types.ts // generierte DB-Typen auth.ts // OAuth-Helfer components/ FloorPlan.tsx // dynamische Ansicht der Raumgeometrie TableRect.tsx // ein Tisch (Label, Belegung, Tap → Aktionen) PersonChip.tsx // Avatar/Name-Chip

```

### HCI / UX
- **Tischplan-Screen**: Raumsilhouette (Wände, Türen, Fenster wie im Plan,
  vereinfacht), Tische als Rectangle mit Nummer + belegten Plätzen.
  **Layout UND Belegung sind dynamisch:**
  - **Admin kann Tische per Drag&Drop frei verschieben** – die neue Position
    (`x_m/y_m`) wird in der DB gespeichert und erscheint realtime auf allen Geräten
  - Tap auf Tisch → Bottom-Sheet: Belegung anzeigen, sich selbst hinzufügen,
    eigene Zuweisung wechseln/löschen (Admin: beliebige Personen verschieben)
  - Tap auf Person-Chip → Profil-Overlay mit „An Tisch X verschieben“
- **Farb-Codierung**: frei = grau, belegt = blau (wie Markierung im PDF), Admin-Markierung = Akzentfarbe
- **Darstellung** „ABEM Mittag 12:15“ oben im Header (Event-Titel + Zeit, wie im PDF-Titelblock)

### Ansichten
1. **Plan** – visuelle Darstellung (Standard)
2. **Liste** – Frage & Antwort-Style, schnelle Eingabe auf dem Handy
3. **Web/Desktop** – Plan im größeren Format, Drag&Drop für Admins

---

## 7. Dynamik/Realtime

- `useRealtimeSeatings(eventId)`: subscribes auf `postgres_changes` für
  `seatings` (INSERT/UPDATE/DELETE) → Optimistic UI, server-first Korrektur
- „Wer sitzt wo“ ist dadurch live auf allen Geräten aktuell
- Offline-Fallback: letzter Stand wird gecacht (TanStack Query), Änderungen
  werden beim Reconnect mit Konflikt-Hinweis erneut hochgeladen

---

## 8. Meilensteine / Phasen

### Phase 0 – Setup (Tag 1)
- [ ] Expo-Projekt anlegen (TypeScript, Expo Router, NativeWind)
- [ ] Supabase-Projekt anlegen, Migrations-SQL ausführen, Seed-Tische einfügen
- [ ] Google-/Apple-OAuth in Supabase + Providern konfigurieren
- [ ] Deep-Links/Redirect-URLs testen (Web + iOS + Android)

### Phase 1 – Auth & Profil (Tag 2–3)
- [ ] Login-Screens (Google/Apple)
- [ ] Onboarding „Dein Name“ + Profilbearbeitung
- [ ] `profiles` Trigger + RLS-Policies
- [ ] Logout, Fehlerbehandlung

### Phase 2 – Tischplan lesen (Tag 4–5)
- [ ] `FloorPlan`-Komponente rendert 14 Tische aus DB
- [ ] Event „ABEM Mittag 12:15“ laden
- [ ] Belegung farbig darstellen, Realtime-Subscription

### Phase 3 – Interaktion (Tag 6–8)
- [ ] Sich selbst an einen Platz setzen / wechseln / freigeben
- [ ] Bottom-Sheets, Validierung (Platz frei?, doppelt?)
- [ ] Listenansicht

### Phase 4 – Admin-Features (Tag 9–11)
- [ ] Admin-Rolle, Tische/Events verwalten
- [ ] Person an anderen Tisch verschieben (Drag&Drop im Web, im Modal auf Mobile)
- [ ] **Tisch-Layout per Drag&Drop bearbeiten**: Tische verschieben, Größe und
      Platzzahl ändern, neue Tische hinzufügen (Web-first, Mobile: Press-and-Drag)

### Phase 5 – Release
- [ ] EAS Build (Android/iOS), Web-Deployment
- [ ] App-Store-Assets, Screenshots
- [ ] ⚠️ **Blocker gemerkt**: Datenschutzerklärung (DSGVO) + Impressum für
      Google-/Apple-Login bereithalten (offener Punkt 5, Abschnitt 10)
- [ ] Beta-Test mit dem Orga-Team, Feedback-Runde

---

## 9. Testing

- **Unit**: Namens-Validierung, Platzlogik (doppelt/belegt)
- **Integration**: RLS-Policies (Admin vs. Staff), OAuth-Flow (Staging-Keys)
- **E2E**: Detox / Web mit Playwright – Login → Name eintragen → Platz wählen →
  zweites Gerät sieht Änderung
- **Realtime-Test**: zwei Browser/Geräte parallel

---

## 10. Entscheidungen (Stand: 10.11.2026)

| # | Frage | Entscheidung |
|---|---|---|
| 1 | Layout-Engine | ✅ **Ja** – Tische per Drag&Drop frei verschiebbar (Admin), Position in `tables.x_m/y_m` persistiert, realtime auf allen Geräten |
| 2 | Zeitfenster | ✅ **Nein** – nur **eine Schicht-Anzeige** („ABEM Mittag 12:15“), kein Abend-Event |
| 3 | Anfangs-Belegung | ✅ Produktiv **leer** starten; die handschriftlichen Namen aus dem PDF nur als **Test-Seed** (Dev/Staging) – siehe Seed-SQL in Abschnitt 4 |
| 4 | Erster Admin | ✅ Wird **per Supabase-Dashboard** gesetzt (`profiles.role = 'admin'`) |
| 5 | DSGVO/Impressum | ⚠️ **Noch nicht geplant – gemerkt!** Vor dem Release (Phase 5) muss eine Datenschutzerklärung (DSGVO) incl. Google-/Apple-Login her, ebenso Impressum. **Offener Punkt** |

> Hinweis: Da Punkt 5 noch ungeklärt ist, bitte ihn nicht vergessen –
> Google verlangt für OAuth-Apps eine verlinkte Privacy Policy, Apple ebenso.

```
