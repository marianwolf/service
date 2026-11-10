/**
 * Bottom-Sheet eines Tisches (plan.md Abschnitt 6 „Tap auf Tisch“):
 * - Belegung anzeigen, sich selbst hinzufügen, eigene Zuweisung wechseln/löschen
 * - Admin: beliebige Personen an freie Plätze setzen bzw. verschieben
 */
import { useMemo, useState } from 'react'
import { Alert, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native'

import { firstFreeSeat, seatsTaken } from '@/lib/seating-logic'
import type { Profile, Seating, Table } from '@/lib/types'

interface SeatSheetProps {
    visible: boolean
    table: Table | null
    seatings: Seating[] // alle des Events
    profiles: Profile[] // alle Profile (für Admin-Zuweisung)
    ownProfile: Profile | null
    isAdmin: boolean
    onClose: () => void
    onClaim: (tableId: string, seatNo: number) => void
    onRelease: (seatingId: string) => void
    onAdminAssign: (profileId: string, tableId: string, seatNo: number) => void
}

export const SeatSheet = ({
    visible,
    table,
    seatings,
    profiles,
    ownProfile,
    isAdmin,
    onClose,
    onClaim,
    onRelease,
    onAdminAssign,
}: SeatSheetProps) => {
    const [assignProfileId, setAssignProfileId] = useState<string | null>(null)

    const taken = useMemo(
        () => (table ? seatsTaken(seatings, table.id) : new Map<number, Seating>()),
        [table, seatings]
    )
    const unseated = useMemo(
        () => profiles.filter((p) => !seatings.some((s) => s.profile_id === p.id)),
        [profiles, seatings]
    )

    if (!table) return null
    const label = table.label ?? `Tisch ${table.number}`

    const claim = (seatNo: number) => {
        if (!ownProfile) return
        onClaim(table.id, seatNo)
        onClose()
    }

    const assignFree = () => {
        const seatNo = firstFreeSeat(seatings, table.id, table.seats)
        if (seatNo && assignProfileId) {
            onAdminAssign(assignProfileId, table.id, seatNo)
            setAssignProfileId(null)
            onClose()
        }
    }

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} onDismiss={onClose}>
            {/* Klick auf Backdrop schließt */}
            <Pressable className="flex-1" onPress={onClose} accessibilityLabel="Bottom Sheet schließen">
                <View className="flex-1 justify-end">
                    <Pressable className="rounded-t-3xl bg-white p-4" style={[elevation(10)]} onPress={undefined}>
                        <View className="mb-3 h-1 w-12 self-center rounded-full bg-gray-300" />
                        <Text className="text-base font-bold">{label}</Text>
                        <Text className="mb-2 text-xs text-gray-500">
                            {taken.size}/{table.seats} belegt · zum Platz drücken
                        </Text>

                        <ScrollView className="max-h-64 grow-0" nestedScrollEnabled>
                            <View className="flex-row flex-wrap gap-1.5">
                                {seedButtons(table, taken, ownProfile, claim, onRelease)}
                            </View>
                        </ScrollView>

                        {/* Admin: Person zuweisen */}
                        {isAdmin && (
                            <View className="mt-3 border-t border-gray-200 pt-3">
                                <Text className="mb-1 text-xs font-semibold text-gray-700">Person zuweisen</Text>
                                {unseated.length === 0 ? (
                                    <Text className="text-xs text-gray-500">
                                        Alle Personen haben bereits einen Platz.
                                    </Text>
                                ) : (
                                    <View className="flex-row flex-wrap gap-1.5">
                                        {unseated.slice(0, 12).map((p) => (
                                            <Pressable
                                                key={p.id}
                                                onPress={() =>
                                                    setAssignProfileId((cur) => (cur === p.id ? null : p.id))
                                                }
                                                className={`rounded-full px-2.5 py-1 ${
                                                    assignProfileId === p.id ? 'bg-blue-600' : 'bg-gray-100'
                                                }`}
                                            >
                                                <Text
                                                    className={`text-xs ${
                                                        assignProfileId === p.id ? 'text-white' : 'text-gray-800'
                                                    }`}
                                                >
                                                    {p.display_name}
                                                </Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                )}
                                <Pressable
                                    className="mt-2 items-center rounded-lg bg-emerald-600 py-2 disabled:opacity-40"
                                    disabled={!assignProfileId}
                                    onPress={assignFree}
                                >
                                    <Text className="text-sm font-semibold text-white">Freien Platz besetzen</Text>
                                </Pressable>
                            </View>
                        )}
                    </Pressable>
                </View>
            </Pressable>
        </Modal>
    )
}

const elevation = (value: number) =>
    Platform.select({
        android: { elevation: value },
        default: { shadowOpacity: 0.1, shadowRadius: value, shadowOffset: { width: 0, height: -2 } },
    })

/** Platz-Buttons: frei → „Platz n“, belegt → Person, eigener → Freigeben */
const seedButtons = (
    table: Table,
    taken: Map<number, Seating>,
    ownProfile: Profile | null,
    onClaim: (seatNo: number) => void,
    onRelease: (seatingId: string) => void
) =>
    Array.from({ length: table.seats }, (_, index) => {
        const seatNo = index + 1
        const occupant = taken.get(seatNo)
        const isOwn = occupant && ownProfile && occupant.profile_id === ownProfile.id
        return (
            <Pressable
                key={`place-${seatNo}`}
                disabled={!occupant ? false : !isOwn}
                onPress={() => {
                    if (isOwn && occupant) onRelease(occupant.id)
                    else if (!occupant) onClaim(seatNo)
                    else Alert.alert('Platz belegt', `Hier sitzt ${occupant.profile?.display_name ?? '?'}.`)
                }}
                className={`w-16 items-center justify-center rounded-lg py-2 ${
                    occupant ? (isOwn ? 'bg-emerald-100' : 'bg-blue-100') : 'bg-gray-100'
                }`}
            >
                <Text className="text-xs font-semibold text-gray-700">
                    {occupant ? (occupant.profile?.display_name ?? 'Platz') : `Platz ${seatNo}`}
                </Text>
                <Text className="text-[10px] text-gray-500" numberOfLines={1}>
                    {isOwn ? 'Freigeben' : occupant ? 'belegt' : 'frei'}
                </Text>
            </Pressable>
        )
    })
