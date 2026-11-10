/**
 * Reine Platz-Logik – ohne Supabase/React, gut unit-testbar
 * (plan.md Abschnitt 9: „Platzlogik (doppelt/belegt)“).
 */
import type { Seating } from '@/lib/types'

export type SeatedInfo = { tableId: string; seatNo: number }

/** Alle vergebenen Plätze eines Tisches (event-normalisierte Übersicht). */
export const seatsTaken = (seatings: Seating[], tableId: string): Map<number, Seating> => {
    const map = new Map<number, Seating>()
    for (const seat of seatings.filter((s) => s.table_id === tableId)) map.set(seat.seat_no, seat)
    return map
}

/** Ist der Platz x an Tisch y frei? */
export const isSeatFree = (seatings: Seating[], tableId: string, seatNo: number): boolean =>
    !seatings.some((s) => s.table_id === tableId && s.seat_no === seatNo)

/** Erster freier Platz am Tisch (oder null wenn voll). */
export const firstFreeSeat = (seatings: Seating[], tableId: string, seatCount: number): number | null => {
    for (let seatNo = 1; seatNo <= seatCount; seatNo += 1) {
        if (isSeatFree(seatings, tableId, seatNo)) return seatNo
    }
    return null
}

/** Eigene Zuweisung für ein Event finden (oder null). */
export const findOwnSeating = (seatings: Seating[], profileId: string): Seating | null =>
    seatings.find((s) => s.profile_id === profileId) ?? null

/** Anzahl belegter Plätze eines Tisches. */
export const occupiedCount = (seatings: Seating[], tableId: string): number =>
    seatings.filter((s) => s.table_id === tableId).length

/**
 * Prüft, ob eine Zuweisung (Antrag) aktuell zulässig ist.
 * Liefert null = ok, sonst den Fehlergrund als UI-Message.
 */
export const validateClaim = ({
    seatings,
    tableId,
    seatNo,
    profileId,
    seatCount,
    currentSeatingId = undefined,
}: {
    seatings: Seating[]
    tableId: string
    seatNo: number
    profileId: string
    seatCount: number
    /** Beim Wechseln: die Sequenz-ID, die der Vorgang ersetzt */
    currentSeatingId?: string
}): string | null => {
    if (seatNo < 1 || seatNo > seatCount) return 'Ungültiger Platz.'
    const targetRow = seatings.find((s) => s.table_id === tableId && s.seat_no === seatNo)
    if (targetRow && targetRow.id !== currentSeatingId) {
        if (targetRow.profile_id === profileId) return 'Du sitzt bereits hier.'
        return 'Platz ist bereits vergeben.'
    }
    return null
}
