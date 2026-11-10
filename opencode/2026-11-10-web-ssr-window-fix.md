# Session-Summary: Web-SSR-Crash fixen („window is not defined“)

**Datum:** 2026-11-10 · **Projekt:** Repo-Root (jetzt gleich das Expo-Projekt `abem-tischplan`)

## Ziel

`npx expo start --web` stürzte beim Server-Rendering der Async-Routes mit `ReferenceError: window is not defined` ab (in `@expo/router-server/node/render.js` via `SupabaseAuthClient._recoverAndRefresh → getItemAsync`).

## Ursachen & Fixes

1. **`src/lib/supabase.ts`** – Client wird im Node-Bundle (`resolver.environment=node`) erzeugt; AsyncStorage/`window` gibt es dort nicht. → Server-Erkennung `isServerRender` (`Platform.OS === 'web' && typeof window === 'undefined'`, Native hat auch kein window), No-Op-Storage + `autoRefreshToken:false`, `detectSessionInUrl` nur im echten Browser.
2. **`src/lib/auth.ts`** – `WebBrowser.maybeCompleteAuthSession()` lief beim SSR-Translate auch im Server-Kontext → Guard `typeof window !== 'undefined'`.
3. **ESLint** war danach kaputt („typescript with invalid interface loaded as resolver“): `eslint-config-expo` listet `eslint-import-resolver-typescript`, es war aber nicht installiert → nach installiation crashed `import/namespace` auf `.ts`-Dateien über den Fallback. Fix: `npm i -D eslint-import-resolver-typescript`.
4. `.gitignore`: `.env` ergänzt (DB-Secrets, wurde als untracked angezeigt).
5. `eslint.config.js`: generierte `.expo/*` in `ignores`.

Anpassung der Tests: `@/`-Alias-Imports in den Vitest-Dateien auf relative Imports umgestellt; das begegnet demselben Resolver-Problem in der lästigen Namespace-Rule von test files.

## Geänderte Dateien

- `src/lib/supabase.ts` (SSR-Guard + serverStorage)
- `src/lib/auth.ts` (`maybeCompleteAuthSession`-Guard)
- `src/lib/seating-logic.test.ts`, `src/lib/validation.test.ts` (relative Imports)
- `eslint.config.js` (`.expo/*`-Ignore), `package.json`/`package-lock.json` (eslint-import-resolver-typescript), `.gitignore` (`.env`)

## Testergebnis

- ✅ Web-PR-Smoke: `npx expo start --web` + `curl http://localhost:8081/` → HTTP 200, Login-Shell mit „ABEM Tischplan“, `/admin/rooms` → HTTP 200, Server-Bundle (λ) lädt ohne `window is not defined`
- ✅ `npx tsc --noEmit` – ohne Fehler
- ✅ `npx eslint .` – 0 Probleme
- ✅ `npx vitest run` – 2 Dateien / 13 Tests grün

## `npm run format` ausgeführt?

Ja.

## Offene Punkte

1. OAuth-Provider + Redirect-URLs noch konfigurieren (docs/supabase-setup.md)
2. Mobile-Build (EAS/Dev-Client) noch nicht getestet
3. ⚠️ plan.md Punkt 5: DSGVO-Datenschutzerklärung + Impressum vor Release
