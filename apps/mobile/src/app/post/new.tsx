import { useState } from 'react'
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
import { choosePhotoSource } from '../../lib/media.js'
import { colors, spacing, typography, borderRadius } from '../../constants/theme.js'

export default function NewPostScreen() {
  const [content, setContent] = useState('')
  const [tagsRaw, setTagsRaw] = useState('')
  const [photo, setPhoto] = useState<string | null>(null)
  const user = useAuthStore((s) => s.user)
  const create = useCreatePost()

  const handleAddPhoto = async () => {
    const uri = await choosePhotoSource()
    if (uri) setPhoto(uri)
  }

  const canPost = !!content.trim() || !!photo

  const handlePost = async () => {
    if (!canPost) {
      Alert.alert('Atenção', 'Escreva algo ou adicione uma foto para publicar')
      return
    }
    const tags = tagsRaw
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean)
    const media = photo ? [{ type: 'image', url: photo }] : []
    try {
      await create.mutateAsync({ content: content.trim(), tags, media } as any)
      router.back()
    } catch {
      Alert.alert('Erro', 'Não foi possível publicar. Tente novamente.')
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Nova publicação</Text>
          <TouchableOpacity
            style={[styles.postBtn, !canPost && styles.postBtnDisabled]}
            onPress={handlePost}
            disabled={!canPost || create.isPending}
          >
            {create.isPending ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.postBtnText}>Publicar</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
          {/* Author row */}
          <View style={styles.authorRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() ?? '?'}</Text>
            </View>
            <View>
              <Text style={styles.authorName}>{user?.name}</Text>
              <Text style={styles.authorRole}>
                {user?.role === 'producer' ? 'Produtor Rural' :
                 user?.role === 'supplier' ? 'Fornecedor' :
                 user?.role === 'technician' ? 'Técnico' : 'Cooperativa'}
              </Text>
            </View>
          </View>

          {/* Content */}
          <TextInput
            style={styles.contentInput}
            placeholder="O que está acontecendo na sua lavoura?"
            placeholderTextColor={colors.textMuted}
            value={content}
            onChangeText={setContent}
            multiline
            autoFocus
            textAlignVertical="top"
          />

          {/* Photo preview */}
          {photo && (
            <View style={styles.photoWrap}>
              <Image source={{ uri: photo }} style={styles.photoPreview} resizeMode="cover" />
              <TouchableOpacity style={styles.removePhoto} onPress={() => setPhoto(null)}>
                <Ionicons name="close-circle" size={28} color={colors.white} />
              </TouchableOpacity>
            </View>
          )}

          {/* Media actions */}
          <View style={styles.mediaActions}>
            <TouchableOpacity style={styles.mediaBtn} onPress={handleAddPhoto}>
              <Ionicons name="image-outline" size={22} color={colors.primary} />
              <Text style={styles.mediaBtnText}>{photo ? 'Trocar foto' : 'Adicionar foto'}</Text>
            </TouchableOpacity>
          </View>

          {/* Tags */}
          <View style={styles.tagsSection}>
            <Ionicons name="pricetag-outline" size={18} color={colors.textMuted} />
            <TextInput
              style={styles.tagsInput}
              placeholder="Tags: soja, safra, cotação (separadas por vírgula)"
              placeholderTextColor={colors.textMuted}
              value={tagsRaw}
              onChangeText={setTagsRaw}
              autoCapitalize="none"
            />
          </View>

          {/* Char count */}
          <Text style={[styles.charCount, content.length > 900 && styles.charCountWarn]}>
            {content.length}/1000
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
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
  cancelBtn: { padding: 4 },
  cancelText: { ...typography.body, color: colors.textSecondary },
  title: { ...typography.h4, color: colors.text },
  postBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    minWidth: 80,
    alignItems: 'center',
  },
  postBtnDisabled: { backgroundColor: colors.border },
  postBtnText: { ...typography.label, color: colors.white },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { ...typography.h4, color: colors.white },
  authorName: { ...typography.label, color: colors.text },
  authorRole: { ...typography.caption, color: colors.textMuted },
  contentInput: {
    ...typography.body,
    color: colors.text,
    paddingHorizontal: spacing.md,
    minHeight: 160,
    lineHeight: 24,
  },
  tagsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.md,
  },
  tagsInput: { ...typography.bodySmall, color: colors.text, flex: 1 },
  photoWrap: { marginHorizontal: spacing.md, marginTop: spacing.sm, position: 'relative' },
  photoPreview: { width: '100%', height: 220, borderRadius: borderRadius.md, backgroundColor: colors.surfaceSecondary },
  removePhoto: { position: 'absolute', top: spacing.sm, right: spacing.sm },
  mediaActions: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.md, marginTop: spacing.sm },
  mediaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  mediaBtnText: { ...typography.label, color: colors.primary },
  charCount: { ...typography.caption, color: colors.textMuted, textAlign: 'right', paddingHorizontal: spacing.md, marginTop: spacing.xs },
  charCountWarn: { color: colors.error },
})
