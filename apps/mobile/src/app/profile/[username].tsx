import { useState } from 'react'
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
  Share,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api.js'
import { useAuthStore } from '../../store/auth.js'
import { useTogglePartnership, useStartConversation } from '../../hooks/useSocial.js'
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme.js'
import type { User, Post, Farm } from '@agrolink/types'

const { width: SCREEN_W } = Dimensions.get('window')
const POST_THUMB = (SCREEN_W - spacing.md * 2 - spacing.xs * 2) / 3

const ROLE_LABELS: Record<string, string> = {
  producer: 'Produtor Rural',
  supplier: 'Fornecedor',
  technician: 'Técnico / Consultor',
  cooperative: 'Cooperativa',
}

const ROLE_COLORS: Record<string, string> = {
  producer: colors.soja,
  supplier: colors.secondary,
  technician: colors.info,
  cooperative: colors.primary,
}

type ProfileData = User & {
  farms?: Farm[]
  followersCount: number
  followingCount: number
  postsCount: number
  isFollowing: boolean
}

function StatItem({ value, label }: { value: number; label: string }) {
  const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n))
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{fmt(value)}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

export default function PublicProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>()
  const currentUser = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const [tab, setTab] = useState<'posts' | 'farms'>('posts')

  const { data: profile, isLoading } = useQuery<ProfileData>({
    queryKey: ['profile', username],
    queryFn: () => api.get(`/users/${username}`).then((r) => r.data),
    enabled: !!username,
  })

  const { data: userPosts = [] } = useQuery<Post[]>({
    queryKey: ['profile-posts', username],
    queryFn: () => api.get(`/users/${username}/posts`).then((r) => r.data),
    enabled: !!username,
  })

  const togglePartnership = useTogglePartnership()
  const startConversation = useStartConversation()

  const isOwnProfile = currentUser?.username === username

  const handleFollow = () => {
    if (!profile) return
    togglePartnership.mutate(
      { userId: profile.id, isPartner: profile.isFollowing },
      { onSuccess: () => qc.invalidateQueries({ queryKey: ['profile', username] }) }
    )
  }

  const handleMessage = async () => {
    if (!profile) return
    try {
      const thread = await startConversation.mutateAsync(profile.id)
      router.push(`/chat/${thread.id}`)
    } catch {
      Alert.alert('Erro', 'Não foi possível iniciar a conversa.')
    }
  }

  const handleShare = () => {
    if (!profile) return
    Share.share({
      message: `Confira o perfil de ${profile.name} (@${profile.username}) no AgroLink!\n${ROLE_LABELS[profile.role] ?? profile.role}`,
      title: 'AgroLink',
    })
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={colors.primary} style={{ flex: 1 }} />
      </SafeAreaView>
    )
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.floatingHeader}>
          <TouchableOpacity style={styles.floatingBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={colors.white} />
          </TouchableOpacity>
        </View>
        <View style={styles.empty}>
          <Ionicons name="person-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyText}>Usuário não encontrado</Text>
        </View>
      </SafeAreaView>
    )
  }

  const roleColor = ROLE_COLORS[profile.role] ?? colors.primary

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Floating buttons over cover */}
      <View style={styles.floatingHeader}>
        <TouchableOpacity style={styles.floatingBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.floatingBtn} onPress={handleShare}>
          <Ionicons name="share-social-outline" size={22} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Cover gradient */}
        <LinearGradient
          colors={[colors.primaryDark, colors.primary, colors.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cover}
        >
          <View style={styles.coverCircle1} />
          <View style={styles.coverCircle2} />
        </LinearGradient>

        {/* Avatar row */}
        <View style={styles.avatarArea}>
          <View style={styles.avatarRing}>
            {profile.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarText}>{profile.name[0].toUpperCase()}</Text>
              </View>
            )}
            {profile.verified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={22} color={colors.info} />
              </View>
            )}
          </View>

          {!isOwnProfile && (
            <View style={styles.actionBtns}>
              <TouchableOpacity
                style={[styles.followBtn, profile.isFollowing && styles.followingBtn]}
                onPress={handleFollow}
                disabled={togglePartnership.isPending}
              >
                {togglePartnership.isPending ? (
                  <ActivityIndicator size="small" color={profile.isFollowing ? colors.primary : colors.white} />
                ) : (
                  <>
                    <Ionicons
                      name={profile.isFollowing ? 'person-remove-outline' : 'person-add-outline'}
                      size={15}
                      color={profile.isFollowing ? colors.primary : colors.white}
                    />
                    <Text style={[styles.followBtnText, profile.isFollowing && styles.followingBtnText]}>
                      {profile.isFollowing ? 'Seguindo' : 'Seguir'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.msgBtn}
                onPress={handleMessage}
                disabled={startConversation.isPending}
              >
                {startConversation.isPending
                  ? <ActivityIndicator size="small" color={colors.primary} />
                  : <Ionicons name="chatbubble-outline" size={18} color={colors.primary} />
                }
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Identity */}
        <View style={styles.identity}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{profile.name}</Text>
            {profile.premiumUntil && (
              <View style={styles.premiumBadge}>
                <Ionicons name="star" size={10} color={colors.white} />
                <Text style={styles.premiumText}>Premium</Text>
              </View>
            )}
          </View>
          <Text style={styles.username}>@{profile.username}</Text>

          <View style={[styles.roleBadge, { borderColor: roleColor }]}>
            <Text style={[styles.roleText, { color: roleColor }]}>{ROLE_LABELS[profile.role] ?? profile.role}</Text>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <StatItem value={profile.postsCount} label="Publicações" />
            <View style={styles.statDivider} />
            <StatItem value={profile.followersCount} label="Seguidores" />
            <View style={styles.statDivider} />
            <StatItem value={profile.followingCount} label="Seguindo" />
          </View>

          {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

          {(profile as any).farms?.length > 0 && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color={colors.textMuted} />
              <Text style={styles.locationText}>
                {(profile as any).farms[0].city}/{(profile as any).farms[0].state}
              </Text>
            </View>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, tab === 'posts' && styles.tabActive]}
            onPress={() => setTab('posts')}
          >
            <Ionicons name={tab === 'posts' ? 'grid' : 'grid-outline'} size={18}
              color={tab === 'posts' ? colors.primary : colors.textMuted} />
            <Text style={[styles.tabText, tab === 'posts' && styles.tabTextActive]}>Publicações</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'farms' && styles.tabActive]}
            onPress={() => setTab('farms')}
          >
            <Ionicons name={tab === 'farms' ? 'leaf' : 'leaf-outline'} size={18}
              color={tab === 'farms' ? colors.primary : colors.textMuted} />
            <Text style={[styles.tabText, tab === 'farms' && styles.tabTextActive]}>Fazendas</Text>
          </TouchableOpacity>
        </View>

        {/* Posts grid */}
        {tab === 'posts' && (
          <View style={styles.postsGrid}>
            {userPosts.length === 0 ? (
              <View style={styles.emptyTab}>
                <Ionicons name="images-outline" size={40} color={colors.textMuted} />
                <Text style={styles.emptyTabText}>Nenhuma publicação ainda</Text>
              </View>
            ) : (
              <View style={styles.gridWrap}>
                {userPosts.map((post) => (
                  <TouchableOpacity
                    key={post.id}
                    style={styles.postThumb}
                    onPress={() => router.push(`/post/${post.id}`)}
                    activeOpacity={0.8}
                  >
                    {post.media?.[0]?.url ? (
                      <Image source={{ uri: post.media[0].url }} style={styles.thumbImg} resizeMode="cover" />
                    ) : (
                      <View style={styles.thumbText}>
                        <Text style={styles.thumbTextContent} numberOfLines={4}>{post.content}</Text>
                      </View>
                    )}
                    <View style={styles.thumbBadge}>
                      <Ionicons name="heart" size={9} color={colors.white} />
                      <Text style={styles.thumbBadgeText}>
                        {Object.values(post.reactionsCount ?? {}).reduce((a, v) => a + (v as number), 0)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Farms list */}
        {tab === 'farms' && (
          <View style={styles.farmsList}>
            {!(profile as any).farms?.length ? (
              <View style={styles.emptyTab}>
                <Ionicons name="leaf-outline" size={40} color={colors.textMuted} />
                <Text style={styles.emptyTabText}>Nenhuma fazenda cadastrada</Text>
              </View>
            ) : (
              (profile as any).farms.map((farm: Farm) => (
                <View key={farm.id} style={styles.farmCard}>
                  <View style={styles.farmIcon}>
                    <Text style={{ fontSize: 28 }}>🌾</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.farmName}>{farm.name}</Text>
                    <Text style={styles.farmMeta}>
                      {farm.city}/{farm.state} · {farm.areaHectares.toLocaleString('pt-BR')} ha
                    </Text>
                  </View>
                  <View style={styles.farmAreaBadge}>
                    <Text style={styles.farmAreaText}>{farm.areaHectares.toLocaleString('pt-BR')} ha</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  floatingHeader: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    zIndex: 10,
  },
  floatingBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cover: { height: 160, overflow: 'hidden' },
  coverCircle1: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.07)',
    top: -70,
    right: -50,
  },
  coverCircle2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.07)',
    bottom: -40,
    left: 50,
  },
  avatarArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginTop: -52,
    marginBottom: spacing.sm,
  },
  avatarRing: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 4,
    borderColor: colors.white,
    backgroundColor: colors.white,
    ...shadows.md,
    position: 'relative',
  },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  avatarFallback: { backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 38, fontWeight: '700', color: colors.white },
  verifiedBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 1,
  },
  actionBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    ...shadows.sm,
  },
  followingBtn: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  followBtnText: { ...typography.label, color: colors.white },
  followingBtnText: { color: colors.primary },
  msgBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  identity: { paddingHorizontal: spacing.lg },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  name: { ...typography.h2, color: colors.text },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  premiumText: { ...typography.caption, color: colors.white, fontWeight: '700' },
  username: { ...typography.body, color: colors.textSecondary, marginTop: 2 },
  roleBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    marginTop: spacing.sm,
    backgroundColor: colors.white,
  },
  roleText: { ...typography.label },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { ...typography.h3, color: colors.text },
  statLabel: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: colors.border },
  bio: { ...typography.body, color: colors.text, lineHeight: 22, marginBottom: spacing.sm },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  locationText: { ...typography.bodySmall, color: colors.textMuted },
  tabs: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.sm,
    backgroundColor: colors.white,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: colors.primary },
  tabText: { ...typography.label, color: colors.textMuted },
  tabTextActive: { color: colors.primary },
  postsGrid: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  gridWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  postThumb: {
    width: POST_THUMB,
    height: POST_THUMB,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: colors.surfaceSecondary,
  },
  thumbImg: { width: '100%', height: '100%' },
  thumbText: {
    width: '100%',
    height: '100%',
    padding: spacing.xs,
    backgroundColor: colors.primaryDark,
    justifyContent: 'center',
  },
  thumbTextContent: { ...typography.caption, color: colors.white, lineHeight: 14 },
  thumbBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  thumbBadgeText: { ...typography.caption, color: colors.white, fontSize: 9 },
  farmsList: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm,
    flexDirection: 'column',
  },
  farmCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
    marginBottom: spacing.sm,
  },
  farmIcon: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  farmName: { ...typography.h4, color: colors.text },
  farmMeta: { ...typography.bodySmall, color: colors.textMuted, marginTop: 2 },
  farmAreaBadge: {
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  farmAreaText: { ...typography.caption, color: colors.primary, fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  emptyText: { ...typography.body, color: colors.textMuted },
  emptyTab: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  emptyTabText: { ...typography.body, color: colors.textMuted },
})
