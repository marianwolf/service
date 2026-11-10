/**
 * Admin: Raumlayout bearbeiten (plan.md Abschnitt 8 Phase 4).
 * - Tische per Press-Drag verschieben (Web: Maus, Mobile: lang drücken)
 * - Größe + Platzzahl ändern, Tische hinzufügen/löschen
 * - Positionen persistieren in `tables.x_m/y_m` und erscheinen realtime
 */
import { useState } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'

import { FloorPlan } from '@/components/floor-plan'
import { useRealtimeTables } from '@/hooks/use-realtime'
import { useSession } from '@/hooks/use-session'
import {
    useActiveEventQuery,
    useCreateTable,
    useHomeRoomQuery,
    useRemoveTable,
    useSeatingsQuery,
    useTablesQuery,
    useUpdateTable,
} from '@/lib/queries'
import type { Table } from '@/lib/types'

export default function RoomAdmin() {
    const { isAdmin } = useSession()
    const router = useRouter()
    const queryClient = useQueryClient()
    const { data: room, isLoading } = useHomeRoomQuery()
    const { data: tables } = useTablesQuery(room?.id ?? null)
    const { data: activeEvent } = useActiveEventQuery(room?.id ?? null)
    const { data: seatings } = useSeatingsQuery(activeEvent?.id ?? null)

    useRealtimeTables(room?.id ?? null, queryClient)

    const updateTable = useUpdateTable()
    const createTable = useCreateTable()
    const removeTable = useRemoveTable()

    const [selected, setSelected] = useState<Table | null>(null)

    if (!isAdmin) {
        return (
            <View className="flex-1 items-center justify-center px-6">
                <Text className="text-center text-sm text-gray-600">
                    Nur die Orga-Leitung (Rolle „admin“) kann das Layout bearbeiten.
                </Text>
            </View>
        )
    }

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center">
                <ActivityIndicator />
            </View>
        )
    }

    const nextNumber = (tables ?? []).reduce((max, t) => Math.max(max, t.number), 0) + 1

    const addTable = () => {
        if (!room) return
        // Einfach unter dem letzten Tisch einreihen (Reihenraster 1,7 m)
        const maxY = (tables ?? []).reduce((max, t) => Math.max(max, t.y_m + t.h_m), 0.4)
        createTable.mutate({
            roomId: room.id,
            number: nextNumber,
            label: `Tisch ${nextNumber}`,
            x_m: 1,
            y_m: Math.round((maxY + 0.3) * 10) / 10,
            w_m: 1.8,
            h_m: 0.9,
            seats: 8,
        })
    }

    return (
        <>
            {/* eigenes Portal-Banner ohne Tabs */}
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: `Layout ${room?.name ?? ''}`,
                    presentation: 'card',
                    headerBackTitle: 'Plan',
                }}
            />
            <ScrollView className="flex-1 bg-gray-50" contentContainerClassName="pb-12">
                <Text className="px-4 pt-3 text-xs text-gray-600">
                    Tisch drücken und ziehen um zu verschieben – speichert automatisch an die DB.
                </Text>

                <FloorPlan
                    room={room ?? null}
                    tables={tables ?? []}
                    seatings={seatings ?? []}
                    editMode
                    selectedTable={selected}
                    onSelectTable={setSelected}
                    onCommitMove={(tableId, x_m, y_m) =>
                        updateTable.mutate({
                            id: tableId,
                            roomId: room?.id ?? '',
                            x_m,
                            y_m,
                            w_m: (tables ?? []).find((t) => t.id === tableId)?.w_m ?? 1.8,
                            h_m: (tables ?? []).find((t) => t.id === tableId)?.h_m ?? 0.9,
                            seats: (tables ?? []).find((t) => t.id === tableId)?.seats ?? 8,
                        })
                    }
                />

                {/* Manipulations-Panel des selektierten Tisches */}
                {selected ? (
                    <View className="mx-4 rounded-xl bg-white p-4" style={{ shadowOpacity: 0.04 }}>
                        <View className="mb-2 flex-row items-center justify-between">
                            <Text className="font-bold text-slate-800">
                                {selected.label ?? `Tisch ${selected.number}`}
                            </Text>
                            <Pressable
                                className="rounded-lg bg-red-100 px-3 py-1"
                                onPress={() =>
                                    Alert.alert('Tisch löschen?', `Tisch ${selected.number} entfernen?`, [
                                        { text: 'Abbrechen', style: 'cancel' },
                                        {
                                            text: 'Löschen',
                                            style: 'destructive',
                                            onPress: () => {
                                                removeTable.mutate({ tableId: selected.id, roomId: room?.id ?? '' })
                                                setSelected(null)
                                            },
                                        },
                                    ])
                                }
                            >
                                <Text className="text-xs font-semibold text-red-600">🗑️ Löschen</Text>
                            </Pressable>
                        </View>

                        <View className="mb-2 flex-row gap-3">
                            <View className="flex-1">
                                <Text className="mb-1 text-[10px] font-semibold text-gray-600">Label</Text>
                                <TextInput
                                    className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                                    value={selected.label ?? ''}
                                    onChangeText={(text) => setSelected({ ...selected, label: text })}
                                />
                            </View>
                            <View className="w-20">
                                <Text className="mb-1 text-[10px] font-semibold text-gray-600">Plätze</Text>
                                <TextInput
                                    className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                                    keyboardType="number-pad"
                                    value={String(selected.seats)}
                                    onChangeText={(text) =>
                                        setSelected({
                                            ...selected,
                                            seats: Math.max(1, Math.min(24, parseInt(text, 10) || 1)),
                                        })
                                    }
                                />
                            </View>
                        </View>

                        <View className="mb-3 flex-row gap-3">
                            <View className="w-24">
                                <Text className="mb-1 text-[10px] font-semibold text-gray-600">Breite m</Text>
                                <TextInput
                                    className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                                    keyboardType="numbers-and-punctuation"
                                    value={String(selected.w_m)}
                                    onChangeText={(text) =>
                                        setSelected({
                                            ...selected,
                                            w_m: Math.max(0.5, Math.min(6, parseFloat(text.replace(',', '.')) || 1.8)),
                                        })
                                    }
                                />
                            </View>
                            <View className="w-24">
                                <Text className="mb-1 text-[10px] font-semibold text-gray-600">Tiefe m</Text>
                                <TextInput
                                    className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                                    keyboardType="numbers-and-punctuation"
                                    value={String(selected.h_m)}
                                    onChangeText={(text) =>
                                        setSelected({
                                            ...selected,
                                            h_m: Math.max(0.5, Math.min(6, parseFloat(text.replace(',', '.')) || 0.9)),
                                        })
                                    }
                                />
                            </View>
                        </View>

                        <Pressable
                            className="items-center rounded-lg bg-blue-600 py-2.5 disabled:opacity-50"
                            disabled={updateTable.isPending}
                            onPress={() => {
                                updateTable.mutate({
                                    id: selected.id,
                                    roomId: room?.id ?? '',
                                    x_m: selected.x_m,
                                    y_m: selected.y_m,
                                    w_m: selected.w_m,
                                    h_m: selected.h_m,
                                    seats: selected.seats,
                                    label: selected.label ?? undefined,
                                })
                                setSelected(null)
                            }}
                        >
                            <Text className="font-semibold text-white">Änderungen speichern</Text>
                        </Pressable>
                    </View>
                ) : (
                    <Text className="mt-3 px-4 text-xs text-gray-400">
                        Kein Tisch ausgewählt. Tap → Details, drücken & ziehen → verschieben.
                    </Text>
                )}

                {/* Neuer Tisch */}
                <View className="mx-4 mt-4">
                    <Pressable
                        className="items-center rounded-lg border-2 border-dashed border-gray-300 py-3 disabled:opacity-50"
                        onPress={addTable}
                        disabled={createTable.isPending}
                    >
                        <Text className="text-sm font-semibold text-gray-700">+ Tisch {nextNumber} hinzufügen</Text>
                    </Pressable>
                </View>

                <Pressable className="mx-4 mt-4 items-center py-2" onPress={() => router.back()}>
                    <Text className="text-sm text-blue-600">← Zurück zum Plan</Text>
                </Pressable>
            </ScrollView>
        </>
    )
}
