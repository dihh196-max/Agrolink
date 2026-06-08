import { useState } from 'react'
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { api } from '../../lib/api.js'
import { useAuthStore } from '../../store/auth.js'
import { ProfileAbout } from '../../components/ProfileAbout.js'
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme.js'

const { width } = Dimensions.get('window')
const CELL = (width - spacing.md * 2 - 2) / 3

const ROLE_LABELS: Record<string, string> = {
  producer: 'Produtor Rural',
  supplier: 'Fornecedor',
  technician: 'Técnico / Consultor',
  cooperative: 'Cooperativa',
}

const ROLE_COLORS: Record<string, string> = {
  producer: colors.primary,
  supplier: colors.warning,
  technician: colors.info,
  cooperative: '#7c3aed',
}

export default function ProfileScreen() {
  const { user, logout } = useAuthStore()
  const [tab, setTab] = useState<'posts' | 'farms'>('posts')

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', user?.username],
    queryFn: () => api.get(`/users/${user!.username}`).then((r) => r.data),
    enabled: !!user?.username,
  })

  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ['user-posts', user?.username],
    queryFn: () => api.get(`/users/${user!.username}/posts`).then((r) => r.data),
    enabled: !!user?.username,
  })

  const handleLogout = () => {
    Alert.alert('Sair', 'Deseja sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: logout },
    ])
  }

  if (!user) return null

  const u = user as any
  const farms: any[] = profile?.farms ?? []
  const roleColor = ROLE_COLORS[user.role] ?? colors.primary

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Meu Perfil</Text>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <TouchableOpacity onPress={() => router.push('/notifications' as any)}>
            <Ionicons name="notifications-outline" size={24} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/settings' as any)}>
            <Ionicons name="settings-outline" size={24} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Cover + avatar ── */}
        <View style={s.coverWrap}>
          {u.coverUrl ? (
            <Image source={{ uri: u.coverUrl }} style={s.cover} resizeMode="cover" />
          ) : (
            <LinearGradient
              colors={[colors.primaryDark, colors.primary, colors.primaryLight]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={s.cover}
            />
          )}
          <View style={s.avatarWrap}>
            {user.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={s.avatar} />
            ) : (
              <LinearGradient colors={[colors.primaryDark, colors.primaryLight]} style={[s.avatar, s.avatarFallback]}>
                <Text style={s.avatarText}>{user.name[0].toUpperCase()}</Text>
              </LinearGradient>
            )}
            {user.verified && (
              <View style={s.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
              </View>
            )}
          </View>
          <TouchableOpacity
            style={s.editCoverBtn}
            onPress={() => router.push('/edit-profile' as any)}
          >
            <Ionicons name="pencil" size={14} color={colors.white} />
            <Text style={s.editCoverText}>Editar perfil</Text>
          </TouchableOpacity>
        </View>

        {/* ── Identity ── */}
        <View style={s.identity}>
          <View style={s.nameRow}>
            <Text style={s.name}>{user.name}</Text>
            {user.premiumUntil && (
              <View style={s.premiumBadge}>
                <Ionicons name="star" size={10} color={colors.white} />
                <Text style={s.premiumText}>Premium</Text>
              </View>
            )}
          </View>
          <Text style={s.username}>@{user.username}</Text>

          <View style={[s.roleBadge, { backgroundColor: roleColor + '15', borderColor: roleColor + '40' }]}>
            <Text style={[s.roleText, { color: roleColor }]}>{ROLE_LABELS[user.role]}</Text>
          </View>

          {/* Quick actions */}
          <View style={s.actionsRow}>
            <TouchableOpacity
              style={[s.actionBtn, s.actionPrimary]}
              onPress={() => router.push('/edit-profile' as any)}
            >
              <Ionicons name="pencil-outline" size={18} color={colors.white} />
              <Text style={s.actionPrimaryTxt}>Editar perfil</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.actionBtn}
              onPress={() => router.push('/post/new' as any)}
            >
              <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
              <Text style={s.actionTxt}>Publicar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Sobre / Contato ── */}
        {profileLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />
        ) : (
          <ProfileAbout user={{ ...user, ...(profile ?? {}) } as any} showContact />
        )}

        {/* ── Tabs ── */}
        <View style={s.tabs}>
          {(['posts', 'farms'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[s.tab, tab === t && s.tabActive]}
              onPress={() => setTab(t)}
            >
              <Ionicons
                name={t === 'posts' ? 'grid-outline' : 'leaf-outline'}
                size={18}
                color={tab === t ? colors.primary : colors.textMuted}
              />
              <Text style={[s.tabTxt, tab === t && s.tabTxtActive]}>
                {t === 'posts'
                  ? `Publicações${profile?.postsCount ? ` · ${profile.postsCount}` : ''}`
                  : `Fazendas${farms.length ? ` · ${farms.length}` : ''}`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Posts grid ── */}
        {tab === 'posts' && (
          postsLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
          ) : (posts?.length ?? 0) === 0 ? (
            <View style={s.empty}>
              <Ionicons name="camera-outline" size={48} color={colors.border} />
              <Text style={s.emptyTxt}>Compartilhe sua primeira publicação</Text>
              <TouchableOpacity style={s.emptyBtn} onPress={() => router.push('/post/new' as any)}>
                <Text style={s.emptyBtnTxt}>Criar publicação</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.grid}>
              {posts!.map((post: any) => {
                const img = post.media?.[0]?.url ?? post.images?.[0]
                const total = Object.values(post.reactionsCount ?? {}).reduce(
                  (a: number, v: any) => a + (typeof v === 'number' ? v : 0), 0
                ) as number
                return (
                  <TouchableOpacity
                    key={post.id}
                    style={s.gridCell}
                    onPress={() => router.push(`/post/${post.id}` as any)}
                  >
                    {img ? (
                      <Image source={{ uri: img }} style={s.gridImg} />
                    ) : (
                      <View style={[s.gridImg, s.gridTextCell]}>
                        <Text style={s.gridText} numberOfLines={4}>{post.content}</Text>
                      </View>
                    )}
                    {total > 0 && (
                      <View style={s.gridBadge}>
                        <Text style={s.gridBadgeTxt}>❤️ {total}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )
              })}
            </View>
          )
        )}

        {/* ── Farms list ── */}
        {tab === 'farms' && (
          farms.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="leaf-outline" size={48} color={colors.border} />
              <Text style={s.emptyTxt}>Nenhuma fazenda cadastrada</Text>
              <TouchableOpacity
                style={s.emptyBtn}
                onPress={() => Alert.alert('Cadastrar fazenda', 'Em breve!')}
              >
                <Text style={s.emptyBtnTxt}>Adicionar fazenda</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.farmsList}>
              {farms.map((farm: any) => (
                <View key={farm.id} style={s.farmCard}>
                  <View style={s.farmIconWrap}>
                    <Ionicons name="leaf" size={22} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.farmName}>{farm.name}</Text>
                    <Text style={s.farmMeta}>
                      {farm.city}/{farm.state}
                    </Text>
                  </View>
                  <View style={s.farmAreaBadge}>
                    <Text style={s.farmAreaTxt}>{farm.areaHectares.toLocaleString('pt-BR')} ha</Text>
                  </View>
                </View>
              ))}
            </View>
          )
        )}

        {/* ── Premium banner ── */}
        {!user.premiumUntil && (
          <TouchableOpacity
            style={s.premiumBanner}
            onPress={() => Alert.alert('AgroLink Premium', 'Em breve!')}
          >
            <LinearGradient
              colors={[colors.secondary, '#f59e0b']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={s.premiumGrad}
            >
              <Text style={s.premiumIcon}>⭐</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.premiumTitle}>Assine o Premium</Text>
                <Text style={s.premiumSub}>Alertas de preço, IA ilimitada e mais</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.primaryDark} />
            </LinearGradient>
          </TouchableOpacity>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerTitle: { ...typography.h3, color: colors.white },

  coverWrap: { height: 160, position: 'relative', marginBottom: 56 },
  cover: { width: '100%', height: 160 },
  avatarWrap: { position: 'absolute', bottom: -48, left: spacing.lg },
  avatar: {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 4, borderColor: colors.white,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarFallback: { justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 36, fontWeight: '700', color: colors.white },
  verifiedBadge: {
    position: 'absolute', right: -2, bottom: -2,
    backgroundColor: colors.white, borderRadius: 12, width: 24, height: 24,
    justifyContent: 'center', alignItems: 'center',
  },
  editCoverBtn: {
    position: 'absolute', bottom: spacing.sm, right: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.55)',
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.sm, paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  editCoverText: { ...typography.caption, color: colors.white, fontWeight: '700' },

  identity: { paddingHorizontal: spacing.lg, paddingTop: 0 },
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
    borderWidth: 1,
    paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderRadius: borderRadius.full,
    marginTop: spacing.sm,
  },
  roleText: { ...typography.caption, fontWeight: '700' },

  actionsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, borderWidth: 1.5, borderColor: colors.primary,
    borderRadius: borderRadius.md, paddingVertical: spacing.sm,
    backgroundColor: colors.white,
  },
  actionPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  actionTxt: { ...typography.label, color: colors.primary, fontWeight: '700' },
  actionPrimaryTxt: { ...typography.label, color: colors.white, fontWeight: '700' },

  tabs: {
    flexDirection: 'row',
    borderTopWidth: 1, borderTopColor: colors.border,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.white,
    marginTop: spacing.md,
  },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.sm + 2 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabTxt: { ...typography.label, color: colors.textMuted },
  tabTxtActive: { color: colors.primary, fontWeight: '700' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 1, paddingHorizontal: spacing.md, paddingTop: spacing.xs },
  gridCell: { width: CELL, height: CELL, position: 'relative' },
  gridImg: { width: '100%', height: '100%', borderRadius: 2 },
  gridTextCell: { backgroundColor: colors.surfaceSecondary, justifyContent: 'center', padding: 6 },
  gridText: { ...typography.caption, color: colors.textSecondary },
  gridBadge: {
    position: 'absolute', bottom: 4, left: 4,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  gridBadgeTxt: { fontSize: 10, color: colors.white },

  farmsList: { gap: spacing.sm, paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  farmCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.white, borderRadius: borderRadius.md,
    padding: spacing.md, ...shadows.sm,
  },
  farmIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center', alignItems: 'center',
  },
  farmName: { ...typography.label, color: colors.text, fontWeight: '700' },
  farmMeta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  farmAreaBadge: { backgroundColor: colors.primary + '15', paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: borderRadius.full },
  farmAreaTxt: { ...typography.caption, color: colors.primary, fontWeight: '700' },

  empty: { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.md },
  emptyTxt: { ...typography.body, color: colors.textMuted },
  emptyBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.full },
  emptyBtnTxt: { ...typography.label, color: colors.white, fontWeight: '700' },

  premiumBanner: {
    marginTop: spacing.lg,
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.lg, overflow: 'hidden',
  },
  premiumGrad: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.sm },
  premiumIcon: { fontSize: 28 },
  premiumTitle: { ...typography.label, color: colors.primaryDark, fontWeight: '700' },
  premiumSub: { ...typography.caption, color: colors.primaryDark + 'cc' },
})
