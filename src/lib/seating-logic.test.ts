/**
 * Unit: reine Platzlogik (plan.md Abschnitt 9 – „Platzlogik (doppelt/belegt)“).
 */
import { describe, expect, it } from 'vitest'

import {
    findOwnSeating,
    firstFreeSeat,
    isSeatFree,
    occupiedCount,
    seatsTaken,
    validateClaim,
} from '@/lib/seating-logic'
import type { Seating } from '@/lib/types'

const seating = (id: string, profileId: string, tableId: string, seatNo: number): Seating => ({
    id,
    event_id: 'event-1',
    table_id: tableId,
    profile_id: profileId,
    seat_no: seatNo,
    note: null,
    created_at: new Date().toISOString(),
})

const T1 = 'table-1'
const T2 = 'table-2'

describe('seatsTaken', () => {
    it('sammelt die Plätze eines Tisches nach seat_no', () => {
        const rows = [seating('a', 'p1', T1, 1), seating('b', 'p2', T1, 3), seating('c', 'p3', T2, 1)]
        const map = seatsTaken(rows, T1)
        expect(map.size).toBe(2)
        expect(map.get(1)?.profile_id).toBe('p1')
        expect(map.get(3)?.profile_id).toBe('p2')
    })
})

describe('isSeatFree / firstFreeSeat', () => {
    it('erkennt belegte Plätze', () => {
        const rows = [seating('a', 'p1', T1, 2)]
        expect(isSeatFree(rows, T1, 2)).toBe(false)
        expect(isSeatFree(rows, T1, 3)).toBe(true)
    })

    it('liefert den ersten freien Platz und null bei vollem Tisch', () => {
        const rows = [seating('a', 'p1', T1, 1), seating('b', 'p2', T1, 2)]
        expect(firstFreeSeat(rows, T1, 4)).toBe(3)
        const full = Array.from({ length: 4 }, (_, i) => seating(String(i), `p${i}`, T1, i + 1))
        expect(firstFreeSeat(full, T1, 4)).toBeNull()
    })
})

describe('findOwnSeating / occupiedCount', () => {
    it('findet die eigene Zuweisung', () => {
        const rows = [seating('a', 'p1', T1, 1)]
        expect(findOwnSeating(rows, 'p1')?.table_id).toBe(T1)
        expect(findOwnSeating(rows, 'p9')).toBeNull()
    })

    it('zählt belegte Plätze', () => {
        const rows = [seating('a', 'p1', T1, 1), seating('b', 'p2', T1, 2), seating('c', 'p3', T2, 1)]
        expect(occupiedCount(rows, T1)).toBe(2)
    })
})

describe('validateClaim (doppelt/belegt)', () => {
    it('blockt belegte Plätze anderer', () => {
        const rows = [seating('a', 'other', T1, 1)]
        expect(validateClaim({ seatings: rows, tableId: T1, seatNo: 1, profileId: 'me', seatCount: 4 })).toMatch(
            /bereits vergeben/
        )
    })

    it('erlaubt freie Plätze und erkennt „bereits hier“', () => {
        expect(validateClaim({ seatings: [], tableId: T1, seatNo: 1, profileId: 'me', seatCount: 4 })).toBeNull()
        expect(
            validateClaim({
                seatings: [seating('a', 'me', T1, 1)],
                tableId: T1,
                seatNo: 1,
                profileId: 'me',
                seatCount: 4,
            })
        ).toMatch(/bereits hier/)
    })

    it('erlaubt den Wechsel vom eigenen Sitz (currentSeatingId) und ungültige Platznummern', () => {
        expect(
            validateClaim({
                seatings: [seating('a', 'me', T1, 1)],
                tableId: T1,
                seatNo: 1,
                profileId: 'me',
                seatCount: 4,
                currentSeatingId: 'a',
            })
        ).toBeNull()
        expect(validateClaim({ seatings: [], tableId: T1, seatNo: 9, profileId: 'me', seatCount: 4 })).toMatch(
            /Ungültig/
        )
    })
})
