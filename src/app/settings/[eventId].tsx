/**
 * Admin: die eine Schicht verwalten (plan.md Abschnitt 6 „settings/[eventId]“).
 * eventId kann 'first' (aktives/letzte Event suchen) oder 'new' (anlegen) sein.
 * Zugänglich nur mit role='admin' (RLS erzwingt das serverseitig).
 */
import { useMemo, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'

import { useSession } from '@/hooks/use-session'
import { createEvent, useActiveEventQuery, useHomeRoomQuery, useUpdateEvent } from '@/lib/queries'
import { eventSchema, toLocalInputValue, type EventInput } from '@/lib/validation'
import type { Event } from '@/lib/types'

export default function EventSettings() {
    const { eventId } = useLocalSearchParams<{ eventId: string }>()
    const { profile, isAdmin } = useSession()
    const { data: room } = useHomeRoomQuery()
    const { data: activeEvent, isLoading } = useActiveEventQuery(room?.id ?? null)
    const updateEvent = useUpdateEvent()
    const queryClient = useQueryClient()
    const router = useRouter()
    const [creating, setCreating] = useState(false)

    /** 'first' → aktives Event mitladen; 'new' → Neuanlage ohne Vorbefüllung */
    const target = useMemo<Event | null>(
        () => (eventId === 'first' ? (activeEvent ?? null) : activeEvent?.id === eventId ? activeEvent : null),
        [eventId, activeEvent]
    )

    const form = useForm<EventInput>({
        resolver: zodResolver(eventSchema),
        defaultValues: target
            ? {
                  title: target.title,
                  starts_at: toLocalInputValue(target.starts_at),
                  ends_at: target.ends_at ? toLocalInputValue(target.ends_at) : '',
              }
            : { title: room?.title ?? 'ABEM Mittag 12:15', starts_at: '', ends_at: '' },
    })

    if (!isAdmin) return <NotAdmin />
    if (isLoading) return <Loading />

    const save = form.handleSubmit(async (values) => {
        try {
            if (target) {
                await updateEvent.mutateAsync({
                    id: target.id,
                    title: values.title,
                    starts_at: new Date(values.starts_at).toISOString(),
                    ends_at: values.ends_at ? new Date(values.ends_at).toISOString() : null,
                })
                Alert.alert('Gespeichert', 'Die Schicht wurde aktualisiert.')
            } else {
                if (!room || !profile) {
                    Alert.alert('Fehler', 'Raum oder Profil fehlen.')
                    return
                }
                setCreating(true)
                const created = await createEvent({
                    room_id: room.id,
                    title: values.title,
                    starts_at: new Date(values.starts_at).toISOString(),
                    ends_at: values.ends_at ? new Date(values.ends_at).toISOString() : null,
                    created_by: profile.id,
                })
                await queryClient.invalidateQueries({ queryKey: ['active-event'] })
                router.replace(`/settings/${created.id}`)
            }
        } catch (e) {
            Alert.alert('Fehler', e instanceof Error ? e.message : 'Speichern fehlgeschlagen.')
        } finally {
            setCreating(false)
        }
    })

    return (
        <ScrollView className="flex-1 bg-gray-50" contentContainerClassName="px-4 pb-10 pt-4">
            <Text className="mb-1 text-xl font-bold text-slate-800">
                {target ? 'Schicht bearbeiten' : 'Schicht anlegen'}
            </Text>
            <Text className="mb-4 text-xs text-gray-500">
                Die App zeigt immer genau die aktive/letzte Schicht („ABEM Mittag 12:15“) – kein separates Abend-Event.
            </Text>

            <Controller
                control={form.control}
                name="title"
                render={({ field, fieldState }) => (
                    <View className="mb-3">
                        <Text className="mb-1 text-xs font-semibold text-slate-600">Titel</Text>
                        <TextInput
                            className="rounded-lg border border-gray-300 bg-white px-3 py-2"
                            value={field.value ?? ''}
                            onChangeText={field.onChange}
                            onBlur={field.onBlur}
                        />
                        {fieldState.error && (
                            <Text className="mt-1 text-xs text-red-600">{fieldState.error.message}</Text>
                        )}
                    </View>
                )}
            />

            <Controller
                control={form.control}
                name="starts_at"
                render={({ field, fieldState }) => (
                    <View className="mb-3">
                        <Text className="mb-1 text-xs font-semibold text-slate-600">
                            Start (YYYY-MM-DD HH:MM oder ISO)
                        </Text>
                        <TextInput
                            className="rounded-lg border border-gray-300 bg-white px-3 py-2"
                            value={field.value ?? ''}
                            onChangeText={field.onChange}
                            onBlur={field.onBlur}
                            autoCapitalize="none"
                            placeholder="2026-11-12 12:15"
                        />
                        {fieldState.error && (
                            <Text className="mt-1 text-xs text-red-600">{fieldState.error.message}</Text>
                        )}
                    </View>
                )}
            />

            <Controller
                control={form.control}
                name="ends_at"
                render={({ field, fieldState }) => (
                    <View className="mb-4">
                        <Text className="mb-1 text-xs font-semibold text-slate-600">Ende (optional)</Text>
                        <TextInput
                            className="rounded-lg border border-gray-300 bg-white px-3 py-2"
                            value={field.value ?? ''}
                            onChangeText={field.onChange}
                            onBlur={field.onBlur}
                            autoCapitalize="none"
                            placeholder="2026-11-12 14:00"
                        />
                        {fieldState.error && (
                            <Text className="mt-1 text-xs text-red-600">{fieldState.error.message}</Text>
                        )}
                    </View>
                )}
            />

            <Pressable
                className="items-center rounded-lg bg-blue-600 py-3 disabled:opacity-50"
                onPress={() => void save()}
                disabled={updateEvent.isPending || form.formState.isSubmitting || creating}
            >
                {updateEvent.isPending || form.formState.isSubmitting || creating ? (
                    <ActivityIndicator color="#fff" size="small" />
                ) : (
                    <Text className="font-semibold text-white">
                        {target ? 'Änderungen speichern' : 'Schicht anlegen'}
                    </Text>
                )}
            </Pressable>

            {target ? <Text className="mt-4 text-center text-[10px] text-gray-400">eventId: {target.id}</Text> : null}
        </ScrollView>
    )
}

const Loading = () => (
    <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
    </View>
)

const NotAdmin = () => (
    <View className="flex-1 items-center justify-center px-6">
        <Text className="text-center text-sm text-gray-600">
            Nur die Orga-Leitung (Rolle „admin“) kann Schichten verwalten.
        </Text>
    </View>
)
