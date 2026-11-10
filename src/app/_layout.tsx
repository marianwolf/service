/**
 * Root-Layout (plan.md Abschnitt 6 „app/_layout.tsx“):
 * NativeWind-CSS-Import, GestureHandlerRootView, TanStack Query,
 * Session-Provider, Deep-Link-Empfang für OAuth-Rückkehr.
 */
import '@/global.css'

import { QueryClientProvider } from '@tanstack/react-query'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useLinkingURL } from 'expo-linking'

import { queryClient } from '@/lib/queries'
import { SessionProvider } from '@/hooks/use-session'
import { createSessionFromUrl } from '@/lib/auth'

/** Native: Deep-Link mit Tokens auch dann setzen, wenn die Auth-Session
 * beim Schließen des Browsers nicht abgefangen werden konnte (app getötet). */
const AuthDeepLink = () => {
    const url = useLinkingURL()
    useEffect(() => {
        if (!url) return
        if (url.includes('access_token=') || url.includes('code=')) {
            void createSessionFromUrl(url).catch(() => undefined)
        }
    }, [url])
    return null
}

export default function RootLayout() {
    return (
        <QueryClientProvider client={queryClient}>
            <GestureHandlerRootView className="flex-1 bg-white">
                <SessionProvider>
                    <AuthDeepLink />
                    <StatusBar style="dark" />
                    <Stack screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="(auth)" />
                        <Stack.Screen name="(tabs)" />
                        <Stack.Screen name="settings/[eventId]" options={{ presentation: 'modal' }} />
                        <Stack.Screen name="admin/rooms" />
                    </Stack>
                </SessionProvider>
            </GestureHandlerRootView>
        </QueryClientProvider>
    )
}
