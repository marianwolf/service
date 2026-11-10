/**
 * 📋 Listenansicht (plan.md Abschnitt 6 „Liste“): Frage-&-Antwort-Style
 * für schnelle Eingabe auf dem Handy – Tische, Belegung, „Ich hier“-Knopf.
 */
import { Alert, Pressable, ScrollView, Text, View } from 'react-native'

import { PersonChip } from '@/components/person-chip'
import { useRealtimeSeatings } from '@/hooks/use-realtime'
import { useSession } from '@/hooks/use-session'
import {
    queryClient,
    useActiveEventQuery,
    useClaimSeat,
    useHomeRoomQuery,
    useMoveSeat,
    useReleaseSeat,
    useSeatingsQuery,
    useTablesQuery,
} from '@/lib/queries'
import { findOwnSeating, firstFreeSeat, occupiedCount } from '@/lib/seating-logic'
import type { Seating, Table } from '@/lib/types'

export default function ListScreen() {
    const { profile } = useSession()
    const { data: room } = useHomeRoomQuery()
    const { data: event } = useActiveEventQuery(room?.id ?? null)
    const { data: tables } = useTablesQuery(room?.id ?? null)
    const { data: seatings } = useSeatingsQuery(event?.id ?? null)

    useRealtimeSeatings(event?.id ?? null, queryClient)

    const claimSeat = useClaimSeat()
    const moveSeat = useMoveSeat()
    const releaseSeat = useReleaseSeat()

    const ownSeating = profile ? findOwnSeating(seatings ?? [], profile.id) : null

    const takeSeat = (table: Table) => {
        if (!event || !profile) return
        const seatNo = firstFreeSeat(seatings ?? [], table.id, table.seats)
        if (!seatNo) {
            Alert.alert('Tisch voll', `Am Tisch ${table.number} ist kein Platz mehr frei.`)
            return
        }
        if (ownSeating) {
            moveSeat.mutate({
                seatingId: ownSeating.id,
                eventId: event.id,
                patch: { table_id: table.id, seat_no: seatNo },
            })
        } else {
            claimSeat.mutate({
                seating: { eventId: event.id, tableId: table.id, profileId: profile.id, seatNo },
                optimistic: {
                    id: `optimistic-${Date.now()}`,
                    event_id: event.id,
                    table_id: table.id,
                    profile_id: profile.id,
                    seat_no: seatNo,
                    note: null,
                    created_at: new Date().toISOString(),
                },
            })
        }
    }

    return (
        <ScrollView className="flex-1 bg-gray-50" contentContainerClassName="px-4 pb-8 pt-2">
            {!event ? (
                <Text className="py-10 text-center text-sm text-gray-500">Noch keine Schicht aktiv.</Text>
            ) : (
                (tables ?? []).map((table) => (
                    <ListRow
                        key={table.id}
                        table={table}
                        seatings={seatings ?? []}
                        ownSeating={ownSeating}
                        onTake={takeSeat}
                        onRelease={(id) => event && releaseSeat.mutate({ seatingId: id, eventId: event.id })}
                    />
                ))
            )}
        </ScrollView>
    )
}

function ListRow({
    table,
    seatings,
    ownSeating,
    onTake,
    onRelease,
}: {
    table: Table
    seatings: Seating[]
    ownSeating: Seating | null
    onTake: (table: Table) => void
    onRelease: (seatingId: string) => void
}) {
    const count = occupiedCount(seatings, table.id)
    const whoHere = seatings.filter((s) => s.table_id === table.id)
    const isMineHere = whoHere.some((row) => row.id === ownSeating?.id)

    return (
        <View className="mb-2 rounded-xl bg-white p-3" style={{ shadowOpacity: 0.03, shadowRadius: 4 }}>
            <View className="mb-2 flex-row items-center justify-between">
                <Text className="text-sm font-semibold text-slate-800">{table.label ?? `Tisch ${table.number}`}</Text>
                <Text className="text-xs text-gray-500">
                    {count}/{table.seats}
                </Text>
            </View>
            <View className="min-h-9 flex-row flex-wrap items-center gap-1">
                {whoHere.length === 0 ? (
                    <Text className="text-xs italic text-gray-400">noch frei</Text>
                ) : (
                    whoHere.map((s) => (
                        <PersonChip
                            key={s.id}
                            profile={s.profile ?? { id: s.profile_id, display_name: '?', avatar_url: null }}
                            size={24}
                            compact
                        />
                    ))
                )}
            </View>
            <View className="mt-2 flex-row justify-end gap-2">
                {isMineHere ? (
                    <Pressable
                        className="rounded-lg bg-gray-100 px-3 py-1.5"
                        onPress={() => {
                            const mineHere = whoHere.find((row) => row.id === ownSeating?.id)
                            if (mineHere) onRelease(mineHere.id)
                        }}
                    >
                        <Text className="text-xs font-semibold text-gray-700">Platz freigeben</Text>
                    </Pressable>
                ) : (
                    <Pressable
                        className="rounded-lg bg-blue-600 px-3 py-1.5 disabled:opacity-40"
                        disabled={count >= table.seats}
                        onPress={() => onTake(table)}
                    >
                        <Text className="text-xs font-semibold text-white">Ich hier</Text>
                    </Pressable>
                )}
            </View>
        </View>
    )
}
