import { useState } from 'react'
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  FlatList,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import {
  useMarketPrices,
  usePriceAlerts,
  useCreatePriceAlert,
  useDeletePriceAlert,
} from '../../hooks/useMarket.js'
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme.js'
import type { MarketPrice, Culture, PriceAlert } from '@agrolink/types'

const CULTURE_LABELS: Record<Culture, string> = {
  soja: 'Soja',
  milho: 'Milho',
  algodao: 'Algodão',
  cafe: 'Café',
  boi_gordo: 'Boi Gordo',
  trigo: 'Trigo',
  arroz: 'Arroz',
  feijao: 'Feijão',
  cana: 'Cana',
  eucalipto: 'Eucalipto',
}

const CULTURE_ICONS: Partial<Record<Culture, string>> = {
  soja: '🌿',
  milho: '🌽',
  algodao: '☁️',
  cafe: '☕',
  boi_gordo: '🐄',
  trigo: '🌾',
  arroz: '🍚',
  feijao: '🫘',
}

// ─── Create Alert Modal ───────────────────────────────────────────────────────

interface CreateAlertModalProps {
  price: MarketPrice | null
  onClose: () => void
}

function CreateAlertModal({ price, onClose }: CreateAlertModalProps) {
  const [condition, setCondition] = useState<'above' | 'below'>('above')
  const [targetPrice, setTargetPrice] = useState(price ? String(Math.round(price.price)) : '')
  const create = useCreatePriceAlert()

  if (!price) return null

  const unitLabel = price.unit === 'saca_60kg' ? '/sc' : price.unit === 'arroba' ? '/@' : '/t'

  const handleSave = () => {
    const val = parseFloat(targetPrice.replace(',', '.'))
    if (!val || val <= 0) {
      Alert.alert('Valor inválido', 'Informe um preço válido maior que zero.')
      return
    }
    create.mutate(
      { culture: price.culture, targetPrice: val, condition },
      { onSuccess: onClose, onError: () => Alert.alert('Erro', 'Não foi possível criar o alerta.') }
    )
  }

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <View style={modal.handle} />

          <View style={modal.header}>
            <Text style={modal.title}>
              {CULTURE_ICONS[price.culture] ?? '📊'} Alerta de {CULTURE_LABELS[price.culture]}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={modal.currentLabel}>Cotação atual</Text>
          <Text style={modal.currentPrice}>
            R$ {price.price.toFixed(2).replace('.', ',')}<Text style={modal.unit}>{unitLabel}</Text>
          </Text>

          <Text style={modal.label}>Condição</Text>
          <View style={modal.conditionRow}>
            {(['above', 'below'] as const).map((c) => (
              <TouchableOpacity
                key={c}
                style={[modal.condBtn, condition === c && modal.condBtnActive]}
                onPress={() => setCondition(c)}
              >
                <Ionicons
                  name={c === 'above' ? 'trending-up' : 'trending-down'}
                  size={16}
                  color={condition === c ? colors.white : colors.textSecondary}
                />
                <Text style={[modal.condText, condition === c && modal.condTextActive]}>
                  {c === 'above' ? 'Subir acima de' : 'Cair abaixo de'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={modal.label}>Preço alvo (R${unitLabel})</Text>
          <TextInput
            style={modal.input}
            value={targetPrice}
            onChangeText={setTargetPrice}
            keyboardType="decimal-pad"
            placeholder="Ex: 125,00"
            placeholderTextColor={colors.textMuted}
          />

          <View style={modal.actions}>
            <TouchableOpacity style={modal.cancelBtn} onPress={onClose}>
              <Text style={modal.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modal.saveBtn, create.isPending && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={create.isPending}
            >
              {create.isPending ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={modal.saveText}>Criar Alerta</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

// ─── Price Card ───────────────────────────────────────────────────────────────

function PriceCard({ price, onAlertPress }: { price: MarketPrice; onAlertPress: (p: MarketPrice) => void }) {
  const isPositive = price.variation24h >= 0
  const unitLabel = price.unit === 'saca_60kg' ? '/sc' : price.unit === 'arroba' ? '/@' : '/t'

  return (
    <TouchableOpacity
      style={styles.priceCard}
      onPress={() => router.push(`/market/${price.culture}` as any)}
      activeOpacity={0.75}
    >
      <View style={styles.priceHeader}>
        <Text style={styles.cultureIcon}>{CULTURE_ICONS[price.culture] ?? '📊'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.cultureName}>{CULTURE_LABELS[price.culture]}</Text>
          <Text style={styles.priceSource}>
            {price.source === 'B3' ? 'CBOT/ICE/CME → BRL' : price.source === 'CEPEA' ? 'CEPEA/ESALQ' : 'Preço Indicativo'}
          </Text>
        </View>
        <View style={[styles.variationBadge, { backgroundColor: isPositive ? '#dcfce7' : '#fee2e2' }]}>
          <Ionicons
            name={isPositive ? 'trending-up' : 'trending-down'}
            size={12}
            color={isPositive ? colors.success : colors.error}
          />
          <Text style={[styles.variationText, { color: isPositive ? colors.success : colors.error }]}>
            {isPositive ? '+' : ''}{price.variationPercent24h?.toFixed(2)}%
          </Text>
        </View>
      </View>

      <View style={styles.priceRow}>
        <Text style={styles.price}>
          R${' '}
          {price.price
            ?.toFixed(2)
            .replace('.', ',')
            .replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
        </Text>
        <Text style={styles.priceUnit}>{unitLabel}</Text>
      </View>

      <View style={styles.priceFooter}>
        <Text style={styles.updatedAt}>
          {new Date(price.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </Text>
        <View style={styles.priceFooterRight}>
          <TouchableOpacity style={styles.alertBtn} onPress={(e) => { e.stopPropagation?.(); onAlertPress(price) }}>
            <Ionicons name="notifications-outline" size={14} color={colors.primary} />
            <Text style={styles.alertBtnText}>Alerta</Text>
          </TouchableOpacity>
          <View style={styles.detailHint}>
            <Text style={styles.detailHintText}>Ver detalhes</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  )
}

// ─── Alert Row ────────────────────────────────────────────────────────────────

function AlertRow({ alert, onDelete }: { alert: PriceAlert; onDelete: (id: string) => void }) {
  const isActive = alert.active
  return (
    <View style={styles.alertRow}>
      <Text style={styles.alertIcon}>{CULTURE_ICONS[alert.culture] ?? '📊'}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.alertCulture}>{CULTURE_LABELS[alert.culture]}</Text>
        <Text style={styles.alertCondition}>
          {alert.condition === 'above' ? '↑ Subir acima de' : '↓ Cair abaixo de'}{' '}
          <Text style={{ fontWeight: '700', color: colors.text }}>
            R$ {alert.targetPrice.toFixed(2).replace('.', ',')}
          </Text>
        </Text>
        {alert.triggeredAt && (
          <Text style={styles.triggeredAt}>
            Ativado em {new Date(alert.triggeredAt).toLocaleDateString('pt-BR')}
          </Text>
        )}
      </View>
      <View style={styles.alertRight}>
        <View style={[styles.alertStatusBadge, !isActive && styles.alertStatusTriggered]}>
          <Text style={[styles.alertStatusText, !isActive && { color: colors.warning }]}>
            {isActive ? 'Ativo' : 'Ativado'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() =>
            Alert.alert('Excluir alerta', 'Deseja remover este alerta?', [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Excluir', style: 'destructive', onPress: () => onDelete(alert.id) },
            ])
          }
        >
          <Ionicons name="trash-outline" size={18} color={colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MarketScreen() {
  const { data: prices, isLoading, refetch } = useMarketPrices()
  const { data: alerts, isLoading: alertsLoading } = usePriceAlerts()
  const deleteAlert = useDeletePriceAlert()
  const [tab, setTab] = useState<'prices' | 'alerts'>('prices')
  const [alertTarget, setAlertTarget] = useState<MarketPrice | null>(null)

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mercado</Text>
        <TouchableOpacity onPress={() => setTab('alerts')}>
          <View style={{ position: 'relative' }}>
            <Ionicons name="notifications-outline" size={24} color={colors.white} />
            {(alerts?.filter((a) => a.active).length ?? 0) > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{alerts!.filter((a) => a.active).length}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* Tab pills */}
      <View style={styles.tabs}>
        {(['prices', 'alerts'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'prices' ? 'Cotações' : `Meus Alertas${alerts?.length ? ` (${alerts.length})` : ''}`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Create Alert Modal */}
      <CreateAlertModal price={alertTarget} onClose={() => setAlertTarget(null)} />

      {/* Cotações */}
      {tab === 'prices' && (
        isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
        ) : (
          <ScrollView
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
          >
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Cotações em Tempo Real</Text>
              <Text style={styles.sectionSubtitle}>CBOT/ICE/CME convertido para BRL • Atualizado a cada 15 min</Text>
            </View>
            {(prices ?? []).map((p) => (
              <PriceCard key={p.id} price={p} onAlertPress={setAlertTarget} />
            ))}
          </ScrollView>
        )
      )}

      {/* Alertas */}
      {tab === 'alerts' && (
        alertsLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
        ) : (alerts?.length ?? 0) === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyTitle}>Nenhum alerta criado</Text>
            <Text style={styles.emptyText}>
              Vá para "Cotações" e toque em "Criar alerta" em qualquer cultura
            </Text>
            <TouchableOpacity style={styles.emptyAction} onPress={() => setTab('prices')}>
              <Text style={styles.emptyActionText}>Ver Cotações</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={alerts}
            keyExtractor={(a) => a.id}
            renderItem={({ item }) => (
              <AlertRow alert={item} onDelete={(id) => deleteAlert.mutate(id)} />
            )}
            contentContainerStyle={styles.content}
          />
        )
      )}
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  badge: {
    position: 'absolute', top: -6, right: -8,
    backgroundColor: colors.secondary,
    minWidth: 16, height: 16, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3,
  },
  badgeText: { ...typography.caption, color: colors.white, fontWeight: '700', fontSize: 10 },
  tabs: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
  },
  tabBtnActive: { backgroundColor: colors.primary },
  tabText: { ...typography.label, color: colors.textSecondary },
  tabTextActive: { color: colors.white },
  content: { padding: spacing.md, gap: spacing.sm },
  sectionHeader: { marginBottom: spacing.sm },
  sectionTitle: { ...typography.h4, color: colors.text },
  sectionSubtitle: { ...typography.caption, color: colors.textMuted },
  priceCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  priceHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  cultureIcon: { fontSize: 28 },
  cultureName: { ...typography.h4, color: colors.text },
  priceSource: { ...typography.caption, color: colors.textMuted },
  variationBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: borderRadius.sm,
  },
  variationText: { ...typography.caption, fontWeight: '700' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  price: { ...typography.h2, color: colors.text },
  priceUnit: { ...typography.body, color: colors.textSecondary },
  priceFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  updatedAt: { ...typography.caption, color: colors.textMuted },
  priceFooterRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  alertBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  alertBtnText: { ...typography.caption, color: colors.primary, fontWeight: '600' },
  detailHint: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  detailHintText: { ...typography.caption, color: colors.textMuted },
  alertRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.white, borderRadius: borderRadius.lg, padding: spacing.md, ...shadows.sm,
  },
  alertIcon: { fontSize: 24 },
  alertCulture: { ...typography.label, color: colors.text },
  alertCondition: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 2 },
  triggeredAt: { ...typography.caption, color: colors.warning, marginTop: 2 },
  alertRight: { alignItems: 'flex-end', gap: spacing.xs },
  alertStatusBadge: {
    backgroundColor: '#dcfce7', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.sm,
  },
  alertStatusTriggered: { backgroundColor: '#fef3c7' },
  alertStatusText: { ...typography.caption, color: colors.success, fontWeight: '700' },
  deleteBtn: { padding: 4 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.sm },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.xl },
  emptyAction: {
    backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, borderRadius: borderRadius.full,
  },
  emptyActionText: { ...typography.label, color: colors.white },
})

const modal = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border,
    alignSelf: 'center', marginBottom: spacing.lg,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  title: { ...typography.h4, color: colors.text },
  currentLabel: { ...typography.caption, color: colors.textMuted, marginBottom: 2 },
  currentPrice: { ...typography.h2, color: colors.primary, marginBottom: spacing.lg },
  unit: { ...typography.body, color: colors.textSecondary },
  label: { ...typography.label, color: colors.textSecondary, marginBottom: spacing.sm },
  conditionRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  condBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: borderRadius.lg, padding: spacing.sm,
  },
  condBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  condText: { ...typography.label, color: colors.textSecondary },
  condTextActive: { color: colors.white },
  input: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    ...typography.h3, color: colors.text, marginBottom: spacing.lg,
  },
  actions: { flexDirection: 'row', gap: spacing.sm },
  cancelBtn: {
    flex: 1, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: borderRadius.lg, padding: spacing.md, alignItems: 'center',
  },
  cancelText: { ...typography.label, color: colors.textSecondary },
  saveBtn: {
    flex: 2, backgroundColor: colors.primary,
    borderRadius: borderRadius.lg, padding: spacing.md, alignItems: 'center',
  },
  saveText: { ...typography.label, color: colors.white },
})
