/**
 * OAuth-Callback (Web): Supabase leitet nach dem OAuth-Flow hierher zurück
 * (redirectTo in lib/auth.ts). Die OAuth-Parameter (code / error*) dürfen in
 * keinem Fall in der Tabs-Route landen — dort würden sie SSR-seitig in die
 * Tab-Hrefs gerendert und erzeugen bei der Hydration Encoding-Divergenzen
 * (React-Hydration-Mismatch auf <a href>).
 *
 * Der Screen rendert bewusst nur statischen Inhalt; alle Entscheidungen
 * erfolgen im Effekt (erst nach der Hydration). Redirects räumen die
 * OAuth-Parameter aus der URL.
 */
import { useEffect, useRef } from 'react'
import { ActivityIndicator, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'

import { supabase } from '@/lib/supabase'

/** Kurz-Code der Fehlerart, die dem Login-Screen übergeben wird (ohne
 * Sonderzeichen, damit die Re-Encodierung beim erneuten SSR stabil bleibt). */
export type AuthErrorKind = 'exchange' | 'unknown'

const replaceToLogin = (authError?: AuthErrorKind) => {
    void router.replace(authError ? { pathname: '/(auth)/login', params: { authError } } : '/(auth)/login')
}

export default function AuthCallback() {
    const params = useLocalSearchParams<{ code?: string | string[]; error?: string | string[] }>()
    // String-Params normalisieren (Expo Router liefert bei Dubletten Arrays).
    const code = typeof params.code === 'string' ? params.code : undefined
    const error = typeof params.error === 'string' ? params.error : undefined

    // Guard gegen Doppel-Ausführung (React Strict Mode) — OAuth-Codes sind
    // einmalig nutzbar: ein zweiter Austausch würde "already used" werfen.
    const processedRef = useRef(false)

    useEffect(() => {
        if (processedRef.current) return
        processedRef.current = true

        void (async () => {
            if (error) {
                console.warn(`OAuth-Rückkehr mit Fehler: ${error}`)
                replaceToLogin('exchange')
                return
            }
            if (!code) {
                // Direkter Besuch ohne OAuth-Parameter → neutral zur Conversion-Route.
                replaceToLogin()
                return
            }
            try {
                const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
                if (exchangeError) {
                    console.warn(`OAuth code exchange fehlgeschlagen: ${exchangeError.message}`)
                    replaceToLogin('exchange')
                    return
                }
                // Erfolg: Session ist gesetzt; (tabs) entscheidet über Onboarding etc.
                void router.replace('/(tabs)')
            } catch (e) {
                console.warn('OAuth code exchange nicht möglich:', e)
                replaceToLogin('exchange')
            }
        })()
    }, [code, error])

    // Statisch: identisch auf Server und Client.
    return (
        <View className="flex-1 items-center justify-center bg-white">
            <ActivityIndicator />
            <Text className="mt-3 text-sm text-slate-500">Anmeldung wird abgeschlossen…</Text>
        </View>
    )
}
