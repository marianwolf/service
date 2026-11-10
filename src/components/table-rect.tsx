/**
 * Ein Tisch im Plan (plan.md Abschnitt 6: TableRect).
 * Ansichts-Screen rendert Views statt SVG → robuste Gesten
 * (Tap auf Native + Web, Press-Drag im Admin-Layout-Editor).
 */
import { Text, View } from 'react-native'

import { PersonChip } from '@/components/person-chip'
import type { Seating, Table } from '@/lib/types'
import { seatsTaken } from '@/lib/seating-logic'

export const FREE_SEAT_COLOR = '#d1d5db' // frei = grau (PDF-Markierungs-Konvention)
export const SEATED_SEAT_COLOR = '#2563eb' // belegt = blau
export const ADMIN_HIGHLIGHT = '#f59e0b'

interface Props {
    table: Table
    scale: number // px pro Meter
    seatings: Seating[]
    onPress?: () => void
    adminHighlight?: Table | null // selektierter Tisch im Admin-Editor
}

export const TableRect = ({ table, scale, seatings, onPress, adminHighlight }: Props) => {
    const w = table.w_m * scale
    const h = table.h_m * scale
    const label = table.label ?? `Tisch ${table.number}`

    const taken = seatsTaken(seatings, table.id)
    const isHighlighted = adminHighlight?.id === table.id

    return (
        <View
            onTouchEnd={onPress}
            accessibilityRole="button"
            accessibilityLabel={`${label}, ${taken.size} von ${table.seats} Plätzen belegt`}
            className="absolute overflow-hidden rounded-xl justify-between"
            style={{
                left: table.x_m * scale,
                top: table.y_m * scale,
                width: w,
                height: h,
                backgroundColor: isHighlighted ? '#fff7ed' : '#fff',
                borderWidth: isHighlighted ? 3 : 1.5,
                borderColor: isHighlighted ? ADMIN_HIGHLIGHT : '#9ca3af',
                shadowColor: '#000',
                shadowOpacity: 0.08,
                shadowRadius: 3,
                shadowOffset: { width: 0, height: 1 },
            }}
        >
            {/* Plätze als Dots entlang der langen Kanten */}
            <View className="flex-row justify-around">{seatDots(table.seats, taken, 'top')}</View>
            <View className="flex-1 items-center justify-center px-0.5">
                <Text className="text-[10px] font-semibold text-gray-800" numberOfLines={1}>
                    {label}
                </Text>
                <Text
                    className="text-[9px]"
                    style={{ color: taken.size >= table.seats ? SEATED_SEAT_COLOR : '#6b7280' }}
                >
                    {taken.size}/{table.seats}
                </Text>
            </View>
            <View className="flex-row justify-around">{seatDots(table.seats, taken, 'bottom')}</View>
        </View>
    )
}

/** Sitz-Dots verteilen sich einfach/pyramidisch auf Ober- und Unterkante. */
const seatDots = (total: number, taken: Map<number, Seating>, edge: 'top' | 'bottom') => {
    const edgeCount = Math.ceil(total / 2)
    const start = edge === 'top' ? 1 : edgeCount + 1
    const count = edge === 'top' ? edgeCount : total - edgeCount

    return Array.from({ length: count }, (_, index) => {
        const seatNo = start + index
        const isTaken = taken.has(seatNo)
        return (
            <View
                key={`seat-${edge}-${seatNo}`}
                className="items-center justify-center"
                style={{ width: 10, height: 10 }}
            >
                <View
                    style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: isTaken ? SEATED_SEAT_COLOR : FREE_SEAT_COLOR,
                        borderColor: 'rgba(0,0,0,0.15)',
                        borderWidth: 1,
                    }}
                />
            </View>
        )
    })
}

/** Kleines Auswertungs-Chip für Tischzentren (Namen kleinen Ansichten). */
export const SeatOccupantsMini = ({ seatings, tableId }: { seatings: Seating[]; tableId: string }) => (
    <View className="flex-row flex-wrap">
        {seatings
            .filter((s) => s.table_id === tableId)
            .map((s) => (
                <PersonChip
                    key={s.id}
                    profile={s.profile ?? { id: s.profile_id, display_name: '?', avatar_url: null }}
                    size={18}
                    compact
                />
            ))}
    </View>
)
