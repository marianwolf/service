/**
 * Dynamische Ansicht der Raumgeometrie (plan.md Abschnitt 6: FloorPlan).
 * - Tische als absolute Views, skaliert von Metern in Pixel (Raumbreite)
 * - Admin: Tisch lange drücken → Press-Drag verschieben (Mobile + Web)
 * - Tap auf Tisch → Callback (Bottom-Sheet im Plan-Screen)
 */
import { useCallback, useMemo, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { runOnJS } from 'react-native-reanimated'

import { TableRect } from '@/components/table-rect'
import type { Room, Seating, Table } from '@/lib/types'

interface FloorPlanProps {
    room: Room | null
    tables: Table[]
    seatings: Seating[]
    editMode?: boolean
    selectedTable?: Table | null
    onSelectTable?: (table: Table) => void
    /** Aufruf beim Loslassen des gezogenen Tisches (Admin) */
    onCommitMove?: (tableId: string, x_m: number, y_m: number) => void
}

const MARGIN_M = 0.4

export const FloorPlan = ({
    room,
    tables,
    seatings,
    editMode = false,
    selectedTable = null,
    onSelectTable,
    onCommitMove,
}: FloorPlanProps) => {
    const [containerWidth, setContainerWidth] = useState(0)

    /** Raumabmessung aus DB oder aus maximaler Tisch-Ausdehnung ableiten */
    const roomWidth = useMemo(() => {
        if (room?.width_m) return room.width_m as number
        const maxX = tables.reduce((max, t) => Math.max(max, t.x_m + t.w_m), 0)
        return maxX + MARGIN_M
    }, [room, tables])

    const roomHeight = useMemo(() => {
        if (room?.height_m) return room.height_m as number
        const maxY = tables.reduce((max, t) => Math.max(max, t.y_m + t.h_m), 0)
        return maxY + MARGIN_M
    }, [room, tables])

    const scale = containerWidth ? containerWidth / roomWidth : 0

    /** Position des gerade gezogenen Tisches (JS-Thread, gesteuert aus dem worklet) */
    const [dragState, setDragState] = useState<{ id: string; x_m: number; y_m: number } | null>(null)

    const dragUpdate = useCallback(
        (id: string, baseX: number, baseY: number, translationX: number, translationY: number) => {
            if (!editMode || !scale) return
            const table = tables.find((t) => t.id === id)
            if (!table) return
            const nextX = Math.max(0, Math.min(baseX + translationX / scale, roomWidth - table.w_m))
            const nextY = Math.max(0, Math.min(baseY + translationY / scale, roomHeight - table.h_m))
            setDragState({ id, x_m: Math.round(nextX * 100) / 100, y_m: Math.round(nextY * 100) / 100 })
        },
        [editMode, scale, tables, roomWidth, roomHeight]
    )

    const dragCommit = useCallback(
        (id: string) => {
            setDragState((current) => {
                if (current?.id === id && onCommitMove) onCommitMove(id, current.x_m, current.y_m)
                return null
            })
        },
        [onCommitMove]
    )

    // Kein Reset-Effekt nötig: dragUpdate läuft nur im Edit-Modus (guard unten),
    // dragCommit setzt den Zustand beim Loslassen zurück.

    if (!room || !tables.length || !scale) {
        return (
            <View className="flex-1 items-center justify-center">
                <Text className="text-sm text-gray-500">Raum lädt …</Text>
            </View>
        )
    }

    const canvasWidth = roomWidth * scale
    const canvasHeight = roomHeight * scale

    return (
        <View className="w-full" onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}>
            <ScrollView
                scrollEnabled={!editMode}
                nestedScrollEnabled
                style={{ height: Math.min(canvasHeight, 560) }}
                showsVerticalScrollIndicator={false}
            >
                <View className="m-2">
                    {/* Raumsilhouette (vereinfachte Wände wie im Plan-PDF) */}
                    <View
                        className="absolute inset-0 rounded-lg bg-emerald-50"
                        style={{ width: canvasWidth, height: canvasHeight, borderColor: '#334155', borderWidth: 2 }}
                    />
                    <View style={{ width: canvasWidth, height: canvasHeight }}>
                        {tables.map((table, index) => {
                            const dragged = dragState && dragState.id === table.id ? { ...table, ...dragState } : table

                            if (!editMode) {
                                return (
                                    <TableRect
                                        key={table.id}
                                        table={dragged}
                                        scale={scale}
                                        seatings={seatings}
                                        onPress={() => onSelectTable?.(dragged)}
                                    />
                                )
                            }

                            // Press-Drag: 180 ms drücken aktiviert das Pan-Gesture
                            const gesture = Gesture.Pan()
                                .activateAfterLongPress(180)
                                .onUpdate((event) => {
                                    runOnJS(dragUpdate)(
                                        dragged.id,
                                        table.x_m,
                                        table.y_m,
                                        event.translationX,
                                        event.translationY
                                    )
                                })
                                .onEnd(() => {
                                    runOnJS(dragCommit)(dragged.id)
                                })
                            return (
                                <GestureDetector key={table.id} gesture={gesture}>
                                    <View
                                        className="absolute"
                                        style={{
                                            left: dragged.x_m * scale,
                                            top: dragged.y_m * scale,
                                            width: dragged.w_m * scale,
                                            height: dragged.h_m * scale,
                                            zIndex: dragState?.id === table.id ? 40 : index + 1,
                                        }}
                                    >
                                        <TableRect
                                            table={dragged}
                                            scale={scale}
                                            seatings={seatings}
                                            onPress={() => onSelectTable?.(dragged)}
                                            adminHighlight={selectedTable}
                                        />
                                    </View>
                                </GestureDetector>
                            )
                        })}
                    </View>
                </View>
            </ScrollView>
            <Text className="mt-1 text-center text-[10px] text-gray-500">
                {room.name} · {roomWidth.toFixed(1)} × {roomHeight.toFixed(1)} m
            </Text>
        </View>
    )
}
