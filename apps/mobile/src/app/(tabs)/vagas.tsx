import { useState } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useJobs, useApplyJob } from '../../hooks/useSocial.js'
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme.js'
import type { Job } from '@agrolink/types'

const JOB_TYPE_LABELS: Record<string, string> = {
  seasonal: 'Safra',
  permanent: 'Efetivo',
  internship: 'Estágio',
  service: 'Serviço',
}

const JOB_TYPE_COLORS: Record<string, string> = {
  seasonal: '#d97706',
  permanent: '#16a34a',
  internship: '#2563eb',
  service: '#7c3aed',
}

const TYPE_FILTERS = [
  { id: 'all', label: 'Todas' },
  { id: 'seasonal', label: 'Safra' },
  { id: 'permanent', label: 'Efetivo' },
  { id: 'service', label: 'Serviço' },
  { id: 'internship', label: 'Estágio' },
]

function JobCard({ job, onApply }: { job: Job; onApply: (id: string) => void }) {
  const typeColor = JOB_TYPE_COLORS[job.type] ?? colors.primary

  return (
    <View style={[styles.card, shadows.sm]}>
      <View style={styles.cardHeader}>
        <View style={styles.titleRow}>
          <Text style={styles.jobTitle} numberOfLines={2}>{job.title}</Text>
          <View style={[styles.typeBadge, { backgroundColor: typeColor + '20' }]}>
            <Text style={[styles.typeText, { color: typeColor }]}>{JOB_TYPE_LABELS[job.type]}</Text>
          </View>
        </View>
        {(job as any).poster?.name && (
          <Text style={styles.posterName}>{(job as any).poster.name}</Text>
        )}
      </View>

      <Text style={styles.description} numberOfLines={3}>{job.description}</Text>

      <View style={styles.meta}>
        <View style={styles.metaItem}>
          <Ionicons name="location-outline" size={13} color={colors.primary} />
          <Text style={styles.metaText}>
            {job.city}/{job.state}
            {job.distanceKm != null ? ` · ${job.distanceKm} km` : ''}
          </Text>
        </View>
        {job.salaryMin != null && (
          <View style={styles.metaItem}>
            <Ionicons name="cash-outline" size={13} color={colors.success} />
            <Text style={[styles.metaText, { color: colors.success, fontWeight: '600' }]}>
              R$ {job.salaryMin.toLocaleString('pt-BR')}
              {job.salaryMax != null ? `–${job.salaryMax.toLocaleString('pt-BR')}` : ''}/mês
            </Text>
          </View>
        )}
        {job.deadline && (
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={13} color={colors.textMuted} />
            <Text style={styles.metaText}>
              até {new Date(job.deadline).toLocaleDateString('pt-BR')}
            </Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={styles.applyBtn}
        onPress={() => onApply(job.id)}
        activeOpacity={0.8}
      >
        <Ionicons name="paper-plane-outline" size={16} color={colors.white} />
        <Text style={styles.applyBtnText}>Candidatar-se</Text>
      </TouchableOpacity>
    </View>
  )
}

export default function VagasScreen() {
  const [typeFilter, setTypeFilter] = useState('all')
  const [applied, setApplied] = useState<Set<string>>(new Set())

  const { data: jobs, isLoading, refetch } = useJobs(typeFilter)
  const applyJob = useApplyJob()

  const handleApply = (jobId: string) => {
    Alert.alert(
      'Candidatar-se',
      'Deseja enviar sua candidatura para esta vaga?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Candidatar',
          onPress: () => {
            applyJob.mutate(
              { jobId, message: 'Tenho interesse nesta vaga.' },
              {
                onSuccess: () => {
                  setApplied((prev) => new Set([...prev, jobId]))
                  Alert.alert('Candidatura enviada!', 'Boa sorte! 🍀')
                },
                onError: () => {
                  Alert.alert('Erro', 'Não foi possível enviar a candidatura.')
                },
              }
            )
          },
        },
      ]
    )
  }

  const data = jobs ?? []

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="briefcase-outline" size={24} color={colors.white} />
          <Text style={styles.headerTitle}>Vagas</Text>
        </View>
        <TouchableOpacity>
          <Ionicons name="add-circle-outline" size={26} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {TYPE_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.id}
            style={[styles.filterChip, typeFilter === f.id && styles.filterChipActive]}
            onPress={() => setTypeFilter(f.id)}
          >
            <Text style={[styles.filterText, typeFilter === f.id && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : data.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="briefcase-outline" size={48} color={colors.border} />
          <Text style={styles.emptyText}>Nenhuma vaga encontrada</Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} colors={[colors.primary]} />}
          renderItem={({ item }) =>
            applied.has(item.id) ? (
              <View style={[styles.card, styles.appliedCard]}>
                <View style={styles.appliedRow}>
                  <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                  <View style={{ marginLeft: spacing.sm }}>
                    <Text style={styles.appliedTitle}>{item.title}</Text>
                    <Text style={styles.appliedSub}>Candidatura enviada! ✅</Text>
                  </View>
                </View>
              </View>
            ) : (
              <JobCard job={item} onApply={handleApply} />
            )
          }
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerTitle: { ...typography.h3, color: colors.white },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { ...typography.label, color: colors.textSecondary },
  filterTextActive: { color: colors.white },
  list: { padding: spacing.md, gap: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  cardHeader: { marginBottom: spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, justifyContent: 'space-between' },
  jobTitle: { ...typography.h4, color: colors.text, flex: 1 },
  typeBadge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: borderRadius.full },
  typeText: { ...typography.caption, fontWeight: '700' as const },
  posterName: { ...typography.bodySmall, color: colors.textMuted, marginTop: 2 },
  description: { ...typography.bodySmall, color: colors.textSecondary, lineHeight: 20, marginBottom: spacing.sm },
  meta: { gap: spacing.xs, marginBottom: spacing.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { ...typography.bodySmall, color: colors.textSecondary },
  applyBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm + 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  applyBtnText: { ...typography.label, color: colors.white, fontSize: 14 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  emptyText: { ...typography.body, color: colors.textMuted },
  appliedCard: { borderWidth: 1.5, borderColor: colors.success + '60', backgroundColor: colors.success + '08' },
  appliedRow: { flexDirection: 'row', alignItems: 'center' },
  appliedTitle: { ...typography.h4, color: colors.text },
  appliedSub: { ...typography.bodySmall, color: colors.success },
})
