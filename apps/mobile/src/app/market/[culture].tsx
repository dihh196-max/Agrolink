import { useState, useMemo } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useMarketPrices, usePriceHistory, useCreatePriceAlert } from '../../hooks/useMarket.js'
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme.js'
import type { Culture, MarketPrice } from '@agrolink/types'

// ─── Static metadata ──────────────────────────────────────────────────────────

const CULTURE_LABELS: Record<Culture, string> = {
  soja: 'Soja', milho: 'Milho', algodao: 'Algodão', cafe: 'Café',
  boi_gordo: 'Boi Gordo', trigo: 'Trigo', arroz: 'Arroz',
  feijao: 'Feijão', cana: 'Cana-de-açúcar', eucalipto: 'Eucalipto',
}
const CULTURE_ICONS: Partial<Record<Culture, string>> = {
  soja: '🌿', milho: '🌽', algodao: '☁️', cafe: '☕',
  boi_gordo: '🐄', trigo: '🌾', arroz: '🍚', feijao: '🫘',
  cana: '🎋', eucalipto: '🌳',
}
const UNIT_LABELS: Record<string, string> = {
  saca_60kg: 'saca 60 kg', arroba: 'arroba (@)', tonelada: 'tonelada',
}
const CONTRACT_INFO: Partial<Record<Culture, { symbol: string; exchange: string; note: string }>> = {
  soja:      { symbol: 'ZS=F', exchange: 'CBOT — Chicago', note: 'Futuros de soja grão, convertido p/ BRL' },
  milho:     { symbol: 'ZC=F', exchange: 'CBOT — Chicago', note: 'Futuros de milho, convertido p/ BRL' },
  cafe:      { symbol: 'KC=F', exchange: 'ICE — Nova York', note: 'Futuros de café arábica, convertido p/ BRL' },
  algodao:   { symbol: 'CT=F', exchange: 'ICE — Nova York', note: 'Futuros de algodão em pluma, convertido p/ BRL' },
  boi_gordo: { symbol: 'LE=F', exchange: 'CME — Chicago', note: 'Live Cattle futuros, convertido p/ BRL/arroba' },
  trigo:     { symbol: 'ZW=F', exchange: 'CBOT — Chicago', note: 'Futuros de trigo, convertido p/ BRL' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtBRL(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

/** Reduce dataset to at most maxPts samples, always keeping last point */
function sample<T>(arr: T[], maxPts: number): T[] {
  if (arr.length <= maxPts) return arr
  const step = Math.ceil(arr.length / maxPts)
  const out: T[] = []
  for (let i = 0; i < arr.length; i++) {
    if (i % step === 0 || i === arr.length - 1) out.push(arr[i])
  }
  return out
}

// ─── Sparkline chart (pure Views) ────────────────────────────────────────────

interface SparklineProps {
  data: { timestamp: string; price: number }[]
  height?: number
  upColor?: string
  downColor?: string
}

function Sparkline({ data, height = 130, upColor = colors.success, downColor = colors.error }: SparklineProps) {
  if (!data.length) return (
    <View style={[spark.container, { height }]}>
      <Text style={spark.empty}>Sem dados suficientes</Text>
    </View>
  )

  const pts = sample(data, 60)
  const prices = pts.map((d) => d.price)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const range = max - min || 1
  const first = prices[0]
  const last = prices[prices.length - 1]
  const isUp = last >= first
  const barColor = isUp ? upColor : downColor
  const barBg = isUp ? '#dcfce7' : '#fee2e2'

  const normalize = (p: number) => Math.max(6, ((p - min) / range) * (height - 24))

  return (
    <View style={[spark.container, { height: height + 24, backgroundColor: barBg }]}>
      {/* Horizontal reference lines */}
      <View style={[spark.refLine, { bottom: height * 0.25 + 12 }]} />
      <View style={[spark.refLine, { bottom: height * 0.5 + 12 }]} />
      <View style={[spark.refLine, { bottom: height * 0.75 + 12 }]} />

      {/* Bars */}
      <View style={spark.barsRow}>
        {pts.map((pt, i) => {
          const h = normalize(pt.price)
          const isLast = i === pts.length - 1
          return (
            <View
              key={i}
              style={[
                spark.bar,
                {
                  height: h,
                  backgroundColor: isLast ? barColor : barColor + '99',
                  borderTopLeftRadius: 2,
                  borderTopRightRadius: 2,
                },
              ]}
            />
          )
        })}
      </View>

      {/* Min/Max labels */}
      <View style={spark.labels}>
        <Text style={[spark.label, { color: downColor }]}>↓ R$ {fmtBRL(min)}</Text>
        <Text style={[spark.label, { color: upColor }]}>↑ R$ {fmtBRL(max)}</Text>
      </View>
    </View>
  )
}

const spark = StyleSheet.create({
  container: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'flex-end',
    paddingBottom: 4,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 1,
    paddingHorizontal: 6,
    paddingBottom: 4,
  },
  bar: { flex: 1, minWidth: 2 },
  refLine: {
    position: 'absolute', left: 0, right: 0, height: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xs,
  },
  label: { ...typography.caption, fontWeight: '700' },
  empty: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginTop: 40 },
})

// ─── Alert Modal ──────────────────────────────────────────────────────────────

function AlertModal({ price, onClose }: { price: MarketPrice; onClose: () => void }) {
  const [condition, setCondition] = useState<'above' | 'below'>('above')
  const [target, setTarget] = useState(String(Math.round(price.price)))
  const create = useCreatePriceAlert()
  const unitLabel = price.unit === 'saca_60kg' ? '/sc' : price.unit === 'arroba' ? '/@' : '/t'

  const save = () => {
    const val = parseFloat(target.replace(',', '.'))
    if (!val || val <= 0) { Alert.alert('Valor inválido', 'Informe um preço válido.'); return }
    create.mutate(
      { culture: price.culture, targetPrice: val, condition },
      { onSuccess: onClose, onError: () => Alert.alert('Erro', 'Não foi possível criar o alerta.') }
    )
  }

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={am.overlay}>
        <View style={am.sheet}>
          <View style={am.handle} />
          <View style={am.header}>
            <Text style={am.title}>
              {CULTURE_ICONS[price.culture]} Alerta · {CULTURE_LABELS[price.culture]}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={am.sub}>Cotação atual: R$ {fmtBRL(price.price)}{unitLabel}</Text>

          <Text style={am.fieldLabel}>Condição</Text>
          <View style={am.row}>
            {(['above', 'below'] as const).map((c) => (
              <TouchableOpacity key={c} style={[am.chip, condition === c && am.chipActive]} onPress={() => setCondition(c)}>
                <Ionicons name={c === 'above' ? 'trending-up' : 'trending-down'} size={14}
                  color={condition === c ? colors.white : colors.textSecondary} />
                <Text style={[am.chipText, condition === c && { color: colors.white }]}>
                  {c === 'above' ? 'Subir acima de' : 'Cair abaixo de'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={am.fieldLabel}>Preço alvo (R${unitLabel})</Text>
          <TextInput style={am.input} value={target} onChangeText={setTarget}
            keyboardType="decimal-pad" placeholder="Ex: 125,00" placeholderTextColor={colors.textMuted} />

          <View style={am.actions}>
            <TouchableOpacity style={am.cancelBtn} onPress={onClose}>
              <Text style={am.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[am.saveBtn, create.isPending && { opacity: 0.6 }]}
              onPress={save} disabled={create.isPending}>
              {create.isPending
                ? <ActivityIndicator color={colors.white} size="small" />
                : <Text style={am.saveText}>Criar Alerta</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const am = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, padding: spacing.lg, paddingBottom: spacing.xl },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { ...typography.h4, color: colors.text },
  sub: { ...typography.bodySmall, color: colors.textMuted, marginBottom: spacing.lg },
  fieldLabel: { ...typography.label, color: colors.textSecondary, marginBottom: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  chip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 1.5, borderColor: colors.border, borderRadius: borderRadius.md, padding: spacing.sm },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.label, color: colors.textSecondary },
  input: { borderWidth: 1.5, borderColor: colors.border, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, ...typography.h3, color: colors.text, marginBottom: spacing.lg },
  actions: { flexDirection: 'row', gap: spacing.sm },
  cancelBtn: { flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: borderRadius.md, padding: spacing.md, alignItems: 'center' },
  cancelText: { ...typography.label, color: colors.textSecondary },
  saveBtn: { flex: 2, backgroundColor: colors.primary, borderRadius: borderRadius.md, padding: spacing.md, alignItems: 'center' },
  saveText: { ...typography.label, color: colors.white },
})

// ─── Main screen ──────────────────────────────────────────────────────────────

const PERIODS = [
  { label: '7D',  days: 7 },
  { label: '15D', days: 15 },
  { label: '30D', days: 30 },
] as const

export default function CultureDetailScreen() {
  const { culture } = useLocalSearchParams<{ culture: Culture }>()
  const [days, setDays] = useState<7 | 15 | 30>(30)
  const [showAlert, setShowAlert] = useState(false)

  const { data: prices } = useMarketPrices()
  const { data: history, isLoading: histLoading } = usePriceHistory(culture, days)

  const price = prices?.find((p) => p.culture === culture)

  const stats = useMemo(() => {
    if (!history?.length) return null
    const vals = history.map((h: any) => h.price as number)
    const high = Math.max(...vals)
    const low  = Math.min(...vals)
    const avg  = vals.reduce((s: number, v: number) => s + v, 0) / vals.length
    const first = vals[0]
    const last  = vals[vals.length - 1]
    const pctChange = first > 0 ? ((last - first) / first) * 100 : 0
    return { high, low, avg, pctChange }
  }, [history])

  const recentHistory: any[] = useMemo(() => {
    if (!history?.length) return []
    return [...history].reverse().slice(0, 15)
  }, [history])

  const isUp = (price?.variation24h ?? 0) >= 0
  const contract = contract_for(culture)

  if (!price) {
    return (
      <SafeAreaView style={s.container}>
        <TouchableOpacity style={s.backRow} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      </SafeAreaView>
    )
  }

  const unitLabel = price.unit === 'saca_60kg' ? '/sc' : price.unit === 'arroba' ? '/@' : '/t'

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerIcon}>{CULTURE_ICONS[culture] ?? '📊'}</Text>
          <Text style={s.headerTitle}>{CULTURE_LABELS[culture]}</Text>
        </View>
        <TouchableOpacity onPress={() => setShowAlert(true)} hitSlop={12}>
          <Ionicons name="notifications-outline" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── Hero price ── */}
        <View style={s.heroCard}>
          <Text style={s.heroLabel}>Cotação atual</Text>
          <View style={s.heroRow}>
            <Text style={s.heroPrice}>R$ {fmtBRL(price.price)}</Text>
            <Text style={s.heroUnit}>{unitLabel}</Text>
          </View>
          <View style={[s.variationPill, { backgroundColor: isUp ? '#dcfce7' : '#fee2e2' }]}>
            <Ionicons name={isUp ? 'trending-up' : 'trending-down'} size={16}
              color={isUp ? colors.success : colors.error} />
            <Text style={[s.variationText, { color: isUp ? colors.success : colors.error }]}>
              {isUp ? '+' : ''}R$ {fmtBRL(price.variation24h)}
              {'  '}
              {isUp ? '+' : ''}{price.variationPercent24h?.toFixed(2)}% nas últ. 24h
            </Text>
          </View>
          <Text style={s.updatedAt}>
            Atualizado às {fmtTime(price.updatedAt)}
          </Text>
        </View>

        {/* ── Stats row ── */}
        {stats && (
          <View style={s.statsCard}>
            <StatBox label={`Máxima ${days}D`} value={`R$ ${fmtBRL(stats.high)}`} color={colors.success} />
            <View style={s.statDivider} />
            <StatBox label={`Mínima ${days}D`} value={`R$ ${fmtBRL(stats.low)}`} color={colors.error} />
            <View style={s.statDivider} />
            <StatBox label={`Média ${days}D`} value={`R$ ${fmtBRL(stats.avg)}`} />
            <View style={s.statDivider} />
            <StatBox
              label={`Var. ${days}D`}
              value={`${stats.pctChange >= 0 ? '+' : ''}${stats.pctChange.toFixed(2)}%`}
              color={stats.pctChange >= 0 ? colors.success : colors.error}
            />
          </View>
        )}

        {/* ── Chart ── */}
        <View style={s.chartCard}>
          <View style={s.chartHeader}>
            <Text style={s.chartTitle}>Histórico de Preço</Text>
            <View style={s.periodRow}>
              {PERIODS.map((p) => (
                <TouchableOpacity
                  key={p.days}
                  style={[s.periodBtn, days === p.days && s.periodBtnActive]}
                  onPress={() => setDays(p.days)}
                >
                  <Text style={[s.periodText, days === p.days && s.periodTextActive]}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {histLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.xl }} />
          ) : (
            <Sparkline
              data={history ?? []}
              height={140}
              upColor={colors.success}
              downColor={colors.error}
            />
          )}

          {/* Date axis hints */}
          {!histLoading && !!history?.length && (
            <View style={s.dateAxis}>
              <Text style={s.dateAxisLabel}>{fmtDate(history[0].timestamp)}</Text>
              <Text style={s.dateAxisLabel}>{fmtDate(history[Math.floor(history.length / 2)].timestamp)}</Text>
              <Text style={s.dateAxisLabel}>{fmtDate(history[history.length - 1].timestamp)}</Text>
            </View>
          )}
        </View>

        {/* ── Recent history list ── */}
        <View style={s.historyCard}>
          <Text style={s.sectionTitle}>Últimas Atualizações</Text>
          {recentHistory.length === 0 && !histLoading && (
            <Text style={s.emptyText}>Nenhum histórico disponível ainda.</Text>
          )}
          {recentHistory.map((h: any, i: number) => {
            const prevPrice = recentHistory[i + 1]?.price
            const delta = prevPrice ? h.price - prevPrice : 0
            const up = delta >= 0
            return (
              <View key={i} style={[s.histRow, i < recentHistory.length - 1 && s.histRowBorder]}>
                <View>
                  <Text style={s.histDate}>{fmtDate(h.timestamp)}</Text>
                  <Text style={s.histTime}>{fmtTime(h.timestamp)}</Text>
                </View>
                <Text style={s.histPrice}>R$ {fmtBRL(h.price)}</Text>
                {prevPrice ? (
                  <Text style={[s.histDelta, { color: up ? colors.success : colors.error }]}>
                    {up ? '+' : ''}{fmtBRL(delta)}
                  </Text>
                ) : (
                  <Text style={s.histDeltaEmpty}>—</Text>
                )}
              </View>
            )
          })}
        </View>

        {/* ── Alert CTA ── */}
        <TouchableOpacity style={s.alertCta} onPress={() => setShowAlert(true)}>
          <Ionicons name="notifications" size={20} color={colors.white} />
          <Text style={s.alertCtaText}>Criar Alerta de Preço</Text>
        </TouchableOpacity>

        {/* ── Source info ── */}
        <View style={s.sourceCard}>
          <Text style={s.sourceTitle}>Sobre esta cotação</Text>

          <InfoRow icon="swap-horizontal" label="Unidade" value={UNIT_LABELS[price.unit] ?? price.unit} />
          <InfoRow icon="globe-outline" label="Fonte" value={
            price.source === 'B3' ? 'Bolsas internacionais (convertido p/ BRL)' :
            price.source === 'CEPEA' ? 'CEPEA/ESALQ — USP' : 'Preço indicativo regional (CONAB base)'
          } />

          {contract && (
            <>
              <InfoRow icon="bar-chart-outline" label="Contrato" value={`${contract.symbol} · ${contract.exchange}`} />
              <InfoRow icon="information-circle-outline" label="Metodologia" value={contract.note} />
            </>
          )}

          <InfoRow icon="time-outline" label="Atualização" value="Automática a cada 15 minutos" />
          <InfoRow icon="alert-circle-outline" label="Aviso"
            value="Cotações para referência. Preços reais podem variar conforme praça e qualidade." />
        </View>

      </ScrollView>

      {showAlert && <AlertModal price={price} onClose={() => setShowAlert(false)} />}
    </SafeAreaView>
  )
}

function StatBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={s.statBox}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={[s.statValue, color ? { color } : {}]}>{value}</Text>
    </View>
  )
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={s.infoRow}>
      <Ionicons name={icon as any} size={16} color={colors.primary} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={s.infoValue}>{value}</Text>
      </View>
    </View>
  )
}

function contract_for(culture: Culture) {
  return CONTRACT_INFO[culture] ?? null
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  backRow: { padding: spacing.md },

  header: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  headerIcon: { fontSize: 22 },
  headerTitle: { ...typography.h4, color: colors.white },

  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },

  // Hero
  heroCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },
  heroLabel: { ...typography.label, color: colors.textMuted, marginBottom: spacing.xs },
  heroRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs, marginBottom: spacing.sm },
  heroPrice: { fontSize: 40, fontWeight: '800', color: colors.text, lineHeight: 48 },
  heroUnit: { ...typography.body, color: colors.textSecondary },
  variationPill: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm, paddingVertical: 5,
    borderRadius: borderRadius.full,
    marginBottom: spacing.xs,
  },
  variationText: { ...typography.label },
  updatedAt: { ...typography.caption, color: colors.textMuted },

  // Stats
  statsCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    padding: spacing.md,
    ...shadows.sm,
  },
  statBox: { flex: 1, alignItems: 'center', gap: 4 },
  statLabel: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
  statValue: { ...typography.label, color: colors.text, textAlign: 'center' },
  statDivider: { width: 1, backgroundColor: colors.border, marginVertical: spacing.xs },

  // Chart
  chartCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  chartTitle: { ...typography.h4, color: colors.text },
  periodRow: { flexDirection: 'row', gap: spacing.xs },
  periodBtn: {
    paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.background,
  },
  periodBtnActive: { backgroundColor: colors.primary },
  periodText: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
  periodTextActive: { color: colors.white },
  dateAxis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
  dateAxisLabel: { ...typography.caption, color: colors.textMuted },

  // History list
  historyCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  sectionTitle: { ...typography.h4, color: colors.text, marginBottom: spacing.sm },
  emptyText: { ...typography.bodySmall, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.md },
  histRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  histRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  histDate: { ...typography.label, color: colors.text },
  histTime: { ...typography.caption, color: colors.textMuted },
  histPrice: { ...typography.body, color: colors.text, fontWeight: '600', flex: 1, textAlign: 'right' },
  histDelta: { ...typography.label, width: 72, textAlign: 'right' },
  histDeltaEmpty: { ...typography.label, color: colors.textMuted, width: 72, textAlign: 'right' },

  // Alert CTA
  alertCta: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    ...shadows.sm,
  },
  alertCtaText: { ...typography.h4, color: colors.white },

  // Source info
  sourceCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
    gap: spacing.sm,
  },
  sourceTitle: { ...typography.h4, color: colors.text },
  infoRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  infoLabel: { ...typography.caption, color: colors.textMuted },
  infoValue: { ...typography.bodySmall, color: colors.text },
})
