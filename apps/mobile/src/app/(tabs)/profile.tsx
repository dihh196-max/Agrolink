import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api.js'
import { useAuthStore } from '../../store/auth.js'
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme.js'

const ROLE_LABELS: Record<string, string> = {
  producer: 'Produtor Rural',
  supplier: 'Fornecedor',
  technician: 'Técnico / Consultor',
  cooperative: 'Cooperativa',
}

export default function ProfileScreen() {
  const { user, logout } = useAuthStore()
  const { data: farms } = useQuery({
    queryKey: ['farms'],
    queryFn: () => api.get('/users/me/farms').then((r) => r.data),
  })

  const handleLogout = () => {
    Alert.alert('Sair', 'Deseja sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: logout },
    ])
  }

  if (!user) return null

  const totalArea = farms?.reduce((acc: number, f: any) => acc + f.areaHectares, 0) ?? 0

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Perfil</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView>
        {/* Cover + avatar */}
        <View style={styles.coverArea}>
          <View style={styles.cover} />
          <View style={styles.avatarWrap}>
            {user.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarText}>{user.name[0].toUpperCase()}</Text>
              </View>
            )}
            {user.verified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              </View>
            )}
          </View>
        </View>

        <View style={styles.info}>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.username}>@{user.username}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{ROLE_LABELS[user.role]}</Text>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{farms?.length ?? 0}</Text>
              <Text style={styles.statLabel}>Fazendas</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{totalArea.toLocaleString('pt-BR')} ha</Text>
              <Text style={styles.statLabel}>Área Total</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{user.premiumUntil ? '⭐ Premium' : 'Free'}</Text>
              <Text style={styles.statLabel}>Plano</Text>
            </View>
          </View>

          {/* Farms */}
          {farms && farms.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Minhas Fazendas</Text>
              {farms.map((farm: any) => (
                <View key={farm.id} style={styles.farmCard}>
                  <Ionicons name="leaf-outline" size={20} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.farmName}>{farm.name}</Text>
                    <Text style={styles.farmMeta}>{farm.areaHectares} ha • {farm.city}/{farm.state}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Menu */}
          <View style={styles.section}>
            {[
              { icon: 'settings-outline', label: 'Configurações', action: () => {} },
              { icon: 'shield-checkmark-outline', label: 'Privacidade', action: () => {} },
              { icon: 'star-outline', label: 'Assinar Premium', action: () => {} },
              { icon: 'help-circle-outline', label: 'Ajuda e Suporte', action: () => {} },
            ].map((item) => (
              <TouchableOpacity key={item.label} style={styles.menuItem} onPress={item.action}>
                <Ionicons name={item.icon as any} size={22} color={colors.textSecondary} />
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerTitle: { ...typography.h3, color: colors.white },
  coverArea: { height: 120, position: 'relative', marginBottom: 48 },
  cover: { height: 120, backgroundColor: colors.primaryLight },
  avatarWrap: { position: 'absolute', bottom: -40, left: spacing.lg },
  avatar: { width: 88, height: 88, borderRadius: 44, borderWidth: 4, borderColor: colors.white },
  avatarFallback: { backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 36, fontWeight: '700', color: colors.white },
  verifiedBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: colors.white,
    borderRadius: 12,
  },
  info: { padding: spacing.lg },
  name: { ...typography.h2, color: colors.text },
  username: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.sm },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    marginBottom: spacing.lg,
  },
  roleText: { ...typography.label, color: colors.primary },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { ...typography.h4, color: colors.text },
  statLabel: { ...typography.caption, color: colors.textMuted },
  statDivider: { width: 1, backgroundColor: colors.border },
  section: { marginBottom: spacing.lg },
  sectionTitle: { ...typography.h4, color: colors.text, marginBottom: spacing.sm },
  farmCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.white, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadows.sm },
  farmName: { ...typography.label, color: colors.text },
  farmMeta: { ...typography.caption, color: colors.textMuted },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.white, padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.sm, ...shadows.sm },
  menuLabel: { ...typography.body, color: colors.text, flex: 1 },
})
