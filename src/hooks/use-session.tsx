/**
 * Session-/Profil-Kontext (plan.md Abschnitt 3).
 * - session: Supabase-Session (null = nicht angemeldet)
 * - profile: `profiles`-Zeile; null = Onboarding („Dein Name“) nötig
 * - role 'admin' → Orga-Features (Tische, Einteilungen, Schicht)
 */
import { Session } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'

import { supabase } from '@/lib/supabase'
import { fetchProfile } from '@/lib/queries'
import type { Profile } from '@/lib/types'

export type SessionState = 'loading' | 'signed-out' | 'needs-onboarding' | 'ready'

interface SessionContextValue {
    state: SessionState
    session: Session | null
    profile: Profile | null
    isAdmin: boolean
    refreshProfile: () => Promise<void>
}

const SessionContext = createContext<SessionContextValue>({
    state: 'loading',
    session: null,
    profile: null,
    isAdmin: false,
    refreshProfile: async () => {},
})

/** Platzhalter-Name aus dem Auth-Trigger (on_auth_user_created) */
export const isPlaceholderName = (display_name: string, placeholder = 'Neue Person') => display_name === placeholder

export function SessionProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [status, setStatus] = useState<'loading' | 'ready'>('loading')

    useEffect(() => {
        let active = true

        const loadProfile = async (current: Session | null) => {
            if (!current?.user) {
                if (active) {
                    setSession(null)
                    setProfile(null)
                    setStatus('ready')
                }
                return
            }
            const row = await fetchProfile(current.user.id)
            if (active) {
                setSession(current)
                setProfile(row)
                setStatus('ready')
            }
        }

        void supabase.auth
            .getSession()
            .then(({ data }) => {
                void loadProfile(data.session)
            })
            .catch(() => {
                if (active) setStatus('ready')
            })

        // onAuthStateChange-Korrekturen sinnvoll entzerrt (supabase-js splice-Deadlock vermeiden)
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, newSession) => {
            setTimeout(() => void loadProfile(newSession), 0)
        })

        return () => {
            active = false
            subscription.unsubscribe()
        }
    }, [])

    const refreshProfile = useMemo(
        () => async () => {
            const {
                data: { session: currentSession },
            } = await supabase.auth.getSession()
            if (!currentSession?.user) return
            const row = await fetchProfile(currentSession.user.id)
            setProfile(row)
        },
        []
    )

    const state: SessionState =
        status === 'loading'
            ? 'loading'
            : session === null
              ? 'signed-out'
              : profile === null || isPlaceholderName(profile.display_name)
                ? 'needs-onboarding'
                : 'ready'

    const value: SessionContextValue = {
        state,
        session,
        profile,
        isAdmin: profile?.role === 'admin',
        refreshProfile,
    }

    return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export const useSession = () => useContext(SessionContext)
