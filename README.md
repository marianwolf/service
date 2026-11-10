# ABEM Tischplan

Dynamische Tischplan-Software für die Gastronomie-Orga – **Expo (React Native

- Expo Router)**, eine Codebasis für Android, iOS und Web. Backend: **Supabase** (Postgres, Auth mit Google/Apple, Realtime, RLS).

Implementiert laut `../plan.md` (Stand 10.11.2026).

## Features

- **Login** mit Google-/Apple-Konto (OAuth → Deep-Link/Rückkehr je Plattform)
- **Onboarding „Dein Name“** bei erster Anmeldung (später im Profil änderbar)
- **Tischplan** (🪑 Plan): Raumsilhouette, 14 Tische mit freien/belegten Plätzen (grau/blau), Header „ABEM Mittag 12:15“ aus dem Event
- **Realtime-Sync**: Belegungs- und Layout-Änderungen via Postgres-Changes auf allen Geräten
- **Liste** (📋): schnelle „Ich hier“-Zuweisung am Handy
- **Profil** (👤): Name/Spitzname/Avatar, Abmelden, Admin-Bereiche
- **Admin**:
  - Schicht verwalten (Titel/Zeit) in `settings/[eventId]`
  - Raumlayout per **Press-Drag** verschieben, Größe/Platzzahl ändern, Tische hinzufügen/löschen in `admin/rooms` (Web-first, Mobile: lang drücken)
- Rollen: `staff` (Standard) / `admin` (Orga) – RLS erzwingt es serverseitig

## Struktur

```
src/app/(auth)/          Login + Onboarding
src/app/(tabs)/          Plan (index), Liste, Profil
src/app/settings/        Schichtverwaltung (admin)
src/app/admin/rooms.tsx  Layout-Editor (admin, Drag&Drop)
src/components/          FloorPlan, TableRect, PersonChip, SeatSheet
src/hooks/               Session, Realtime-Subscriptions
src/lib/                 supabase-Client, Queries/Mutationen, Platzlogik, zod
supabase/migrations/     Schema, RLS + Trigger + Realtime, Seed (14 Tische)
supabase/seed_demo.sql   TEST-SEED (nur Dev/Staging!)
```

## Setup kurz

Alle Details (Provider, Redirect-URLs, erster Admin) stehen in [docs/supabase-setup.md](docs/supabase-setup.md).

```bash
cp .env.example .env   # Supabase URL + anon key eintragen
npm install
npm test               # Unit-Tests (Platzlogik, Validierung)
npx tsc --noEmit       # Typecheck
npx expo start         # Dev-Server (Web/iOS/Android)
npx eslint .           # Lint
```

## Deployment (Phase 5, offen)

- Web: Vercel (`npx expo export` / static output)
- Mobile: **EAS Build** + **EAS Update** (`npx eas build -p android|ios`)
- ⚠️ **Vor Release (plan.md, Punkt 5)**: Datenschutzerklärung (DSGVO) inkl. Google-/Apple-Login + Impressum – **noch offen**.
