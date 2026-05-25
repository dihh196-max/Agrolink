import { useCallback } from 'react'
import {
  FlatList,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useFeed, useReactToPost } from '../../hooks/useFeed.js'
import { useNotifications } from '../../hooks/useSocial.js'
import { StoriesBar } from '../../components/StoriesBar.js'
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme.js'
import type { Post } from '@agrolink/types'

function PostCard({ post }: { post: Post }) {
  const react = useReactToPost()
  const totalReactions = Object.values(post.reactionsCount ?? {}).reduce(
    (acc, v) => acc + (v as number),
    0
  )

  return (
    <View style={styles.card}>
      {/* Author */}
      <TouchableOpacity
        style={styles.author}
        onPress={() => router.push(`/profile/${post.author.username}`)}
      >
        {post.author.avatarUrl ? (
          <Image source={{ uri: post.author.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarText}>{post.author.name[0].toUpperCase()}</Text>
          </View>
        )}
        <View>
          <Text style={styles.authorName}>{post.author.name}</Text>
          <Text style={styles.authorMeta}>
            @{post.author.username}
            {post.city ? ` • ${post.city}/${post.state}` : ''}
          </Text>
        </View>
        {post.isSponsored && (
          <View style={styles.sponsoredBadge}>
            <Text style={styles.sponsoredText}>Patrocinado</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Content */}
      <Text style={styles.content}>{post.content}</Text>

      {/* Tags */}
      {post.tags?.length > 0 && (
        <View style={styles.tags}>
          {post.tags.map((tag) => (
            <Text key={tag} style={styles.tag}>
              #{tag}
            </Text>
          ))}
        </View>
      )}

      {/* Media */}
      {post.media?.length > 0 && (
        <Image
          source={{ uri: post.media[0].url }}
          style={styles.media}
          resizeMode="cover"
        />
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.action}
          onPress={() => react.mutate({ postId: post.id, type: 'like' })}
        >
          <Ionicons
            name={post.userReaction === 'like' ? 'heart' : 'heart-outline'}
            size={22}
            color={post.userReaction === 'like' ? colors.error : colors.textSecondary}
          />
          <Text style={styles.actionText}>{totalReactions}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.action}
          onPress={() => router.push(`/post/${post.id}`)}
        >
          <Ionicons name="chatbubble-outline" size={22} color={colors.textSecondary} />
          <Text style={styles.actionText}>{post.commentsCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.action}>
          <Ionicons name="share-social-outline" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

export default function FeedScreen() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch } = useFeed()
  const { data: unreadNotifs } = useNotifications(true)
  const unreadCount = unreadNotifs?.length ?? 0

  const posts = data?.pages.flatMap((p) => p.items) ?? []

  const renderItem = useCallback(({ item }: { item: Post }) => <PostCard post={item} />, [])

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerLogo}>🌱 AgroLink</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => router.push('/(tabs)/search')}>
            <Ionicons name="search-outline" size={24} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(tabs)/messages')}>
            <Ionicons name="chatbubbles-outline" size={24} color={colors.white} />
          </TouchableOpacity>
          <View>
            <TouchableOpacity onPress={() => router.push('/notifications')}>
              <Ionicons name="notifications-outline" size={24} color={colors.white} />
            </TouchableOpacity>
            {unreadCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Stories */}
      <StoriesBar />

      {/* New post CTA */}
      <TouchableOpacity style={styles.newPost} onPress={() => router.push('/post/new')}>
        <Ionicons name="add-circle-outline" size={20} color={colors.textMuted} />
        <Text style={styles.newPostText}>O que está acontecendo na sua lavoura?</Text>
      </TouchableOpacity>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.4}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator color={colors.primary} style={{ padding: spacing.md }} />
            ) : null
          }
          contentContainerStyle={{ paddingBottom: spacing.xl }}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerLogo: { ...typography.h3, color: colors.white },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  notifBadge: {
    position: 'absolute', top: -6, right: -8, backgroundColor: colors.secondary,
    minWidth: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4,
  },
  notifBadgeText: { ...typography.caption, color: colors.white, fontWeight: '700', fontSize: 10 },
  newPost: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  newPostText: { ...typography.body, color: colors.textMuted, flex: 1 },
  card: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  author: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  avatar: { width: 42, height: 42, borderRadius: 21 },
  avatarFallback: { backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  avatarText: { ...typography.h4, color: colors.white },
  authorName: { ...typography.label, color: colors.text },
  authorMeta: { ...typography.caption, color: colors.textMuted },
  sponsoredBadge: {
    marginLeft: 'auto',
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  sponsoredText: { ...typography.caption, color: colors.textSecondary },
  content: { ...typography.body, color: colors.text, lineHeight: 22, marginBottom: spacing.sm },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
  tag: { ...typography.caption, color: colors.primary, fontWeight: '600' },
  media: { width: '100%', height: 240, borderRadius: borderRadius.md, marginBottom: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.lg, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  action: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  actionText: { ...typography.bodySmall, color: colors.textSecondary },
})
