import { useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
  RefreshControl, Alert, Modal, ScrollView, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useJobs, useApplyJob } from '../../hooks/useSocial.js'
import { api } from '../../lib/api.js'
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme.js'
import type { Job } from '@agrolink/types'

const JOB_TYPE_LABELS: Record<string, string> = {
  seasonal: 'Safra', permanent: 'Efetivo', internship: 'Estágio', service: 'Serviço',
}

const JOB_TYPE_COLORS: Record<string, string> = {
  seasonal: '#d97706', permanent: '#16a34a', internship: '#2563eb', service: '#7c3aed',
}

const TYPE_FILTERS = [
  { id: 'all', label: 'Todas' }, { id: 'seasonal', label: 'Safra' },
  { id: 'permanent', label: 'Efetivo' }, { id: 'service', label: 'Serviço' },
  { id: 'internship', label: 'Estágio' },
]

const JOB_TYPES = [
  { value: 'seasonal', label: 'Safra / Temporário' }, { value: 'permanent', label: 'Efetivo' },
  { value: 'service', label: 'Prestação de Serviço' }, { value: 'internship', label: 'Estágio' },
]

function usePostJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/jobs', body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  })
}

function PostJobModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const postJob = usePostJob()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('seasonal')
  const [salaryMin, setSalaryMin] = useState('')
  const [salaryMax, setSalaryMax] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('MT')
  const [success, setSuccess] = useState(false)

  const reset = () => {
    setTitle(''); setDescription(''); setType('seasonal')
    setSalaryMin(''); setSalaryMax(''); setCity(''); setState('MT')
    setSuccess(false)
  }

  const handleClose = () => { reset(); onClose() }

  const handleSubmit = () => {
    if (!title.trim() || !description.trim() || !city.trim()) {
      Alert.alert('Campos obrigatórios', 'Preencha título, descrição e cidade.')
      return
    }
    const body: Record<string, unknown> = {
      title: title.trim(), description: description.trim(), type,
      city: city.trim(), state,
      ...(salaryMin && { salaryMin: Number(salaryMin) }),
      ...(salaryMax && { salaryMax: Number(salaryMax) }),
    }
    postJob.mutate(body, {
      onSuccess: () => setSuccess(true),
      onError: () => Alert.alert('Erro', 'Não foi possível publicar a vaga.'),
    })
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={modalStyles.container} edges={['top']}>
        <View style={modalStyles.header}>
          <Text style={modalStyles.headerTitle}>Publicar Vaga</Text>
          <TouchableOpacity onPress={handleClose} style={modalStyles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {success ? (
          <View style={modalStyles.successContainer}>
            <Text style={modalStyles.successIcon}>🎉</Text>
            <Text style={modalStyles.successTitle}>Vaga publicada!</Text>
            <Text style={modalStyles.successSub}>Candidatos em todo o Brasil já podem se candidatar.</Text>
            <TouchableOpacity style={modalStyles.submitBtn} onPress={handleClose}>
              <Text style={modalStyles.submitBtnText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <ScrollView style={modalStyles.form} contentContainerStyle={{ paddingBottom: 40 }}>
              <Text style={modalStyles.fieldLabel}>Título da vaga *</Text>
              <TextInput style={modalStyles.input} value={title} onChangeText={setTitle}
                placeholder="Ex: Operador de Colheitadeira" placeholderTextColor={colors.textMuted} />

              <Text style={modalStyles.fieldLabel}>Tipo de contrato *</Text>
              <View style={modalStyles.typeRow}>
                {JOB_TYPES.map((t) => (
                  <TouchableOpacity key={t.value} style={[modalStyles.typeChip, type === t.value && modalStyles.typeChipActive]}
                    onPress={() => setType(t.value)}>
                    <Text style={[modalStyles.typeChipText, type === t.value && modalStyles.typeChipTextActive]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={modalStyles.fieldLabel}>Descrição *</Text>
              <TextInput style={[modalStyles.input, modalStyles.textarea]} value={description}
                onChangeText={setDescription} multiline numberOfLines={4}
                placeholder="Responsabilidades, requisitos, benefícios..." placeholderTextColor={colors.textMuted} />

              <View style={modalStyles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={modalStyles.fieldLabel}>Salário mín. (R$)</Text>
                  <TextInput style={modalStyles.input} value={salaryMin} onChangeText={setSalaryMin}
                    keyboardType="numeric" placeholder="1800" placeholderTextColor={colors.textMuted} />
                </View>
                <View style={{ width: spacing.md }} />
                <View style={{ flex: 1 }}>
                  <Text style={modalStyles.fieldLabel}>Salário máx. (R$)</Text>
                  <TextInput style={modalStyles.input} value={salaryMax} onChangeText={setSalaryMax}
                    keyboardType="numeric" placeholder="3500" placeholderTextColor={colors.textMuted} />
                </View>
              </View>

              <View style={modalStyles.row}>
                <View style={{ flex: 2 }}>
                  <Text style={modalStyles.fieldLabel}>Cidade *</Text>
                  <TextInput style={modalStyles.input} value={city} onChangeText={setCity}
                    placeholder="Sorriso" placeholderTextColor={colors.textMuted} />
                </View>
                <View style={{ width: spacing.md }} />
                <View style={{ flex: 1 }}>
                  <Text style={modalStyles.fieldLabel}>UF *</Text>
                  <TextInput style={modalStyles.input} value={state} onChangeText={setState}
                    placeholder="MT" maxLength={2} autoCapitalize="characters" placeholderTextColor={colors.textMuted} />
                </View>
              </View>

              <TouchableOpacity style={[modalStyles.submitBtn, postJob.isPending && { opacity: 0.6 }]}
                onPress={handleSubmit} disabled={postJob.isPending}>
                <Text style={modalStyles.submitBtnText}>
                  {postJob.isPending ? 'Publicando...' : 'Publicar Vaga'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </Modal>
  )
}

function JobCard({ job, onApply }: { job: Job; onApply: (id: string) => void }) {
  const typeColor = JOB_TYPE_COLORS[job.type] ?? colors.primary
  return (
    <View style={[styles.card, shadows.sm]}>
      <View style={styles.titleRow}>
        <Text style={styles.jobTitle} numberOfLines={2}>{job.title}</Text>
        <View style={[styles.typeBadge, { backgroundColor: typeColor + '20' }]}>
          <Text style={[styles.typeText, { color: typeColor }]}>{JOB_TYPE_LABELS[job.type]}</Text>
        </View>
      </View>
      {(job as any).poster?.name && <Text style={styles.posterName}>{(job as any).poster.name}</Text>}
      <Text style={styles.description} numberOfLines={3}>{job.description}</Text>
      <View style={styles.meta}>
        <View style={styles.metaItem}>
          <Ionicons name="location-outline" size={13} color={colors.primary} />
          <Text style={styles.metaText}>{job.city}/{job.state}{job.distanceKm != null ? ` · ${job.distanceKm} km` : ''}</Text>
        </View>
        {job.salaryMin != null && (
          <View style={styles.metaItem}>
            <Ionicons name="cash-outline" size={13} color={colors.success} />
            <Text style={[styles.metaText, { color: colors.success, fontWeight: '600' }]}>
              R$ {job.salaryMin.toLocaleString('pt-BR')}{job.salaryMax ? `–${job.salaryMax.toLocaleString('pt-BR')}` : ''}/mês
            </Text>
          </View>
        )}
        {job.deadline && (
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={13} color={colors.textMuted} />
            <Text style={styles.metaText}>até {new Date(job.deadline).toLocaleDateString('pt-BR')}</Text>
          </View>
        )}
      </View>
      <TouchableOpacity style={styles.applyBtn} onPress={() => onApply(job.id)} activeOpacity={0.8}>
        <Ionicons name="paper-plane-outline" size={16} color={colors.white} />
        <Text style={styles.applyBtnText}>Candidatar-se</Text>
      </TouchableOpacity>
    </View>
  )
}

export default function VagasScreen() {
  const [typeFilter, setTypeFilter] = useState('all')
  const [applied, setApplied] = useState<Set<string>>(new Set())
  const [showPost, setShowPost] = useState(false)

  const { data: jobs, isLoading, refetch } = useJobs(typeFilter)
  const applyJob = useApplyJob()

  const handleApply = (jobId: string) => {
    Alert.alert('Candidatar-se', 'Deseja enviar sua candidatura para esta vaga?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Candidatar',
        onPress: () => {
          applyJob.mutate({ jobId, message: 'Tenho interesse nesta vaga.' }, {
            onSuccess: () => { setApplied((prev) => new Set([...prev, jobId])); Alert.alert('Candidatura enviada! 🍀') },
            onError: () => Alert.alert('Erro', 'Não foi possível enviar a candidatura.'),
          })
        },
      },
    ])
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <PostJobModal visible={showPost} onClose={() => setShowPost(false)} />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="briefcase-outline" size={24} color={colors.white} />
          <Text style={styles.headerTitle}>Vagas</Text>
        </View>
        <TouchableOpacity onPress={() => setShowPost(true)} style={styles.postBtn}>
          <Ionicons name="add" size={18} color={colors.white} />
          <Text style={styles.postBtnText}>Publicar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        {TYPE_FILTERS.map((f) => (
          <TouchableOpacity key={f.id} style={[styles.filterChip, typeFilter === f.id && styles.filterChipActive]}
            onPress={() => setTypeFilter(f.id)}>
            <Text style={[styles.filterText, typeFilter === f.id && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>
      ) : (jobs ?? []).length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="briefcase-outline" size={48} color={colors.border} />
          <Text style={styles.emptyText}>Nenhuma vaga encontrada</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowPost(true)}>
            <Text style={styles.emptyBtnText}>Publicar vaga</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={jobs ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} colors={[colors.primary]} />}
          renderItem={({ item }) =>
            applied.has(item.id) ? (
              <View style={[styles.card, styles.appliedCard]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                  <View><Text style={styles.appliedTitle}>{item.title}</Text><Text style={styles.appliedSub}>Candidatura enviada! ✅</Text></View>
                </View>
              </View>
            ) : <JobCard job={item} onApply={handleApply} />
          }
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 4 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerTitle: { ...typography.h3, color: colors.white },
  postBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.secondary, paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs + 2, borderRadius: borderRadius.full },
  postBtnText: { ...typography.label, color: colors.white, fontSize: 13 },
  filterRow: { flexDirection: 'row', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.xs, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  filterChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, borderRadius: borderRadius.full, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { ...typography.label, color: colors.textSecondary },
  filterTextActive: { color: colors.white },
  list: { padding: spacing.md, gap: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, justifyContent: 'space-between', marginBottom: 4 },
  jobTitle: { ...typography.h4, color: colors.text, flex: 1 },
  typeBadge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: borderRadius.full },
  typeText: { ...typography.caption, fontWeight: '700' as const },
  posterName: { ...typography.bodySmall, color: colors.textMuted, marginBottom: spacing.xs },
  description: { ...typography.bodySmall, color: colors.textSecondary, lineHeight: 20, marginBottom: spacing.sm },
  meta: { gap: spacing.xs, marginBottom: spacing.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { ...typography.bodySmall, color: colors.textSecondary },
  applyBtn: { backgroundColor: colors.primary, borderRadius: borderRadius.lg, paddingVertical: spacing.sm + 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  applyBtnText: { ...typography.label, color: colors.white, fontSize: 14 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  emptyText: { ...typography.body, color: colors.textMuted },
  emptyBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm + 2, borderRadius: borderRadius.full },
  emptyBtnText: { ...typography.label, color: colors.white, fontSize: 14 },
  appliedCard: { borderWidth: 1.5, borderColor: colors.success + '60', backgroundColor: colors.success + '08' },
  appliedTitle: { ...typography.h4, color: colors.text },
  appliedSub: { ...typography.bodySmall, color: colors.success },
})

const modalStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { ...typography.h3, color: colors.text },
  closeBtn: { padding: spacing.xs },
  form: { flex: 1, padding: spacing.md },
  fieldLabel: { ...typography.label, color: colors.text, marginBottom: spacing.xs, marginTop: spacing.md },
  input: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, ...typography.body, color: colors.text },
  textarea: { height: 100, textAlignVertical: 'top' },
  row: { flexDirection: 'row' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  typeChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, borderRadius: borderRadius.full, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  typeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeChipText: { ...typography.label, color: colors.textSecondary },
  typeChipTextActive: { color: colors.white },
  submitBtn: { backgroundColor: colors.primary, borderRadius: borderRadius.lg, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.xl },
  submitBtnText: { ...typography.h4, color: colors.white },
  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl, gap: spacing.md },
  successIcon: { fontSize: 56 },
  successTitle: { ...typography.h2, color: colors.text },
  successSub: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
})
