/**
 * Auth-Gruppe (plan.md Abschnitt 3): Login → Onboarding → Tabs.
 */
import { useEffect } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { Slot, router } from 'expo-router'

import { useSession } from '@/hooks/use-session'

export default function AuthLayout() {
    const { state } = useSession()

    useEffect(() => {
        if (state === 'ready') router.replace('/(tabs)')
        if (state === 'needs-onboarding') router.replace('/(auth)/onboarding')
    }, [state])

    if (state === 'loading') {
        return (
            <View className="flex-1 items-center justify-center bg-white">
                <ActivityIndicator />
            </View>
        )
    }

    return <Slot />
}
