import { useState, useMemo } from 'react'
import {
  ScrollView, View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Modal, TextInput,
  FlatList, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import {
  useMarketPrices, usePriceAlerts, useCreatePriceAlert,
  useDeletePriceAlert, useOffers,
} from '../../hooks/useMarket.js'
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme.js'
import type { MarketPrice, Culture, PriceAlert, Offer } from '@agrolink/types'

// ─── Data ─────────────────────────────────────────────────────────────────────

const CULTURE_LABELS: Record<Culture, string> = {
  soja: 'Soja', milho: 'Milho', algodao: 'Algodão', cafe: 'Café',
  boi_gordo: 'Boi Gordo', trigo: 'Trigo', arroz: 'Arroz',
  feijao: 'Feijão', cana: 'Cana', eucalipto: 'Eucalipto',
}

const CULTURE_ICONS: Partial<Record<Culture, string>> = {
  soja: '🌿', milho: '🌽', algodao: '☁️', cafe: '☕',
  boi_gordo: '🐄', trigo: '🌾', arroz: '🍚', feijao: '🫘',
  cana: '🎋', eucalipto: '🌳',
}

const CULTURES: Culture[] = ['soja', 'milho', 'algodao', 'cafe', 'boi_gordo', 'trigo', 'arroz', 'feijao', 'cana', 'eucalipto']

const BR_STATES = [
  { uf: 'AC', name: 'Acre' }, { uf: 'AL', name: 'Alagoas' },
  { uf: 'AM', name: 'Amazonas' }, { uf: 'AP', name: 'Amapá' },
  { uf: 'BA', name: 'Bahia' }, { uf: 'CE', name: 'Ceará' },
  { uf: 'DF', name: 'Distrito Federal' }, { uf: 'ES', name: 'Espírito Santo' },
  { uf: 'GO', name: 'Goiás' }, { uf: 'MA', name: 'Maranhão' },
  { uf: 'MG', name: 'Minas Gerais' }, { uf: 'MS', name: 'Mato Grosso do Sul' },
  { uf: 'MT', name: 'Mato Grosso' }, { uf: 'PA', name: 'Pará' },
  { uf: 'PB', name: 'Paraíba' }, { uf: 'PE', name: 'Pernambuco' },
  { uf: 'PI', name: 'Piauí' }, { uf: 'PR', name: 'Paraná' },
  { uf: 'RJ', name: 'Rio de Janeiro' }, { uf: 'RN', name: 'Rio Grande do Norte' },
  { uf: 'RO', name: 'Rondônia' }, { uf: 'RR', name: 'Roraima' },
  { uf: 'RS', name: 'Rio Grande do Sul' }, { uf: 'SC', name: 'Santa Catarina' },
  { uf: 'SE', name: 'Sergipe' }, { uf: 'SP', name: 'São Paulo' },
  { uf: 'TO', name: 'Tocantins' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function unitLabel(unit?: string) {
  if (unit === 'saca_60kg') return '/sc'
  if (unit === 'arroba') return '/@'
  return '/t'
}

// ─── State Picker Modal ───────────────────────────────────────────────────────

function StatePickerModal({
  visible, selected, onSelect, onClose,
}: {
  visible: boolean; selected: string; onSelect: (uf: string) => void; onClose: () => void
}) {
  const [search, setSearch] = useState('')
  const filtered = BR_STATES.filter(
    (s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.uf.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={picker.container} edges={['top']}>
        <View style={picker.header}>
          <Text style={picker.title}>Selecionar Estado</Text>
          <TouchableOpacity onPress={onClose} style={picker.closeBtn}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* All Brazil option */}
        <TouchableOpacity
          style={[picker.stateRow, !selected && picker.stateRowActive]}
          onPress={() => { onSelect(''); onClose() }}>
          <View style={picker.stateFlag}>
            <Text style={{ fontSize: 18 }}>🇧🇷</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[picker.stateName, !selected && picker.stateNameActive]}>Todo o Brasil</Text>
            <Text style={picker.stateSub}>Médias nacionais</Text>
          </View>
          {!selected && <Ionicons name="checkmark" size={18} color={colors.primary} />}
        </TouchableOpacity>

        <View style={picker.searchWrap}>
          <Ionicons name="search-outline" size={16} color={colors.textMuted} />
          <TextInput
            style={picker.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar estado..."
            placeholderTextColor={colors.textMuted}
            autoFocus
          />
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(i) => i.uf}
          renderItem={({ item }) => {
            const active = selected === item.uf
            return (
              <TouchableOpacity
                style={[picker.stateRow, active && picker.stateRowActive]}
                onPress={() => { onSelect(item.uf); onClose() }}>
                <View style={[picker.stateFlag, active && picker.stateFlagActive]}>
                  <Text style={[picker.stateUf, active && { color: colors.white }]}>{item.uf}</Text>
                </View>
                <Text style={[picker.stateName, active && picker.stateNameActive]}>{item.name}</Text>
                {active && <Ionicons name="checkmark" size={18} color={colors.primary} />}
              </TouchableOpacity>
            )
          }}
          keyboardShouldPersistTaps="handled"
        />
      </SafeAreaView>
    </Modal>
  )
}

const picker = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  title: { fontSize: 17, fontWeight: '700' as const, color: colors.text },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, margin: spacing.md, backgroundColor: colors.surface, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1.5, borderColor: colors.border },
  searchInput: { flex: 1, fontSize: 14, color: colors.text, padding: 0 },
  stateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  stateRowActive: { backgroundColor: colors.primary + '08' },
  stateFlag: { width: 42, height: 42, borderRadius: 10, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: colors.border },
  stateFlagActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  stateUf: { fontSize: 13, fontWeight: '800' as const, color: colors.text },
  stateName: { flex: 1, fontSize: 15, fontWeight: '500' as const, color: colors.text },
  stateNameActive: { fontWeight: '700' as const, color: colors.primary },
  stateSub: { fontSize: 12, color: colors.textMuted },
})

// ─── Create Alert Modal ───────────────────────────────────────────────────────

function CreateAlertModal({ price, onClose }: { price: MarketPrice | null; onClose: () => void }) {
  const [condition, setCondition] = useState<'above' | 'below'>('above')
  const [targetPrice, setTargetPrice] = useState(price ? String(Math.round(price.price)) : '')
  const create = useCreatePriceAlert()

  if (!price) return null
  const ul = unitLabel(price.unit)

  const handleSave = () => {
    const val = parseFloat(targetPrice.replace(',', '.'))
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
          <View style={am.row}>
            <Text style={am.title}>{CULTURE_ICONS[price.culture] ?? '📊'} Alerta de {CULTURE_LABELS[price.culture]}</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={colors.textSecondary} /></TouchableOpacity>
          </View>
          <Text style={am.currentLabel}>Cotação atual</Text>
          <Text style={am.currentPrice}>R$ {fmt(price.price)}<Text style={am.unit}>{ul}</Text></Text>

          <Text style={am.label}>Condição</Text>
          <View style={am.condRow}>
            {(['above', 'below'] as const).map((c) => (
              <TouchableOpacity key={c} style={[am.condBtn, condition === c && am.condBtnActive]} onPress={() => setCondition(c)}>
                <Ionicons name={c === 'above' ? 'trending-up' : 'trending-down'} size={16} color={condition === c ? colors.white : colors.textSecondary} />
                <Text style={[am.condText, condition === c && am.condTextActive]}>{c === 'above' ? 'Subir acima de' : 'Cair abaixo de'}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={am.label}>Preço alvo (R${ul})</Text>
          <TextInput style={am.input} value={targetPrice} onChangeText={setTargetPrice} keyboardType="decimal-pad" placeholder="Ex: 125,00" placeholderTextColor={colors.textMuted} />

          <View style={am.actions}>
            <TouchableOpacity style={am.cancelBtn} onPress={onClose}><Text style={am.cancelText}>Cancelar</Text></TouchableOpacity>
            <TouchableOpacity style={[am.saveBtn, create.isPending && { opacity: 0.6 }]} onPress={handleSave} disabled={create.isPending}>
              {create.isPending ? <ActivityIndicator color={colors.white} size="small" /> : <Text style={am.saveText}>Criar Alerta</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const am = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.lg, paddingBottom: spacing.xl },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.lg },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  title: { fontSize: 16, fontWeight: '700' as const, color: colors.text },
  currentLabel: { fontSize: 11, color: colors.textMuted, marginBottom: 2 },
  currentPrice: { fontSize: 28, fontWeight: '800' as const, color: colors.primary, marginBottom: spacing.lg },
  unit: { fontSize: 15, color: colors.textSecondary, fontWeight: '400' as const },
  label: { fontSize: 12, fontWeight: '600' as const, color: colors.textSecondary, marginBottom: spacing.sm, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  condRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  condBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, borderWidth: 1.5, borderColor: colors.border, borderRadius: borderRadius.lg, padding: spacing.sm },
  condBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  condText: { fontSize: 13, fontWeight: '600' as const, color: colors.textSecondary },
  condTextActive: { color: colors.white },
  input: { borderWidth: 1.5, borderColor: colors.border, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 22, fontWeight: '700' as const, color: colors.text, marginBottom: spacing.lg },
  actions: { flexDirection: 'row', gap: spacing.sm },
  cancelBtn: { flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: borderRadius.lg, padding: spacing.md, alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '600' as const, color: colors.textSecondary },
  saveBtn: { flex: 2, backgroundColor: colors.primary, borderRadius: borderRadius.lg, padding: spacing.md, alignItems: 'center' },
  saveText: { fontSize: 14, fontWeight: '700' as const, color: colors.white },
})

// ─── National Price Card ──────────────────────────────────────────────────────

function PriceCard({ price, onAlertPress }: { price: MarketPrice; onAlertPress: (p: MarketPrice) => void }) {
  const isPositive = price.variation24h >= 0
  const ul = unitLabel(price.unit)

  return (
    <TouchableOpacity
      style={s.priceCard}
      onPress={() => router.push(`/market/${price.culture}` as any)}
      activeOpacity={0.78}>
      <View style={s.pcTop}>
        <Text style={s.pcIcon}>{CULTURE_ICONS[price.culture] ?? '📊'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.pcName}>{CULTURE_LABELS[price.culture]}</Text>
          <Text style={s.pcSource}>
            {price.source === 'B3' ? 'CBOT/ICE/CME → BRL' : price.source === 'CEPEA' ? 'CEPEA/ESALQ' : 'Preço indicativo'}
          </Text>
        </View>
        <View style={[s.varBadge, { backgroundColor: isPositive ? '#dcfce7' : '#fee2e2' }]}>
          <Ionicons name={isPositive ? 'trending-up' : 'trending-down'} size={12} color={isPositive ? colors.success : colors.error} />
          <Text style={[s.varText, { color: isPositive ? colors.success : colors.error }]}>
            {isPositive ? '+' : ''}{price.variationPercent24h?.toFixed(2)}%
          </Text>
        </View>
      </View>

      <View style={s.pcPriceRow}>
        <Text style={s.pcPrice}>R$ {fmt(price.price)}</Text>
        <Text style={s.pcUnit}>{ul}</Text>
      </View>

      <View style={s.pcFooter}>
        <Text style={s.pcUpdated}>
          Atualizado {new Date(price.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </Text>
        <View style={s.pcActions}>
          <TouchableOpacity style={s.alertBtn} onPress={(e) => { e.stopPropagation?.(); onAlertPress(price) }}>
            <Ionicons name="notifications-outline" size={14} color={colors.primary} />
            <Text style={s.alertBtnText}>Criar alerta</Text>
          </TouchableOpacity>
          <View style={s.detailHint}>
            <Text style={s.detailHintText}>Histórico</Text>
            <Ionicons name="chevron-forward" size={13} color={colors.textMuted} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  )
}

// ─── Regional Price Card (based on local offers) ──────────────────────────────

function RegionalPriceCard({
  culture, offers, nationalPrice,
}: {
  culture: Culture; offers: Offer[]; nationalPrice?: MarketPrice
}) {
  const cultureOffers = offers.filter((o) => o.culture === culture)
  if (!cultureOffers.length) return null

  const sellOffers = cultureOffers.filter((o) => o.type === 'sell')
  const buyOffers = cultureOffers.filter((o) => o.type === 'buy')

  const avg = (arr: Offer[]) =>
    arr.length ? arr.reduce((s, o) => s + o.pricePerUnit, 0) / arr.length : null

  const avgSell = avg(sellOffers)
  const avgBuy = avg(buyOffers)
  const refPrice = nationalPrice?.price ?? 0
  const ul = unitLabel(nationalPrice?.unit ?? cultureOffers[0]?.unit)

  const delta = avgSell && refPrice ? ((avgSell - refPrice) / refPrice) * 100 : null

  return (
    <View style={s.regCard}>
      <View style={s.regHeader}>
        <Text style={s.regIcon}>{CULTURE_ICONS[culture] ?? '📊'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.regName}>{CULTURE_LABELS[culture]}</Text>
          <Text style={s.regOfferCount}>{cultureOffers.length} {cultureOffers.length === 1 ? 'oferta local' : 'ofertas locais'}</Text>
        </View>
        {delta != null && (
          <View style={[s.deltaBadge, { backgroundColor: delta >= 0 ? '#dcfce7' : '#fee2e2' }]}>
            <Text style={[s.deltaText, { color: delta >= 0 ? colors.success : colors.error }]}>
              {delta >= 0 ? '+' : ''}{delta.toFixed(1)}% vs ref.
            </Text>
          </View>
        )}
      </View>

      <View style={s.regPriceGrid}>
        {avgSell != null && (
          <View style={s.regPriceItem}>
            <Text style={s.regPriceLabel}>Venda (média)</Text>
            <Text style={[s.regPriceValue, { color: colors.success }]}>R$ {fmt(avgSell)}<Text style={s.regUnit}>{ul}</Text></Text>
            <Text style={s.regPriceCount}>{sellOffers.length} oferta{sellOffers.length !== 1 ? 's' : ''}</Text>
          </View>
        )}
        {avgBuy != null && (
          <View style={[s.regPriceItem, avgSell != null && { borderLeftWidth: 1, borderLeftColor: colors.border, paddingLeft: spacing.md }]}>
            <Text style={s.regPriceLabel}>Compra (média)</Text>
            <Text style={[s.regPriceValue, { color: colors.info }]}>R$ {fmt(avgBuy)}<Text style={s.regUnit}>{ul}</Text></Text>
            <Text style={s.regPriceCount}>{buyOffers.length} oferta{buyOffers.length !== 1 ? 's' : ''}</Text>
          </View>
        )}
      </View>

      {refPrice > 0 && (
        <View style={s.refRow}>
          <Ionicons name="information-circle-outline" size={13} color={colors.textMuted} />
          <Text style={s.refText}>Referência nacional (CBOT): R$ {fmt(refPrice)}{ul}</Text>
        </View>
      )}
    </View>
  )
}

// ─── Prices by State Tab ──────────────────────────────────────────────────────

function PricesByStateTab({ nationalPrices }: { nationalPrices: MarketPrice[] }) {
  const [selectedState, setSelectedState] = useState('')
  const [selectedCulture, setSelectedCulture] = useState<Culture | 'all'>('all')
  const [showPicker, setShowPicker] = useState(false)

  const { data: localOffers, isLoading } = useOffers({
    state: selectedState || undefined,
    culture: selectedCulture !== 'all' ? selectedCulture : undefined,
  })

  const stateName = selectedState
    ? BR_STATES.find((s) => s.uf === selectedState)?.name ?? selectedState
    : 'Todo o Brasil'

  const culturesWithOffers = useMemo(() => {
    if (!localOffers?.length) return []
    const seen = new Set(localOffers.map((o) => o.culture))
    return CULTURES.filter((c) => seen.has(c))
  }, [localOffers])

  const nationalMap = useMemo(() => {
    const m: Partial<Record<Culture, MarketPrice>> = {}
    for (const p of nationalPrices) m[p.culture] = p
    return m
  }, [nationalPrices])

  return (
    <ScrollView contentContainerStyle={s.stateContent} showsVerticalScrollIndicator={false}>
      {/* Location selector */}
      <View style={s.locationCard}>
        <View style={s.locationCardTop}>
          <View style={s.locationIcon}>
            <Ionicons name="location" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.locationLabel}>Localização selecionada</Text>
            <Text style={s.locationValue}>{stateName}</Text>
          </View>
          <TouchableOpacity style={s.changeBtn} onPress={() => setShowPicker(true)}>
            <Ionicons name="chevron-down" size={14} color={colors.primary} />
            <Text style={s.changeBtnText}>Alterar</Text>
          </TouchableOpacity>
        </View>
        <Text style={s.locationNote}>
          {selectedState
            ? `Mostrando ofertas reais registradas em ${stateName} por produtores e cooperativas da rede AgroLink.`
            : 'Mostrando ofertas de todo o Brasil. Selecione um estado para ver preços regionais.'}
        </Text>
      </View>

      {/* Culture filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.cultureFilterBar}
        contentContainerStyle={s.cultureFilterContent}>
        <TouchableOpacity
          style={[s.cultureChip, selectedCulture === 'all' && s.cultureChipActive]}
          onPress={() => setSelectedCulture('all')}>
          <Text style={[s.cultureChipText, selectedCulture === 'all' && s.cultureChipTextActive]}>Todos</Text>
        </TouchableOpacity>
        {CULTURES.map((c) => (
          <TouchableOpacity key={c}
            style={[s.cultureChip, selectedCulture === c && s.cultureChipActive]}
            onPress={() => setSelectedCulture(c)}>
            <Text style={s.cultureChipEmoji}>{CULTURE_ICONS[c] ?? ''}</Text>
            <Text style={[s.cultureChipText, selectedCulture === c && s.cultureChipTextActive]}>
              {CULTURE_LABELS[c]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : culturesWithOffers.length === 0 ? (
        <View style={s.emptyState}>
          <View style={s.emptyIcon}><Ionicons name="bar-chart-outline" size={36} color={colors.primary} /></View>
          <Text style={s.emptyTitle}>Nenhuma oferta encontrada</Text>
          <Text style={s.emptyText}>
            {selectedState
              ? `Ainda não há ofertas cadastradas em ${stateName} para ${selectedCulture !== 'all' ? CULTURE_LABELS[selectedCulture] : 'este filtro'}.`
              : 'Nenhuma oferta ativa no momento. Tente filtrar por cultura.'}
          </Text>
          <TouchableOpacity style={s.emptyAction} onPress={() => router.push('/(tabs)/offers' as any)}>
            <Ionicons name="add" size={14} color={colors.white} />
            <Text style={s.emptyActionText}>Publicar oferta</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={s.regList}>
          <View style={s.regSectionHeader}>
            <Text style={s.regSectionTitle}>Preços praticados no mercado</Text>
            <Text style={s.regSectionSub}>Baseado em {localOffers?.length ?? 0} oferta{(localOffers?.length ?? 0) !== 1 ? 's' : ''} ativas</Text>
          </View>
          {culturesWithOffers.map((c) => (
            <RegionalPriceCard
              key={c}
              culture={c}
              offers={localOffers ?? []}
              nationalPrice={nationalMap[c]}
            />
          ))}
        </View>
      )}

      <StatePickerModal
        visible={showPicker}
        selected={selectedState}
        onSelect={setSelectedState}
        onClose={() => setShowPicker(false)}
      />
    </ScrollView>
  )
}

// ─── Alert Row ────────────────────────────────────────────────────────────────

function AlertRow({ alert, onDelete }: { alert: PriceAlert; onDelete: (id: string) => void }) {
  return (
    <View style={s.alertRow}>
      <Text style={{ fontSize: 22 }}>{CULTURE_ICONS[alert.culture] ?? '📊'}</Text>
      <View style={{ flex: 1 }}>
        <Text style={s.alertCulture}>{CULTURE_LABELS[alert.culture]}</Text>
        <Text style={s.alertCondition}>
          {alert.condition === 'above' ? '↑ Subir acima de' : '↓ Cair abaixo de'}{' '}
          <Text style={{ fontWeight: '700' as const, color: colors.text }}>R$ {fmt(alert.targetPrice)}</Text>
        </Text>
        {alert.triggeredAt && (
          <Text style={s.triggeredAt}>Ativado em {new Date(alert.triggeredAt).toLocaleDateString('pt-BR')}</Text>
        )}
      </View>
      <View style={s.alertRight}>
        <View style={[s.alertBadge, !alert.active && s.alertBadgeTriggered]}>
          <Text style={[s.alertBadgeText, !alert.active && { color: colors.warning }]}>
            {alert.active ? 'Ativo' : 'Ativado'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => Alert.alert('Excluir alerta', 'Deseja remover este alerta?', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Excluir', style: 'destructive', onPress: () => onDelete(alert.id) },
          ])}>
          <Ionicons name="trash-outline" size={18} color={colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

type Tab = 'prices' | 'regional' | 'alerts'

export default function MarketScreen() {
  const { data: prices, isLoading, refetch } = useMarketPrices()
  const { data: alerts, isLoading: alertsLoading } = usePriceAlerts()
  const deleteAlert = useDeletePriceAlert()
  const [tab, setTab] = useState<Tab>('prices')
  const [alertTarget, setAlertTarget] = useState<MarketPrice | null>(null)

  const activeAlerts = alerts?.filter((a) => a.active).length ?? 0

  const TABS: { id: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'prices', label: 'Cotações', icon: 'trending-up-outline' },
    { id: 'regional', label: 'Por Estado', icon: 'location-outline' },
    { id: 'alerts', label: 'Alertas', icon: 'notifications-outline' },
  ]

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <LinearGradient colors={[colors.primaryDark, colors.primary]} style={s.header}>
        <View>
          <Text style={s.headerTitle}>Mercado Agro</Text>
          <Text style={s.headerSub}>Cotações em tempo real • CBOT/ICE/CME</Text>
        </View>
        <View style={s.headerRight}>
          <View style={s.liveDot} />
          <Text style={s.liveText}>Ao vivo</Text>
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={s.tabs}>
        {TABS.map((t) => {
          const active = tab === t.id
          return (
            <TouchableOpacity key={t.id} style={[s.tabBtn, active && s.tabBtnActive]} onPress={() => setTab(t.id)}>
              <Ionicons name={t.icon} size={14} color={active ? colors.primary : colors.textMuted} />
              <Text style={[s.tabText, active && s.tabTextActive]}>{t.label}</Text>
              {t.id === 'alerts' && activeAlerts > 0 && (
                <View style={s.tabBadge}><Text style={s.tabBadgeText}>{activeAlerts}</Text></View>
              )}
            </TouchableOpacity>
          )
        })}
      </View>

      <CreateAlertModal price={alertTarget} onClose={() => setAlertTarget(null)} />

      {/* ── Cotações nacionais ── */}
      {tab === 'prices' && (
        isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
        ) : (
          <ScrollView
            contentContainerStyle={s.content}
            refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} colors={[colors.primary]} />}
            showsVerticalScrollIndicator={false}>

            <View style={s.sectionHeader}>
              <View style={s.sectionTitleRow}>
                <Ionicons name="globe-outline" size={16} color={colors.primary} />
                <Text style={s.sectionTitle}>Referência Internacional</Text>
              </View>
              <Text style={s.sectionSub}>Convertido para BRL • Atualizado a cada 15 min</Text>
            </View>

            {(prices ?? []).map((p) => (
              <PriceCard key={p.id} price={p} onAlertPress={setAlertTarget} />
            ))}

            <View style={s.disclaimerBox}>
              <Ionicons name="information-circle-outline" size={15} color={colors.info} />
              <Text style={s.disclaimerText}>
                Preços baseados em contratos futuros da CBOT, ICE e CME convertidos pela taxa USD/BRL do momento. Valores podem variar da cotação física local. Use a aba "Por Estado" para ver preços praticados na sua região.
              </Text>
            </View>
          </ScrollView>
        )
      )}

      {/* ── Preços por estado ── */}
      {tab === 'regional' && (
        <PricesByStateTab nationalPrices={prices ?? []} />
      )}

      {/* ── Alertas ── */}
      {tab === 'alerts' && (
        alertsLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
        ) : (alerts?.length ?? 0) === 0 ? (
          <View style={s.emptyState}>
            <View style={s.emptyIcon}><Ionicons name="notifications-outline" size={36} color={colors.primary} /></View>
            <Text style={s.emptyTitle}>Nenhum alerta criado</Text>
            <Text style={s.emptyText}>Vá em "Cotações" e toque em "Criar alerta" em qualquer cultura para ser notificado.</Text>
            <TouchableOpacity style={s.emptyAction} onPress={() => setTab('prices')}>
              <Text style={s.emptyActionText}>Ver Cotações</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={alerts}
            keyExtractor={(a) => a.id}
            renderItem={({ item }) => <AlertRow alert={item} onDelete={(id) => deleteAlert.mutate(id)} />}
            contentContainerStyle={s.content}
          />
        )
      )}
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Header
  header: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800' as const, color: colors.white },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ade80' },
  liveText: { fontSize: 12, fontWeight: '700' as const, color: 'rgba(255,255,255,0.85)' },

  // Tabs
  tabs: { flexDirection: 'row', backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: spacing.sm + 2, borderBottomWidth: 2.5, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: colors.primary },
  tabText: { fontSize: 12, fontWeight: '600' as const, color: colors.textMuted },
  tabTextActive: { color: colors.primary },
  tabBadge: { backgroundColor: colors.secondary, borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
  tabBadgeText: { fontSize: 10, fontWeight: '800' as const, color: colors.white },

  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },

  // Section header
  sectionHeader: { marginBottom: spacing.xs },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 14, fontWeight: '700' as const, color: colors.text },
  sectionSub: { fontSize: 11, color: colors.textMuted, marginTop: 2 },

  // National price card
  priceCard: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, ...shadows.sm },
  pcTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  pcIcon: { fontSize: 28 },
  pcName: { fontSize: 16, fontWeight: '700' as const, color: colors.text },
  pcSource: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  varBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: borderRadius.sm },
  varText: { fontSize: 11, fontWeight: '700' as const },
  pcPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs, marginBottom: spacing.sm },
  pcPrice: { fontSize: 26, fontWeight: '800' as const, color: colors.text },
  pcUnit: { fontSize: 14, color: colors.textSecondary },
  pcFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  pcUpdated: { fontSize: 11, color: colors.textMuted },
  pcActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  alertBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  alertBtnText: { fontSize: 12, color: colors.primary, fontWeight: '600' as const },
  detailHint: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  detailHintText: { fontSize: 11, color: colors.textMuted },

  // Disclaimer
  disclaimerBox: { flexDirection: 'row', gap: spacing.xs, alignItems: 'flex-start', backgroundColor: colors.info + '0d', borderRadius: borderRadius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.info + '25', marginTop: spacing.sm },
  disclaimerText: { flex: 1, fontSize: 12, color: colors.info, lineHeight: 17 },

  // Regional / By State tab
  stateContent: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },

  locationCard: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, borderWidth: 1.5, borderColor: colors.primary + '30', gap: spacing.sm },
  locationCardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  locationIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primary + '12', justifyContent: 'center', alignItems: 'center' },
  locationLabel: { fontSize: 11, color: colors.textMuted, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  locationValue: { fontSize: 17, fontWeight: '700' as const, color: colors.text },
  changeBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs + 2, backgroundColor: colors.primary + '12', borderRadius: borderRadius.full },
  changeBtnText: { fontSize: 12, fontWeight: '700' as const, color: colors.primary },
  locationNote: { fontSize: 12, color: colors.textMuted, lineHeight: 17 },

  cultureFilterBar: { marginHorizontal: -spacing.md },
  cultureFilterContent: { paddingHorizontal: spacing.md, gap: spacing.xs, flexDirection: 'row' },
  cultureChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, borderRadius: borderRadius.full, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border },
  cultureChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  cultureChipEmoji: { fontSize: 13 },
  cultureChipText: { fontSize: 12, fontWeight: '600' as const, color: colors.textSecondary },
  cultureChipTextActive: { color: colors.white },

  regList: { gap: spacing.sm },
  regSectionHeader: { marginBottom: spacing.xs },
  regSectionTitle: { fontSize: 14, fontWeight: '700' as const, color: colors.text },
  regSectionSub: { fontSize: 11, color: colors.textMuted, marginTop: 1 },

  regCard: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, gap: spacing.sm, ...shadows.sm },
  regHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  regIcon: { fontSize: 26 },
  regName: { fontSize: 15, fontWeight: '700' as const, color: colors.text },
  regOfferCount: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  deltaBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.full },
  deltaText: { fontSize: 11, fontWeight: '700' as const },
  regPriceGrid: { flexDirection: 'row', gap: spacing.md },
  regPriceItem: { flex: 1, gap: 3 },
  regPriceLabel: { fontSize: 11, color: colors.textMuted, textTransform: 'uppercase' as const, letterSpacing: 0.3 },
  regPriceValue: { fontSize: 18, fontWeight: '800' as const },
  regUnit: { fontSize: 12, fontWeight: '400' as const, color: colors.textMuted },
  regPriceCount: { fontSize: 11, color: colors.textMuted },
  refRow: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  refText: { fontSize: 11, color: colors.textMuted },

  // Alerts
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  alertCulture: { fontSize: 14, fontWeight: '700' as const, color: colors.text },
  alertCondition: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  triggeredAt: { fontSize: 11, color: colors.warning, marginTop: 2 },
  alertRight: { alignItems: 'flex-end', gap: spacing.xs },
  alertBadge: { backgroundColor: '#dcfce7', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.sm },
  alertBadgeTriggered: { backgroundColor: '#fef3c7' },
  alertBadgeText: { fontSize: 11, fontWeight: '700' as const, color: colors.success },

  // Empty
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md, marginTop: spacing.xl },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary + '12', justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700' as const, color: colors.text },
  emptyText: { fontSize: 13, color: colors.textMuted, textAlign: 'center' as const, lineHeight: 20, maxWidth: 280 },
  emptyAction: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm + 2, borderRadius: borderRadius.full },
  emptyActionText: { fontSize: 14, fontWeight: '700' as const, color: colors.white },
})
