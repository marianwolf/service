/**
 * DB-Typen für Supabase (plan.md Abschnitt 4).
 * Handgeschrieben (notiert die Spalten der Migrationen) statt codegen –
 * Struktur 1:1 mit supabase/migrations.
 */

export type Role = 'staff' | 'admin'

export interface Profile {
    id: string
    display_name: string
    nickname: string | null
    avatar_url: string | null
    role: Role
    created_at: string
}

export interface Room {
    id: string
    name: string
    title: string | null
    width_m: number | null
    height_m: number | null
    created_at: string
}

export interface Table {
    id: string
    room_id: string | null
    number: number
    label: string | null
    /** Position im Raum in Metern (linke obere Ecke) */
    x_m: number
    y_m: number
    /** Maße in Metern (Tischbreite/-tiefe) */
    w_m: number
    h_m: number
    seats: number
}

export interface Event {
    id: string
    room_id: string
    title: string
    starts_at: string
    ends_at: string | null
    created_by: string | null
}

/** Zeile aus `seatings`, angereichert mit dem zugehörigen Profil */
export interface Seating {
    id: string
    event_id: string
    table_id: string
    profile_id: string
    seat_no: number
    note: string | null
    created_at: string
    profile?: Pick<Profile, 'id' | 'display_name' | 'nickname' | 'avatar_url'>
}

/** Default-Werte aus dem Plan-Zeichnungs-Raster */
export const TABLE_DEFAULTS = {
    w: 1.8,
    h: 0.9,
    seats: 8,
    rowStepM: 1.7,
} as const
