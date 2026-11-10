/**
 * Supabase-Client (plan.md Abschnitt 2/7).
 * - Session-Persistenz über AsyncStorage (Offline-Fallback: letzter Stand bleibt erhalten)
 * - detectSessionInUrl nur im Web: dort empfängt die Route den OAuth-Return
 *   direkt in der URL (PKCE). Auf Native kommt der Return per Deep-Link
 *   zurück und wird in lib/auth.ts manuell gesetzt.
 */
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
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

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: Platform.OS === 'web',
    },
})

export const isSupabaseConfigured = Boolean(supabaseUrl) && Boolean(supabaseAnonKey)
