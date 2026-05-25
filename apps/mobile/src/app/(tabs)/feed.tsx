import { useCallback, useState, useRef, useMemo } from 'react'
import {
  FlatList,
  View,
  Text,
  Image,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Share,
  ScrollView,
  useWindowDimensions,
  Pressable,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useFeed, useReactToPost } from '../../hooks/useFeed.js'
import { useNotifications } from '../../hooks/useSocial.js'
import { useAuthStore } from '../../store/auth.js'
import { StoriesBar } from '../../components/StoriesBar.js'
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme.js'
import type { Post } from '@agrolink/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const REACTIONS = [
  { type: 'like',       icon: '❤️',  label: 'Curtir'    },
  { type: 'applause',   icon: '👏',  label: 'Parabéns'  },
  { type: 'useful',     icon: '💡',  label: 'Útil'      },
  { type: 'insightful', icon: '🌾',  label: 'Relevante' },
] as const

type ReactionType = (typeof REACTIONS)[number]['type']

const REACTION_ICONS: Record<string, string> = {
  like: '❤️', applause: '👏', useful: '💡', insightful: '🌾',
}

const ROLE_META: Record<string, { label: string; bg: string; fg: string }> = {
  producer:    { label: 'Produtor',    bg: '#dcfce7', fg: '#166534' },
  supplier:    { label: 'Fornecedor',  bg: '#dbeafe', fg: '#1e40af' },
  technician:  { label: 'Técnico',     bg: '#f3e8ff', fg: '#7e22ce' },
  cooperative: { label: 'Cooperativa', bg: '#fef3c7', fg: '#92400e' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1)  return 'agora'
  if (m < 60) return `${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7)  return `${d}d`
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

// ─── Image Carousel ───────────────────────────────────────────────────────────

function ImageCarousel({
  media,
  onDoubleTap,
}: {
  media: { url: string; type: string }[]
  onDoubleTap: () => void
}) {
  const { width } = useWindowDimensions()
  const cardWidth = width - spacing.md * 2
  const imgH = Math.round(cardWidth * 0.75)
  const [page, setPage] = useState(0)
  const lastTap = useRef(0)

  const handleTap = () => {
    const now = Date.now()
    if (now - lastTap.current < 350) onDoubleTap()
    lastTap.current = now
  }

  if (!media.length) return null

  return (
    <View>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={(e) =>
          setPage(Math.round(e.nativeEvent.contentOffset.x / cardWidth))
        }
        scrollEventThrottle={16}
        style={{ marginHorizontal: -spacing.md }}
      >
        {media.map((m, i) => (
          <TouchableWithoutFeedback key={i} onPress={handleTap}>
            <Image
              source={{ uri: m.url }}
              style={{ width: cardWidth + spacing.md * 2, height: imgH }}
              resizeMode="cover"
            />
          </TouchableWithoutFeedback>
        ))}
      </ScrollView>

      {/* Page dots */}
      {media.length > 1 && (
        <View style={cs.dots}>
          {media.map((_, i) => (
            <View key={i} style={[cs.dot, i === page && cs.dotActive]} />
          ))}
        </View>
      )}

      {/* Image count badge */}
      {media.length > 1 && (
        <View style={cs.badge}>
          <Text style={cs.badgeText}>{page + 1}/{media.length}</Text>
        </View>
      )}
    </View>
  )
}

const cs = StyleSheet.create({
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: spacing.xs },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary, width: 16 },
  badge: {
    position: 'absolute', top: spacing.sm, right: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: borderRadius.sm,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  badgeText: { ...typography.caption, color: '#fff', fontWeight: '700' },
})

// ─── Inline Reaction Picker ───────────────────────────────────────────────────

function InlineReactionPicker({
  visible,
  current,
  onSelect,
}: {
  visible: boolean
  current?: string
  onSelect: (type: ReactionType) => void
}) {
  if (!visible) return null
  return (
    <View style={rp.row}>
      {REACTIONS.map((r) => (
        <TouchableOpacity
          key={r.type}
          style={[rp.btn, current === r.type && rp.btnActive]}
          onPress={() => onSelect(r.type)}
        >
          <Text style={rp.emoji}>{r.icon}</Text>
          <Text style={[rp.label, current === r.type && { color: colors.primary }]}>
            {r.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

const rp = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: borderRadius.full,
    padding: spacing.xs,
    gap: spacing.xs,
    alignSelf: 'flex-start',
    ...shadows.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btn: {
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    gap: 2,
  },
  btnActive: { backgroundColor: colors.surfaceSecondary },
  emoji: { fontSize: 24 },
  label: { ...typography.caption, color: colors.textMuted, fontSize: 10 },
})

// ─── Post Card ────────────────────────────────────────────────────────────────

function PostCard({ post }: { post: Post }) {
  const react = useReactToPost()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [likeFlash, setLikeFlash] = useState(false)

  const totalReactions = Object.values(post.reactionsCount ?? {}).reduce(
    (a, v) => a + (v as number),
    0
  )

  const reactionBreakdown = Object.entries(post.reactionsCount ?? {})
    .filter(([, c]) => (c as number) > 0)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 3)

  const handleReact = (type: ReactionType) => {
    setPickerOpen(false)
    react.mutate({ postId: post.id, type })
  }

  const handleDoubleTap = () => {
    setLikeFlash(true)
    react.mutate({ postId: post.id, type: 'like' })
    setTimeout(() => setLikeFlash(false), 800)
  }

  const role = ROLE_META[post.author.role] ?? ROLE_META.producer
  const TEXT_LIMIT = 160
  const longText = post.content.length > TEXT_LIMIT
  const displayText =
    longText && !expanded ? post.content.slice(0, TEXT_LIMIT) + '…' : post.content

  return (
    <View style={s.card}>
      {/* ── Author bar ── */}
      <View style={s.authorRow}>
        <TouchableOpacity
          style={s.authorLeft}
          onPress={() => router.push(`/profile/${post.author.username}` as any)}
          activeOpacity={0.7}
        >
          {post.author.avatarUrl ? (
            <Image source={{ uri: post.author.avatarUrl }} style={s.avatar} />
          ) : (
            <LinearGradient
              colors={[colors.primaryLight, colors.primary]}
              style={[s.avatar, s.avatarGrad]}
            >
              <Text style={s.avatarInitial}>{post.author.name[0].toUpperCase()}</Text>
            </LinearGradient>
          )}
          <View style={s.authorInfo}>
            <View style={s.nameRow}>
              <Text style={s.authorName} numberOfLines={1}>{post.author.name}</Text>
              <View style={[s.roleBadge, { backgroundColor: role.bg }]}>
                <Text style={[s.roleText, { color: role.fg }]}>{role.label}</Text>
              </View>
            </View>
            <Text style={s.authorSub}>
              @{post.author.username}
              {post.city ? ` · 📍${post.city}/${post.state}` : ''}
              {(post as any).createdAt ? ` · ${timeAgo((post as any).createdAt)}` : ''}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push(`/post/${post.id}` as any)} hitSlop={8}>
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* ── Content ── */}
      <View style={s.contentWrap}>
        <Text style={s.content}>{displayText}</Text>
        {longText && (
          <TouchableOpacity onPress={() => setExpanded((e) => !e)}>
            <Text style={s.seeMore}>{expanded ? 'Ver menos' : 'Ver mais'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Tags ── */}
      {post.tags?.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.tagsScroll}
          contentContainerStyle={s.tagsContainer}
        >
          {post.tags.map((tag) => (
            <View key={tag} style={s.tagPill}>
              <Text style={s.tagText}>#{tag}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      {/* ── Images ── */}
      {post.media?.length > 0 && (
        <View style={s.mediaWrap}>
          <ImageCarousel media={post.media} onDoubleTap={handleDoubleTap} />
          {likeFlash && (
            <View style={s.likeFlash} pointerEvents="none">
              <Text style={s.likeFlashIcon}>❤️</Text>
            </View>
          )}
        </View>
      )}

      {/* ── Reactions summary ── */}
      {totalReactions > 0 && (
        <View style={s.reactSummary}>
          <View style={s.reactIcons}>
            {reactionBreakdown.map(([type]) => (
              <Text key={type} style={s.reactSummaryIcon}>{REACTION_ICONS[type]}</Text>
            ))}
          </View>
          <Text style={s.reactCount}>{totalReactions}</Text>
          <Text style={s.reactLabel}>
            {totalReactions === 1 ? 'reação' : 'reações'}
          </Text>
        </View>
      )}

      {/* ── Inline reaction picker ── */}
      {pickerOpen && (
        <InlineReactionPicker
          visible
          current={post.userReaction}
          onSelect={handleReact}
        />
      )}

      {/* ── Action bar ── */}
      <View style={s.actionBar}>
        {/* React */}
        <TouchableOpacity
          style={s.actionBtn}
          onPress={() => setPickerOpen((v) => !v)}
          activeOpacity={0.7}
        >
          {post.userReaction ? (
            <Text style={{ fontSize: 20 }}>{REACTION_ICONS[post.userReaction]}</Text>
          ) : (
            <Ionicons name="heart-outline" size={22} color={colors.textSecondary} />
          )}
          {totalReactions > 0 && (
            <Text style={[s.actionCount, post.userReaction && { color: colors.error }]}>
              {totalReactions}
            </Text>
          )}
        </TouchableOpacity>

        {/* Comment */}
        <TouchableOpacity
          style={s.actionBtn}
          onPress={() => router.push(`/post/${post.id}` as any)}
          activeOpacity={0.7}
        >
          <Ionicons name="chatbubble-outline" size={22} color={colors.textSecondary} />
          {post.commentsCount > 0 && (
            <Text style={s.actionCount}>{post.commentsCount}</Text>
          )}
        </TouchableOpacity>

        {/* Share */}
        <TouchableOpacity
          style={s.actionBtn}
          onPress={() =>
            Share.share({
              message: `${post.content}\n\n— @${post.author.username} no AgroLink`,
            }).catch(() => {})
          }
          activeOpacity={0.7}
        >
          <Ionicons name="share-social-outline" size={22} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Spacer + time on right */}
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={() => router.push(`/post/${post.id}` as any)}>
          <Text style={s.commentsCta}>
            {post.commentsCount > 0
              ? `Ver ${post.commentsCount} comentário${post.commentsCount > 1 ? 's' : ''}`
              : 'Comentar'}
          </Text>
        </TouchableOpacity>
      </View>

      {post.isSponsored && (
        <View style={s.sponsoredBar}>
          <Ionicons name="megaphone-outline" size={12} color={colors.textMuted} />
          <Text style={s.sponsoredText}>Conteúdo patrocinado</Text>
        </View>
      )}
    </View>
  )
}

// ─── Trending tags strip ──────────────────────────────────────────────────────

function TrendingTags({ posts }: { posts: Post[] }) {
  const tags = useMemo(() => {
    const freq: Record<string, number> = {}
    posts.forEach((p) => p.tags?.forEach((t) => { freq[t] = (freq[t] ?? 0) + 1 }))
    return Object.entries(freq).sort(([, a], [, b]) => b - a).slice(0, 8).map(([t]) => t)
  }, [posts])

  if (!tags.length) return null
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={tt.scroll}
      contentContainerStyle={tt.row}
    >
      {tags.map((t) => (
        <TouchableOpacity key={t} style={tt.pill}>
          <Text style={tt.text}>#{t}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  )
}

const tt = StyleSheet.create({
  scroll: { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  row: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.xs },
  pill: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  text: { ...typography.caption, color: colors.primary, fontWeight: '700' },
})

// ─── New Post CTA ─────────────────────────────────────────────────────────────

function NewPostCta() {
  const user = useAuthStore((s) => s.user)
  return (
    <TouchableOpacity
      style={cta.wrap}
      onPress={() => router.push('/post/new' as any)}
      activeOpacity={0.8}
    >
      {user?.avatarUrl ? (
        <Image source={{ uri: user.avatarUrl }} style={cta.avatar} />
      ) : (
        <LinearGradient colors={[colors.primaryLight, colors.primary]} style={[cta.avatar, cta.avatarGrad]}>
          <Text style={cta.avatarInitial}>{user?.name?.[0]?.toUpperCase() ?? '?'}</Text>
        </LinearGradient>
      )}
      <Text style={cta.placeholder}>O que está acontecendo na sua lavoura?</Text>
      <TouchableOpacity
        style={cta.imgBtn}
        onPress={() => router.push('/post/new' as any)}
      >
        <Ionicons name="image-outline" size={20} color={colors.primary} />
      </TouchableOpacity>
    </TouchableOpacity>
  )
}

const cta = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.white,
    marginHorizontal: spacing.md, marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5, borderColor: colors.border,
    ...shadows.sm,
  },
  avatar: { width: 38, height: 38, borderRadius: 19 },
  avatarGrad: { justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { ...typography.label, color: colors.white },
  placeholder: { ...typography.body, color: colors.textMuted, flex: 1 },
  imgBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center', alignItems: 'center',
  },
})

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyFeed() {
  return (
    <View style={empty.wrap}>
      <Text style={empty.icon}>🌱</Text>
      <Text style={empty.title}>Seu feed está vazio</Text>
      <Text style={empty.sub}>
        Siga outros produtores e cooperativas para ver publicações aqui.
      </Text>
      <TouchableOpacity style={empty.btn} onPress={() => router.push('/(tabs)/search' as any)}>
        <Text style={empty.btnText}>Descobrir pessoas</Text>
      </TouchableOpacity>
    </View>
  )
}

const empty = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  icon: { fontSize: 64 },
  title: { ...typography.h3, color: colors.text, textAlign: 'center' },
  sub: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  btn: {
    backgroundColor: colors.primary, borderRadius: borderRadius.full,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.sm,
  },
  btnText: { ...typography.label, color: colors.white },
})

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function FeedScreen() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch, isRefetching } = useFeed()
  const { data: unreadNotifs } = useNotifications(true)
  const user = useAuthStore((s) => s.user)
  const unreadCount = unreadNotifs?.length ?? 0
  const posts = data?.pages.flatMap((p) => p.items) ?? []

  const renderItem = useCallback(({ item }: { item: Post }) => <PostCard post={item} />, [])
  const keyExtractor = useCallback((item: Post) => item.id, [])

  const ListHeader = useMemo(
    () => (
      <>
        <StoriesBar />
        <TrendingTags posts={posts} />
        <NewPostCta />
      </>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [posts.length]
  )

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* ── Header ── */}
      <LinearGradient colors={[colors.primaryDark, colors.primary]} style={s.header}>
        <View>
          <Text style={s.headerLogo}>🌱 AgroLink</Text>
          {user?.name && (
            <Text style={s.headerGreeting}>
              {greeting()}, {user.name.split(' ')[0]}!
            </Text>
          )}
        </View>
        <View style={s.headerIcons}>
          <TouchableOpacity onPress={() => router.push('/(tabs)/search' as any)} hitSlop={8}>
            <Ionicons name="search-outline" size={24} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(tabs)/messages' as any)} hitSlop={8}>
            <Ionicons name="chatbubbles-outline" size={24} color={colors.white} />
          </TouchableOpacity>
          <View>
            <TouchableOpacity onPress={() => router.push('/notifications' as any)} hitSlop={8}>
              <Ionicons name="notifications-outline" size={24} color={colors.white} />
            </TouchableOpacity>
            {unreadCount > 0 && (
              <View style={s.notifDot}>
                <Text style={s.notifDotText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </LinearGradient>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={<EmptyFeed />}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator color={colors.primary} style={{ padding: spacing.lg }} />
            ) : null
          }
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerLogo: { ...typography.h3, color: colors.white, fontWeight: '800' },
  headerGreeting: { ...typography.caption, color: 'rgba(255,255,255,0.75)', marginTop: 1 },
  headerIcons: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  notifDot: {
    position: 'absolute', top: -5, right: -7,
    backgroundColor: colors.secondary,
    minWidth: 17, height: 17, borderRadius: 9,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3,
  },
  notifDotText: { fontSize: 10, fontWeight: '700', color: colors.white },

  listContent: { paddingBottom: spacing.xxl },

  // Post card
  card: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  authorLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarGrad: { justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { ...typography.h4, color: colors.white },
  authorInfo: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  authorName: { ...typography.label, color: colors.text, fontWeight: '700' },
  roleBadge: {
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  roleText: { fontSize: 10, fontWeight: '700', lineHeight: 14 },
  authorSub: { ...typography.caption, color: colors.textMuted },

  // Content
  contentWrap: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  content: { ...typography.body, color: colors.text, lineHeight: 22 },
  seeMore: { ...typography.bodySmall, color: colors.primary, fontWeight: '600', marginTop: 2 },

  // Tags
  tagsScroll: { marginBottom: spacing.xs },
  tagsContainer: { paddingHorizontal: spacing.md, gap: spacing.xs },
  tagPill: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1, borderColor: '#bbf7d0',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 3,
  },
  tagText: { ...typography.caption, color: colors.primary, fontWeight: '700' },

  // Media
  mediaWrap: { position: 'relative' },
  likeFlash: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
  },
  likeFlashIcon: { fontSize: 80, opacity: 0.9 },

  // Reactions summary
  reactSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  reactIcons: { flexDirection: 'row' },
  reactSummaryIcon: { fontSize: 14, marginRight: -2 },
  reactCount: { ...typography.label, color: colors.text },
  reactLabel: { ...typography.caption, color: colors.textMuted },

  // Action bar
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionCount: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '600' },
  commentsCta: { ...typography.caption, color: colors.primary, fontWeight: '600' },

  // Sponsored
  sponsoredBar: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.md, paddingBottom: spacing.sm,
  },
  sponsoredText: { ...typography.caption, color: colors.textMuted },
})
