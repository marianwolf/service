/**
 * Avatar-Knopf oben rechts → Profilscreen.
 */
import { Pressable, Text, View } from 'react-native'
import { router } from 'expo-router'

import { useSession } from '@/hooks/use-session'

const initialsFor = (name: string) =>
    name
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('')

export const SessionBadge = () => {
    const { profile } = useSession()
    const name = profile?.display_name ?? '?'

    return (
        <Pressable className="mr-3" onPress={() => router.push('/profile')} accessibilityLabel="Profil öffnen">
            <View className="h-8 w-8 items-center justify-center rounded-full bg-blue-600">
                <Text className="text-xs font-bold text-white">{initialsFor(name) || '?'}</Text>
            </View>
        </Pressable>
    )
}
