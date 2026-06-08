import { useState, useRef } from 'react'
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Share,
  Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { usePostComments, useAddComment, useReactToPost } from '../../hooks/useFeed.js'
import { api } from '../../lib/api.js'
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme.js'
import type { Post, PostComment } from '@agrolink/types'

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [comment, setComment] = useState('')
  const [pickerVisible, setPickerVisible] = useState(false)
  const inputRef = useRef<TextInput>(null)

  const REACTIONS = [
    { type: 'like', icon: '❤️', label: 'Curtir' },
    { type: 'applause', icon: '👏', label: 'Parabéns' },
    { type: 'useful', icon: '💡', label: 'Útil' },
    { type: 'insightful', icon: '🌾', label: 'Relevante' },
  ]

  const REACTION_ICONS: Record<string, string> = {
    like: '❤️', applause: '👏', useful: '💡', insightful: '🌾',
  }

  const handleShare = async () => {
    if (!post) return
    try {
      await Share.share({
        message: `${post.content}\n\n— @${post.author.username} no AgroLink`,
        title: 'AgroLink',
      })
    } catch {/* user cancelled */}
  }

  const { data: post, isLoading } = useQuery<Post>({
    queryKey: ['post', id],
    queryFn: () => api.get(`/posts/${id}`).then((r) => r.data),
    enabled: !!id,
  })
  const { data: comments = [] } = usePostComments(id ?? '')
  const addComment = useAddComment(id ?? '')
  const react = useReactToPost()

  const handleComment = async () => {
    if (!comment.trim()) return
    try {
      await addComment.mutateAsync(comment.trim())
      setComment('')
    } catch {
      Alert.alert('Erro', 'Não foi possível comentar.')
    }
  }

  if (isLoading || !post) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Publicação</Text>
          <View style={{ width: 24 }} />
        </View>
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      </SafeAreaView>
    )
  }

  const totalReactions = Object.values(post.reactionsCount ?? {}).reduce(
    (acc, v) => acc + (v as number),
    0
  )

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Publicação</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        <FlatList
          data={comments}
          keyExtractor={(item: PostComment) => item.id}
          ListHeaderComponent={() => (
            <View>
              {/* Post */}
              <View style={styles.postCard}>
                <View style={styles.author}>
                  {post.author.avatarUrl ? (
                    <Image source={{ uri: post.author.avatarUrl }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarFallback]}>
                      <Text style={styles.avatarText}>{post.author.name[0]}</Text>
                    </View>
                  )}
                  <View>
                    <Text style={styles.authorName}>{post.author.name}</Text>
                    <Text style={styles.authorMeta}>@{post.author.username}</Text>
                  </View>
                </View>
                <Text style={styles.content}>{post.content}</Text>
                {post.tags?.length > 0 && (
                  <View style={styles.tags}>
                    {post.tags.map((t) => (
                      <Text key={t} style={styles.tag}>#{t}</Text>
                    ))}
                  </View>
                )}
                <View style={styles.actions}>
                  {/* Reaction: tap = like toggle, long press = picker */}
                  <TouchableOpacity
                    style={styles.action}
                    onPress={() => react.mutate({ postId: post.id, type: 'like' })}
                    onLongPress={() => setPickerVisible(true)}
                    delayLongPress={400}
                  >
                    {post.userReaction ? (
                      <Text style={{ fontSize: 20, lineHeight: 26 }}>
                        {REACTION_ICONS[post.userReaction] ?? '❤️'}
                      </Text>
                    ) : (
                      <Ionicons name="heart-outline" size={22} color={colors.textSecondary} />
                    )}
                    {totalReactions > 0 && (
                      <Text style={[styles.actionText, post.userReaction && { color: colors.error }]}>
                        {totalReactions}
                      </Text>
                    )}
                  </TouchableOpacity>

                  <View style={styles.action}>
                    <Ionicons name="chatbubble-outline" size={22} color={colors.primary} />
                    <Text style={[styles.actionText, { color: colors.primary }]}>
                      {comments.length}
                    </Text>
                  </View>

                  <TouchableOpacity style={styles.action} onPress={handleShare}>
                    <Ionicons name="share-social-outline" size={22} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Reaction picker modal */}
                <Modal visible={pickerVisible} transparent animationType="fade" onRequestClose={() => setPickerVisible(false)}>
                  <TouchableWithoutFeedback onPress={() => setPickerVisible(false)}>
                    <View style={rpStyles.overlay}>
                      <TouchableWithoutFeedback>
                        <View style={rpStyles.picker}>
                          {REACTIONS.map((r) => (
                            <TouchableOpacity key={r.type} style={rpStyles.item}
                              onPress={() => { react.mutate({ postId: post.id, type: r.type }); setPickerVisible(false) }}>
                              <Text style={rpStyles.emoji}>{r.icon}</Text>
                              <Text style={rpStyles.label}>{r.label}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </TouchableWithoutFeedback>
                    </View>
                  </TouchableWithoutFeedback>
                </Modal>
              </View>

              <Text style={styles.commentsLabel}>
                {comments.length > 0 ? `${comments.length} comentário${comments.length > 1 ? 's' : ''}` : 'Seja o primeiro a comentar'}
              </Text>
            </View>
          )}
          renderItem={({ item }: { item: PostComment }) => (
            <View style={styles.commentCard}>
              {item.author.avatarUrl ? (
                <Image source={{ uri: item.author.avatarUrl }} style={styles.commentAvatar} />
              ) : (
                <View style={[styles.commentAvatar, styles.avatarFallback]}>
                  <Text style={styles.commentAvatarText}>{item.author.name[0]}</Text>
                </View>
              )}
              <View style={styles.commentBody}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentAuthor}>{item.author.name}</Text>
                  <Text style={styles.commentTime}>{timeAgo(item.createdAt)}</Text>
                </View>
                <Text style={styles.commentText}>{item.content}</Text>
              </View>
            </View>
          )}
          contentContainerStyle={{ paddingBottom: spacing.xl }}
        />

        {/* Comment input */}
        <View style={styles.inputBar}>
          <TextInput
            ref={inputRef}
            style={styles.commentInput}
            placeholder="Adicionar comentário..."
            placeholderTextColor={colors.textMuted}
            value={comment}
            onChangeText={setComment}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !comment.trim() && styles.sendBtnDisabled]}
            onPress={handleComment}
            disabled={!comment.trim() || addComment.isPending}
          >
            {addComment.isPending ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Ionicons name="send" size={18} color={colors.white} />
            )}
          </TouchableOpacity>
        </View>
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
  postCard: {
    backgroundColor: colors.white,
    margin: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  author: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: { backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  avatarText: { ...typography.h4, color: colors.white },
  authorName: { ...typography.label, color: colors.text },
  authorMeta: { ...typography.caption, color: colors.textMuted },
  content: { ...typography.body, color: colors.text, lineHeight: 22, marginBottom: spacing.sm },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
  tag: { ...typography.caption, color: colors.primary, fontWeight: '600' },
  actions: {
    flexDirection: 'row',
    gap: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  action: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  actionText: { ...typography.bodySmall, color: colors.textSecondary },
  commentsLabel: {
    ...typography.label,
    color: colors.textSecondary,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
  },
  commentCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  commentAvatar: { width: 36, height: 36, borderRadius: 18 },
  commentAvatarText: { ...typography.bodySmall, color: colors.white, fontWeight: '700' },
  commentBody: { flex: 1 },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  commentAuthor: { ...typography.label, color: colors.text },
  commentTime: { ...typography.caption, color: colors.textMuted },
  commentText: { ...typography.bodySmall, color: colors.text, lineHeight: 20 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  commentInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxHeight: 100,
    backgroundColor: colors.background,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: colors.border },
})

const rpStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  picker: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    gap: spacing.md,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  item: { alignItems: 'center', gap: spacing.xs, minWidth: 56 },
  emoji: { fontSize: 28 },
  label: { ...typography.caption, color: colors.textSecondary },
})
