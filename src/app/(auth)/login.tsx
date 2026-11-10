/**
 * Login-Screen (plan.md Abschnitt 3): „Anmelden mit Google“ / „… Apple“.
 */
import { useCallback, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native'

import { signInWithProvider } from '@/lib/auth'

export default function Login() {
    const [busy, setBusy] = useState<'google' | 'apple' | null>(null)
    const [lastError, setLastError] = useState<string | null>(null)

    const signIn = useCallback(async (provider: 'google' | 'apple') => {
        setLastError(null)
        setBusy(provider)
        await signInWithProvider(provider, (message) => {
            setLastError(message)
            setBusy(null)
            if (message !== 'Anmeldung abgebrochen.') {
                Alert.alert('Anmeldung fehlgeschlagen', message)
            }
        })
        // Bei Erfolg übernimmt der Session-Provider die Navigation.
    }, [])

    return (
        <View className="flex-1 items-center justify-center bg-white px-6">
            <View className="mb-10 items-center">
                <Text className="text-3xl font-bold text-slate-800">ABEM Tischplan</Text>
                <Text className="mt-2 text-center text-sm text-slate-500">
                    Wer sitzt wo? Der Tischplan der Aula – live auf jedem Gerät.
                </Text>
            </View>

            <Pressable
                className="w-full max-w-sm flex-row items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 active:bg-gray-50"
                onPress={() => void signIn('google')}
                disabled={busy !== null}
            >
                {busy === 'google' ? <ActivityIndicator size="small" /> : null}
                <Text className="text-base font-semibold text-slate-800">Anmelden mit Google</Text>
            </Pressable>

            <Pressable
                className="mt-3 w-full max-w-sm items-center rounded-xl bg-black px-4 py-3 active:opacity-80"
                onPress={() => void signIn('apple')}
                disabled={busy !== null}
            >
                {busy === 'apple' ? <ActivityIndicator size="small" color="#fff" /> : null}
                <Text className="text-base font-semibold text-white">Anmelden mit Apple</Text>
            </Pressable>

            {lastError ? <Text className="mt-4 max-w-sm text-center text-xs text-red-600">{lastError}</Text> : null}

            <Text className="mt-10 max-w-sm text-center text-[10px] text-slate-400">
                Interne Nutzung durch das Orga-Team. Die Standard-Rolle ist „staff“; Admin-Rollen werden von der
                Orga-Leitung vergeben.
            </Text>
        </View>
    )
}
