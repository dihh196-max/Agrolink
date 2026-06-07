import { useState, useCallback, useRef } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert, Modal, ScrollView,
  TextInput, KeyboardAvoidingView, Platform, Linking, Image,
  Animated,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api.js'
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme.js'
import type { Job, ExternalJob } from '@agrolink/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type AnyJob = (Job & { source: 'internal' }) | (ExternalJob & { source: 'external' })

type SourceFilter = 'all' | 'internal' | 'external'
type TypeFilter = 'all' | 'seasonal' | 'permanent' | 'internship' | 'service'

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  seasonal: 'Safra', permanent: 'Efetivo', internship: 'Estágio', service: 'Serviço',
  FULLTIME: 'Efetivo', PARTTIME: 'Part-time', INTERN: 'Estágio', CONTRACTOR: 'Freelance',
}

const TYPE_COLORS: Record<string, string> = {
  seasonal: '#d97706', permanent: '#16a34a', internship: '#2563eb', service: '#7c3aed',
  FULLTIME: '#16a34a', PARTTIME: '#d97706', INTERN: '#2563eb', CONTRACTOR: '#7c3aed',
}

const SOURCE_TABS: { id: SourceFilter; label: string; icon: string }[] = [
  { id: 'all', label: 'Todas', icon: 'globe-outline' },
  { id: 'internal', label: 'AgroLink', icon: 'leaf-outline' },
  { id: 'external', label: 'Externas', icon: 'briefcase-outline' },
]

const TYPE_FILTERS: { id: TypeFilter; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'permanent', label: 'Efetivo' },
  { id: 'seasonal', label: 'Safra' },
  { id: 'service', label: 'Serviço' },
  { id: 'internship', label: 'Estágio' },
]

const JOB_TYPES = [
  { value: 'seasonal', label: 'Safra / Temporário' },
  { value: 'permanent', label: 'Efetivo' },
  { value: 'service', label: 'Prestação de Serviço' },
  { value: 'internship', label: 'Estágio' },
]

const CULTURES = [
  'soja', 'milho', 'algodao', 'cafe', 'boi_gordo', 'trigo', 'arroz', 'feijao', 'cana', 'eucalipto',
]

const CULTURE_LABELS: Record<string, string> = {
  soja: 'Soja', milho: 'Milho', algodao: 'Algodão', cafe: 'Café',
  boi_gordo: 'Boi Gordo', trigo: 'Trigo', arroz: 'Arroz',
  feijao: 'Feijão', cana: 'Cana', eucalipto: 'Eucalipto',
}

const WORK_MODES = [
  { value: 'presencial', label: 'Presencial' },
  { value: 'remoto', label: 'Remoto' },
  { value: 'hibrido', label: 'Híbrido' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr?: string | null): string {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Hoje'
  if (days === 1) return 'Ontem'
  if (days < 7) return `${days} dias atrás`
  if (days < 30) return `${Math.floor(days / 7)} sem. atrás`
  return `${Math.floor(days / 30)} meses atrás`
}

function formatSalary(min?: number | null, max?: number | null, currency = 'BRL'): string | null {
  if (!min && !max) return null
  const fmt = (v: number) => v.toLocaleString('pt-BR')
  if (min && max) return `R$ ${fmt(min)} – ${fmt(max)}/mês`
  if (min) return `A partir de R$ ${fmt(min)}/mês`
  if (max) return `Até R$ ${fmt(max!)}/mês`
  return null
}

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

function getJobTitle(job: AnyJob): string { return job.title }
function getJobCity(job: AnyJob): string | undefined {
  return 'city' in job ? job.city ?? undefined : undefined
}
function getJobState(job: AnyJob): string | undefined {
  if ('state' in job && job.state) return job.state
  return undefined
}
function getJobSalaryMin(job: AnyJob): number | undefined {
  return job.salaryMin ?? undefined
}
function getJobSalaryMax(job: AnyJob): number | undefined {
  return job.salaryMax ?? undefined
}
function getJobType(job: AnyJob): string {
  if (job.source === 'internal') return (job as Job).type
  return (job as ExternalJob).employmentType ?? 'permanent'
}
function getJobPostedAt(job: AnyJob): string | undefined {
  if (job.source === 'internal') return (job as Job).createdAt
  return (job as ExternalJob).postedAt ?? undefined
}
function getCompanyName(job: AnyJob): string {
  if (job.source === 'internal') {
    const j = job as any
    return j.poster?.name ?? 'AgroLink'
  }
  return (job as ExternalJob).company
}
function getCompanyLogo(job: AnyJob): string | undefined {
  if (job.source === 'external') return (job as ExternalJob).companyLogo ?? undefined
  return (job as any).poster?.avatarUrl ?? undefined
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useJobs(source: SourceFilter, typeFilter: TypeFilter, q: string) {
  return useQuery<AnyJob[]>({
    queryKey: ['jobs', source, typeFilter, q],
    queryFn: () =>
      api.get('/jobs', {
        params: {
          source,
          ...(typeFilter !== 'all' && { type: typeFilter }),
          ...(q.trim().length >= 2 && { q: q.trim() }),
        },
      }).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  })
}

function useApplyJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ jobId, message }: { jobId: string; message?: string }) =>
      api.post(`/jobs/${jobId}/apply`, { message }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  })
}

function usePostJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/jobs', body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  })
}

// ─── Company Avatar ───────────────────────────────────────────────────────────

function CompanyAvatar({ logo, name, size = 48 }: { logo?: string; name: string; size?: number }) {
  const [error, setError] = useState(false)
  const bg = logo && !error ? 'transparent' : colors.primary + '20'
  return (
    <View style={[compStyles.avatar, { width: size, height: size, borderRadius: size / 4, backgroundColor: bg }]}>
      {logo && !error ? (
        <Image source={{ uri: logo }} style={{ width: size, height: size, borderRadius: size / 4 }}
          onError={() => setError(true)} resizeMode="contain" />
      ) : (
        <Text style={[compStyles.initials, { fontSize: size * 0.35, color: colors.primary }]}>
          {getInitials(name)}
        </Text>
      )}
    </View>
  )
}
const compStyles = StyleSheet.create({
  avatar: { justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  initials: { fontWeight: '700' as const },
})

// ─── Job Card ─────────────────────────────────────────────────────────────────

function JobCard({ job, onPress, applied }: { job: AnyJob; onPress: () => void; applied: boolean }) {
  const typeColor = TYPE_COLORS[getJobType(job)] ?? colors.primary
  const typeLabel = TYPE_LABELS[getJobType(job)] ?? 'Vaga'
  const salary = formatSalary(getJobSalaryMin(job), getJobSalaryMax(job))
  const city = getJobCity(job)
  const state = getJobState(job)
  const location = [city, state].filter(Boolean).join(', ')
  const company = getCompanyName(job)
  const logo = getCompanyLogo(job)
  const postedAt = getJobPostedAt(job)
  const isExternal = job.source === 'external'

  return (
    <TouchableOpacity style={[cardStyles.card, shadows.sm]} onPress={onPress} activeOpacity={0.92}>
      {/* Header row */}
      <View style={cardStyles.headerRow}>
        <CompanyAvatar logo={logo} name={company} size={44} />
        <View style={cardStyles.headerText}>
          <Text style={cardStyles.company} numberOfLines={1}>{company}</Text>
          <View style={cardStyles.badgeRow}>
            <View style={[cardStyles.typeBadge, { backgroundColor: typeColor + '18' }]}>
              <Text style={[cardStyles.typeText, { color: typeColor }]}>{typeLabel}</Text>
            </View>
            <View style={[cardStyles.sourceBadge, isExternal ? cardStyles.sourceBadgeExt : cardStyles.sourceBadgeInt]}>
              <Ionicons name={isExternal ? 'briefcase-outline' : 'leaf-outline'} size={10}
                color={isExternal ? '#2563eb' : colors.primary} />
              <Text style={[cardStyles.sourceText, { color: isExternal ? '#2563eb' : colors.primary }]}>
                {isExternal ? 'Externa' : 'AgroLink'}
              </Text>
            </View>
          </View>
        </View>
        {postedAt && <Text style={cardStyles.date}>{timeAgo(postedAt)}</Text>}
      </View>

      {/* Title */}
      <Text style={cardStyles.title} numberOfLines={2}>{getJobTitle(job)}</Text>

      {/* Meta */}
      <View style={cardStyles.metaRow}>
        {location ? (
          <View style={cardStyles.metaItem}>
            <Ionicons name="location-outline" size={13} color={colors.textMuted} />
            <Text style={cardStyles.metaText}>{location}
              {(job as any).distanceKm != null ? ` · ${(job as any).distanceKm} km` : ''}
            </Text>
          </View>
        ) : null}
        {salary ? (
          <View style={cardStyles.metaItem}>
            <Ionicons name="cash-outline" size={13} color={colors.success} />
            <Text style={[cardStyles.metaText, { color: colors.success, fontWeight: '600' as const }]}>
              {salary}
            </Text>
          </View>
        ) : null}
      </View>

      {/* CTA */}
      {applied ? (
        <View style={cardStyles.appliedBanner}>
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
          <Text style={cardStyles.appliedText}>Candidatura enviada</Text>
        </View>
      ) : (
        <View style={cardStyles.cta}>
          <Text style={cardStyles.ctaText}>{isExternal ? 'Ver vaga completa' : 'Ver detalhes'}</Text>
          <Ionicons name="arrow-forward" size={14} color={colors.primary} />
        </View>
      )}
    </TouchableOpacity>
  )
}

const cardStyles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.sm },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm },
  headerText: { flex: 1 },
  company: { ...typography.label, color: colors.text, marginBottom: 4 },
  badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: borderRadius.full },
  typeText: { fontSize: 11, fontWeight: '700' as const },
  sourceBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: borderRadius.full },
  sourceBadgeInt: { backgroundColor: colors.primary + '14' },
  sourceBadgeExt: { backgroundColor: '#2563eb14' },
  sourceText: { fontSize: 10, fontWeight: '600' as const },
  date: { ...typography.caption, color: colors.textMuted, flexShrink: 0 },
  title: { ...typography.h4, color: colors.text, marginBottom: spacing.sm, lineHeight: 22 },
  metaRow: { gap: 6, marginBottom: spacing.sm },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { ...typography.bodySmall, color: colors.textSecondary },
  appliedBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: colors.success + '12', borderRadius: borderRadius.md },
  appliedText: { ...typography.label, color: colors.success, fontSize: 13 },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, paddingTop: 4 },
  ctaText: { ...typography.label, color: colors.primary, fontSize: 13 },
})

// ─── Job Detail Modal ─────────────────────────────────────────────────────────

function JobDetailModal({
  job, visible, onClose, applied, onApply,
}: {
  job: AnyJob | null; visible: boolean; onClose: () => void
  applied: boolean; onApply: (id: string, message: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [showApply, setShowApply] = useState(false)
  const [message, setMessage] = useState('')

  if (!job) return null

  const isExternal = job.source === 'external'
  const salary = formatSalary(getJobSalaryMin(job), getJobSalaryMax(job))
  const company = getCompanyName(job)
  const logo = getCompanyLogo(job)
  const typeColor = TYPE_COLORS[getJobType(job)] ?? colors.primary
  const typeLabel = TYPE_LABELS[getJobType(job)] ?? 'Vaga'
  const desc = job.description ?? ''
  const shortDesc = desc.length > 400 ? desc.slice(0, 400) + '…' : desc
  const extJob = job.source === 'external' ? (job as ExternalJob) : null
  const intJob = job.source === 'internal' ? (job as Job) : null

  const handleApply = () => {
    if (isExternal && extJob) {
      Linking.openURL(extJob.applyUrl).catch(() => Alert.alert('Erro', 'Não foi possível abrir o link.'))
      return
    }
    if (applied) return
    setShowApply(true)
  }

  const handleSubmitApply = () => {
    onApply(job.id, message)
    setShowApply(false)
    setMessage('')
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={detailStyles.container} edges={['top']}>
        {/* Header */}
        <LinearGradient colors={[colors.primary, '#2d7a47']} style={detailStyles.gradHeader}>
          <TouchableOpacity onPress={onClose} style={detailStyles.closeBtn}>
            <Ionicons name="chevron-down" size={24} color={colors.white} />
          </TouchableOpacity>
          <View style={detailStyles.companyRow}>
            <CompanyAvatar logo={logo} name={company} size={56} />
            <View style={{ flex: 1 }}>
              <Text style={detailStyles.companyName} numberOfLines={1}>{company}</Text>
              <View style={[detailStyles.typePill, { backgroundColor: typeColor }]}>
                <Text style={detailStyles.typePillText}>{typeLabel}</Text>
              </View>
            </View>
          </View>
          <Text style={detailStyles.jobTitle}>{getJobTitle(job)}</Text>
        </LinearGradient>

        <ScrollView style={detailStyles.body} showsVerticalScrollIndicator={false}>
          {/* Key info */}
          <View style={detailStyles.infoGrid}>
            {(getJobCity(job) || getJobState(job)) && (
              <View style={detailStyles.infoItem}>
                <Ionicons name="location" size={18} color={colors.primary} />
                <View>
                  <Text style={detailStyles.infoLabel}>Localização</Text>
                  <Text style={detailStyles.infoValue}>
                    {[getJobCity(job), getJobState(job)].filter(Boolean).join(', ')}
                    {(job as any).distanceKm != null ? ` · ${(job as any).distanceKm} km` : ''}
                  </Text>
                </View>
              </View>
            )}
            {salary && (
              <View style={detailStyles.infoItem}>
                <Ionicons name="cash" size={18} color={colors.success} />
                <View>
                  <Text style={detailStyles.infoLabel}>Salário</Text>
                  <Text style={[detailStyles.infoValue, { color: colors.success, fontWeight: '700' as const }]}>{salary}</Text>
                </View>
              </View>
            )}
            {intJob?.culture && (
              <View style={detailStyles.infoItem}>
                <Ionicons name="leaf" size={18} color={colors.primary} />
                <View>
                  <Text style={detailStyles.infoLabel}>Cultura</Text>
                  <Text style={detailStyles.infoValue}>{CULTURE_LABELS[intJob.culture] ?? intJob.culture}</Text>
                </View>
              </View>
            )}
            {intJob?.deadline && (
              <View style={detailStyles.infoItem}>
                <Ionicons name="time" size={18} color="#d97706" />
                <View>
                  <Text style={detailStyles.infoLabel}>Prazo</Text>
                  <Text style={detailStyles.infoValue}>{new Date(intJob.deadline).toLocaleDateString('pt-BR')}</Text>
                </View>
              </View>
            )}
            <View style={detailStyles.infoItem}>
              <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
              <View>
                <Text style={detailStyles.infoLabel}>Publicada</Text>
                <Text style={detailStyles.infoValue}>{timeAgo(getJobPostedAt(job)) || '—'}</Text>
              </View>
            </View>
            {isExternal && (
              <View style={detailStyles.infoItem}>
                <Ionicons name="globe-outline" size={18} color="#2563eb" />
                <View>
                  <Text style={detailStyles.infoLabel}>Fonte</Text>
                  <Text style={[detailStyles.infoValue, { color: '#2563eb' }]}>Vaga externa</Text>
                </View>
              </View>
            )}
          </View>

          {/* Skills */}
          {extJob?.requiredSkills && extJob.requiredSkills.length > 0 && (
            <View style={detailStyles.section}>
              <Text style={detailStyles.sectionTitle}>Habilidades requeridas</Text>
              <View style={detailStyles.skillsRow}>
                {extJob.requiredSkills.map((s) => (
                  <View key={s} style={detailStyles.skillChip}>
                    <Text style={detailStyles.skillText}>{s}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Description */}
          <View style={detailStyles.section}>
            <Text style={detailStyles.sectionTitle}>Sobre a vaga</Text>
            <Text style={detailStyles.descText}>{expanded ? desc : shortDesc}</Text>
            {desc.length > 400 && (
              <TouchableOpacity onPress={() => setExpanded(!expanded)} style={detailStyles.expandBtn}>
                <Text style={detailStyles.expandText}>{expanded ? 'Ver menos' : 'Ver descrição completa'}</Text>
                <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Apply message (internal only) */}
          {showApply && !isExternal && (
            <View style={detailStyles.section}>
              <Text style={detailStyles.sectionTitle}>Mensagem de apresentação</Text>
              <TextInput
                style={detailStyles.msgInput}
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={4}
                placeholder="Conte um pouco sobre você e por que tem interesse nesta vaga..."
                placeholderTextColor={colors.textMuted}
              />
              <TouchableOpacity style={detailStyles.submitApplyBtn} onPress={handleSubmitApply}>
                <Ionicons name="paper-plane" size={16} color={colors.white} />
                <Text style={detailStyles.submitApplyText}>Enviar candidatura</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Bottom CTA */}
        {!showApply && (
          <View style={detailStyles.bottomBar}>
            {applied && !isExternal ? (
              <View style={detailStyles.appliedBar}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                <Text style={detailStyles.appliedBarText}>Candidatura enviada com sucesso!</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[detailStyles.applyBtn, isExternal && detailStyles.applyBtnExt]}
                onPress={handleApply}
                activeOpacity={0.85}
              >
                <Ionicons name={isExternal ? 'open-outline' : 'paper-plane-outline'} size={18} color={colors.white} />
                <Text style={detailStyles.applyBtnText}>
                  {isExternal ? 'Candidatar no site da empresa' : 'Candidatar-se'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </SafeAreaView>
    </Modal>
  )
}

const detailStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  gradHeader: { paddingHorizontal: spacing.md, paddingBottom: spacing.lg },
  closeBtn: { alignSelf: 'flex-start', padding: spacing.xs, marginBottom: spacing.sm },
  companyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  companyName: { ...typography.h4, color: colors.white, marginBottom: 6 },
  typePill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: borderRadius.full },
  typePillText: { ...typography.caption, color: colors.white, fontWeight: '700' as const },
  jobTitle: { ...typography.h2, color: colors.white, lineHeight: 28 },
  body: { flex: 1 },
  infoGrid: { padding: spacing.md, gap: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  infoItem: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  infoLabel: { ...typography.caption, color: colors.textMuted },
  infoValue: { ...typography.body, color: colors.text, marginTop: 1 },
  section: { padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  sectionTitle: { ...typography.h4, color: colors.text, marginBottom: spacing.sm },
  descText: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },
  expandBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm },
  expandText: { ...typography.label, color: colors.primary },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  skillChip: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: colors.primary + '14', borderRadius: borderRadius.full },
  skillText: { ...typography.caption, color: colors.primary, fontWeight: '600' as const },
  msgInput: { backgroundColor: colors.background, borderWidth: 1.5, borderColor: colors.border, borderRadius: borderRadius.md, padding: spacing.md, ...typography.body, color: colors.text, height: 100, textAlignVertical: 'top' },
  submitApplyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary, borderRadius: borderRadius.lg, paddingVertical: spacing.md, marginTop: spacing.md },
  submitApplyText: { ...typography.h4, color: colors.white, fontSize: 15 },
  bottomBar: { padding: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  applyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary, borderRadius: borderRadius.lg, paddingVertical: spacing.md + 2 },
  applyBtnExt: { backgroundColor: '#2563eb' },
  applyBtnText: { ...typography.h4, color: colors.white, fontSize: 15 },
  appliedBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, backgroundColor: colors.success + '12', borderRadius: borderRadius.lg },
  appliedBarText: { ...typography.h4, color: colors.success },
})

// ─── Post Job Modal ───────────────────────────────────────────────────────────

function PostJobModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const postJob = usePostJob()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('seasonal')
  const [culture, setCulture] = useState('')
  const [workMode, setWorkMode] = useState('presencial')
  const [salaryMin, setSalaryMin] = useState('')
  const [salaryMax, setSalaryMax] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [deadline, setDeadline] = useState('')
  const [success, setSuccess] = useState(false)

  const reset = () => {
    setTitle(''); setDescription(''); setType('seasonal'); setCulture('')
    setWorkMode('presencial'); setSalaryMin(''); setSalaryMax('')
    setCity(''); setState(''); setDeadline(''); setSuccess(false)
  }

  const handleClose = () => { reset(); onClose() }

  const handleSubmit = () => {
    if (!title.trim() || !description.trim() || !city.trim() || !state.trim()) {
      Alert.alert('Campos obrigatórios', 'Preencha título, descrição, cidade e estado.')
      return
    }
    postJob.mutate({
      title: title.trim(), description: description.trim(), type,
      ...(culture && { culture }),
      workMode,
      city: city.trim(), state: state.toUpperCase().trim().slice(0, 2),
      ...(salaryMin && { salaryMin: Number(salaryMin) }),
      ...(salaryMax && { salaryMax: Number(salaryMax) }),
      ...(deadline && { deadline: new Date(deadline.split('/').reverse().join('-')).toISOString() }),
    }, {
      onSuccess: () => setSuccess(true),
      onError: () => Alert.alert('Erro', 'Não foi possível publicar a vaga.'),
    })
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={postStyles.container} edges={['top']}>
        <LinearGradient colors={[colors.primary, '#2d7a47']} style={postStyles.header}>
          <TouchableOpacity onPress={handleClose} style={postStyles.closeBtn}>
            <Ionicons name="close" size={22} color={colors.white} />
          </TouchableOpacity>
          <Text style={postStyles.headerTitle}>Publicar Vaga</Text>
          <Text style={postStyles.headerSub}>Alcance candidatos de todo o Brasil</Text>
        </LinearGradient>

        {success ? (
          <View style={postStyles.successContainer}>
            <Text style={{ fontSize: 56 }}>🎉</Text>
            <Text style={postStyles.successTitle}>Vaga publicada!</Text>
            <Text style={postStyles.successSub}>Candidatos qualificados já podem se candidatar via AgroLink.</Text>
            <TouchableOpacity style={postStyles.submitBtn} onPress={handleClose}>
              <Text style={postStyles.submitBtnText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={postStyles.form}>
              {/* Informações básicas */}
              <Text style={postStyles.sectionTitle}>Informações básicas</Text>

              <Text style={postStyles.label}>Título da vaga *</Text>
              <TextInput style={postStyles.input} value={title} onChangeText={setTitle}
                placeholder="Ex: Engenheiro Agrônomo Pleno" placeholderTextColor={colors.textMuted} />

              <Text style={postStyles.label}>Tipo de contrato *</Text>
              <View style={postStyles.chipRow}>
                {JOB_TYPES.map((t) => (
                  <TouchableOpacity key={t.value}
                    style={[postStyles.chip, type === t.value && postStyles.chipActive]}
                    onPress={() => setType(t.value)}>
                    <Text style={[postStyles.chipText, type === t.value && postStyles.chipTextActive]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={postStyles.label}>Modalidade</Text>
              <View style={postStyles.chipRow}>
                {WORK_MODES.map((m) => (
                  <TouchableOpacity key={m.value}
                    style={[postStyles.chip, workMode === m.value && postStyles.chipActive]}
                    onPress={() => setWorkMode(m.value)}>
                    <Text style={[postStyles.chipText, workMode === m.value && postStyles.chipTextActive]}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Cultura */}
              <Text style={postStyles.sectionTitle}>Área de atuação</Text>
              <Text style={postStyles.label}>Cultura / Setor (opcional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
                <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                  <TouchableOpacity
                    style={[postStyles.chip, !culture && postStyles.chipActive]}
                    onPress={() => setCulture('')}>
                    <Text style={[postStyles.chipText, !culture && postStyles.chipTextActive]}>Geral</Text>
                  </TouchableOpacity>
                  {CULTURES.map((c) => (
                    <TouchableOpacity key={c}
                      style={[postStyles.chip, culture === c && postStyles.chipActive]}
                      onPress={() => setCulture(c)}>
                      <Text style={[postStyles.chipText, culture === c && postStyles.chipTextActive]}>
                        {CULTURE_LABELS[c]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Descrição */}
              <Text style={postStyles.sectionTitle}>Descrição da vaga</Text>
              <Text style={postStyles.label}>Descreva responsabilidades, requisitos e benefícios *</Text>
              <TextInput style={[postStyles.input, postStyles.textarea]} value={description}
                onChangeText={setDescription} multiline numberOfLines={6}
                placeholder="• Responsabilidades do cargo&#10;• Requisitos mínimos&#10;• Diferenciais&#10;• Benefícios oferecidos"
                placeholderTextColor={colors.textMuted} />
              <Text style={postStyles.charHint}>{description.length} caracteres (mín. 20)</Text>

              {/* Remuneração */}
              <Text style={postStyles.sectionTitle}>Remuneração</Text>
              <View style={postStyles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={postStyles.label}>Salário mínimo (R$)</Text>
                  <TextInput style={postStyles.input} value={salaryMin} onChangeText={setSalaryMin}
                    keyboardType="numeric" placeholder="Ex: 3500" placeholderTextColor={colors.textMuted} />
                </View>
                <View style={{ width: spacing.md }} />
                <View style={{ flex: 1 }}>
                  <Text style={postStyles.label}>Salário máximo (R$)</Text>
                  <TextInput style={postStyles.input} value={salaryMax} onChangeText={setSalaryMax}
                    keyboardType="numeric" placeholder="Ex: 6000" placeholderTextColor={colors.textMuted} />
                </View>
              </View>

              {/* Localização */}
              <Text style={postStyles.sectionTitle}>Localização</Text>
              <View style={postStyles.row}>
                <View style={{ flex: 2 }}>
                  <Text style={postStyles.label}>Cidade *</Text>
                  <TextInput style={postStyles.input} value={city} onChangeText={setCity}
                    placeholder="Ex: Sorriso" placeholderTextColor={colors.textMuted} />
                </View>
                <View style={{ width: spacing.md }} />
                <View style={{ flex: 1 }}>
                  <Text style={postStyles.label}>UF *</Text>
                  <TextInput style={postStyles.input} value={state} onChangeText={setState}
                    placeholder="MT" maxLength={2} autoCapitalize="characters" placeholderTextColor={colors.textMuted} />
                </View>
              </View>

              {/* Prazo */}
              <Text style={postStyles.label}>Prazo de inscrição (dd/mm/aaaa)</Text>
              <TextInput style={postStyles.input} value={deadline} onChangeText={setDeadline}
                placeholder="30/06/2026" placeholderTextColor={colors.textMuted} keyboardType="numeric" />

              <TouchableOpacity
                style={[postStyles.submitBtn, postJob.isPending && { opacity: 0.6 }]}
                onPress={handleSubmit}
                disabled={postJob.isPending}>
                <Ionicons name="paper-plane-outline" size={18} color={colors.white} />
                <Text style={postStyles.submitBtnText}>
                  {postJob.isPending ? 'Publicando...' : 'Publicar vaga gratuitamente'}
                </Text>
              </TouchableOpacity>

              <View style={{ height: spacing.xl }} />
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </Modal>
  )
}

const postStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.md, paddingBottom: spacing.lg, paddingTop: spacing.sm },
  closeBtn: { alignSelf: 'flex-start', padding: spacing.xs, marginBottom: spacing.xs },
  headerTitle: { ...typography.h2, color: colors.white },
  headerSub: { ...typography.bodySmall, color: colors.white + 'CC', marginTop: 2 },
  form: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
  sectionTitle: { ...typography.h4, color: colors.text, marginTop: spacing.lg, marginBottom: spacing.xs, borderLeftWidth: 3, borderLeftColor: colors.primary, paddingLeft: spacing.sm },
  label: { ...typography.label, color: colors.textSecondary, marginBottom: spacing.xs, marginTop: spacing.sm },
  input: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, ...typography.body, color: colors.text },
  textarea: { height: 130, textAlignVertical: 'top', paddingTop: spacing.sm },
  charHint: { ...typography.caption, color: colors.textMuted, textAlign: 'right', marginTop: 2 },
  row: { flexDirection: 'row' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.xs },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, borderRadius: borderRadius.full, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.label, color: colors.textSecondary, fontSize: 13 },
  chipTextActive: { color: colors.white },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary, borderRadius: borderRadius.lg, paddingVertical: spacing.md + 2, marginTop: spacing.xl },
  submitBtnText: { ...typography.h4, color: colors.white, fontSize: 15 },
  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl, gap: spacing.md },
  successTitle: { ...typography.h2, color: colors.text },
  successSub: { ...typography.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
})

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function VagasScreen() {
  const [source, setSource] = useState<SourceFilter>('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [selectedJob, setSelectedJob] = useState<AnyJob | null>(null)
  const [applied, setApplied] = useState<Set<string>>(new Set())
  const [showPost, setShowPost] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: jobs = [], isLoading, refetch, isRefetching } = useJobs(source, typeFilter, debouncedQ)
  const applyJob = useApplyJob()

  const handleSearch = useCallback((text: string) => {
    setSearchQuery(text)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => setDebouncedQ(text), 500)
  }, [])

  const handleApply = useCallback((jobId: string, message: string) => {
    applyJob.mutate({ jobId, message: message || 'Tenho interesse nesta vaga.' }, {
      onSuccess: () => {
        setApplied((prev) => new Set([...prev, jobId]))
        Alert.alert('✅ Candidatura enviada!', 'O recrutador receberá sua candidatura.')
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.message ?? 'Não foi possível enviar a candidatura.'
        Alert.alert('Erro', msg)
      },
    })
  }, [applyJob])

  const externalCount = jobs.filter((j) => j.source === 'external').length
  const internalCount = jobs.filter((j) => j.source === 'internal').length

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <PostJobModal visible={showPost} onClose={() => setShowPost(false)} />
      <JobDetailModal
        job={selectedJob}
        visible={!!selectedJob}
        onClose={() => setSelectedJob(null)}
        applied={selectedJob ? applied.has(selectedJob.id) : false}
        onApply={handleApply}
      />

      {/* Header */}
      <LinearGradient colors={[colors.primary, '#2d7a47']} style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Vagas do Agro</Text>
            <Text style={styles.headerSub}>
              {isLoading ? 'Buscando…' : `${jobs.length} vagas encontradas`}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setShowPost(true)} style={styles.publishBtn} activeOpacity={0.85}>
            <Ionicons name="add" size={16} color={colors.white} />
            <Text style={styles.publishBtnText}>Publicar</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={handleSearch}
            placeholder="Buscar vaga, empresa, área..."
            placeholderTextColor={colors.textMuted}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setDebouncedQ('') }}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* Source tabs */}
      <View style={styles.sourceTabs}>
        {SOURCE_TABS.map((tab) => {
          const count = tab.id === 'internal' ? internalCount : tab.id === 'external' ? externalCount : jobs.length
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.sourceTab, source === tab.id && styles.sourceTabActive]}
              onPress={() => setSource(tab.id)}>
              <Ionicons name={tab.icon as any} size={14}
                color={source === tab.id ? colors.primary : colors.textMuted} />
              <Text style={[styles.sourceTabText, source === tab.id && styles.sourceTabTextActive]}>
                {tab.label}
              </Text>
              {!isLoading && count > 0 && (
                <View style={[styles.countBadge, source === tab.id && styles.countBadgeActive]}>
                  <Text style={[styles.countText, source === tab.id && styles.countTextActive]}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          )
        })}
      </View>

      {/* Type filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeFilterBar}
        contentContainerStyle={styles.typeFilterContent}>
        {TYPE_FILTERS.map((f) => (
          <TouchableOpacity key={f.id}
            style={[styles.typeChip, typeFilter === f.id && styles.typeChipActive]}
            onPress={() => setTypeFilter(f.id)}>
            <Text style={[styles.typeChipText, typeFilter === f.id && styles.typeChipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.loadingText}>Buscando vagas do agronegócio…</Text>
        </View>
      ) : jobs.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="briefcase-outline" size={56} color={colors.border} />
          <Text style={styles.emptyTitle}>Nenhuma vaga encontrada</Text>
          <Text style={styles.emptyText}>
            {source === 'external' && !isLoading
              ? 'As vagas externas são coletadas automaticamente a cada 4h.\nConfigure JSEARCH_API_KEY no servidor para ativá-las.'
              : 'Seja o primeiro a publicar uma vaga!'}
          </Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowPost(true)}>
            <Ionicons name="add" size={16} color={colors.white} />
            <Text style={styles.emptyBtnText}>Publicar vaga</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[colors.primary]} />
          }
          renderItem={({ item }) => (
            <JobCard
              job={item}
              applied={applied.has(item.id)}
              onPress={() => setSelectedJob(item)}
            />
          )}
          ListFooterComponent={
            externalCount > 0 ? (
              <View style={styles.footer}>
                <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
                <Text style={styles.footerText}>
                  Vagas externas coletadas de plataformas como LinkedIn e Indeed
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  headerTitle: { ...typography.h2, color: colors.white },
  headerSub: { ...typography.bodySmall, color: colors.white + 'BB', marginTop: 2 },
  publishBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, borderRadius: borderRadius.full, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  publishBtnText: { ...typography.label, color: colors.white, fontSize: 13 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  searchInput: { flex: 1, ...typography.body, color: colors.text, padding: 0 },
  sourceTabs: { flexDirection: 'row', backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  sourceTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: spacing.sm + 2, borderBottomWidth: 2.5, borderBottomColor: 'transparent' },
  sourceTabActive: { borderBottomColor: colors.primary },
  sourceTabText: { ...typography.label, color: colors.textMuted, fontSize: 12 },
  sourceTabTextActive: { color: colors.primary },
  countBadge: { backgroundColor: colors.border, borderRadius: borderRadius.full, paddingHorizontal: 5, paddingVertical: 1 },
  countBadgeActive: { backgroundColor: colors.primary + '20' },
  countText: { fontSize: 10, fontWeight: '700' as const, color: colors.textMuted },
  countTextActive: { color: colors.primary },
  typeFilterBar: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, maxHeight: 44 },
  typeFilterContent: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, gap: spacing.xs, flexDirection: 'row', alignItems: 'center' },
  typeChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, borderRadius: borderRadius.full, backgroundColor: colors.background, borderWidth: 1.5, borderColor: colors.border },
  typeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeChipText: { ...typography.label, color: colors.textSecondary, fontSize: 12 },
  typeChipTextActive: { color: colors.white },
  list: { padding: spacing.md, paddingBottom: spacing.xl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md, padding: spacing.xl },
  loadingText: { ...typography.body, color: colors.textMuted },
  emptyTitle: { ...typography.h3, color: colors.text },
  emptyText: { ...typography.bodySmall, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm + 2, borderRadius: borderRadius.full, marginTop: spacing.sm },
  emptyBtnText: { ...typography.label, color: colors.white, fontSize: 14 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', paddingVertical: spacing.md, opacity: 0.6 },
  footerText: { ...typography.caption, color: colors.textMuted, flex: 1 },
})
