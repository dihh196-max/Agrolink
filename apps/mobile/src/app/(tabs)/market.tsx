import { useState } from 'react'
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useMarketPrices } from '../../hooks/useMarket.js'
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme.js'
import type { MarketPrice, Culture } from '@agrolink/types'

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

function PriceCard({ price }: { price: MarketPrice }) {
  const isPositive = price.variation24h >= 0
  const unitLabel = price.unit === 'saca_60kg' ? '/sc' : price.unit === 'arroba' ? '/@' : '/t'

  return (
    <View style={styles.priceCard}>
      <View style={styles.priceHeader}>
        <Text style={styles.cultureIcon}>{CULTURE_ICONS[price.culture] ?? '📊'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.cultureName}>{CULTURE_LABELS[price.culture]}</Text>
          <Text style={styles.priceSource}>{price.source} • ESALQ</Text>
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
          R$ {price.price?.toFixed(2)
            .replace('.', ',')
            .replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
        </Text>
        <Text style={styles.priceUnit}>{unitLabel}</Text>
      </View>
      <Text style={styles.updatedAt}>
        Atualizado: {new Date(price.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  )
}

export default function MarketScreen() {
  const { data: prices, isLoading, refetch } = useMarketPrices()
  const [tab, setTab] = useState<'prices' | 'alerts'>('prices')

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mercado</Text>
        <TouchableOpacity>
          <Ionicons name="notifications-outline" size={24} color={colors.white} />
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
              {t === 'prices' ? 'Cotações' : 'Meus Alertas'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        >
          {tab === 'prices' && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Cotações CEPEA/ESALQ</Text>
                <Text style={styles.sectionSubtitle}>Atualizado a cada 15 min</Text>
              </View>
              {(prices ?? []).map((p) => (
                <PriceCard key={p.id} price={p} />
              ))}
            </>
          )}

          {tab === 'alerts' && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🔔</Text>
              <Text style={styles.emptyTitle}>Nenhum alerta criado</Text>
              <Text style={styles.emptyText}>
                Toque em uma cotação para criar alertas de preço
              </Text>
            </View>
          )}
        </ScrollView>
      )}
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
  variationBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: borderRadius.sm },
  variationText: { ...typography.caption, fontWeight: '700' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  price: { ...typography.h2, color: colors.text },
  priceUnit: { ...typography.body, color: colors.textSecondary },
  updatedAt: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  emptyState: { alignItems: 'center', paddingTop: spacing.xxl },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.sm },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
})
