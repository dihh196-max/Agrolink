import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api.js'
import { useAuthStore } from '../../store/auth.js'
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme.js'
import type { User } from '@agrolink/types'

const ROLE_LABELS: Record<string, string> = {
  producer: 'Produtor Rural',
  supplier: 'Fornecedor',
  technician: 'Técnico / Consultor',
  cooperative: 'Cooperativa',
}

export default function PublicProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>()
  const currentUser = useAuthStore((s) => s.user)
  const qc = useQueryClient()

  const { data: profile, isLoading } = useQuery<User & { isFollowing?: boolean }>({
    queryKey: ['profile', username],
    queryFn: () => api.get(`/users/${username}`).then((r) => r.data),
    enabled: !!username,
  })

  const connect = useMutation({
    mutationFn: () => api.post(`/users/${profile?.id}/connect`, {}).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile', username] })
      Alert.alert('Solicitação enviada', `Você se conectou com ${profile?.name}`)
    },
  })

  const isOwnProfile = currentUser?.username === username

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Perfil</Text>
          <View style={{ width: 24 }} />
        </View>
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      </SafeAreaView>
    )
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Perfil</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.empty}>
          <Ionicons name="person-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyText}>Usuário não encontrado</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>@{profile.username}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView>
        {/* Cover + avatar */}
        <View style={styles.coverArea}>
          <View style={styles.cover} />
          <View style={styles.avatarWrap}>
            {profile.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarText}>{profile.name[0].toUpperCase()}</Text>
              </View>
            )}
            {profile.verified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              </View>
            )}
          </View>
        </View>

        <View style={styles.info}>
          <View style={styles.nameRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{profile.name}</Text>
              <Text style={styles.username}>@{profile.username}</Text>
            </View>
            {!isOwnProfile && (
              <TouchableOpacity
                style={styles.connectBtn}
                onPress={() => connect.mutate()}
                disabled={connect.isPending}
              >
                {connect.isPending ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <>
                    <Ionicons name="person-add-outline" size={16} color={colors.white} />
                    <Text style={styles.connectText}>Conectar</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{ROLE_LABELS[profile.role] ?? profile.role}</Text>
          </View>

          {profile.bio && (
            <Text style={styles.bio}>{profile.bio}</Text>
          )}

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Ionicons name="location-outline" size={16} color={colors.textMuted} />
              <Text style={styles.statText}>
                {profile.city && profile.state ? `${profile.city}/${profile.state}` : 'Brasil'}
              </Text>
            </View>
            {profile.premiumUntil && (
              <View style={styles.stat}>
                <Ionicons name="star" size={16} color={colors.secondary} />
                <Text style={[styles.statText, { color: colors.secondary }]}>Premium</Text>
              </View>
            )}
          </View>

          {/* Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => Alert.alert('Em breve', 'Chat direto em breve!')}
            >
              <Ionicons name="chatbubble-outline" size={20} color={colors.primary} />
              <Text style={styles.actionBtnText}>Mensagem</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => Alert.alert('Em breve', 'Parceria em breve!')}
            >
              <Ionicons name="people-outline" size={20} color={colors.primary} />
              <Text style={styles.actionBtnText}>Parceria</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
  coverArea: { height: 120, position: 'relative', marginBottom: 48 },
  cover: { height: 120, backgroundColor: colors.primaryLight },
  avatarWrap: { position: 'absolute', bottom: -40, left: spacing.lg },
  avatar: { width: 88, height: 88, borderRadius: 44, borderWidth: 4, borderColor: colors.white },
  avatarFallback: { backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 36, fontWeight: '700', color: colors.white },
  verifiedBadge: {
    position: 'absolute', right: 0, bottom: 0,
    backgroundColor: colors.white, borderRadius: 12,
  },
  info: { padding: spacing.lg },
  nameRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
  name: { ...typography.h2, color: colors.text },
  username: { ...typography.body, color: colors.textSecondary },
  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  connectText: { ...typography.label, color: colors.white },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    marginBottom: spacing.md,
  },
  roleText: { ...typography.label, color: colors.primary },
  bio: { ...typography.body, color: colors.text, lineHeight: 22, marginBottom: spacing.md },
  statsRow: { flexDirection: 'row', gap: spacing.lg, marginBottom: spacing.md },
  stat: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  statText: { ...typography.bodySmall, color: colors.textMuted },
  actionsRow: { flexDirection: 'row', gap: spacing.md },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    backgroundColor: colors.white,
    ...shadows.sm,
  },
  actionBtnText: { ...typography.label, color: colors.primary },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  emptyText: { ...typography.body, color: colors.textMuted },
})
