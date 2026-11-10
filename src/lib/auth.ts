/**
 * OAuth-Helfer für Google/Apple (plan.md Abschnitt 3).
 *
 * Ablauf (Native): signInWithOAuth mit skipBrowserRedirect:true liefert die
 * OAuth-URL → openAuthSessionAsync öffnet den in-app Browser → der Redirect
 * (app-scheme) liefert Tokens in der URL → setSession.
 * Ablauf (Web): normales window-Redirect-Verhalten; supabase-js erkennt den
 * Code beim Boot (detectSessionInUrl, siehe lib/supabase.ts).
 */
import { makeRedirectUri } from 'expo-auth-session'
import * as WebBrowser from 'expo-web-browser'
import { Platform } from 'react-native'

import { supabase } from '@/lib/supabase'

// Pflicht für Web: verhindert, dass der Browser-Tab hängen bleibt.
if (Platform.OS === 'web') {
    WebBrowser.maybeCompleteAuthSession()
}

/**
 * Query-/Fragment-Parameter der Auth-Rückkehr-URL auslesen
 * (SDK-58-kompatibel, da `expo-auth-session` den QueryParams-Helper
 * nicht mehr als Paket-Export freigibt).
 */
const parseAuthUrlParams = (url: string): Record<string, string> => {
    const params: Record<string, string> = {}
    const add = (segment: string) => {
        for (const pair of segment.split('&')) {
            const [key, value] = pair.split('=')
            if (!key) continue
            params[decodeURIComponent(key)] = decodeURIComponent(value ?? '')
        }
    }
    const hashIndex = url.indexOf('#')
    const queryIndex = url.indexOf('?')
    if (hashIndex >= 0) add(url.slice(hashIndex + 1).split('?')[0]!)
    if (queryIndex >= 0) add(url.slice(queryIndex + 1).split('#')[0]!)
    return params
}

export const createSessionFromUrl = async (url: string) => {
    const params = parseAuthUrlParams(url)
    const { access_token, refresh_token } = params

    if (!access_token) return null

    const { error } = await supabase.auth.setSession({ access_token, refresh_token })
    if (error) throw error
    return true
}

/** Redirect-Ziel je Plattform: Web = Origin, Native = App-Scheme */
const redirectTo = () => {
    if (Platform.OS === 'web') {
        return typeof window === 'undefined' ? undefined : window.location.origin
    }
    return makeRedirectUri()
}

export type OAuthProvider = 'google' | 'apple'

/**
 * Startet den OAuth-Flow. Mutator: hält den Login-Button in
 * (auth)/login.tsx für die Dauer des Flows auf „busy".
 */
export const signInWithProvider = async (provider: OAuthProvider, errorHandler?: (message: string) => void) => {
    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider,
            // `redirectTo` → im Web Origin, Native → Scheme; Supabase-Dashboard URL-Konfig
            options: {
                redirectTo: redirectTo(),
            },
        })
        if (error) throw error

        if (Platform.OS === 'web') {
            // supabase-js leitet selbst weiter; detectSessionInUrl
            // (lib/supabase.ts) setzt beim Reload die Session.
            return
        }
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo())
        if (result.type === 'success') {
            await createSessionFromUrl(result.url)
        } else {
            throw new Error('Anmeldung abgebrochen.')
        }
    } catch (e: unknown) {
        if (errorHandler) errorHandler(e instanceof Error ? e.message : 'Unbekannter Fehler')
        else throw e
    }
}

export const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
}
