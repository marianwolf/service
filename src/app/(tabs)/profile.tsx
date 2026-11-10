/**
 * 👤 Profil (plan.md Abschnitt 3/6): Name/Spitzname/Avatar ändern,
 * Abmelden; Admin: Link in Schicht-Verwaltung + Raumlayout.
 */
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'expo-router'
import { useState } from 'react'

import { useSession } from '@/hooks/use-session'
import { useUpdateProfile } from '@/lib/queries'
import { signOut } from '@/lib/auth'
import { onboardingSchema, type OnboardingInput } from '@/lib/validation'

export default function ProfileScreen() {
    const { profile, isAdmin, refreshProfile } = useSession()
    const router = useRouter()
    const update = useUpdateProfile()
    const [signingOut, setSigningOut] = useState(false)

    const { control, handleSubmit, formState } = useForm<OnboardingInput>({
        resolver: zodResolver(onboardingSchema),
        defaultValues: {
            display_name: profile?.display_name ?? '',
            nickname: profile?.nickname ?? '',
            avatar_url: profile?.avatar_url ?? '',
        },
    })

    const onSubmit = async (values: OnboardingInput) => {
        if (!profile) return
        try {
            await update.mutateAsync({
                id: profile.id,
                display_name: values.display_name,
                nickname: values.nickname || null,
                avatar_url: values.avatar_url || null,
            })
            await refreshProfile()
            Alert.alert('Gespeichert', 'Dein Profil wurde aktualisiert.')
        } catch (e) {
            Alert.alert('Fehler', e instanceof Error ? e.message : 'Speichern fehlgeschlagen.')
        }
    }

    const doSignOut = async () => {
        setSigningOut(true)
        try {
            await signOut()
            router.replace('/(auth)/login')
        } finally {
            setSigningOut(false)
        }
    }

    return (
        <ScrollView className="flex-1 bg-gray-50" contentContainerClassName="px-4 pb-10 pt-4">
            <View className="mb-4 rounded-xl bg-white p-4">
                <View className="mb-1 flex-row items-center justify-between">
                    <Text className="text-base font-bold text-slate-800">{profile?.display_name ?? 'Profil'}</Text>
                    <View className="rounded-full bg-gray-100 px-2 py-0.5">
                        <Text className="text-[10px] font-semibold text-gray-600">{isAdmin ? 'admin' : 'staff'}</Text>
                    </View>
                </View>
                <Text className="text-xs text-gray-500">{profile?.id ? '' : 'Nicht angemeldet'}</Text>
            </View>

            {profile ? (
                <View className="rounded-xl bg-white p-4">
                    <Controller
                        control={control}
                        name="display_name"
                        render={({ field, fieldState }) => (
                            <View className="mb-3">
                                <Text className="mb-1 text-xs font-semibold text-slate-600">Anzeigename</Text>
                                <TextInput
                                    className="rounded-lg border border-gray-300 px-3 py-2"
                                    value={field.value ?? ''}
                                    onChangeText={field.onChange}
                                    onBlur={field.onBlur}
                                    maxLength={60}
                                />
                                {fieldState.error ? (
                                    <Text className="mt-1 text-xs text-red-600">{fieldState.error.message}</Text>
                                ) : null}
                            </View>
                        )}
                    />
                    <Controller
                        control={control}
                        name="nickname"
                        render={({ field }) => (
                            <View className="mb-3">
                                <Text className="mb-1 text-xs font-semibold text-slate-600">Spitzname</Text>
                                <TextInput
                                    className="rounded-lg border border-gray-300 px-3 py-2"
                                    value={field.value ?? ''}
                                    onChangeText={field.onChange}
                                    onBlur={field.onBlur}
                                />
                            </View>
                        )}
                    />

                    <Pressable
                        className="items-center rounded-lg bg-blue-600 py-2.5 disabled:opacity-50"
                        onPress={() => void handleSubmit(onSubmit)()}
                        disabled={update.isPending || formState.isSubmitting}
                    >
                        {update.isPending || formState.isSubmitting ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Text className="font-semibold text-white">Änderungen speichern</Text>
                        )}
                    </Pressable>
                </View>
            ) : null}

            {isAdmin ? (
                <View className="mt-4 rounded-xl bg-amber-50 p-4">
                    <Text className="mb-2 text-sm font-bold text-amber-700">Orga-Leitung</Text>
                    <AdminMenuRow
                        icon="🗓️"
                        label="Schicht „ABEM Mittag 12:15“ verwalten"
                        onPress={() => router.push('/settings/first')}
                    />
                    <AdminMenuRow icon="🪑" label="Raumlayout verwalten" onPress={() => router.push('/admin/rooms')} />
                </View>
            ) : null}

            <Pressable
                className="mt-6 items-center rounded-lg border border-red-200 bg-white py-2.5"
                onPress={() => void doSignOut()}
                disabled={signingOut}
            >
                {signingOut ? (
                    <ActivityIndicator size="small" color="#dc2626" />
                ) : (
                    <Text className="font-semibold text-red-600">Abmelden</Text>
                )}
            </Pressable>
        </ScrollView>
    )
}

const AdminMenuRow = ({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) => (
    <Pressable className="my-1 flex-row items-center rounded-lg bg-white px-3 py-2" onPress={onPress}>
        <Text className="mr-2">{icon}</Text>
        <Text className="text-sm font-medium text-slate-800">{label}</Text>
    </Pressable>
)
