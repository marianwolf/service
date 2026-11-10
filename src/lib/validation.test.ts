/**
 * Unit: Namens-Validierung (plan.md Abschnitt 9).
 */
import { describe, expect, it } from 'vitest'

import { displayNameSchema, eventSchema, tableSchema } from './validation'

describe('displayNameSchema (Onboarding-Regeln aus plan.md: 2–50 Zeichen)', () => {
    it('nimmt gültige Namen an und trimmt Anführungszeichen-Whitespace', () => {
        expect(displayNameSchema.parse(' Marie K. ')).toBe('Marie K.')
    })

    it('blockt zu kurze und zu lange Namen', () => {
        expect(() => displayNameSchema.parse('')).toThrow()
        expect(() => displayNameSchema.parse('A')).toThrow()
        expect(() => displayNameSchema.parse('x'.repeat(51))).toThrow()
        expect(displayNameSchema.parse('x'.repeat(50)).length).toBe(50)
    })
})

describe('eventSchema (eine Schicht, plan.md 4.4/10-2)', () => {
    it('verlangt Start nach Ende-Konsistenz', () => {
        const ok = eventSchema.safeParse({
            title: 'ABEM Mittag 12:15',
            starts_at: '2026-11-12T12:15:00.000Z',
            ends_at: '2026-11-12T14:00:00.000Z',
        })
        expect(ok.success).toBe(true)

        const wrong = eventSchema.safeParse({
            title: 'ABEM Mittag 12:15',
            starts_at: '2026-11-12T14:00:00.000Z',
            ends_at: '2026-11-12T12:15:00.000Z',
        })
        expect(wrong.success).toBe(false)
    })
})

describe('tableSchema (Admin-Neuanlage)', () => {
    it('akzeptiert das PDF-Raster-Tischmaß', () => {
        const ok = tableSchema.safeParse({
            label: 'Tisch 15',
            seats: 8,
            w_m: 1.8,
            h_m: 0.9,
            x_m: 1,
            y_m: 2.7,
        })
        expect(ok.success).toBe(true)
    })

    it('blockt Platzzahlen untypisch über 24', () => {
        const bad = tableSchema.safeParse({
            label: 'Tisch XXL',
            seats: 25,
            w_m: 1.8,
            h_m: 0.9,
            x_m: 1,
            y_m: 1,
        })
        expect(bad.success).toBe(false)
    })
})
