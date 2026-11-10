/**
 * Realtime-Abonnement (plan.md Abschnitt 7).
 * - seatings: Postgres-Changes (INSERT/UPDATE/DELETE) → Cache-Server-Korrektur
 * - tables:   Admin-Drag&Drop-Layout erscheint auf allen Geräten live
 * Offline-Fallback: TanStack Query hält den letzten Stand, Änderungen
 * werden beim Reconnect per onSettled-Invalidierung erneut hochgeladen.
 */
import { useEffect } from 'react'
import { QueryClient } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'
import type { Seating, Table } from '@/lib/types'

export const useRealtimeSeatings = (eventId: string | null, queryClient: QueryClient) => {
    useEffect(() => {
        if (!eventId) return

        const channel = supabase
            .channel(`seatings-${eventId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'seatings', filter: `event_id=eq.${eventId}` },
                () => {
                    void queryClient.invalidateQueries({ queryKey: ['seatings', eventId] })
                }
            )
            .subscribe()

        return () => {
            void supabase.removeChannel(channel)
        }
    }, [eventId, queryClient])
}

export const useRealtimeTables = (roomId: string | null, queryClient: QueryClient) => {
    useEffect(() => {
        if (!roomId) return

        const channel = supabase
            .channel(`tables-${roomId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'tables', filter: `room_id=eq.${roomId}` },
                (payload) => {
                    const row = payload.new as Table | undefined
                    if (payload.eventType === 'DELETE' || !row?.id) {
                        void queryClient.invalidateQueries({ queryKey: ['tables', roomId] })
                        return
                    }
                    // Optimistic UI: vorhandene frischere lokale Position behalten,
                    // sonst DB-Wert übernehmen (server-first Korrektur)
                    queryClient.setQueryData<Table[]>(['tables', roomId], (old) => {
                        const list = old ?? []
                        const index = list.findIndex((t) => t.id === row.id)
                        if (index === -1)
                            return [...list, { ...row, room_id: roomId }].sort((a, b) => a.number - b.number)
                        const current = list[index]
                        if (current.x_m === row.x_m && current.y_m === row.y_m) return list
                        const next = [...list]
                        next[index] = { ...current, ...row }
                        return next
                    })
                }
            )
            .subscribe()

        return () => {
            void supabase.removeChannel(channel)
        }
    }, [roomId, queryClient])
}

/** Typ-Shim für Aktualisierung aus supabase-js Realtime-Payload (Server zuerst). */
export type SeatingChange = Partial<Seating>
