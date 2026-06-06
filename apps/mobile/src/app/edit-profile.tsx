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
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api.js'
import { useAuthStore } from '../store/auth.js'
import { choosePhotoSource } from '../lib/media.js'
import { colors, spacing, typography, borderRadius, shadows } from '../constants/theme.js'

type ProfilePatch = {
  name?: string
  bio?: string
  phone?: string
  avatarUrl?: string
  coverUrl?: string
  city?: string
  state?: string
  occupation?: string
  experienceYears?: string
  cultures?: string
  website?: string
  instagram?: string
  birthDate?: string
}

function useUpdateProfile() {
  const qc = useQueryClient()
  const { loadSession } = useAuthStore()
  return useMutation({
    mutationFn: (data: ProfilePatch) => api.patch('/users/me', data).then((r) => r.data),
    onSuccess: async () => {
      await loadSession()
      qc.invalidateQueries({ queryKey: ['profile'] })
    },
  })
}

export default function EditProfileScreen() {
  const { user } = useAuthStore()
  const update = useUpdateProfile()
  const u = user as any

  // Identity
  const [name, setName] = useState(user?.name ?? '')
  const [bio, setBio] = useState(u?.bio ?? '')
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '')
  const [coverUrl, setCoverUrl] = useState(u?.coverUrl ?? '')

  // Contact
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [website, setWebsite] = useState(u?.website ?? '')
  const [instagram, setInstagram] = useState(u?.instagram ?? '')

  // Location
  const [city, setCity] = useState(u?.city ?? '')
  const [state, setState] = useState(u?.state ?? '')

  // Work
  const [occupation, setOccupation] = useState(u?.occupation ?? '')
  const [experienceYears, setExperienceYears] = useState(u?.experienceYears ?? '')
  const [cultures, setCultures] = useState(u?.cultures ?? '')
  const [birthDate, setBirthDate] = useState(u?.birthDate ?? '')

  if (!user) return null

  const handleSave = () => {
    if (name.trim().length < 2) {
      Alert.alert('Nome inválido', 'O nome precisa ter ao menos 2 caracteres.')
      return
    }

    const trim = (s: string) => s.trim() || undefined

    update.mutate(
      {
        name: name.trim(),
        bio: trim(bio),
        phone: trim(phone),
        avatarUrl: trim(avatarUrl),
        coverUrl: trim(coverUrl),
        city: trim(city),
        state: state.trim().toUpperCase().slice(0, 2) || undefined,
        occupation: trim(occupation),
        experienceYears: trim(experienceYears),
        cultures: trim(cultures),
        website: trim(website),
        instagram: trim(instagram)?.replace(/^@/, ''),
        birthDate: trim(birthDate),
      },
      {
        onSuccess: () =>
          Alert.alert('Salvo!', 'Seu perfil foi atualizado.', [
            { text: 'OK', onPress: () => router.back() },
          ]),
        onError: (err: any) =>
          Alert.alert('Erro', err?.response?.data?.error ?? 'Não foi possível salvar.'),
      }
    )
  }

  const pickCover = async () => {
    const uri = await choosePhotoSource()
    if (uri) setCoverUrl(uri)
  }

  const pickAvatar = async () => {
    const uri = await choosePhotoSource()
    if (uri) setAvatarUrl(uri)
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={colors.white} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Editar Perfil</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={update.isPending}
          style={[s.saveBtn, update.isPending && { opacity: 0.5 }]}
        >
          {update.isPending
            ? <ActivityIndicator color={colors.white} size="small" />
            : <Text style={s.saveBtnText}>Salvar</Text>}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

          {/* ── Cover + Avatar ── */}
          <View style={s.coverSection}>
            <TouchableOpacity onPress={pickCover} activeOpacity={0.85}>
              {coverUrl ? (
                <Image source={{ uri: coverUrl }} style={s.cover} resizeMode="cover" />
              ) : (
                <LinearGradient
                  colors={[colors.primaryDark, colors.primary, colors.primaryLight]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={s.cover}
                />
              )}
              <View style={s.coverEditBadge}>
                <Ionicons name="camera" size={14} color={colors.white} />
                <Text style={s.coverEditText}>{coverUrl ? 'Trocar capa' : 'Adicionar capa'}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={s.avatarWrap} onPress={pickAvatar} activeOpacity={0.85}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={s.avatar} />
              ) : (
                <View style={[s.avatar, s.avatarFallback]}>
                  <Text style={s.avatarInitial}>{name[0]?.toUpperCase() ?? '?'}</Text>
                </View>
              )}
              <View style={s.avatarEdit}>
                <Ionicons name="camera" size={14} color={colors.white} />
              </View>
            </TouchableOpacity>
          </View>

          {/* ── Sobre você ── */}
          <Section title="Sobre você" icon="person-outline">
            <Field label="Nome completo *">
              <TextInput
                style={input.base}
                value={name}
                onChangeText={setName}
                placeholder="Como você se chama?"
                placeholderTextColor={colors.textMuted}
                maxLength={80}
              />
            </Field>

            <Field label="Bio">
              <TextInput
                style={[input.base, { minHeight: 90, textAlignVertical: 'top' }]}
                value={bio}
                onChangeText={setBio}
                placeholder="Conte um pouco sobre você e sua trajetória no agro..."
                placeholderTextColor={colors.textMuted}
                multiline
                maxLength={500}
              />
              <Text style={s.charCount}>{bio.length}/500</Text>
            </Field>

            <Field label="Data de nascimento (opcional)">
              <TextInput
                style={input.base}
                value={birthDate}
                onChangeText={setBirthDate}
                placeholder="DD/MM/AAAA"
                placeholderTextColor={colors.textMuted}
                maxLength={10}
              />
            </Field>
          </Section>

          {/* ── Trabalho e Atuação ── */}
          <Section title="Trabalho e atuação" icon="briefcase-outline">
            <Field label="Profissão / Cargo">
              <TextInput
                style={input.base}
                value={occupation}
                onChangeText={setOccupation}
                placeholder="Ex: Engenheiro Agrônomo, Pecuarista..."
                placeholderTextColor={colors.textMuted}
                maxLength={100}
              />
            </Field>

            <Field label="Anos de experiência no agro">
              <TextInput
                style={input.base}
                value={experienceYears}
                onChangeText={setExperienceYears}
                placeholder="Ex: 15"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                maxLength={3}
              />
            </Field>

            <Field label="Culturas com que trabalha">
              <TextInput
                style={input.base}
                value={cultures}
                onChangeText={setCultures}
                placeholder="Ex: Soja, Milho, Café"
                placeholderTextColor={colors.textMuted}
                maxLength={200}
              />
              <Text style={s.hint}>Separe por vírgula. Aparece como tags no seu perfil.</Text>
            </Field>
          </Section>

          {/* ── Localização ── */}
          <Section title="Onde você atua" icon="location-outline">
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 2 }}>
                <Field label="Cidade">
                  <TextInput
                    style={input.base}
                    value={city}
                    onChangeText={setCity}
                    placeholder="Sorriso"
                    placeholderTextColor={colors.textMuted}
                    maxLength={100}
                  />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="UF">
                  <TextInput
                    style={input.base}
                    value={state}
                    onChangeText={(v) => setState(v.toUpperCase())}
                    placeholder="MT"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="characters"
                    maxLength={2}
                  />
                </Field>
              </View>
            </View>
          </Section>

          {/* ── Contato ── */}
          <Section title="Contato" icon="call-outline">
            <Field label="Telefone / WhatsApp">
              <TextInput
                style={input.base}
                value={phone}
                onChangeText={setPhone}
                placeholder="(65) 99999-9999"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />
            </Field>

            <Field label="Instagram (sem @)">
              <TextInput
                style={input.base}
                value={instagram}
                onChangeText={(v) => setInstagram(v.replace(/^@/, ''))}
                placeholder="seu_usuario"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                maxLength={50}
              />
            </Field>

            <Field label="Site / LinkedIn">
              <TextInput
                style={input.base}
                value={website}
                onChangeText={setWebsite}
                placeholder="https://..."
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                keyboardType="url"
                maxLength={255}
              />
            </Field>
          </Section>

          {/* ── Dados fixos ── */}
          <Section title="Dados da conta" icon="lock-closed-outline">
            <View style={s.readOnlyRow}>
              <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
              <View style={{ flex: 1 }}>
                <Text style={s.readOnlyLabel}>E-mail</Text>
                <Text style={s.readOnlyValue}>{user.email}</Text>
              </View>
            </View>
            <View style={[s.readOnlyRow, { borderTopWidth: 1, borderTopColor: colors.border }]}>
              <Ionicons name="at-outline" size={18} color={colors.textMuted} />
              <View style={{ flex: 1 }}>
                <Text style={s.readOnlyLabel}>Username</Text>
                <Text style={s.readOnlyValue}>@{user.username}</Text>
              </View>
            </View>
          </Section>

          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <View style={s.sectionHeader}>
        <Ionicons name={icon as any} size={18} color={colors.primary} />
        <Text style={s.sectionTitle}>{title}</Text>
      </View>
      <View style={s.sectionBody}>{children}</View>
    </View>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      {children}
    </View>
  )
}

const input = StyleSheet.create({
  base: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.white,
  },
})

const s = StyleSheet.create({
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
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    minWidth: 70,
    alignItems: 'center',
  },
  saveBtnText: { ...typography.label, color: colors.white, fontWeight: '700' },

  scrollContent: { paddingBottom: spacing.xxl },

  // Cover + avatar
  coverSection: { position: 'relative', marginBottom: 56 },
  cover: { width: '100%', height: 160 },
  coverEditBadge: {
    position: 'absolute', top: spacing.sm, right: spacing.sm,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: spacing.sm, paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  coverEditText: { ...typography.caption, color: colors.white, fontWeight: '700' },
  avatarWrap: {
    position: 'absolute',
    bottom: -48,
    left: spacing.lg,
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 4, borderColor: colors.white,
    backgroundColor: colors.white,
    ...shadows.md,
  },
  avatar: { width: 88, height: 88, borderRadius: 44 },
  avatarFallback: {
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarInitial: { fontSize: 36, fontWeight: '700', color: colors.white },
  avatarEdit: {
    position: 'absolute', bottom: 0, right: 0,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.primary,
    borderWidth: 2.5, borderColor: colors.white,
    justifyContent: 'center', alignItems: 'center',
  },

  // Section
  section: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.xs,
  },
  sectionTitle: { ...typography.h4, color: colors.text, fontWeight: '700' },
  sectionBody: { padding: spacing.md, gap: spacing.md },

  fieldLabel: { ...typography.label, color: colors.textSecondary, fontWeight: '600' },
  charCount: { ...typography.caption, color: colors.textMuted, textAlign: 'right' },
  hint: { ...typography.caption, color: colors.textMuted, fontStyle: 'italic' },

  // Read-only
  readOnlyRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  readOnlyLabel: { ...typography.caption, color: colors.textMuted },
  readOnlyValue: { ...typography.body, color: colors.text },
})
