/**
 * Onboarding „Dein Name“ (plan.md Abschnitt 3, Schritt 3):
 * erste Anmeldung → Pflichtfeld Anzeigename, optional Spitzname/Avatar-URL.
 */
import { useState } from 'react'
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { router } from 'expo-router'

import { useSession } from '@/hooks/use-session'
import { queryClient, updateProfile } from '@/lib/queries'
import { onboardingSchema, type OnboardingInput } from '@/lib/validation'

export default function Onboarding() {
    const { session, profile } = useSession()
    const [saving, setSaving] = useState(false)

    const { control, handleSubmit, formState } = useForm<OnboardingInput>({
        resolver: zodResolver(onboardingSchema),
        defaultValues: {
            display_name: profile?.display_name?.trim() ?? '',
            nickname: profile?.nickname ?? '',
            avatar_url: profile?.avatar_url ?? '',
        },
    })

    const onSubmit = async (values: OnboardingInput) => {
        if (!session?.user) return
        setSaving(true)
        try {
            await updateProfile({
                id: session.user.id,
                display_name: values.display_name,
                nickname: values.nickname || null,
                avatar_url: values.avatar_url || null,
            })
            await queryClient.invalidateQueries({ queryKey: ['profile', session.user.id] })
            router.replace('/(tabs)')
        } catch (e) {
            Alert.alert('Fehler', e instanceof Error ? e.message : 'Speichern fehlgeschlagen.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <View className="flex-1 justify-center bg-white px-6">
            <Text className="text-2xl font-bold text-slate-800">Dein Name</Text>
            <Text className="mt-1 mb-6 text-sm text-slate-500">
                So erscheinst du im Tischplan – jederzeit im Profil änderbar.
            </Text>

            <View className="mb-4">
                <Text className="mb-1 text-xs font-semibold text-slate-600">Anzeigename (Pflicht)</Text>
                <Controller
                    control={control}
                    name="display_name"
                    render={({ field, fieldState }) => (
                        <>
                            <TextInput
                                className="rounded-lg border border-gray-300 px-3 py-2 text-base"
                                placeholder="z. B. Marie K."
                                value={field.value ?? ''}
                                onChangeText={field.onChange}
                                onBlur={field.onBlur}
                                autoCapitalize="words"
                                maxLength={60}
                            />
                            {fieldState.error ? (
                                <Text className="mt-1 text-xs text-red-600">{fieldState.error.message}</Text>
                            ) : null}
                        </>
                    )}
                />
            </View>

            <View className="mb-4">
                <Text className="mb-1 text-xs font-semibold text-slate-600">Spitzname (optional)</Text>
                <Controller
                    control={control}
                    name="nickname"
                    render={({ field }) => (
                        <TextInput
                            className="rounded-lg border border-gray-300 px-3 py-2 text-base"
                            value={field.value ?? ''}
                            onChangeText={field.onChange}
                            onBlur={field.onBlur}
                        />
                    )}
                />
            </View>

            <View className="mb-6">
                <Text className="mb-1 text-xs font-semibold text-slate-600">Avatar-URL (optional)</Text>
                <Controller
                    control={control}
                    name="avatar_url"
                    render={({ field, fieldState }) => (
                        <>
                            <TextInput
                                className="rounded-lg border border-gray-300 px-3 py-2 text-base"
                                value={field.value ?? ''}
                                onChangeText={field.onChange}
                                onBlur={field.onBlur}
                                autoCapitalize="none"
                                keyboardType="url"
                            />
                            {fieldState.error ? (
                                <Text className="mt-1 text-xs text-red-600">{fieldState.error.message}</Text>
                            ) : null}
                        </>
                    )}
                />
            </View>

            <Pressable
                className="items-center rounded-xl bg-blue-600 py-3 active:bg-blue-700 disabled:opacity-50"
                onPress={() => void handleSubmit(onSubmit)()}
                disabled={formState.isSubmitting || saving}
            >
                {saving || formState.isSubmitting ? (
                    <ActivityIndicator color="#fff" size="small" />
                ) : (
                    <Text className="text-base font-semibold text-white">Los geht&apos;s</Text>
                )}
            </Pressable>

            <Pressable className="mt-3 items-center py-2" onPress={() => router.replace('/(tabs)')}>
                <Text className="text-sm text-slate-500">Später erledigen</Text>
            </Pressable>
        </View>
    )
}
