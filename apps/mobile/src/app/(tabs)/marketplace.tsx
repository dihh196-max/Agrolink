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
import { useMarketplace } from '../../hooks/useSocial.js'
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme.js'
import type { MarketplaceProduct } from '@agrolink/types'

const CATEGORY_LABELS: Record<string, string> = {
  all: 'Tudo',
  seeds: 'Sementes',
  fertilizers: 'Fertilizantes',
  pesticides: 'Defensivos',
  equipment: 'Máquinas',
  animals: 'Animais',
  grains: 'Grãos',
  other: 'Outros',
}

const CATEGORY_ICONS: Record<string, string> = {
  seeds: '🌱',
  fertilizers: '🧪',
  pesticides: '🛡️',
  equipment: '🚜',
  animals: '🐄',
  grains: '🌾',
  other: '📦',
}

const FILTERS = ['all', 'seeds', 'fertilizers', 'pesticides', 'equipment', 'grains', 'animals', 'other']

function ProductCard({ product }: { product: MarketplaceProduct }) {
  const icon = CATEGORY_ICONS[product.category] ?? '📦'
  const seller = (product as any).seller

  return (
    <TouchableOpacity style={[styles.productCard, shadows.sm]} activeOpacity={0.85}>
      {/* Image area */}
      <View style={styles.productImage}>
        <Text style={styles.productIcon}>{icon}</Text>
      </View>

      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
        <Text style={styles.productDesc} numberOfLines={2}>{product.description}</Text>

        <View style={styles.priceRow}>
          <Text style={styles.price}>
            R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </Text>
          <Text style={styles.unit}>/{product.unit}</Text>
        </View>

        <View style={styles.locationRow}>
          {seller?.name && (
            <Text style={styles.sellerName} numberOfLines={1}>{seller.name}</Text>
          )}
          <View style={styles.locationPill}>
            <Ionicons name="location-outline" size={11} color={colors.primary} />
            <Text style={styles.locationText}>
              {product.city}/{product.state}
              {product.distanceKm != null ? ` · ${product.distanceKm} km` : ''}
            </Text>
          </View>
        </View>

        {product.stock != null && (
          <Text style={styles.stock}>{product.stock} disponíveis</Text>
        )}
      </View>

      <TouchableOpacity
        style={styles.contactBtn}
        onPress={() => Alert.alert('Produto', `Entre em contato com ${seller?.name ?? 'o vendedor'}`)}
      >
        <Text style={styles.contactBtnText}>Ver Produto</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  )
}

export default function MarketplaceScreen() {
  const [category, setCategory] = useState('all')

  const { data: products, isLoading, refetch } = useMarketplace(category)

  const data = products ?? []

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="storefront-outline" size={24} color={colors.white} />
          <Text style={styles.headerTitle}>Marketplace</Text>
        </View>
        <TouchableOpacity>
          <Ionicons name="add-circle-outline" size={26} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Category filters */}
      <View>
        <FlatList
          data={FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.filterRow}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterChip, category === item && styles.filterChipActive]}
              onPress={() => setCategory(item)}
            >
              {item !== 'all' && <Text style={styles.filterIcon}>{CATEGORY_ICONS[item]}</Text>}
              <Text style={[styles.filterText, category === item && styles.filterTextActive]}>
                {CATEGORY_LABELS[item]}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : data.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🛒</Text>
          <Text style={styles.emptyText}>Nenhum produto encontrado</Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          numColumns={2}
          columnWrapperStyle={styles.row}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} colors={[colors.primary]} />}
          renderItem={({ item }) => <ProductCard product={item} />}
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color={colors.white} />
      </TouchableOpacity>
    </SafeAreaView>
  )
}

const CARD_WIDTH = '48%'

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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterIcon: { fontSize: 13 },
  filterText: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' as const },
  filterTextActive: { color: colors.white },
  list: { padding: spacing.md, paddingBottom: 100 },
  row: { justifyContent: 'space-between', marginBottom: spacing.md },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  productImage: {
    height: 90,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productIcon: { fontSize: 36 },
  productInfo: { padding: spacing.sm + 2 },
  productName: { ...typography.h4, color: colors.text, fontSize: 13, lineHeight: 18 },
  productDesc: { ...typography.caption, color: colors.textMuted, marginTop: 3, lineHeight: 15 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: spacing.xs + 2 },
  price: { fontSize: 16, fontWeight: '700' as const, color: colors.primary },
  unit: { ...typography.caption, color: colors.textMuted, marginLeft: 2 },
  locationRow: { marginTop: spacing.xs, gap: 2 },
  sellerName: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' as const },
  locationPill: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locationText: { ...typography.caption, color: colors.textMuted },
  stock: { ...typography.caption, color: colors.success, marginTop: 2 },
  contactBtn: {
    backgroundColor: colors.primary,
    marginHorizontal: spacing.sm + 2,
    marginBottom: spacing.sm + 2,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.xs + 2,
    alignItems: 'center',
  },
  contactBtnText: { ...typography.caption, color: colors.white, fontWeight: '700' as const },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  emptyIcon: { fontSize: 48 },
  emptyText: { ...typography.body, color: colors.textMuted },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: spacing.md,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.lg,
  },
})
