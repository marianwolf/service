# Supabase-Setup (Phase 0 aus `plan.md`)

Damit die App läuft, sind einmalig diese Schritte nötig.

## 1. Projekt anlegen

1. Neues Projekt auf <https://supabase.com> erstellen (Region nähe Europa).
2. **Project Settings → API**: `Project URL` und anon `API Key` kopieren.
3. Im Repo `.env.example` nach `.env` kopieren und beide Werte eintragen:

```bash
cp .env.example .env
npx expo start -c
```

## 2. Migrationen ausführen

Im SQL-Editor des Dashboards nacheinander ausführen (Reihenfolge beliebig in einemSQL-Block, aber vor `seed_demo.sql`):

- `supabase/migrations/0001_schema.sql` – Tabellen (`profiles`, `rooms`, `tables`, `events`, `seatings`)
- `supabase/migrations/0002_rls_realtime.sql` – RLS-Policies, `is_admin()`-Helfer, Auth-Trigger (`on_auth_user_created`), Realtime-Publication + Replica-Identity
- `supabase/migrations/0003_seed_tables.sql` – Raum „Aula ABEM" + die 14 Tische aus dem PDF (Produktion startet **leer**, keine Zuweisungen)

Optional für Tests/Entwicklung (`nur Dev/Staging!`):

- `supabase/seed_demo.sql` – 12 Dummy-Profile + Zuweisung analog zur handschriftlichen Original-Tabelle (Marie→11, Naomi→12, …)

## 3. OAuth-Provider

### Google

1. <https://console.cloud.google.com> → OAuth-Client (Web) anlegen.
   - Authorized redirect URI: `https://<projekt-ref>.supabase.co/auth/v1/callback`
2. Client-ID + Secret in Supabase **Authentication → Providers → Google** eintragen und aktivieren.

### Apple (App-Store-Pflicht, sobald Google-login angeboten wird)

1. Apple Developer Portal → Services-ID + key erzeugen (`p8`).
2. Secret aus dem Key generieren und in Supabase **Authentication → Providers → Apple** hinterlegen.

## 4. Redirect-URLs

Supabase **Authentication → URL Configuration** → Redirect URLs ergänzen:

```
abemtischplan://**
https://<web-deployment-domain>/**
http://localhost:8081/**
```

- Web versendet `window.location.origin` als `redirectTo`.
- Native versendet das App-Scheme via `makeRedirectUri()` (Scheme = `abemtischplan`, konfiguriert in `app.json`).
- Site URL auf die Produktionsdomain setzen (nicht `localhost`).

## 5. Erster Admin (plan.md, Entscheidung 4)

Im **Supabase-Dashboard → Table Editor → `profiles`**: für deinen Account `role = 'admin'` setzen. Weitere Admins werden später von der Orga-Leitung in der App vergeben.

## 6. Realtime prüfen

Die Migration `0002` fügt die Tabellen der `supabase_realtime`-Publication hinzu und setzt `replica identity full` auf `seatings`/`tables` — damit erscheinen Belegungs- und Layout-Änderungen live auf allen Geräten.
