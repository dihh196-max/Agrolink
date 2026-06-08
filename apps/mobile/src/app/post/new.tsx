import { useState, useMemo } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useCreatePost } from '../../hooks/useFeed.js'
import { useAuthStore } from '../../store/auth.js'
import { choosePhotoSource, pickMultiplePhotos } from '../../lib/media.js'
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme.js'

const MAX_PHOTOS = 5
const MAX_CONTENT = 1000

const CULTURES = [
  { id: 'soja',      label: 'Soja',      icon: '🌿' },
  { id: 'milho',     label: 'Milho',     icon: '🌽' },
  { id: 'cafe',      label: 'Café',      icon: '☕' },
  { id: 'algodao',   label: 'Algodão',   icon: '☁️' },
  { id: 'boi_gordo', label: 'Boi',       icon: '🐄' },
  { id: 'trigo',     label: 'Trigo',     icon: '🌾' },
  { id: 'arroz',     label: 'Arroz',     icon: '🍚' },
  { id: 'feijao',    label: 'Feijão',    icon: '🫘' },
  { id: 'cana',      label: 'Cana',      icon: '🎋' },
] as const

const SUGGESTED_TAGS = [
  'safra', 'colheita', 'plantio', 'cotacao', 'mercado',
  'pragas', 'adubacao', 'tecnologia', 'clima', 'sustentabilidade',
  'fazenda', 'maquinario',
]

const ROLE_LABEL: Record<string, string> = {
  producer: 'Produtor Rural',
  supplier: 'Fornecedor',
  technician: 'Técnico / Consultor',
  cooperative: 'Cooperativa',
}

export default function NewPostScreen() {
  const [content, setContent] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [culture, setCulture] = useState<string | null>(null)
  const [location, setLocation] = useState('')

  const user = useAuthStore((s) => s.user)
  const create = useCreatePost()

  // ── Photo management ──────────────────────────────────────────
  const addOnePhoto = async () => {
    if (photos.length >= MAX_PHOTOS) {
      Alert.alert('Limite atingido', `Você pode adicionar até ${MAX_PHOTOS} fotos.`)
      return
    }
    const uri = await choosePhotoSource()
    if (uri) setPhotos((p) => [...p, uri])
  }
  const addManyPhotos = async () => {
    const remaining = MAX_PHOTOS - photos.length
    if (remaining <= 0) return
    const uris = await pickMultiplePhotos(remaining)
    if (uris.length) setPhotos((p) => [...p, ...uris].slice(0, MAX_PHOTOS))
  }
  const removePhoto = (idx: number) => setPhotos((p) => p.filter((_, i) => i !== idx))

  // ── Tag management ────────────────────────────────────────────
  const addTag = (raw: string) => {
    const clean = raw.trim().replace(/^#/, '').toLowerCase().replace(/\s+/g, '_')
    if (!clean || tags.includes(clean) || tags.length >= 6) return
    setTags((t) => [...t, clean])
  }
  const handleTagSubmit = () => {
    if (!tagInput.trim()) return
    addTag(tagInput)
    setTagInput('')
  }
  const removeTag = (t: string) => setTags((arr) => arr.filter((x) => x !== t))

  const suggestionsToShow = useMemo(
    () => SUGGESTED_TAGS.filter((t) => !tags.includes(t)).slice(0, 8),
    [tags]
  )

  // ── Submit ────────────────────────────────────────────────────
  const canPost = !!content.trim() || photos.length > 0
  const tooLong = content.length > MAX_CONTENT

  const handlePost = async () => {
    if (!canPost) {
      Alert.alert('Atenção', 'Escreva algo ou adicione pelo menos uma foto.')
      return
    }
    if (tooLong) {
      Alert.alert('Texto longo demais', `Máximo de ${MAX_CONTENT} caracteres.`)
      return
    }
    const finalTags = culture ? [culture, ...tags].slice(0, 6) : tags
    const media = photos.map((url) => ({ type: 'image', url }))
    const [city, state] = location.split('/').map((s) => s.trim())
    const payload: any = {
      content: content.trim(),
      tags: finalTags,
      media,
    }
    if (city) payload.city = city
    if (state) payload.state = state.toUpperCase().slice(0, 2)

    try {
      await create.mutateAsync(payload)
      router.back()
    } catch {
      Alert.alert('Erro', 'Não foi possível publicar. Tente novamente.')
    }
  }

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Text style={s.cancelText}>Cancelar</Text>
          </TouchableOpacity>
          <Text style={s.title}>Nova publicação</Text>
          <TouchableOpacity
            style={[s.postBtn, (!canPost || tooLong) && s.postBtnDisabled]}
            onPress={handlePost}
            disabled={!canPost || tooLong || create.isPending}
          >
            {create.isPending
              ? <ActivityIndicator color={colors.white} size="small" />
              : <Text style={s.postBtnText}>Publicar</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Author row ── */}
          <View style={s.authorRow}>
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={s.avatar} />
            ) : (
              <View style={[s.avatar, s.avatarFallback]}>
                <Text style={s.avatarInitial}>{user?.name?.[0]?.toUpperCase() ?? '?'}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={s.authorName}>{user?.name}</Text>
              <Text style={s.authorRole}>{ROLE_LABEL[user?.role ?? ''] ?? ''}</Text>
            </View>
            {culture && (
              <View style={s.cultureChipMini}>
                <Text style={s.cultureChipText}>
                  {CULTURES.find((c) => c.id === culture)?.icon}{' '}
                  {CULTURES.find((c) => c.id === culture)?.label}
                </Text>
              </View>
            )}
          </View>

          {/* ── Text input ── */}
          <TextInput
            style={s.contentInput}
            placeholder="O que está acontecendo na sua lavoura? Compartilhe atualizações, dúvidas ou conquistas..."
            placeholderTextColor={colors.textMuted}
            value={content}
            onChangeText={setContent}
            multiline
            autoFocus
            textAlignVertical="top"
          />

          {/* ── Char counter ── */}
          <View style={s.charCountRow}>
            <Text style={[s.charCount, content.length > MAX_CONTENT * 0.9 && s.charCountWarn]}>
              {content.length} / {MAX_CONTENT}
            </Text>
          </View>

          {/* ── Photo carousel ── */}
          {photos.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.photoStrip}
            >
              {photos.map((uri, idx) => (
                <View key={idx} style={s.photoCard}>
                  <Image source={{ uri }} style={s.photoImg} resizeMode="cover" />
                  <TouchableOpacity style={s.photoRemove} onPress={() => removePhoto(idx)}>
                    <Ionicons name="close" size={16} color={colors.white} />
                  </TouchableOpacity>
                  <View style={s.photoBadge}>
                    <Text style={s.photoBadgeText}>{idx + 1}</Text>
                  </View>
                </View>
              ))}
              {photos.length < MAX_PHOTOS && (
                <TouchableOpacity style={s.photoAddCard} onPress={addManyPhotos}>
                  <Ionicons name="add" size={32} color={colors.primary} />
                  <Text style={s.photoAddText}>Mais</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          )}

          {/* ── Section: Cultura ── */}
          <Section icon="leaf-outline" title="Marcar cultura">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.culturesRow}
            >
              {CULTURES.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[s.cultureChip, culture === c.id && s.cultureChipActive]}
                  onPress={() => setCulture(culture === c.id ? null : c.id)}
                >
                  <Text style={s.cultureEmoji}>{c.icon}</Text>
                  <Text style={[s.cultureLabel, culture === c.id && s.cultureLabelActive]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Section>

          {/* ── Section: Tags ── */}
          <Section icon="pricetag-outline" title={`Tags ${tags.length > 0 ? `(${tags.length}/6)` : ''}`}>
            <View style={s.tagInputRow}>
              <Text style={s.tagHash}>#</Text>
              <TextInput
                style={s.tagInput}
                placeholder="adicione uma tag e pressione enter"
                placeholderTextColor={colors.textMuted}
                value={tagInput}
                onChangeText={setTagInput}
                onSubmitEditing={handleTagSubmit}
                autoCapitalize="none"
                returnKeyType="done"
                editable={tags.length < 6}
              />
              {tagInput.length > 0 && (
                <TouchableOpacity onPress={handleTagSubmit}>
                  <Text style={s.tagAddBtn}>Adicionar</Text>
                </TouchableOpacity>
              )}
            </View>

            {tags.length > 0 && (
              <View style={s.tagsList}>
                {tags.map((t) => (
                  <View key={t} style={s.tagPill}>
                    <Text style={s.tagText}>#{t}</Text>
                    <TouchableOpacity onPress={() => removeTag(t)} hitSlop={4}>
                      <Ionicons name="close" size={14} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {tags.length < 6 && suggestionsToShow.length > 0 && (
              <>
                <Text style={s.subLabel}>Sugestões</Text>
                <View style={s.tagsList}>
                  {suggestionsToShow.map((t) => (
                    <TouchableOpacity key={t} style={s.tagSuggest} onPress={() => addTag(t)}>
                      <Ionicons name="add" size={12} color={colors.textSecondary} />
                      <Text style={s.tagSuggestText}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </Section>

          {/* ── Section: Localização ── */}
          <Section icon="location-outline" title="Localização (opcional)">
            <View style={s.locationRow}>
              <TextInput
                style={s.locationInput}
                placeholder="Ex: Sorriso/MT"
                placeholderTextColor={colors.textMuted}
                value={location}
                onChangeText={setLocation}
                autoCapitalize="words"
              />
            </View>
          </Section>
        </ScrollView>

        {/* ── Bottom toolbar ── */}
        <View style={s.toolbar}>
          <TouchableOpacity style={s.toolBtn} onPress={addOnePhoto}>
            <Ionicons name="camera-outline" size={22} color={colors.primary} />
            <Text style={s.toolBtnLabel}>Câmera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.toolBtn} onPress={addManyPhotos}>
            <Ionicons name="images-outline" size={22} color={colors.primary} />
            <Text style={s.toolBtnLabel}>
              Galeria{photos.length > 0 ? ` (${photos.length})` : ''}
            </Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          {tooLong && (
            <Text style={s.tooLong}>Texto longo demais</Text>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <View style={s.sectionHeader}>
        <Ionicons name={icon as any} size={18} color={colors.primary} />
        <Text style={s.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cancelText: { ...typography.body, color: colors.textSecondary },
  title: { ...typography.h4, color: colors.text },
  postBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    minWidth: 90,
    alignItems: 'center',
    ...shadows.sm,
  },
  postBtnDisabled: { backgroundColor: colors.border, ...shadows.sm, shadowOpacity: 0 },
  postBtnText: { ...typography.label, color: colors.white, fontWeight: '700' },

  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: { backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { ...typography.h4, color: colors.white },
  authorName: { ...typography.label, color: colors.text, fontWeight: '700' },
  authorRole: { ...typography.caption, color: colors.textMuted },

  cultureChipMini: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  cultureChipText: { ...typography.caption, color: '#166534', fontWeight: '700' },

  contentInput: {
    ...typography.body,
    color: colors.text,
    paddingHorizontal: spacing.md,
    minHeight: 140,
    lineHeight: 24,
  },
  charCountRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: spacing.md },
  charCount: { ...typography.caption, color: colors.textMuted },
  charCountWarn: { color: colors.warning, fontWeight: '700' },

  // Photo strip
  photoStrip: { gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  photoCard: {
    width: 110, height: 110, borderRadius: borderRadius.md, overflow: 'hidden',
    backgroundColor: colors.surfaceSecondary,
    position: 'relative',
  },
  photoImg: { width: '100%', height: '100%' },
  photoRemove: {
    position: 'absolute', top: 4, right: 4,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center',
  },
  photoBadge: {
    position: 'absolute', bottom: 4, left: 4,
    paddingHorizontal: 6, paddingVertical: 1,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  photoBadgeText: { fontSize: 10, fontWeight: '700', color: colors.white },
  photoAddCard: {
    width: 110, height: 110, borderRadius: borderRadius.md,
    borderWidth: 2, borderStyle: 'dashed', borderColor: colors.primary,
    justifyContent: 'center', alignItems: 'center', gap: 2,
  },
  photoAddText: { ...typography.caption, color: colors.primary, fontWeight: '700' },

  // Section
  section: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.sm,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
  sectionTitle: { ...typography.label, color: colors.text, fontWeight: '700' },
  subLabel: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm, marginBottom: spacing.xs },

  // Cultures
  culturesRow: { gap: spacing.xs, paddingBottom: spacing.md },
  cultureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  cultureChipActive: { borderColor: colors.primary, backgroundColor: colors.surfaceSecondary },
  cultureEmoji: { fontSize: 16 },
  cultureLabel: { ...typography.label, color: colors.textSecondary },
  cultureLabelActive: { color: colors.primary, fontWeight: '700' },

  // Tags
  tagInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    borderWidth: 1.5, borderColor: colors.border, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
  },
  tagHash: { ...typography.h4, color: colors.textMuted },
  tagInput: { flex: 1, ...typography.body, color: colors.text, paddingVertical: spacing.sm },
  tagAddBtn: { ...typography.label, color: colors.primary, fontWeight: '700', paddingHorizontal: 4 },
  tagsList: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm, paddingBottom: spacing.md },
  tagPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#dcfce7',
    paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  tagText: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  tagSuggest: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: colors.background,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  tagSuggestText: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },

  // Location
  locationRow: { paddingBottom: spacing.md },
  locationInput: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    ...typography.body, color: colors.text,
  },

  // Toolbar
  toolbar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  toolBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  toolBtnLabel: { ...typography.label, color: colors.primary, fontWeight: '600' },
  tooLong: { ...typography.caption, color: colors.error, fontWeight: '700' },
})
