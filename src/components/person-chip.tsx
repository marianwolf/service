/**
 * Avatar/Initialen-Chip (plan.md Abschnitt 6: PersonChip).
 * Farb-Hash aus dem Namen → vier stabile Pastelltöne.
 */
import { Text, View } from 'react-native'

import type { Profile } from '@/lib/types'

const PALETTE = ['#bfdbfe', '#bbf7d0', '#fde68a', '#fbcfe8']

const initialsFor = (name: string) =>
    name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]!.toUpperCase())
        .join('')

const colorFor = (name: string) => {
    let hash = 0
    for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) % 997
    return PALETTE[hash % PALETTE.length]!
}

export const PersonChip = ({
    profile,
    size = 32,
    compact = false,
    onPress,
}: {
    profile: Pick<Profile, 'id' | 'display_name' | 'avatar_url'>
    size?: number
    compact?: boolean
    onPress?: () => void
}) => {
    const display = profile.display_name || '?'
    const bg = colorFor(display)

    return (
        <View
            className={compact ? '' : 'm-0.5'}
            onTouchEnd={onPress}
            accessibilityLabel={display}
            accessibilityRole={onPress ? 'button' : 'image'}
        >
            <View
                className="items-center justify-center rounded-full border border-white/60"
                style={{ width: size, height: size, backgroundColor: bg }}
            >
                <Text className="font-semibold" style={{ fontSize: size * 0.42 }}>
                    {initialsFor(display)}
                </Text>
            </View>
            {!compact && (
                <Text className="mt-0.5 max-w-16 text-center text-[10px] text-gray-700" numberOfLines={1}>
                    {display}
                </Text>
            )}
        </View>
    )
}
