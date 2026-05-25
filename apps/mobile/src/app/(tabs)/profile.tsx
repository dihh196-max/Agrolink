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

function StatItem({ value, label }: { value: string | number; label: string }) {
  return (
    <View style={s.stat}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  )
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

  const farms: any[] = profile?.farms ?? []
  const roleColor = ROLE_COLORS[user.role] ?? colors.primary

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Meu Perfil</Text>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <TouchableOpacity onPress={() => router.push('/notifications')}>
            <Ionicons name="notifications-outline" size={24} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Cover + avatar */}
        <View style={s.coverWrap}>
          <LinearGradient
            colors={[colors.primaryDark, colors.primary, colors.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.cover}
          />
          <View style={s.avatarWrap}>
            {user.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={s.avatar} />
            ) : (
              <LinearGradient colors={[colors.primaryDark, colors.primaryLight]} style={s.avatar}>
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
            onPress={() => router.push('/edit-profile')}
          >
            <Ionicons name="pencil" size={16} color={colors.white} />
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={s.info}>
          <View style={s.nameRow}>
            <View>
              <Text style={s.name}>{user.name}</Text>
              <Text style={s.username}>@{user.username}</Text>
            </View>
            <View style={[s.roleBadge, { backgroundColor: roleColor + '15', borderColor: roleColor + '40' }]}>
              <Text style={[s.roleText, { color: roleColor }]}>
                {ROLE_LABELS[user.role]}
              </Text>
            </View>
          </View>

          {(user as any).bio ? (
            <Text style={s.bio}>{(user as any).bio}</Text>
          ) : null}

          {/* Social stats */}
          {profileLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />
          ) : (
            <View style={s.statsCard}>
              <StatItem value={profile?.postsCount ?? 0} label="Publicações" />
              <View style={s.statDiv} />
              <StatItem value={profile?.followersCount ?? 0} label="Seguidores" />
              <View style={s.statDiv} />
              <StatItem value={profile?.followingCount ?? 0} label="Seguindo" />
            </View>
          )}

          {/* Quick actions */}
          <View style={s.actionsRow}>
            <TouchableOpacity style={s.actionBtn} onPress={() => router.push('/edit-profile')}>
              <Ionicons name="pencil-outline" size={18} color={colors.primary} />
              <Text style={s.actionTxt}>Editar perfil</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.actionBtn} onPress={() => router.push('/settings')}>
              <Ionicons name="settings-outline" size={18} color={colors.textSecondary} />
              <Text style={[s.actionTxt, { color: colors.textSecondary }]}>Configurações</Text>
            </TouchableOpacity>
          </View>

          {/* Tabs */}
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
                  {t === 'posts' ? 'Publicações' : 'Fazendas'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Posts grid */}
          {tab === 'posts' && (
            postsLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
            ) : (posts?.length ?? 0) === 0 ? (
              <View style={s.empty}>
                <Ionicons name="camera-outline" size={48} color={colors.border} />
                <Text style={s.emptyTxt}>Nenhuma publicação ainda</Text>
                <TouchableOpacity style={s.emptyBtn} onPress={() => router.push('/post/new')}>
                  <Text style={s.emptyBtnTxt}>Criar publicação</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={s.grid}>
                {posts!.map((post: any) => {
                  const img = post.images?.[0]
                  return (
                    <TouchableOpacity
                      key={post.id}
                      style={s.gridCell}
                      onPress={() => router.push(`/post/${post.id}`)}
                    >
                      {img ? (
                        <Image source={{ uri: img }} style={s.gridImg} />
                      ) : (
                        <View style={[s.gridImg, s.gridTextCell]}>
                          <Text style={s.gridText} numberOfLines={4}>{post.content}</Text>
                        </View>
                      )}
                      {post.reactionsCount > 0 && (
                        <View style={s.gridBadge}>
                          <Text style={s.gridBadgeTxt}>❤️ {post.reactionsCount}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  )
                })}
              </View>
            )
          )}

          {/* Farms list */}
          {tab === 'farms' && (
            farms.length === 0 ? (
              <View style={s.empty}>
                <Ionicons name="leaf-outline" size={48} color={colors.border} />
                <Text style={s.emptyTxt}>Nenhuma fazenda cadastrada</Text>
                <TouchableOpacity
                  style={s.emptyBtn}
                  onPress={() => Alert.alert('Cadastrar fazenda', 'Acesse Configurações → Minha Fazenda em breve!')}
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
                        {farm.city}/{farm.state} · {farm.areaHectares.toLocaleString('pt-BR')} ha
                      </Text>
                    </View>
                    <View style={s.farmAreaBadge}>
                      <Text style={s.farmAreaTxt}>{farm.areaHectares} ha</Text>
                    </View>
                  </View>
                ))}
              </View>
            )
          )}

          {/* Premium banner */}
          {!user.premiumUntil && (
            <TouchableOpacity
              style={s.premiumBanner}
              onPress={() => Alert.alert('AgroLink Premium', 'Funcionalidade em breve!')}
            >
              <LinearGradient
                colors={[colors.secondary, '#f59e0b']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
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
        </View>
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
  coverWrap: { height: 130, position: 'relative', marginBottom: 52 },
  cover: { height: 130 },
  avatarWrap: { position: 'absolute', bottom: -44, left: spacing.lg },
  avatar: { width: 88, height: 88, borderRadius: 44, borderWidth: 4, borderColor: colors.white, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 36, fontWeight: '700', color: colors.white },
  verifiedBadge: {
    position: 'absolute', right: -2, bottom: -2,
    backgroundColor: colors.white, borderRadius: 12, width: 24, height: 24,
    justifyContent: 'center', alignItems: 'center',
  },
  editCoverBtn: {
    position: 'absolute', top: spacing.sm, right: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.35)', width: 32, height: 32,
    borderRadius: 16, justifyContent: 'center', alignItems: 'center',
  },
  info: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  name: { ...typography.h3, color: colors.text },
  username: { ...typography.body, color: colors.textSecondary },
  roleBadge: {
    borderWidth: 1, paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderRadius: borderRadius.full, marginTop: 2,
  },
  roleText: { ...typography.caption, fontWeight: '700' },
  bio: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.md, lineHeight: 22 },
  statsCard: {
    flexDirection: 'row', backgroundColor: colors.white,
    borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.md, ...shadows.sm,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { ...typography.h3, color: colors.text },
  statLabel: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  statDiv: { width: 1, backgroundColor: colors.border },
  actionsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: borderRadius.md, paddingVertical: spacing.sm, backgroundColor: colors.white,
  },
  actionTxt: { ...typography.label, color: colors.primary },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: spacing.md },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.sm },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabTxt: { ...typography.label, color: colors.textMuted },
  tabTxtActive: { color: colors.primary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 1 },
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
  farmsList: { gap: spacing.sm },
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
  farmName: { ...typography.label, color: colors.text },
  farmMeta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  farmAreaBadge: { backgroundColor: colors.primary + '15', paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: borderRadius.full },
  farmAreaTxt: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.md },
  emptyTxt: { ...typography.body, color: colors.textMuted },
  emptyBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.full },
  emptyBtnTxt: { ...typography.label, color: colors.white },
  premiumBanner: { marginTop: spacing.xl, borderRadius: borderRadius.lg, overflow: 'hidden' },
  premiumGrad: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.sm },
  premiumIcon: { fontSize: 28 },
  premiumTitle: { ...typography.label, color: colors.primaryDark },
  premiumSub: { ...typography.caption, color: colors.primaryDark + 'cc' },
})
