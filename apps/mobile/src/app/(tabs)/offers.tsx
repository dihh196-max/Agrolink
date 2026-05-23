import { useState } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useOffers } from '../../hooks/useMarket.js'
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme.js'
import type { Offer, Culture } from '@agrolink/types'

const CULTURE_LABELS: Partial<Record<Culture, string>> = {
  soja: 'Soja',
  milho: 'Milho',
  algodao: 'Algodão',
  cafe: 'Café',
  boi_gordo: 'Boi Gordo',
  trigo: 'Trigo',
}

const CULTURE_ICONS: Partial<Record<Culture, string>> = {
  soja: '🌿',
  milho: '🌽',
  algodao: '☁️',
  cafe: '☕',
  boi_gordo: '🐄',
  trigo: '🌾',
}

function OfferCard({ offer }: { offer: Offer }) {
  return (
    <TouchableOpacity style={styles.card} onPress={() => router.push(`/offer/${offer.id}`)}>
      <View style={styles.cardHeader}>
        <View style={[styles.typeBadge, { backgroundColor: offer.type === 'sell' ? '#dcfce7' : '#dbeafe' }]}>
          <Text style={[styles.typeText, { color: offer.type === 'sell' ? colors.success : colors.info }]}>
            {offer.type === 'sell' ? '📤 Venda' : '📥 Compra'}
          </Text>
        </View>
        <Text style={styles.distance}>
          {offer.distanceKm ? `${offer.distanceKm.toFixed(0)} km` : offer.city}
        </Text>
      </View>

      <View style={styles.cultureRow}>
        <Text style={styles.cultureIcon}>{CULTURE_ICONS[offer.culture] ?? '📦'}</Text>
        <Text style={styles.cultureName}>{CULTURE_LABELS[offer.culture] ?? offer.culture}</Text>
        <Text style={styles.volume}>{offer.volumeTons}t</Text>
      </View>

      <View style={styles.priceRow}>
        <Text style={styles.price}>
          R$ {offer.pricePerUnit.toFixed(2).replace('.', ',')}
        </Text>
        <Text style={styles.priceUnit}>/ {offer.unit === 'saca_60kg' ? 'sc 60kg' : offer.unit}</Text>
      </View>

      <View style={styles.sellerRow}>
        <Ionicons name="person-outline" size={14} color={colors.textMuted} />
        <Text style={styles.sellerName}>{offer.seller?.name ?? 'Anônimo'}</Text>
        <Text style={styles.location}>{offer.city}/{offer.state}</Text>
      </View>
    </TouchableOpacity>
  )
}

const CULTURES: { value: Culture | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'soja', label: 'Soja' },
  { value: 'milho', label: 'Milho' },
  { value: 'boi_gordo', label: 'Boi Gordo' },
  { value: 'algodao', label: 'Algodão' },
  { value: 'cafe', label: 'Café' },
]

export default function OffersScreen() {
  const [filterCulture, setFilterCulture] = useState<Culture | undefined>()
  const [filterType, setFilterType] = useState<'sell' | 'buy' | undefined>()

  const { data: offers, isLoading, refetch } = useOffers({
    culture: filterCulture,
    type: filterType,
  })

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Oferta e Demanda</Text>
        <TouchableOpacity
          style={styles.newOfferBtn}
          onPress={() => router.push('/offer/new')}
        >
          <Ionicons name="add" size={20} color={colors.white} />
          <Text style={styles.newOfferText}>Anunciar</Text>
        </TouchableOpacity>
      </View>

      {/* Type filter */}
      <View style={styles.typeFilter}>
        {([undefined, 'sell', 'buy'] as const).map((t) => (
          <TouchableOpacity
            key={String(t)}
            style={[styles.filterBtn, filterType === t && styles.filterBtnActive]}
            onPress={() => setFilterType(t)}
          >
            <Text style={[styles.filterText, filterType === t && styles.filterTextActive]}>
              {t === undefined ? 'Todos' : t === 'sell' ? '📤 Venda' : '📥 Compra'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Culture filter */}
      <FlatList
        horizontal
        data={CULTURES}
        keyExtractor={(c) => c.value}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.cultureFilter}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.cultureBtn, filterCulture === (item.value === 'all' ? undefined : item.value) && styles.cultureBtnActive]}
            onPress={() => setFilterCulture(item.value === 'all' ? undefined : item.value as Culture)}
          >
            <Text style={[styles.cultureBtnText, filterCulture === (item.value === 'all' ? undefined : item.value) && styles.cultureBtnTextActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : offers?.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>Nenhuma oferta encontrada</Text>
          <Text style={styles.emptyText}>Seja o primeiro a anunciar na sua região</Text>
        </View>
      ) : (
        <FlatList
          data={offers}
          keyExtractor={(o) => o.id}
          renderItem={({ item }) => <OfferCard offer={item} />}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerTitle: { ...typography.h3, color: colors.white },
  newOfferBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.secondary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full },
  newOfferText: { ...typography.label, color: colors.white },
  typeFilter: { flexDirection: 'row', padding: spacing.md, gap: spacing.sm, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  filterBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  filterBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { ...typography.label, color: colors.textSecondary },
  filterTextActive: { color: colors.white },
  cultureFilter: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.sm, backgroundColor: colors.white },
  cultureBtn: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: borderRadius.full, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  cultureBtnActive: { backgroundColor: colors.primaryLight, borderColor: colors.primaryLight },
  cultureBtnText: { ...typography.bodySmall, color: colors.textSecondary },
  cultureBtnTextActive: { color: colors.white, fontWeight: '600' },
  list: { padding: spacing.md, gap: spacing.sm },
  card: { backgroundColor: colors.white, borderRadius: borderRadius.lg, padding: spacing.md, ...shadows.sm, gap: spacing.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  typeBadge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: borderRadius.sm },
  typeText: { ...typography.caption, fontWeight: '700' },
  distance: { ...typography.caption, color: colors.textMuted },
  cultureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cultureIcon: { fontSize: 24 },
  cultureName: { ...typography.h4, color: colors.text, flex: 1 },
  volume: { ...typography.body, color: colors.textSecondary },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  price: { ...typography.h2, color: colors.primary },
  priceUnit: { ...typography.bodySmall, color: colors.textSecondary },
  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  sellerName: { ...typography.bodySmall, color: colors.textSecondary, flex: 1 },
  location: { ...typography.caption, color: colors.textMuted },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { ...typography.h3, color: colors.text },
  emptyText: { ...typography.body, color: colors.textMuted },
})
