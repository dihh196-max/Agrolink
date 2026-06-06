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
import { ProfileAbout } from '../../components/ProfileAbout.js'
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
  postsCount: number
  isConnected?: boolean
  isFollowing?: boolean
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
  const isConnected = profile?.isConnected ?? profile?.isFollowing ?? false

  const handleConnect = () => {
    if (!profile) return
    togglePartnership.mutate(
      { userId: profile.id, isPartner: isConnected },
      { onSuccess: () => qc.invalidateQueries({ queryKey: ['profile', username] }) }
    )
  }

  const handleMessage = async () => {
    if (!profile) return
    try {
      const thread = await startConversation.mutateAsync(profile.id)
      router.push(`/chat/${thread.id}` as any)
    } catch {
      Alert.alert('Erro', 'Não foi possível iniciar a conversa.')
    }
  }

  const handleShare = () => {
    if (!profile) return
    Share.share({
      message: `Conheça o perfil de ${profile.name} (@${profile.username}) no AgroLink!`,
      title: 'AgroLink',
    })
  }

  if (isLoading) {
    return (
      <SafeAreaView style={s.container}>
        <ActivityIndicator color={colors.primary} style={{ flex: 1 }} />
      </SafeAreaView>
    )
  }

  if (!profile) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.floatingHeader}>
          <TouchableOpacity style={s.floatingBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={colors.white} />
          </TouchableOpacity>
        </View>
        <View style={s.empty}>
          <Ionicons name="person-outline" size={48} color={colors.textMuted} />
          <Text style={s.emptyText}>Usuário não encontrado</Text>
        </View>
      </SafeAreaView>
    )
  }

  const roleColor = ROLE_COLORS[profile.role] ?? colors.primary
  const p = profile as any

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Floating buttons over cover */}
      <View style={s.floatingHeader}>
        <TouchableOpacity style={s.floatingBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <TouchableOpacity style={s.floatingBtn} onPress={handleShare}>
          <Ionicons name="share-social-outline" size={22} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Cover ── */}
        {p.coverUrl ? (
          <Image source={{ uri: p.coverUrl }} style={s.cover} resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={[colors.primaryDark, colors.primary, colors.primaryLight]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={s.cover}
          >
            <View style={s.coverCircle1} />
            <View style={s.coverCircle2} />
          </LinearGradient>
        )}

        {/* ── Avatar overlap ── */}
        <View style={s.avatarArea}>
          <View style={s.avatarRing}>
            {profile.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} style={s.avatar} />
            ) : (
              <View style={[s.avatar, s.avatarFallback]}>
                <Text style={s.avatarText}>{profile.name[0].toUpperCase()}</Text>
              </View>
            )}
            {profile.verified && (
              <View style={s.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={22} color={colors.info} />
              </View>
            )}
          </View>
        </View>

        {/* ── Identity ── */}
        <View style={s.identity}>
          <View style={s.nameRow}>
            <Text style={s.name}>{profile.name}</Text>
            {profile.premiumUntil && (
              <View style={s.premiumBadge}>
                <Ionicons name="star" size={10} color={colors.white} />
                <Text style={s.premiumText}>Premium</Text>
              </View>
            )}
          </View>
          <Text style={s.username}>@{profile.username}</Text>

          <View style={[s.roleBadge, { borderColor: roleColor }]}>
            <Text style={[s.roleText, { color: roleColor }]}>
              {ROLE_LABELS[profile.role] ?? profile.role}
            </Text>
          </View>

          {/* Communication-first action row */}
          {!isOwnProfile && (
            <View style={s.actionRow}>
              <TouchableOpacity
                style={s.msgBtnPrimary}
                onPress={handleMessage}
                disabled={startConversation.isPending}
              >
                {startConversation.isPending ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <>
                    <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.white} />
                    <Text style={s.msgBtnText}>Enviar mensagem</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.connectBtn, isConnected && s.connectedBtn]}
                onPress={handleConnect}
                disabled={togglePartnership.isPending}
              >
                {togglePartnership.isPending ? (
                  <ActivityIndicator size="small" color={isConnected ? colors.primary : colors.primary} />
                ) : (
                  <Ionicons
                    name={isConnected ? 'checkmark' : 'person-add-outline'}
                    size={18}
                    color={isConnected ? colors.success : colors.primary}
                  />
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── Sobre / Contato ── */}
        <ProfileAbout user={p} showContact />

        {/* ── Tabs ── */}
        <View style={s.tabs}>
          <TouchableOpacity
            style={[s.tab, tab === 'posts' && s.tabActive]}
            onPress={() => setTab('posts')}
          >
            <Ionicons name={tab === 'posts' ? 'grid' : 'grid-outline'} size={18}
              color={tab === 'posts' ? colors.primary : colors.textMuted} />
            <Text style={[s.tabText, tab === 'posts' && s.tabTextActive]}>
              Publicações{profile.postsCount > 0 ? ` · ${profile.postsCount}` : ''}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tab, tab === 'farms' && s.tabActive]}
            onPress={() => setTab('farms')}
          >
            <Ionicons name={tab === 'farms' ? 'leaf' : 'leaf-outline'} size={18}
              color={tab === 'farms' ? colors.primary : colors.textMuted} />
            <Text style={[s.tabText, tab === 'farms' && s.tabTextActive]}>
              Fazendas{p.farms?.length ? ` · ${p.farms.length}` : ''}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Posts grid ── */}
        {tab === 'posts' && (
          <View style={s.postsGrid}>
            {userPosts.length === 0 ? (
              <View style={s.emptyTab}>
                <Ionicons name="images-outline" size={40} color={colors.textMuted} />
                <Text style={s.emptyTabText}>Nenhuma publicação ainda</Text>
              </View>
            ) : (
              <View style={s.gridWrap}>
                {userPosts.map((post) => (
                  <TouchableOpacity
                    key={post.id}
                    style={s.postThumb}
                    onPress={() => router.push(`/post/${post.id}` as any)}
                    activeOpacity={0.8}
                  >
                    {post.media?.[0]?.url ? (
                      <Image source={{ uri: post.media[0].url }} style={s.thumbImg} resizeMode="cover" />
                    ) : (
                      <View style={s.thumbText}>
                        <Text style={s.thumbTextContent} numberOfLines={4}>{post.content}</Text>
                      </View>
                    )}
                    {Object.values(post.reactionsCount ?? {}).reduce((a, v) => a + (v as number), 0) > 0 && (
                      <View style={s.thumbBadge}>
                        <Ionicons name="heart" size={9} color={colors.white} />
                        <Text style={s.thumbBadgeText}>
                          {Object.values(post.reactionsCount ?? {}).reduce((a, v) => a + (v as number), 0)}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ── Farms list ── */}
        {tab === 'farms' && (
          <View style={s.farmsList}>
            {!p.farms?.length ? (
              <View style={s.emptyTab}>
                <Ionicons name="leaf-outline" size={40} color={colors.textMuted} />
                <Text style={s.emptyTabText}>Nenhuma fazenda cadastrada</Text>
              </View>
            ) : (
              p.farms.map((farm: Farm) => (
                <View key={farm.id} style={s.farmCard}>
                  <View style={s.farmIcon}>
                    <Text style={{ fontSize: 28 }}>🌾</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.farmName}>{farm.name}</Text>
                    <Text style={s.farmMeta}>{farm.city}/{farm.state}</Text>
                  </View>
                  <View style={s.farmAreaBadge}>
                    <Text style={s.farmAreaText}>{farm.areaHectares.toLocaleString('pt-BR')} ha</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  floatingHeader: {
    position: 'absolute', top: 48, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, zIndex: 10,
  },
  floatingBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center',
  },

  cover: { width: '100%', height: 170, overflow: 'hidden' },
  coverCircle1: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.07)', top: -70, right: -50,
  },
  coverCircle2: {
    position: 'absolute', width: 150, height: 150, borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.07)', bottom: -40, left: 50,
  },

  avatarArea: { paddingHorizontal: spacing.lg, marginTop: -52, marginBottom: spacing.sm },
  avatarRing: {
    width: 104, height: 104, borderRadius: 52,
    borderWidth: 4, borderColor: colors.white,
    backgroundColor: colors.white,
    ...shadows.md,
    position: 'relative',
  },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  avatarFallback: { backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 38, fontWeight: '700', color: colors.white },
  verifiedBadge: {
    position: 'absolute', right: 2, bottom: 2,
    backgroundColor: colors.white, borderRadius: 12, padding: 1,
  },

  identity: { paddingHorizontal: spacing.lg },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  name: { ...typography.h2, color: colors.text },
  premiumBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.sm, paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  premiumText: { ...typography.caption, color: colors.white, fontWeight: '700' },
  username: { ...typography.body, color: colors.textSecondary, marginTop: 2 },
  roleBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    paddingHorizontal: spacing.sm, paddingVertical: 3,
    borderRadius: borderRadius.full,
    marginTop: spacing.sm,
    backgroundColor: colors.white,
  },
  roleText: { ...typography.label, fontWeight: '700' },

  // Action row (message primary, connect secondary)
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  msgBtnPrimary: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm + 2,
    ...shadows.sm,
  },
  msgBtnText: { ...typography.label, color: colors.white, fontWeight: '700' },
  connectBtn: {
    width: 48,
    borderWidth: 1.5, borderColor: colors.primary,
    borderRadius: borderRadius.md,
    backgroundColor: colors.white,
    justifyContent: 'center', alignItems: 'center',
  },
  connectedBtn: { borderColor: colors.success, backgroundColor: '#dcfce7' },

  tabs: {
    flexDirection: 'row',
    borderTopWidth: 1, borderTopColor: colors.border,
    marginTop: spacing.md,
    backgroundColor: colors.white,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, paddingVertical: spacing.sm + 2,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: colors.primary },
  tabText: { ...typography.label, color: colors.textMuted },
  tabTextActive: { color: colors.primary, fontWeight: '700' },

  postsGrid: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  gridWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  postThumb: {
    width: POST_THUMB, height: POST_THUMB,
    borderRadius: borderRadius.md, overflow: 'hidden',
    position: 'relative',
    backgroundColor: colors.surfaceSecondary,
  },
  thumbImg: { width: '100%', height: '100%' },
  thumbText: {
    width: '100%', height: '100%',
    padding: spacing.xs,
    backgroundColor: colors.primaryDark,
    justifyContent: 'center',
  },
  thumbTextContent: { ...typography.caption, color: colors.white, lineHeight: 14 },
  thumbBadge: {
    position: 'absolute', bottom: 4, right: 4,
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8,
    paddingHorizontal: 4, paddingVertical: 2,
  },
  thumbBadgeText: { ...typography.caption, color: colors.white, fontSize: 9 },

  farmsList: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, gap: spacing.sm },
  farmCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.white, borderRadius: borderRadius.lg,
    padding: spacing.md, ...shadows.sm,
  },
  farmIcon: {
    width: 52, height: 52, borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center', alignItems: 'center',
  },
  farmName: { ...typography.h4, color: colors.text, fontWeight: '700' },
  farmMeta: { ...typography.bodySmall, color: colors.textMuted, marginTop: 2 },
  farmAreaBadge: {
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: spacing.sm, paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1, borderColor: colors.border,
  },
  farmAreaText: { ...typography.caption, color: colors.primary, fontWeight: '700' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  emptyText: { ...typography.body, color: colors.textMuted },
  emptyTab: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  emptyTabText: { ...typography.body, color: colors.textMuted },
})
