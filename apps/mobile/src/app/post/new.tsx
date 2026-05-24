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
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useCreatePost } from '../../hooks/useFeed.js'
import { useAuthStore } from '../../store/auth.js'
import { colors, spacing, typography, borderRadius } from '../../constants/theme.js'

export default function NewPostScreen() {
  const [content, setContent] = useState('')
  const [tagsRaw, setTagsRaw] = useState('')
  const user = useAuthStore((s) => s.user)
  const create = useCreatePost()

  const handlePost = async () => {
    if (!content.trim()) {
      Alert.alert('Atenção', 'Escreva algo para publicar')
      return
    }
    const tags = tagsRaw
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean)
    try {
      await create.mutateAsync({ content: content.trim(), tags } as any)
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
            style={[styles.postBtn, !content.trim() && styles.postBtnDisabled]}
            onPress={handlePost}
            disabled={!content.trim() || create.isPending}
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
  charCount: { ...typography.caption, color: colors.textMuted, textAlign: 'right', paddingHorizontal: spacing.md, marginTop: spacing.xs },
  charCountWarn: { color: colors.error },
})
