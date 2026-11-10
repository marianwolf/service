/**
 * Zod-Schemata für Formulare (plan.md Abschnitt 2/9).
 */
import { z } from 'zod'

export const displayNameSchema = z.string().trim().min(2, 'Mindestens 2 Zeichen.').max(50, 'Höchstens 50 Zeichen.')

export const nicknameSchema = z.string().trim().max(50, 'Höchstens 50 Zeichen.').optional()

export const avatarUrlSchema = z.string().trim().url('Ungültige URL.').optional().or(z.literal(''))

export const onboardingSchema = z.object({
    display_name: displayNameSchema,
    nickname: nicknameSchema,
    avatar_url: avatarUrlSchema,
})

export type OnboardingInput = z.infer<typeof onboardingSchema>

/** Schicht verwalten: Titel + Zeiten (settings/[eventId].tsx) */
export const eventSchema = z
    .object({
        title: z.string().trim().min(2, 'Titel fehlt.').max(80, 'Höchstens 80 Zeichen.'),
        starts_at: z
            .string()
            .min(1, 'Startzeit fehlt.')
            .refine((value) => !Number.isNaN(Date.parse(value)), { message: 'Ungültige Startzeit.' }),
        ends_at: z
            .string()
            .refine((value) => value === '' || !Number.isNaN(Date.parse(value)), { message: 'Ungültiges Ende.' })
            .optional(),
    })
    .refine(
        (data) => !data.ends_at || data.ends_at === '' || Date.parse(data.ends_at) > Date.parse(data.starts_at || '0'),
        { message: 'Ende muss nach dem Start liegen.', path: ['ends_at'] }
    )

export type EventInput = z.infer<typeof eventSchema>

/** Tisch anlegen (admin/rooms.tsx) */
export const tableSchema = z.object({
    label: z.string().trim().min(1, 'Label fehlt.').max(40),
    seats: z.number().int().min(1, 'Mind. 1 Platz.').max(24, 'Höchstens 24 Plätze.'),
    w_m: z.number().positive().max(10),
    h_m: z.number().positive().max(10),
    x_m: z.number().nonnegative(),
    y_m: z.number().nonnegative(),
})

export const toLocalInputValue = (iso: string) => {
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
