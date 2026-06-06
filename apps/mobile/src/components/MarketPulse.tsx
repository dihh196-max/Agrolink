import { useMemo } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useMarketPrices } from '../hooks/useMarket.js'
import { colors, spacing, typography, borderRadius, shadows } from '../constants/theme.js'
import type { MarketPrice, Culture } from '@agrolink/types'

const ICON: Partial<Record<Culture, string>> = {
  soja: '🌿', milho: '🌽', algodao: '☁️', cafe: '☕',
  boi_gordo: '🐄', trigo: '🌾', arroz: '🍚', feijao: '🫘',
  cana: '🎋', eucalipto: '🌳',
}
const LABEL: Record<Culture, string> = {
  soja: 'Soja', milho: 'Milho', algodao: 'Algodão', cafe: 'Café',
  boi_gordo: 'Boi', trigo: 'Trigo', arroz: 'Arroz', feijao: 'Feijão',
  cana: 'Cana', eucalipto: 'Eucalipto',
}

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function MoverCard({ price, rank, isTop }: { price: MarketPrice; rank: number; isTop: boolean }) {
  const isUp = price.variation24h >= 0
  const unitLabel = price.unit === 'saca_60kg' ? '/sc' : price.unit === 'arroba' ? '/@' : '/t'

  return (
    <TouchableOpacity
      style={s.moverCard}
      onPress={() => router.push(`/market/${price.culture}` as any)}
      activeOpacity={0.85}
    >
      <View style={s.rankRow}>
        <View style={[s.rankBadge, { backgroundColor: isTop ? '#fef3c7' : '#fee2e2' }]}>
          <Text style={[s.rankText, { color: isTop ? '#92400e' : '#991b1b' }]}>#{rank}</Text>
        </View>
        <Text style={s.cultureIcon}>{ICON[price.culture] ?? '📊'}</Text>
      </View>

      <Text style={s.cultureName}>{LABEL[price.culture]}</Text>
      <Text style={s.price}>R$ {fmt(price.price)}<Text style={s.unit}>{unitLabel}</Text></Text>

      <View style={[s.variation, { backgroundColor: isUp ? '#dcfce7' : '#fee2e2' }]}>
        <Ionicons
          name={isUp ? 'trending-up' : 'trending-down'}
          size={12}
          color={isUp ? colors.success : colors.error}
        />
        <Text style={[s.variationText, { color: isUp ? colors.success : colors.error }]}>
          {isUp ? '+' : ''}{price.variationPercent24h?.toFixed(2)}%
        </Text>
      </View>
    </TouchableOpacity>
  )
}

export function MarketPulse() {
  const { data: prices, isLoading } = useMarketPrices()

  const { gainers, losers } = useMemo(() => {
    if (!prices?.length) return { gainers: [] as MarketPrice[], losers: [] as MarketPrice[] }
    const sorted = [...prices].sort(
      (a, b) => (b.variationPercent24h ?? 0) - (a.variationPercent24h ?? 0)
    )
    return {
      gainers: sorted.filter((p) => (p.variationPercent24h ?? 0) > 0).slice(0, 3),
      losers:  sorted.filter((p) => (p.variationPercent24h ?? 0) < 0).slice(-3).reverse(),
    }
  }, [prices])

  if (isLoading) {
    return (
      <View style={s.wrap}>
        <View style={s.header}>
          <Text style={s.headerTitle}>📊 Mercado agora</Text>
        </View>
        <ActivityIndicator color={colors.primary} style={{ padding: spacing.md }} />
      </View>
    )
  }

  if (!prices?.length) return null

  return (
    <LinearGradient
      colors={['#f0fdf4', colors.white]}
      style={s.wrap}
    >
      <View style={s.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <View style={s.livePulse} />
          <Text style={s.headerTitle}>Mercado em tempo real</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/market' as any)}
          style={s.seeAllBtn}
          hitSlop={6}
        >
          <Text style={s.seeAll}>Ver todas</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {gainers.length > 0 && (
        <>
          <View style={s.sectionLabel}>
            <Ionicons name="trending-up" size={14} color={colors.success} />
            <Text style={[s.sectionLabelText, { color: colors.success }]}>Maiores altas</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.row}
          >
            {gainers.map((p, i) => (
              <MoverCard key={p.id} price={p} rank={i + 1} isTop />
            ))}
          </ScrollView>
        </>
      )}

      {losers.length > 0 && (
        <>
          <View style={s.sectionLabel}>
            <Ionicons name="trending-down" size={14} color={colors.error} />
            <Text style={[s.sectionLabelText, { color: colors.error }]}>Maiores baixas</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.row}
          >
            {losers.map((p, i) => (
              <MoverCard key={p.id} price={p} rank={i + 1} isTop={false} />
            ))}
          </ScrollView>
        </>
      )}
    </LinearGradient>
  )
}

const s = StyleSheet.create({
  wrap: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingBottom: spacing.sm,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  livePulse: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.success,
  },
  headerTitle: { ...typography.h4, color: colors.text },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAll: { ...typography.label, color: colors.primary, fontWeight: '700' },

  sectionLabel: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.md, marginTop: spacing.xs, marginBottom: spacing.xs,
  },
  sectionLabelText: { ...typography.caption, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },

  row: { gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },

  moverCard: {
    width: 130,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rankRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rankBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: borderRadius.sm },
  rankText: { fontSize: 10, fontWeight: '800' },
  cultureIcon: { fontSize: 18 },
  cultureName: { ...typography.label, color: colors.textSecondary, marginTop: 2 },
  price: { ...typography.h4, color: colors.text, fontWeight: '800' },
  unit: { ...typography.caption, color: colors.textMuted, fontWeight: '400' },
  variation: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    alignSelf: 'flex-start',
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginTop: 2,
  },
  variationText: { ...typography.caption, fontWeight: '800' },
})
