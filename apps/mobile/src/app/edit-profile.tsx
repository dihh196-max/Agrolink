import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api.js'
import { useAuthStore } from '../store/auth.js'
import { choosePhotoSource } from '../lib/media.js'
import { colors, spacing, typography, borderRadius, shadows } from '../constants/theme.js'
import type { User } from '@agrolink/types'

function useUpdateProfile() {
  const qc = useQueryClient()
  const { user, loadSession } = useAuthStore()
  return useMutation({
    mutationFn: (data: { name?: string; bio?: string; phone?: string; avatarUrl?: string }) =>
      api.patch('/users/me', data).then((r) => r.data),
    onSuccess: async () => {
      await loadSession()
      qc.invalidateQueries({ queryKey: ['profile'] })
    },
  })
}

const INPUT = StyleSheet.create({
  base: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.white,
  },
})

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  )
}

export default function EditProfileScreen() {
  const { user } = useAuthStore()
  const update = useUpdateProfile()

  const [name, setName] = useState(user?.name ?? '')
  const [bio, setBio] = useState((user as any)?.bio ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '')

  if (!user) return null

  const hasChanges =
    name !== user.name ||
    bio !== ((user as any)?.bio ?? '') ||
    phone !== (user.phone ?? '') ||
    avatarUrl !== (user.avatarUrl ?? '')

  const handleSave = () => {
    if (name.trim().length < 2) {
      Alert.alert('Nome inválido', 'O nome precisa ter ao menos 2 caracteres.')
      return
    }
    update.mutate(
      {
        name: name.trim(),
        ...(bio.trim() && { bio: bio.trim() }),
        ...(phone.trim() && { phone: phone.trim() }),
        ...(avatarUrl.trim() && { avatarUrl: avatarUrl.trim() }),
      },
      {
        onSuccess: () => {
          Alert.alert('Salvo!', 'Seu perfil foi atualizado.', [
            { text: 'OK', onPress: () => router.back() },
          ])
        },
        onError: (err: any) => {
          Alert.alert('Erro', err?.response?.data?.message ?? 'Não foi possível salvar as alterações.')
        },
      }
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Perfil</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={!hasChanges || update.isPending}
          style={[styles.saveBtn, (!hasChanges || update.isPending) && styles.saveBtnDisabled]}
        >
          {update.isPending ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <Text style={styles.saveBtnText}>Salvar</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          {/* Avatar picker */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              style={styles.avatarCircle}
              onPress={async () => {
                const uri = await choosePhotoSource()
                if (uri) setAvatarUrl(uri)
              }}
            >
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarFallbackText}>{name[0]?.toUpperCase()}</Text>
              )}
              <View style={styles.avatarEditBadge}>
                <Ionicons name="camera" size={14} color={colors.white} />
              </View>
            </TouchableOpacity>
            <Text style={styles.avatarHint}>Toque para trocar a foto de perfil</Text>
          </View>

          <Field label="Nome completo *">
            <TextInput
              style={INPUT.base}
              value={name}
              onChangeText={setName}
              placeholder="Seu nome"
              placeholderTextColor={colors.textMuted}
              maxLength={80}
            />
          </Field>

          <Field label="Telefone / WhatsApp">
            <TextInput
              style={INPUT.base}
              value={phone}
              onChangeText={setPhone}
              placeholder="(65) 99999-9999"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
            />
          </Field>

          <Field label="Bio">
            <TextInput
              style={[INPUT.base, styles.bioInput]}
              value={bio}
              onChangeText={setBio}
              placeholder="Conte um pouco sobre você e sua propriedade..."
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={500}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{bio.length}/500</Text>
          </Field>

          {/* Read-only info */}
          <View style={styles.readonlyCard}>
            <View style={styles.readonlyRow}>
              <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
              <View style={{ flex: 1 }}>
                <Text style={styles.readonlyLabel}>E-mail</Text>
                <Text style={styles.readonlyValue}>{user.email}</Text>
              </View>
              <Text style={styles.readonlyNote}>não editável</Text>
            </View>
            <View style={[styles.readonlyRow, { borderTopWidth: 1, borderTopColor: colors.border }]}>
              <Ionicons name="at-outline" size={18} color={colors.textMuted} />
              <View style={{ flex: 1 }}>
                <Text style={styles.readonlyLabel}>Username</Text>
                <Text style={styles.readonlyValue}>@{user.username}</Text>
              </View>
              <Text style={styles.readonlyNote}>não editável</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerTitle: { ...typography.h4, color: colors.white },
  saveBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { ...typography.label, color: colors.white },
  content: { padding: spacing.lg, gap: spacing.md },
  avatarSection: { alignItems: 'center', marginBottom: spacing.sm },
  avatarCircle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.sm,
    ...shadows.md,
    position: 'relative',
  },
  avatarImg: { width: 96, height: 96, borderRadius: 48 },
  avatarFallbackText: { fontSize: 36, fontWeight: '700', color: colors.white },
  avatarEditBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: colors.white,
  },
  avatarHint: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
  field: { gap: spacing.xs },
  label: { ...typography.label, color: colors.textSecondary },
  bioInput: { minHeight: 100, paddingTop: spacing.sm },
  charCount: { ...typography.caption, color: colors.textMuted, textAlign: 'right' },
  readonlyCard: {
    backgroundColor: colors.white, borderRadius: borderRadius.lg, ...shadows.sm,
    marginTop: spacing.sm,
  },
  readonlyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  readonlyLabel: { ...typography.caption, color: colors.textMuted },
  readonlyValue: { ...typography.body, color: colors.text },
  readonlyNote: { ...typography.caption, color: colors.textMuted, fontStyle: 'italic' },
})
