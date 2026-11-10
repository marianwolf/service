/**
 * Supabase-Client (plan.md Abschnitt 2/7).
 * - Session-Persistenz über AsyncStorage (Offline-Fallback: letzter Stand bleibt erhalten)
 * - OAuth-Rückkehr Web: `code`/`error` landen auf der Route app/auth-callback.tsx,
 *   die explizit austauscht/weiterleitet. detectSessionInUrl ist daher aus —
 *   ein implizites „Sniffen" beim Boot würde sonst dieselben Auth-Parameter
 *   einmal SSR-rendern und zum Client-Zeitpunkt ändern (Hydration-Mismatch),
 *   und mit dem Callback-Screen doppelt austauschen.
 * Auf Native kommt der Return per Deep-Link zurück und wird in lib/auth.ts
 * manuell gesetzt.
 *
 * Server-Rendering (Expo Async Routes, Node-Bundle `resolver.environment=node`):
 * dort darf kein Browser-API (window/localStorage) angerufen werden.
 * Der Client wird auf dem Server mit No-Op-Storage erzeugt (keine Session) —
 * im Browser-Bundle übernimmt danach AsyncStorage die Persistenz.
 */
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { Platform } from 'react-native'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        'Supabase-Konfiguration fehlt. Kopiere .env.example nach .env und trage ' +
            'EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_ANON_KEY ein ' +
            '(Supabase-Dashboard → Project Settings → API). Danach `npx expo start -c`.'
    )
}

/**
 * Server-Side-Rendering im Web-Bundle erkennen: Platform web, aber kein window.
 * (Native hat ebenfalls kein window — deshalb die Platform-Kombination.)
 */
export const isServerRender = Platform.OS === 'web' && typeof window === 'undefined'

/** No-Op-Storage für Server-Render (liefert keine Session, wirft nichts). */
const serverStorage = {
    getItem: async (_key: string) => null,
    setItem: async (_key: string, _value: string) => undefined,
    removeItem: async (_key: string) => undefined,
} as const

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: isServerRender ? serverStorage : AsyncStorage,
        persistSession: true,
        // Server rendert nur; Token-Refresh gehört in den Browser/Bildschirm.
        autoRefreshToken: !isServerRender,
        // OAuth-Rückkehr immer explizit (app/auth-callback.tsx bzw. Deep-Link in lib/auth.ts).
        detectSessionInUrl: false,
    },
})

export const isSupabaseConfigured = Boolean(supabaseUrl) && Boolean(supabaseAnonKey)
