/**
 * Tabs-Layout (plan.md Abschnitt 6):
 * 🪑 Tischplan · 📋 Liste · 👤 Profil.
 * Minimaler Header bei Plan/Liste: „ABEM Mittag 12:15“ (Event-Titel).
 */
import { useEffect } from 'react'
import { Tabs, router } from 'expo-router'

import { useHomeRoomQuery, useActiveEventQuery } from '@/lib/queries'
import { SessionBadge } from '@/components/session-badge'
import { useSession } from '@/hooks/use-session'

export default function TabsLayout() {
    const { state } = useSession()

    useEffect(() => {
        if (state === 'signed-out') router.replace('/(auth)/login')
    }, [state])

    const { data: room } = useHomeRoomQuery()
    const { data: event } = useActiveEventQuery(room?.id ?? null)

    const headerTitle = event?.title ?? room?.title ?? 'ABEM Tischplan'

    return (
        <Tabs screenOptions={{ headerShown: true, tabBarActiveTintColor: '#2563eb' }}>
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Plan',
                    headerTitle,
                    headerRight: () => <SessionBadge />,
                }}
            />
            <Tabs.Screen
                name="list"
                options={{
                    title: 'Liste',
                    headerTitle,
                    headerRight: () => <SessionBadge />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profil',
                    headerTitle: 'Profil',
                }}
            />
        </Tabs>
    )
}
