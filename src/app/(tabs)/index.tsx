/**
 * 🪑 Tischplan – Haupt-Screen (plan.md Abschnitt 6 „Plan“).
 * Realtime-Belegung, Tap auf Tisch → Bottom-Sheet; Admin-Link in den
 * Layout-Editor. Läuft auf Web/Desktop, Android und iOS.
 */
import { useMemo, useState } from 'react'
import { Alert, Pressable, ScrollView, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'

import { FloorPlan } from '@/components/floor-plan'
import { SeatSheet } from '@/components/seat-sheet'
import { useRealtimeSeatings, useRealtimeTables } from '@/hooks/use-realtime'
import { useSession } from '@/hooks/use-session'
import {
    useActiveEventQuery,
    useClaimSeat,
    useHomeRoomQuery,
    useMoveSeat,
    useProfilesWatch,
    useReleaseSeat,
    useSeatingsQuery,
    useTablesQuery,
} from '@/lib/queries'
import { findOwnSeating, validateClaim } from '@/lib/seating-logic'
import type { Table } from '@/lib/types'

export default function FloorPlanScreen() {
    const { profile, isAdmin } = useSession()
    const router = useRouter()
    const queryClient = useQueryClient()

    const { data: room } = useHomeRoomQuery()
    const { data: event } = useActiveEventQuery(room?.id ?? null)
    const { data: tables } = useTablesQuery(room?.id ?? null)
    const { data: seatings } = useSeatingsQuery(event?.id ?? null)
    const { data: profiles } = useProfilesWatch()

    useRealtimeSeatings(event?.id ?? null, queryClient)
    useRealtimeTables(room?.id ?? null, queryClient)

    const claimSeat = useClaimSeat()
    const moveSeat = useMoveSeat()
    const releaseSeat = useReleaseSeat()

    const [selectedTable, setSelectedTable] = useState<Table | null>(null)
    const [sheetVisible, setSheetVisible] = useState(false)

    const ownSeating = useMemo(() => (profile ? findOwnSeating(seatings ?? [], profile.id) : null), [seatings, profile])

    const optimisticSeating = (tableId: string, profileId: string, seatNo: number, eventId: string) => ({
        id: `optimistic-${Date.now()}`,
        event_id: eventId,
        table_id: tableId,
        profile_id: profileId,
        seat_no: seatNo,
        note: null,
        created_at: new Date().toISOString(),
    })

    const claimOrMove = (table: Table, seatNo: number) => {
        if (!event || !profile) {
            Alert.alert('Nicht angemeldet', 'Benötigte Profil-Daten fehlen.')
            return
        }
        const error = validateClaim({
            seatings: seatings ?? [],
            tableId: table.id,
            seatNo,
            profileId: profile.id,
            seatCount: table.seats,
        })
        if (error) {
            Alert.alert('Platz belegt', error)
            return
        }
        if (ownSeating) {
            moveSeat.mutate({
                seatingId: ownSeating.id,
                eventId: event.id,
                patch: { table_id: table.id, seat_no: seatNo },
            })
            return
        }
        claimSeat.mutate({
            seating: { eventId: event.id, tableId: table.id, profileId: profile.id, seatNo },
            optimistic: optimisticSeating(table.id, profile.id, seatNo, event.id),
        })
    }

    const adminAssign = (targetProfileId: string, table: Table, seatNo: number) => {
        if (!event) return
        const error = validateClaim({
            seatings: seatings ?? [],
            tableId: table.id,
            seatNo,
            profileId: targetProfileId,
            seatCount: table.seats,
        })
        if (error) {
            Alert.alert('Platz belegt', error)
            return
        }
        claimSeat.mutate({
            seating: { eventId: event.id, tableId: table.id, profileId: targetProfileId, seatNo },
            optimistic: optimisticSeating(table.id, targetProfileId, seatNo, event.id),
        })
    }

    return (
        <ScrollView className="flex-1 bg-gray-50" contentContainerClassName="grow" nestedScrollEnabled>
            {/* Schichtzeile wie im PDF-Titelblock */}
            <View className="flex-row items-center justify-between px-4 pt-2">
                <Text className="text-xs text-gray-500">{room?.name ?? 'Aula ABEM'}</Text>
                {isAdmin ? (
                    <Pressable
                        className="rounded-lg bg-amber-100 px-3 py-1.5"
                        onPress={() => router.push('/admin/rooms')}
                    >
                        <Text className="text-xs font-semibold text-amber-700">✏️ Layout bearbeiten</Text>
                    </Pressable>
                ) : null}
            </View>

            {!event ? (
                <View className="items-center py-10">
                    <Text className="text-sm text-gray-600">Noch keine Schicht angelegt.</Text>
                    {isAdmin ? (
                        <Pressable
                            className="mt-3 items-center rounded-lg bg-blue-600 px-4 py-2"
                            onPress={() => router.push('/settings/new')}
                        >
                            <Text className="text-sm font-semibold text-white">
                                Schicht „ABEM Mittag 12:15“ anlegen
                            </Text>
                        </Pressable>
                    ) : null}
                </View>
            ) : (
                <>
                    <FloorPlan
                        room={room ?? null}
                        tables={tables ?? []}
                        seatings={seatings ?? []}
                        onSelectTable={(table) => {
                            setSelectedTable(table)
                            setSheetVisible(true)
                        }}
                    />
                    {/* Farb-Legende (Konvention aus dem PDF) */}
                    <View className="mb-4 flex-row flex-wrap items-center justify-center gap-4">
                        <LegendDot color="#d1d5db" text="frei" />
                        <LegendDot color="#2563eb" text="belegt" />
                        {isAdmin ? <LegendDot color="#f59e0b" text="Admin-Markierung" /> : null}
                        {ownSeating ? <LegendDot color="#10b981" text="Mein Platz" /> : null}
                    </View>
                </>
            )}

            <SeatSheet
                visible={sheetVisible && Boolean(selectedTable?.id)}
                table={selectedTable}
                seatings={seatings ?? []}
                profiles={profiles ?? []}
                ownProfile={profile}
                isAdmin={Boolean(isAdmin)}
                onClose={() => setSheetVisible(false)}
                onClaim={(tableId, seatNo) => {
                    if (selectedTable) claimOrMove(selectedTable, seatNo)
                }}
                onRelease={(seatingId) => event && releaseSeat.mutate({ seatingId, eventId: event.id })}
                onAdminAssign={(profileId, tableId, seatNo) => {
                    if (selectedTable) adminAssign(profileId, selectedTable, seatNo)
                }}
            />
        </ScrollView>
    )
}

const LegendDot = ({ color, text }: { color: string; text: string }) => (
    <View className="flex-row items-center gap-1">
        <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
        <Text className="text-[10px] text-gray-600">{text}</Text>
    </View>
)
