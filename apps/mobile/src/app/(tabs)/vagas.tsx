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

const SOURCE_TABS: { id: SourceFilter; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'all', label: 'Todas', icon: 'layers-outline' },
  { id: 'internal', label: 'AgroLink', icon: 'leaf-outline' },
  { id: 'external', label: 'Externas', icon: 'briefcase-outline' },
]

const TYPE_FILTERS: { id: TypeFilter; label: string }[] = [
  { id: 'all', label: 'Todos' },
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

const CULTURES = ['soja','milho','algodao','cafe','boi_gordo','trigo','arroz','feijao','cana','eucalipto']
const CULTURE_LABELS: Record<string, string> = {
  soja:'Soja', milho:'Milho', algodao:'Algodão', cafe:'Café',
  boi_gordo:'Boi Gordo', trigo:'Trigo', arroz:'Arroz',
  feijao:'Feijão', cana:'Cana', eucalipto:'Eucalipto',
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

function formatSalary(min?: number | null, max?: number | null): string | null {
  if (!min && !max) return null
  const fmt = (v: number) => v.toLocaleString('pt-BR')
  if (min && max) return `R$ ${fmt(min)} – ${fmt(max)}`
  if (min) return `A partir de R$ ${fmt(min)}`
  if (max) return `Até R$ ${fmt(max!)}`
  return null
}

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
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
  if (job.source === 'internal') return (job as any).poster?.name ?? 'AgroLink'
  return (job as ExternalJob).company
}

function getCompanyLogo(job: AnyJob): string | undefined {
  if (job.source === 'external') return (job as ExternalJob).companyLogo ?? undefined
  return (job as any).poster?.avatarUrl ?? undefined
}

function getLocation(job: AnyJob): string {
  const city = 'city' in job ? job.city ?? '' : ''
  const state = 'state' in job && job.state ? job.state : ''
  return [city, state].filter(Boolean).join(', ')
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
  const hasLogo = logo && !error
  return (
    <View style={[
      compStyles.avatar,
      { width: size, height: size, borderRadius: size / 4 },
      hasLogo ? compStyles.avatarWithLogo : compStyles.avatarFallback,
    ]}>
      {hasLogo ? (
        <Image source={{ uri: logo }} style={{ width: size, height: size, borderRadius: size / 4 }}
          onError={() => setError(true)} resizeMode="contain" />
      ) : (
        <Text style={[compStyles.initials, { fontSize: size * 0.35 }]}>
          {getInitials(name)}
        </Text>
      )}
    </View>
  )
}

const compStyles = StyleSheet.create({
  avatar: { justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarWithLogo: { backgroundColor: '#f0f4f0', borderWidth: 1, borderColor: colors.border },
  avatarFallback: { backgroundColor: colors.primary + '18' },
  initials: { fontWeight: '800' as const, color: colors.primary },
})

// ─── Job Card ─────────────────────────────────────────────────────────────────

function JobCard({ job, onPress, applied }: { job: AnyJob; onPress: () => void; applied: boolean }) {
  const typeColor = TYPE_COLORS[getJobType(job)] ?? colors.primary
  const typeLabel = TYPE_LABELS[getJobType(job)] ?? 'Vaga'
  const salary = formatSalary(job.salaryMin, job.salaryMax)
  const location = getLocation(job)
  const company = getCompanyName(job)
  const logo = getCompanyLogo(job)
  const postedAt = getJobPostedAt(job)
  const isExternal = job.source === 'external'
  const distKm = (job as any).distanceKm

  return (
    <TouchableOpacity style={[cardStyles.card, shadows.md]} onPress={onPress} activeOpacity={0.93}>
      {/* Top row: logo + company + badges + date */}
      <View style={cardStyles.topRow}>
        <CompanyAvatar logo={logo} name={company} size={46} />
        <View style={cardStyles.topInfo}>
          <Text style={cardStyles.company} numberOfLines={1}>{company}</Text>
          <View style={cardStyles.badgeRow}>
            <View style={[cardStyles.typeBadge, { backgroundColor: typeColor + '1a' }]}>
              <Text style={[cardStyles.typeBadgeText, { color: typeColor }]}>{typeLabel}</Text>
            </View>
            <View style={[cardStyles.srcBadge, isExternal ? cardStyles.srcExt : cardStyles.srcInt]}>
              <Ionicons name={isExternal ? 'briefcase-outline' : 'leaf-outline'} size={9}
                color={isExternal ? colors.info : colors.primary} />
              <Text style={[cardStyles.srcText, { color: isExternal ? colors.info : colors.primary }]}>
                {isExternal ? 'Externa' : 'AgroLink'}
              </Text>
            </View>
          </View>
        </View>
        {postedAt && <Text style={cardStyles.date}>{timeAgo(postedAt)}</Text>}
      </View>

      {/* Job title */}
      <Text style={cardStyles.title} numberOfLines={2}>{job.title}</Text>

      {/* Location + salary chips */}
      <View style={cardStyles.chipsRow}>
        {location ? (
          <View style={cardStyles.chip}>
            <Ionicons name="location-outline" size={12} color={colors.textMuted} />
            <Text style={cardStyles.chipText}>
              {location}{distKm != null ? ` · ${distKm} km` : ''}
            </Text>
          </View>
        ) : null}
        {salary ? (
          <View style={[cardStyles.chip, cardStyles.chipSalary]}>
            <Ionicons name="cash-outline" size={12} color={colors.success} />
            <Text style={[cardStyles.chipText, { color: colors.success, fontWeight: '700' as const }]}>
              {salary}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Divider + CTA */}
      <View style={cardStyles.divider} />
      {applied ? (
        <View style={cardStyles.appliedRow}>
          <Ionicons name="checkmark-circle" size={15} color={colors.success} />
          <Text style={cardStyles.appliedText}>Candidatura enviada</Text>
        </View>
      ) : (
        <View style={cardStyles.ctaRow}>
          <Text style={cardStyles.ctaText}>
            {isExternal ? 'Ver vaga completa' : 'Ver detalhes e se candidatar'}
          </Text>
          <View style={cardStyles.ctaArrow}>
            <Ionicons name="arrow-forward" size={13} color={colors.white} />
          </View>
        </View>
      )}
    </TouchableOpacity>
  )
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm },
  topInfo: { flex: 1, gap: 4 },
  company: { fontSize: 13, fontWeight: '600' as const, color: colors.text, lineHeight: 17 },
  badgeRow: { flexDirection: 'row', gap: 5, flexWrap: 'wrap' },
  typeBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: borderRadius.full },
  typeBadgeText: { fontSize: 10, fontWeight: '700' as const },
  srcBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: borderRadius.full },
  srcInt: { backgroundColor: colors.primary + '14' },
  srcExt: { backgroundColor: colors.info + '14' },
  srcText: { fontSize: 9, fontWeight: '700' as const, textTransform: 'uppercase' as const, letterSpacing: 0.3 },
  date: { fontSize: 11, color: colors.textMuted, flexShrink: 0, marginTop: 2 },
  title: { fontSize: 16, fontWeight: '700' as const, color: colors.text, lineHeight: 22, marginBottom: spacing.sm },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.background, borderRadius: borderRadius.full, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: colors.border },
  chipSalary: { backgroundColor: colors.success + '0d', borderColor: colors.success + '30' },
  chipText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' as const },
  divider: { height: 1, backgroundColor: colors.border, marginBottom: spacing.sm },
  appliedRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  appliedText: { fontSize: 13, fontWeight: '600' as const, color: colors.success },
  ctaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ctaText: { fontSize: 13, fontWeight: '600' as const, color: colors.primary },
  ctaArrow: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
})

// ─── Job Detail Modal ─────────────────────────────────────────────────────────

function JobDetailModal({
  job, visible, onClose, applied, onApply,
}: {
  job: AnyJob | null; visible: boolean; onClose: () => void
  applied: boolean; onApply: (id: string, message: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [showApplyPanel, setShowApplyPanel] = useState(false)
  const [message, setMessage] = useState('')
  const panelAnim = useRef(new Animated.Value(0)).current

  if (!job) return null

  const isExternal = job.source === 'external'
  const salary = formatSalary(job.salaryMin, job.salaryMax)
  const company = getCompanyName(job)
  const logo = getCompanyLogo(job)
  const typeColor = TYPE_COLORS[getJobType(job)] ?? colors.primary
  const typeLabel = TYPE_LABELS[getJobType(job)] ?? 'Vaga'
  const desc = job.description ?? ''
  const shortDesc = desc.length > 500 ? desc.slice(0, 500) + '…' : desc
  const extJob = job.source === 'external' ? (job as ExternalJob) : null
  const intJob = job.source === 'internal' ? (job as Job) : null
  const location = getLocation(job)

  const openPanel = () => {
    setShowApplyPanel(true)
    Animated.spring(panelAnim, { toValue: 1, useNativeDriver: true, tension: 65, friction: 11 }).start()
  }

  const closePanel = () => {
    Animated.timing(panelAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => {
      setShowApplyPanel(false)
      setMessage('')
    })
  }

  const handlePrimaryAction = () => {
    if (isExternal && extJob) {
      Linking.openURL(extJob.applyUrl).catch(() => Alert.alert('Erro', 'Não foi possível abrir o link.'))
      return
    }
    if (applied) return
    openPanel()
  }

  const handleSubmit = () => {
    onApply(job.id, message)
    closePanel()
  }

  const panelTranslateY = panelAnim.interpolate({ inputRange: [0, 1], outputRange: [300, 0] })

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={detailStyles.container} edges={['top']}>

        {/* ── Gradient Header ── */}
        <LinearGradient colors={[colors.primary, '#2d7a47', '#3a9458']} style={detailStyles.header}>
          <TouchableOpacity onPress={onClose} style={detailStyles.closeBtn}>
            <Ionicons name="chevron-down" size={22} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>

          <View style={detailStyles.headerContent}>
            <View style={detailStyles.companyRow}>
              <View style={detailStyles.logoWrapper}>
                <CompanyAvatar logo={logo} name={company} size={52} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={detailStyles.companyName} numberOfLines={1}>{company}</Text>
                <View style={[detailStyles.typePill, { backgroundColor: typeColor }]}>
                  <Text style={detailStyles.typePillText}>{typeLabel}</Text>
                </View>
              </View>
              {isExternal && (
                <View style={detailStyles.extBadge}>
                  <Ionicons name="globe-outline" size={11} color={colors.white} />
                  <Text style={detailStyles.extBadgeText}>Externa</Text>
                </View>
              )}
            </View>
            <Text style={detailStyles.jobTitle}>{job.title}</Text>
          </View>
        </LinearGradient>

        {/* ── Quick stats bar ── */}
        <View style={detailStyles.statsBar}>
          {location ? (
            <View style={detailStyles.statItem}>
              <Ionicons name="location" size={14} color={colors.primary} />
              <Text style={detailStyles.statText} numberOfLines={1}>{location}</Text>
            </View>
          ) : null}
          {salary ? (
            <View style={[detailStyles.statItem, detailStyles.statSalary]}>
              <Ionicons name="cash" size={14} color={colors.success} />
              <Text style={[detailStyles.statText, { color: colors.success, fontWeight: '700' as const }]}>
                {salary}
              </Text>
            </View>
          ) : null}
          {getJobPostedAt(job) ? (
            <View style={detailStyles.statItem}>
              <Ionicons name="time-outline" size={13} color={colors.textMuted} />
              <Text style={[detailStyles.statText, { color: colors.textMuted }]}>
                {timeAgo(getJobPostedAt(job))}
              </Text>
            </View>
          ) : null}
        </View>

        {/* ── Scrollable body ── */}
        <ScrollView style={detailStyles.body} showsVerticalScrollIndicator={false}
          contentContainerStyle={detailStyles.bodyContent}>

          {/* Additional details */}
          {(intJob?.culture || intJob?.deadline || (extJob?.requiredSkills?.length)) ? (
            <View style={detailStyles.section}>
              <Text style={detailStyles.sectionTitle}>Detalhes</Text>
              <View style={detailStyles.detailGrid}>
                {intJob?.culture && (
                  <View style={detailStyles.detailItem}>
                    <Ionicons name="leaf" size={16} color={colors.primary} />
                    <View>
                      <Text style={detailStyles.detailLabel}>Cultura</Text>
                      <Text style={detailStyles.detailValue}>{CULTURE_LABELS[intJob.culture] ?? intJob.culture}</Text>
                    </View>
                  </View>
                )}
                {intJob?.deadline && (
                  <View style={detailStyles.detailItem}>
                    <Ionicons name="calendar" size={16} color={colors.warning} />
                    <View>
                      <Text style={detailStyles.detailLabel}>Prazo</Text>
                      <Text style={detailStyles.detailValue}>{new Date(intJob.deadline).toLocaleDateString('pt-BR')}</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          ) : null}

          {/* Required skills */}
          {extJob?.requiredSkills && extJob.requiredSkills.length > 0 && (
            <View style={detailStyles.section}>
              <Text style={detailStyles.sectionTitle}>Habilidades requeridas</Text>
              <View style={detailStyles.skillsRow}>
                {extJob.requiredSkills.map((s) => (
                  <View key={s} style={detailStyles.skillChip}>
                    <Text style={detailStyles.skillChipText}>{s}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Description */}
          <View style={detailStyles.section}>
            <Text style={detailStyles.sectionTitle}>Sobre a vaga</Text>
            <Text style={detailStyles.descText}>{expanded ? desc : shortDesc}</Text>
            {desc.length > 500 && (
              <TouchableOpacity style={detailStyles.expandBtn} onPress={() => setExpanded(!expanded)}>
                <Text style={detailStyles.expandText}>{expanded ? 'Ver menos' : 'Ver descrição completa'}</Text>
                <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={13} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>

          {isExternal && (
            <View style={detailStyles.externalNote}>
              <Ionicons name="information-circle-outline" size={15} color={colors.info} />
              <Text style={detailStyles.externalNoteText}>
                Esta vaga é externa. Você será direcionado ao site da empresa para se candidatar.
              </Text>
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* ── Apply panel (internal jobs) ── */}
        {showApplyPanel && (
          <Animated.View style={[detailStyles.applyPanel, { transform: [{ translateY: panelTranslateY }] }]}>
            <View style={detailStyles.applyPanelHandle} />
            <Text style={detailStyles.applyPanelTitle}>Mensagem de apresentação</Text>
            <Text style={detailStyles.applyPanelSub}>Opcional — conte por que tem interesse nesta vaga</Text>
            <TextInput
              style={detailStyles.applyInput}
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={4}
              placeholder="Ex: Tenho 5 anos de experiência na área e muito interesse em contribuir com…"
              placeholderTextColor={colors.textMuted}
              autoFocus
            />
            <View style={detailStyles.applyPanelActions}>
              <TouchableOpacity style={detailStyles.cancelBtn} onPress={closePanel}>
                <Text style={detailStyles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={detailStyles.sendBtn} onPress={handleSubmit}>
                <Ionicons name="paper-plane" size={16} color={colors.white} />
                <Text style={detailStyles.sendBtnText}>Enviar candidatura</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* ── Bottom action bar (always visible) ── */}
        {!showApplyPanel && (
          <View style={detailStyles.bottomBar}>
            {applied && !isExternal ? (
              <View style={detailStyles.appliedBar}>
                <View style={detailStyles.appliedIcon}>
                  <Ionicons name="checkmark" size={18} color={colors.white} />
                </View>
                <Text style={detailStyles.appliedBarText}>Candidatura enviada com sucesso!</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[detailStyles.applyBtn, isExternal && detailStyles.applyBtnExt]}
                onPress={handlePrimaryAction}
                activeOpacity={0.85}>
                <Ionicons
                  name={isExternal ? 'open-outline' : 'paper-plane-outline'}
                  size={19}
                  color={colors.white}
                />
                <Text style={detailStyles.applyBtnText}>
                  {isExternal ? 'Candidatar-se no site da empresa' : 'Candidatar-se a esta vaga'}
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
  header: { paddingBottom: spacing.lg },
  closeBtn: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    marginLeft: spacing.sm,
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerContent: { paddingHorizontal: spacing.md, paddingTop: spacing.xs },
  logoWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    ...shadows.md,
  },
  companyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  companyName: { fontSize: 14, fontWeight: '700' as const, color: 'rgba(255,255,255,0.9)', marginBottom: 5 },
  typePill: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 3, borderRadius: borderRadius.full },
  typePillText: { fontSize: 11, fontWeight: '700' as const, color: colors.white },
  extBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: borderRadius.full },
  extBadgeText: { fontSize: 10, fontWeight: '700' as const, color: colors.white, textTransform: 'uppercase' as const },
  jobTitle: { fontSize: 20, fontWeight: '800' as const, color: colors.white, lineHeight: 27 },

  statsBar: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: colors.background, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.border },
  statSalary: { backgroundColor: colors.success + '0d', borderColor: colors.success + '30' },
  statText: { fontSize: 12, fontWeight: '600' as const, color: colors.text },

  body: { flex: 1 },
  bodyContent: { paddingBottom: spacing.xl },
  section: { paddingHorizontal: spacing.md, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  sectionTitle: { fontSize: 13, fontWeight: '700' as const, color: colors.textMuted, textTransform: 'uppercase' as const, letterSpacing: 0.8, marginBottom: spacing.sm },

  detailGrid: { gap: spacing.md },
  detailItem: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  detailLabel: { fontSize: 11, color: colors.textMuted, marginBottom: 1 },
  detailValue: { fontSize: 14, fontWeight: '600' as const, color: colors.text },

  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  skillChip: { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: colors.primary + '12', borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.primary + '25' },
  skillChipText: { fontSize: 12, fontWeight: '600' as const, color: colors.primary },

  descText: { fontSize: 14, color: colors.textSecondary, lineHeight: 22 },
  expandBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm + 2, alignSelf: 'flex-start' },
  expandText: { fontSize: 13, fontWeight: '600' as const, color: colors.primary },

  externalNote: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs, marginHorizontal: spacing.md, marginTop: spacing.sm, padding: spacing.sm + 2, backgroundColor: colors.info + '0d', borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.info + '25' },
  externalNoteText: { flex: 1, fontSize: 12, color: colors.info, lineHeight: 17 },

  // Apply panel (slides up)
  applyPanel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: spacing.md,
    paddingBottom: spacing.xl,
    ...shadows.lg,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  applyPanelHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  applyPanelTitle: { fontSize: 16, fontWeight: '700' as const, color: colors.text, marginBottom: 2 },
  applyPanelSub: { fontSize: 12, color: colors.textMuted, marginBottom: spacing.md },
  applyInput: { backgroundColor: colors.background, borderWidth: 1.5, borderColor: colors.border, borderRadius: borderRadius.md, padding: spacing.md, fontSize: 14, color: colors.text, height: 110, textAlignVertical: 'top' as const, marginBottom: spacing.md },
  applyPanelActions: { flexDirection: 'row', gap: spacing.sm },
  cancelBtn: { flex: 1, paddingVertical: spacing.sm + 4, borderRadius: borderRadius.lg, backgroundColor: colors.background, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '600' as const, color: colors.textSecondary },
  sendBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.sm + 4, borderRadius: borderRadius.lg, backgroundColor: colors.primary },
  sendBtnText: { fontSize: 14, fontWeight: '700' as const, color: colors.white },

  // Bottom action bar
  bottomBar: { padding: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  applyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: colors.primary,
    borderRadius: borderRadius.lg, paddingVertical: spacing.md + 2,
    ...shadows.md,
  },
  applyBtnExt: { backgroundColor: colors.info },
  applyBtnText: { fontSize: 16, fontWeight: '700' as const, color: colors.white },
  appliedBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  appliedIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.success, justifyContent: 'center', alignItems: 'center' },
  appliedBarText: { fontSize: 15, fontWeight: '700' as const, color: colors.success },
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
            <Ionicons name="close" size={20} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>
          <Text style={postStyles.headerTitle}>Publicar Vaga</Text>
          <Text style={postStyles.headerSub}>Alcance candidatos qualificados do agronegócio</Text>
        </LinearGradient>

        {success ? (
          <View style={postStyles.successContainer}>
            <View style={postStyles.successIcon}>
              <Ionicons name="checkmark" size={40} color={colors.white} />
            </View>
            <Text style={postStyles.successTitle}>Vaga publicada!</Text>
            <Text style={postStyles.successSub}>
              Candidatos qualificados já podem visualizar e se candidatar à sua vaga no AgroLink.
            </Text>
            <TouchableOpacity style={postStyles.submitBtn} onPress={handleClose}>
              <Text style={postStyles.submitBtnText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={postStyles.form} showsVerticalScrollIndicator={false}>

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

              <Text style={postStyles.sectionTitle}>Área de atuação</Text>
              <Text style={postStyles.label}>Cultura / Setor (opcional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
                <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                  <TouchableOpacity style={[postStyles.chip, !culture && postStyles.chipActive]} onPress={() => setCulture('')}>
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

              <Text style={postStyles.sectionTitle}>Descrição</Text>
              <Text style={postStyles.label}>Responsabilidades, requisitos e benefícios *</Text>
              <TextInput style={[postStyles.input, postStyles.textarea]} value={description}
                onChangeText={setDescription} multiline numberOfLines={6}
                placeholder={'• Responsabilidades do cargo\n• Requisitos mínimos\n• Diferenciais\n• Benefícios oferecidos'}
                placeholderTextColor={colors.textMuted} />
              <Text style={postStyles.charHint}>{description.length} caracteres (mínimo 20)</Text>

              <Text style={postStyles.sectionTitle}>Remuneração</Text>
              <View style={postStyles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={postStyles.label}>Salário mínimo (R$)</Text>
                  <TextInput style={postStyles.input} value={salaryMin} onChangeText={setSalaryMin}
                    keyboardType="numeric" placeholder="3500" placeholderTextColor={colors.textMuted} />
                </View>
                <View style={{ width: spacing.md }} />
                <View style={{ flex: 1 }}>
                  <Text style={postStyles.label}>Salário máximo (R$)</Text>
                  <TextInput style={postStyles.input} value={salaryMax} onChangeText={setSalaryMax}
                    keyboardType="numeric" placeholder="6000" placeholderTextColor={colors.textMuted} />
                </View>
              </View>

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

              <Text style={postStyles.label}>Prazo de inscrição (dd/mm/aaaa)</Text>
              <TextInput style={postStyles.input} value={deadline} onChangeText={setDeadline}
                placeholder="30/06/2026" placeholderTextColor={colors.textMuted} keyboardType="numeric" />

              <TouchableOpacity
                style={[postStyles.submitBtn, postJob.isPending && { opacity: 0.6 }]}
                onPress={handleSubmit}
                disabled={postJob.isPending}>
                {postJob.isPending ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Ionicons name="paper-plane-outline" size={18} color={colors.white} />
                )}
                <Text style={postStyles.submitBtnText}>
                  {postJob.isPending ? 'Publicando...' : 'Publicar vaga gratuitamente'}
                </Text>
              </TouchableOpacity>

              <View style={{ height: spacing.xl * 2 }} />
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
  closeBtn: {
    alignSelf: 'flex-start', marginBottom: spacing.xs,
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 22, fontWeight: '800' as const, color: colors.white, lineHeight: 28 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 3 },
  form: { padding: spacing.md },
  sectionTitle: {
    fontSize: 13, fontWeight: '700' as const, color: colors.textMuted,
    textTransform: 'uppercase' as const, letterSpacing: 0.8,
    marginTop: spacing.lg, marginBottom: spacing.xs,
    borderLeftWidth: 3, borderLeftColor: colors.primary, paddingLeft: spacing.sm,
  },
  label: { fontSize: 13, fontWeight: '600' as const, color: colors.textSecondary, marginBottom: spacing.xs, marginTop: spacing.sm },
  input: {
    backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: borderRadius.md, paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2, fontSize: 14, color: colors.text,
  },
  textarea: { height: 130, textAlignVertical: 'top' as const, paddingTop: spacing.sm },
  charHint: { fontSize: 11, color: colors.textMuted, textAlign: 'right' as const, marginTop: 3 },
  row: { flexDirection: 'row' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 3,
    borderRadius: borderRadius.full, backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600' as const, color: colors.textSecondary },
  chipTextActive: { color: colors.white },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: colors.primary,
    borderRadius: borderRadius.lg, paddingVertical: spacing.md + 4, marginTop: spacing.xl,
    ...shadows.md,
  },
  submitBtnText: { fontSize: 15, fontWeight: '700' as const, color: colors.white },
  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl, gap: spacing.md },
  successIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.success, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm },
  successTitle: { fontSize: 24, fontWeight: '800' as const, color: colors.text },
  successSub: { fontSize: 15, color: colors.textSecondary, textAlign: 'center' as const, lineHeight: 22 },
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
        Alert.alert('Candidatura enviada!', 'O recrutador receberá sua candidatura em breve.')
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

      {/* ── Header ── */}
      <LinearGradient colors={[colors.primary, '#2d7a47']} style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Vagas do Agro</Text>
            <Text style={styles.headerSub}>
              {isLoading ? 'Buscando vagas…' : `${jobs.length} vagas disponíveis`}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setShowPost(true)} style={styles.publishBtn} activeOpacity={0.85}>
            <Ionicons name="add" size={16} color={colors.white} />
            <Text style={styles.publishBtnText}>Publicar vaga</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={17} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={handleSearch}
            placeholder="Buscar por vaga, empresa ou área..."
            placeholderTextColor={colors.textMuted}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setDebouncedQ('') }}>
              <Ionicons name="close-circle" size={17} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* ── Source tabs ── */}
      <View style={styles.sourceTabs}>
        {SOURCE_TABS.map((tab) => {
          const count = tab.id === 'internal' ? internalCount : tab.id === 'external' ? externalCount : jobs.length
          const active = source === tab.id
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.sourceTab, active && styles.sourceTabActive]}
              onPress={() => setSource(tab.id)}>
              <Ionicons name={tab.icon} size={14} color={active ? colors.primary : colors.textMuted} />
              <Text style={[styles.sourceTabText, active && styles.sourceTabTextActive]}>
                {tab.label}
              </Text>
              {!isLoading && count > 0 && (
                <View style={[styles.countBadge, active && styles.countBadgeActive]}>
                  <Text style={[styles.countText, active && styles.countTextActive]}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          )
        })}
      </View>

      {/* ── Type filter chips ── */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}>
          {TYPE_FILTERS.map((f) => (
            <TouchableOpacity key={f.id}
              style={[styles.filterChip, typeFilter === f.id && styles.filterChipActive]}
              onPress={() => setTypeFilter(f.id)}>
              <Text style={[styles.filterChipText, typeFilter === f.id && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Content ── */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.loadingText}>Buscando vagas do agronegócio…</Text>
        </View>
      ) : jobs.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIconBg}>
            <Ionicons name="briefcase-outline" size={38} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Nenhuma vaga encontrada</Text>
          <Text style={styles.emptyText}>
            {source === 'external'
              ? 'Vagas externas são coletadas automaticamente a cada 4h a partir de plataformas do agro.'
              : 'Seja o primeiro a publicar uma oportunidade!'}
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
                <Ionicons name="globe-outline" size={13} color={colors.textMuted} />
                <Text style={styles.footerText}>
                  Vagas externas agregadas de plataformas do agronegócio nacional
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  )
}

// ─── Screen Styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm + 2 },
  headerTitle: { fontSize: 22, fontWeight: '800' as const, color: colors.white },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  publishBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 3,
    borderRadius: borderRadius.full,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  publishBtnText: { fontSize: 13, fontWeight: '600' as const, color: colors.white },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.text, padding: 0 },

  sourceTabs: { flexDirection: 'row', backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  sourceTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: spacing.sm + 3, borderBottomWidth: 2.5, borderBottomColor: 'transparent' },
  sourceTabActive: { borderBottomColor: colors.primary },
  sourceTabText: { fontSize: 12, fontWeight: '600' as const, color: colors.textMuted },
  sourceTabTextActive: { color: colors.primary },
  countBadge: { backgroundColor: colors.border, borderRadius: borderRadius.full, paddingHorizontal: 6, paddingVertical: 1, minWidth: 18, alignItems: 'center' },
  countBadgeActive: { backgroundColor: colors.primary + '1f' },
  countText: { fontSize: 10, fontWeight: '800' as const, color: colors.textMuted },
  countTextActive: { color: colors.primary },

  filterBar: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  filterContent: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, gap: spacing.xs },
  filterChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, borderRadius: borderRadius.full, backgroundColor: colors.background, borderWidth: 1.5, borderColor: colors.border },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { fontSize: 12, fontWeight: '600' as const, color: colors.textSecondary },
  filterChipTextActive: { color: colors.white },

  list: { padding: spacing.md, paddingBottom: spacing.xl },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md, padding: spacing.xl },
  loadingText: { fontSize: 14, color: colors.textMuted },
  emptyIconBg: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary + '12', justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700' as const, color: colors.text },
  emptyText: { fontSize: 13, color: colors.textMuted, textAlign: 'center' as const, lineHeight: 20, maxWidth: 280 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm + 4, borderRadius: borderRadius.full, marginTop: spacing.sm },
  emptyBtnText: { fontSize: 14, fontWeight: '700' as const, color: colors.white },

  footer: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', paddingVertical: spacing.md, opacity: 0.55 },
  footerText: { fontSize: 11, color: colors.textMuted, flex: 1, lineHeight: 16 },
})
