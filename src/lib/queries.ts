/**
 * TanStack-Query-Datenzugriff für die App (plan.md Abschnitt 2/6).
 */
import { QueryClient, UseMutationResult, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'
import type { Event, Profile, Room, Seating, Table } from '@/lib/types'

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 10_000,
            retry: 2,
            refetchOnReconnect: true,
        },
    },
})

// ---------------------------------------------------------------- Room / Tische

export const fetchRoom = async (roomId: string): Promise<Room> => {
    const { data, error } = await supabase.from('rooms').select('*').eq('id', roomId).single()
    if (error) throw error
    return data
}

/**
 * Die App bettet den ersten (aktuell einzigen) Raum ein –
 * „Aula ABEM“ aus dem PDF.
 */
export const fetchFirstRoom = async (): Promise<Room | null> => {
    const { data, error } = await supabase.from('rooms').select('*').order('created_at').limit(1).maybeSingle()
    if (error) throw error
    return data
}

export const useHomeRoomQuery = () =>
    useQuery({ queryKey: ['room', 'first'], queryFn: fetchFirstRoom, staleTime: 60_000 })

export const fetchTables = async (roomId: string): Promise<Table[]> => {
    const { data, error } = await supabase.from('tables').select('*').eq('room_id', roomId).order('number')
    if (error) throw error
    return data ?? []
}

// ---------------------------------------------------------------- Events

/**
 * Konvention aus plan.md (4.4): die App zeigt immer genau das aktive/letzte
 * Event – wir nehmen das Event mit der jüngsten start-Zeit.
 */
export const fetchActiveEvent = async (roomId: string): Promise<Event | null> => {
    const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('room_id', roomId)
        .order('starts_at', { ascending: false })
        .limit(1)
    if (error) throw error
    return data?.[0] ?? null
}

// ---------------------------------------------------------------- Seatings

export const fetchSeatings = async (eventId: string): Promise<Seating[]> => {
    const { data, error } = await supabase
        .from('seatings')
        .select('*, profile:profiles(id, display_name, nickname, avatar_url)')
        .eq('event_id', eventId)
    if (error) throw error
    return (data ?? []) as Seating[]
}

export const updateTableGeometry = async (payload: Pick<Table, 'id'> & Partial<Omit<Table, 'id'>>) => {
    const { data, error } = await supabase.from('tables').update(payload).eq('id', payload.id).select().single()
    if (error) throw error
    return data
}

export interface NewTableInput {
    roomId: string
    number: number
    label: string
    x_m: number
    y_m: number
    w_m: number
    h_m: number
    seats: number
}

export const createTable = async (payload: NewTableInput) => {
    const { data, error } = await supabase.from('tables').insert(payload).select().single()
    if (error) throw error
    return data
}

export const removeTable = async (tableId: string) => {
    const { error } = await supabase.from('tables').delete().eq('id', tableId)
    if (error) throw error
}

export interface UpsertEventInput {
    id: string
    title: string
    starts_at: string
    ends_at: string | null
}

export const updateEvent = async (payload: UpsertEventInput) => {
    const { data, error } = await supabase.from('events').update(payload).eq('id', payload.id).select().single()
    if (error) throw error
    return data
}

export interface CreateEventInput {
    room_id: string
    title: string
    starts_at: string
    ends_at: string | null
    created_by: string
}

export const createEvent = async (payload: CreateEventInput) => {
    const { data, error } = await supabase.from('events').insert(payload).select().single()
    if (error) throw error
    return data
}

// ---------------------------------------------------------------- Profile

export const fetchProfile = async (userId: string): Promise<Profile | null> => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    if (error) throw error
    return data
}

export const updateProfile = async (payload: Pick<Profile, 'id' | 'display_name' | 'nickname' | 'avatar_url'>) => {
    const { data, error } = await supabase
        .from('profiles')
        .update({
            display_name: payload.display_name.trim(),
            nickname: payload.nickname ?? null,
            avatar_url: payload.avatar_url ?? null,
        })
        .eq('id', payload.id)
        .select()
        .single()
    if (error) throw error
    return data
}

export const fetchProfiles = async (): Promise<Profile[]> => {
    const { data, error } = await supabase.from('profiles').select('*').order('display_name')
    if (error) throw error
    return data ?? []
}

/** Liste aller Profile (Admin-Zuweisung im Bottom-Sheet). */
export const useProfilesWatch = () => useQuery({ queryKey: ['profiles'], queryFn: fetchProfiles, staleTime: 30_000 })

// ---------------------------------------------------------------- Seatings-Mutationen

export type ClaimInput = {
    eventId: string
    tableId: string
    profileId: string
    seatNo: number
    note?: string
}

export const claimSeat = async (payload: ClaimInput) => {
    const { data, error } = await supabase
        .from('seatings')
        .insert({
            event_id: payload.eventId,
            table_id: payload.tableId,
            profile_id: payload.profileId,
            seat_no: payload.seatNo,
            note: payload.note ?? null,
        })
        .select('*, profile:profiles(id, display_name, nickname, avatar_url)')
        .single()
    if (error) throw error
    return data as Seating
}

export const moveSeat = async (seatingId: string, patch: { table_id: string; seat_no: number }) => {
    const { data, error } = await supabase
        .from('seatings')
        .update(patch)
        .eq('id', seatingId)
        .select('*, profile:profiles(id, display_name, nickname, avatar_url)')
        .single()
    if (error) throw error
    return data as Seating
}

export const releaseSeat = async (seatingId: string) => {
    const { error } = await supabase.from('seatings').delete().eq('id', seatingId)
    if (error) throw error
}

// ---------------------------------------------------------------- Hooks

export const useRoomQuery = (roomId: string | null) =>
    useQuery({ queryKey: ['room', roomId], queryFn: () => fetchRoom(roomId!), enabled: Boolean(roomId) })

export const useTablesQuery = (roomId: string | null) =>
    useQuery({ queryKey: ['tables', roomId], queryFn: () => fetchTables(roomId!), enabled: Boolean(roomId) })

export const useActiveEventQuery = (roomId: string | null) =>
    useQuery({
        queryKey: ['active-event', roomId],
        queryFn: () => fetchActiveEvent(roomId!),
        enabled: Boolean(roomId),
    })

export const useSeatingsQuery = (eventId: string | null) =>
    useQuery({ queryKey: ['seatings', eventId], queryFn: () => fetchSeatings(eventId!), enabled: Boolean(eventId) })

const useInvalidate = (keys: unknown[][]) => {
    const queryClientInstance = useQueryClient()
    return ({ onSuccess }: { onSuccess?: () => void } = {}) => {
        for (const key of keys) void queryClientInstance.invalidateQueries({ queryKey: key })
        onSuccess?.()
    }
}

/** Typ Helper für Mutation-Generics */
export type AnyMutation<TData, TVars> = UseMutationResult<TData, Error, TVars>

export const useClaimSeat = () => {
    const invalidate = useInvalidate([['seatings']])
    return useMutation({
        mutationFn: (payload: { seating: ClaimInput; optimistic: Seating }) => claimSeat(payload.seating),
        onMutate: async ({ optimistic }) => {
            const key = ['seatings', optimistic.event_id]
            void queryClient.cancelQueries({ queryKey: key })
            const previous = queryClient.getQueryData<Seating[]>(key)
            queryClient.setQueryData<Seating[]>(key, (old) => [...(old ?? []), optimistic])
            return { key, previous }
        },
        onError: (_error, { optimistic }, ctx) => {
            if (ctx?.previous) queryClient.setQueryData(ctx.key, ctx.previous)
            else queryClient.setQueryData(['seatings', optimistic.event_id], [])
        },
        onSettled: (_data, _error, { optimistic }) => {
            void queryClient.invalidateQueries({ queryKey: ['seatings', optimistic.event_id] })
            invalidate()
        },
    })
}

export const useMoveSeat = () => {
    const invalidate = useInvalidate([['seatings']])
    return useMutation({
        mutationFn: (payload: { seatingId: string; eventId: string; patch: { table_id: string; seat_no: number } }) =>
            moveSeat(payload.seatingId, payload.patch),
        onSettled: (_data, _error, { eventId }) => {
            void queryClient.invalidateQueries({ queryKey: ['seatings', eventId] })
            invalidate()
        },
    })
}

export const useReleaseSeat = () => {
    const invalidate = useInvalidate([['seatings']])
    return useMutation({
        mutationFn: (payload: { seatingId: string; eventId: string }) => releaseSeat(payload.seatingId),
        onMutate: async ({ seatingId, eventId }) => {
            const key = ['seatings', eventId]
            void queryClient.cancelQueries({ queryKey: key })
            const previous = queryClient.getQueryData<Seating[]>(key)
            queryClient.setQueryData<Seating[]>(key, (old) => (old ?? []).filter((s) => s.id !== seatingId))
            return { key, previous }
        },
        onError: (_error, { eventId }, ctx) => {
            if (ctx?.previous) queryClient.setQueryData(ctx.key, ctx.previous)
            else queryClient.invalidateQueries({ queryKey: ['seatings', eventId] })
        },
        onSettled: (_data, _error, { eventId }) => {
            void queryClient.invalidateQueries({ queryKey: ['seatings', eventId] })
            invalidate()
        },
    })
}

export const useUpdateProfile = () =>
    useMutation({
        mutationFn: (payload: Pick<Profile, 'id' | 'display_name' | 'nickname' | 'avatar_url'>) =>
            updateProfile(payload),
        onSettled: (_data, _error, payload) => {
            void queryClient.invalidateQueries({ queryKey: ['profile', payload.id] })
        },
    })

export interface UpdateTableInput extends Pick<Table, 'id' | 'x_m' | 'y_m' | 'w_m' | 'h_m' | 'seats'> {
    roomId: string
    label?: string
}

export const useUpdateTable = () => {
    const invalidate = useInvalidate([['tables']])
    return useMutation({
        mutationFn: (payload: UpdateTableInput) => {
            const { roomId: _roomId, ...patch } = payload
            return updateTableGeometry(patch)
        },
        onMutate: async (payload) => {
            const key = ['tables', payload.roomId]
            void queryClient.cancelQueries({ queryKey: key })
            const previous = queryClient.getQueryData<Table[]>(key)
            queryClient.setQueryData<Table[]>(key, (old) =>
                (old ?? []).map((t) =>
                    t.id === payload.id
                        ? {
                              ...t,
                              x_m: payload.x_m,
                              y_m: payload.y_m,
                              w_m: payload.w_m,
                              h_m: payload.h_m,
                              seats: payload.seats,
                              ...(payload.label !== undefined ? { label: payload.label } : {}),
                          }
                        : t
                )
            )
            return { key, previous }
        },
        onError: (_error, _payload, ctx) => {
            if (ctx?.previous) queryClient.setQueryData(ctx.key, ctx.previous)
        },
        onSettled: (_data, _error, payload) => {
            void queryClient.invalidateQueries({ queryKey: ['tables', payload.roomId] })
            invalidate()
        },
    })
}

export const useCreateTable = () => {
    const invalidate = useInvalidate([['tables']])
    return useMutation({
        mutationFn: (payload: NewTableInput) => createTable(payload),
        onSettled: (_data, _error, payload) => {
            void queryClient.invalidateQueries({ queryKey: ['tables', payload.roomId] })
            invalidate()
        },
    })
}

export const useRemoveTable = () => {
    const invalidate = useInvalidate([['tables']])
    return useMutation({
        mutationFn: (payload: { tableId: string; roomId: string }) => removeTable(payload.tableId),
        onMutate: async ({ tableId, roomId }) => {
            const key = ['tables', roomId]
            void queryClient.cancelQueries({ queryKey: key })
            const previous = queryClient.getQueryData<Table[]>(key)
            queryClient.setQueryData<Table[]>(key, (old) => (old ?? []).filter((t) => t.id !== tableId))
            return { key, previous }
        },
        onError: (_error, { roomId }, ctx) => {
            if (ctx?.previous) queryClient.setQueryData(ctx.key, ctx.previous)
        },
        onSettled: (_data, _error, { roomId }) => {
            void queryClient.invalidateQueries({ queryKey: ['tables', roomId] })
            invalidate()
        },
    })
}

export const useUpdateEvent = () => {
    const invalidate = useInvalidate([['active-event'], ['events']])
    return useMutation({
        mutationFn: (payload: UpsertEventInput) => updateEvent(payload),
        onSettled: invalidate,
    })
}
