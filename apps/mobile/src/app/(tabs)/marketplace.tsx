import { useState, useMemo } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
  RefreshControl, Alert, Modal, ScrollView, TextInput, KeyboardAvoidingView,
  Platform, Image, Pressable,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useStartConversation } from '../../hooks/useSocial.js'
import { useAuthStore } from '../../store/auth.js'
import { api } from '../../lib/api.js'
import { pickMultiplePhotos, choosePhotoSource } from '../../lib/media.js'
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme.js'
import type { MarketplaceProduct } from '@agrolink/types'

const CATEGORY_LABELS: Record<string, string> = {
  seeds: 'Sementes', fertilizers: 'Fertilizantes', pesticides: 'Defensivos',
  equipment: 'Máquinas', animals: 'Animais', grains: 'Grãos', other: 'Outros',
}
const CATEGORY_ICONS: Record<string, string> = {
  seeds: '🌱', fertilizers: '🧪', pesticides: '🛡️',
  equipment: '🚜', animals: '🐄', grains: '🌾', other: '📦',
}
const FILTERS = ['all', 'seeds', 'fertilizers', 'pesticides', 'equipment', 'grains', 'animals', 'other'] as const
const SORTS = [
  { id: 'recent',   label: 'Mais recentes', icon: 'time-outline' },
  { id: 'distance', label: 'Mais próximos',  icon: 'navigate-outline' },
  { id: 'priceAsc', label: 'Menor preço',    icon: 'trending-down-outline' },
  { id: 'priceDsc', label: 'Maior preço',    icon: 'trending-up-outline' },
] as const

// ─── Hooks ────────────────────────────────────────────────────────────────────

type GeoParams = { city?: string; state?: string; radius?: number; q?: string }

function useMarketplaceList(category: string, geo: GeoParams) {
  return useQuery<MarketplaceProduct[]>({
    queryKey: ['marketplace', category, geo.q, geo.city, geo.state, geo.radius],
    queryFn: () => api.get('/marketplace', {
      params: {
        ...(category !== 'all' && { category }),
        ...(geo.q && { q: geo.q }),
        ...(geo.radius && { radius: geo.radius }),
      },
    }).then((r) => r.data),
  })
}

function useMyProducts() {
  return useQuery<MarketplaceProduct[]>({
    queryKey: ['marketplace', 'mine'],
    queryFn: () => api.get('/marketplace/mine').then((r) => r.data),
  })
}

function useToggleProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.patch(`/marketplace/${id}/toggle`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketplace'] })
    },
  })
}

function usePostProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/marketplace', body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['marketplace'] }),
  })
}

// ─── Search + radius bar ──────────────────────────────────────────────────────

function SearchAndFilterBar({
  query, onQueryChange,
  radius, onRadiusChange,
  city, onCityChange,
  sort, onSortChange,
}: {
  query: string; onQueryChange: (v: string) => void
  radius: number; onRadiusChange: (v: number) => void
  city: string; onCityChange: (v: string) => void
  sort: typeof SORTS[number]['id']; onSortChange: (s: typeof SORTS[number]['id']) => void
}) {
  const [showFilters, setShowFilters] = useState(false)

  const radiusLabels = [50, 100, 200, 400, 800]

  return (
    <View style={f.wrap}>
      {/* Search */}
      <View style={f.searchRow}>
        <View style={f.searchInputWrap}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            style={f.searchInput}
            placeholder="Buscar produtos, marcas, modelos..."
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={onQueryChange}
            returnKeyType="search"
          />
          {!!query && (
            <TouchableOpacity onPress={() => onQueryChange('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[f.filterBtn, showFilters && f.filterBtnActive]}
          onPress={() => setShowFilters((v) => !v)}
        >
          <Ionicons
            name="options-outline"
            size={20}
            color={showFilters ? colors.white : colors.primary}
          />
        </TouchableOpacity>
      </View>

      {/* Filter panel */}
      {showFilters && (
        <View style={f.panel}>
          {/* City */}
          <View style={f.field}>
            <View style={f.fieldHeader}>
              <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
              <Text style={f.fieldLabel}>Centro da busca</Text>
            </View>
            <TextInput
              style={f.input}
              placeholder="Ex: Sorriso/MT (vazio = mostrar tudo)"
              placeholderTextColor={colors.textMuted}
              value={city}
              onChangeText={onCityChange}
            />
          </View>

          {/* Radius */}
          <View style={f.field}>
            <View style={f.fieldHeader}>
              <Ionicons name="navigate-outline" size={14} color={colors.textSecondary} />
              <Text style={f.fieldLabel}>Raio de busca</Text>
              <View style={f.radiusBadge}>
                <Text style={f.radiusBadgeText}>{radius} km</Text>
              </View>
            </View>
            <View style={f.radiusRow}>
              {radiusLabels.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[f.radiusChip, radius === r && f.radiusChipActive]}
                  onPress={() => onRadiusChange(r)}
                >
                  <Text style={[f.radiusChipText, radius === r && f.radiusChipTextActive]}>
                    {r} km
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {/* Visual radius circle hint */}
            <View style={f.radiusVisual}>
              <View style={[f.radiusCircleOuter, { width: 40 + radius / 12, height: 40 + radius / 12 }]}>
                <View style={f.radiusCircleInner}>
                  <Ionicons name="location" size={14} color={colors.white} />
                </View>
              </View>
              <Text style={f.radiusHint}>
                {radius < 100 ? 'Apenas sua região' :
                 radius < 300 ? 'Cidades vizinhas' :
                 radius < 600 ? 'Estado inteiro' : 'Brasil todo'}
              </Text>
            </View>
          </View>

          {/* Sort */}
          <View style={f.field}>
            <View style={f.fieldHeader}>
              <Ionicons name="funnel-outline" size={14} color={colors.textSecondary} />
              <Text style={f.fieldLabel}>Ordenar por</Text>
            </View>
            <View style={f.sortGrid}>
              {SORTS.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={[f.sortChip, sort === s.id && f.sortChipActive]}
                  onPress={() => onSortChange(s.id)}
                >
                  <Ionicons
                    name={s.icon as any}
                    size={14}
                    color={sort === s.id ? colors.white : colors.textSecondary}
                  />
                  <Text style={[f.sortChipText, sort === s.id && { color: colors.white }]}>
                    {s.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}
    </View>
  )
}

const f = StyleSheet.create({
  wrap: { backgroundColor: colors.white, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  searchRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  searchInputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: spacing.sm, paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  searchInput: { flex: 1, ...typography.body, color: colors.text, paddingVertical: 2 },
  filterBtn: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 1.5, borderColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.white,
  },
  filterBtnActive: { backgroundColor: colors.primary },

  panel: {
    marginTop: spacing.sm,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  field: { gap: 6 },
  fieldHeader: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  fieldLabel: { ...typography.caption, color: colors.textSecondary, fontWeight: '700' },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm, paddingVertical: 6,
    ...typography.bodySmall, color: colors.text,
  },
  radiusBadge: {
    marginLeft: 'auto',
    backgroundColor: colors.primary,
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  radiusBadgeText: { ...typography.caption, color: colors.white, fontWeight: '800' },
  radiusRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  radiusChip: {
    paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.white,
  },
  radiusChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  radiusChipText: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
  radiusChipTextActive: { color: colors.white },
  radiusVisual: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: 4,
  },
  radiusCircleOuter: {
    borderRadius: 999,
    borderWidth: 2, borderColor: colors.primary + '60',
    backgroundColor: colors.primary + '15',
    justifyContent: 'center', alignItems: 'center',
    maxWidth: 90, maxHeight: 90,
  },
  radiusCircleInner: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  radiusHint: { ...typography.caption, color: colors.textMuted, flex: 1 },

  sortGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  sortChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.white,
  },
  sortChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  sortChipText: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
})

// ─── Product detail modal ─────────────────────────────────────────────────────

function ProductDetailModal({
  product, onClose,
}: { product: MarketplaceProduct | null; onClose: () => void }) {
  const startConversation = useStartConversation()
  const [imgIdx, setImgIdx] = useState(0)
  if (!product) return null
  const seller = (product as any).seller

  const handleMessage = async () => {
    if (!seller?.id) { Alert.alert('Indisponível', 'Vendedor sem conta ativa.'); return }
    try {
      const thread = await startConversation.mutateAsync(seller.id)
      onClose()
      router.push(`/chat/${thread.id}` as any)
    } catch {
      Alert.alert('Erro', 'Não foi possível iniciar a conversa.')
    }
  }
  const icon = CATEGORY_ICONS[product.category] ?? '📦'
  const images = product.images ?? []
  const hasPhoto = images.length > 0

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={det.container} edges={['top']}>
        <View style={det.header}>
          <TouchableOpacity onPress={onClose} style={det.closeBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={det.headerTitle} numberOfLines={1}>{product.name}</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {hasPhoto ? (
            <View>
              <ScrollView
                horizontal pagingEnabled showsHorizontalScrollIndicator={false}
                onScroll={(e) => setImgIdx(Math.round(e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width))}
                scrollEventThrottle={16}
              >
                {images.map((url, i) => (
                  <Image key={i} source={{ uri: url }} style={det.heroImage} resizeMode="cover" />
                ))}
              </ScrollView>
              {images.length > 1 && (
                <View style={det.imgDots}>
                  {images.map((_, i) => (
                    <View key={i} style={[det.imgDot, i === imgIdx && det.imgDotActive]} />
                  ))}
                </View>
              )}
            </View>
          ) : (
            <View style={det.heroPlaceholder}>
              <Text style={det.heroIcon}>{icon}</Text>
            </View>
          )}

          <View style={det.body}>
            <View style={det.topRow}>
              <View style={{ flex: 1 }}>
                <Text style={det.name}>{product.name}</Text>
                <View style={det.catBadge}>
                  <Text style={det.catBadgeText}>{icon} {CATEGORY_LABELS[product.category] ?? product.category}</Text>
                </View>
              </View>
            </View>

            <View style={det.priceBox}>
              <Text style={det.priceLabel}>Preço</Text>
              <Text style={det.price}>
                R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                <Text style={det.unit}> / {product.unit}</Text>
              </Text>
              {product.stock != null && (
                <Text style={det.stock}>{product.stock.toLocaleString('pt-BR')} unidades disponíveis</Text>
              )}
            </View>

            <View style={det.section}>
              <Text style={det.sectionTitle}>Descrição</Text>
              <Text style={det.description}>{product.description}</Text>
            </View>

            {seller && (
              <View style={det.section}>
                <Text style={det.sectionTitle}>Vendedor</Text>
                <TouchableOpacity
                  style={det.sellerRow}
                  onPress={() => { onClose(); router.push(`/profile/${seller.username}` as any) }}
                  activeOpacity={0.8}
                >
                  {seller.avatarUrl ? (
                    <Image source={{ uri: seller.avatarUrl }} style={det.sellerAvatarImg} />
                  ) : (
                    <View style={det.sellerAvatar}>
                      <Text style={det.sellerAvatarText}>{seller.name?.[0]?.toUpperCase() ?? '?'}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={det.sellerName}>{seller.name}</Text>
                    <Text style={det.sellerRole}>@{seller.username}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            )}

            <View style={det.locationRow}>
              <Ionicons name="location-outline" size={16} color={colors.primary} />
              <Text style={det.locationText}>
                {product.city}/{product.state}
                {product.distanceKm != null ? ` · ${product.distanceKm} km de distância` : ''}
              </Text>
            </View>

            <View style={det.actionsRow}>
              <TouchableOpacity
                style={[det.msgBtn, startConversation.isPending && { opacity: 0.6 }]}
                onPress={handleMessage}
                disabled={startConversation.isPending}
              >
                {startConversation.isPending
                  ? <ActivityIndicator size="small" color={colors.white} />
                  : <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.white} />
                }
                <Text style={det.msgBtnText}>
                  {startConversation.isPending ? 'Abrindo...' : 'Conversar com vendedor'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}

// ─── Post product modal (multi-photo) ─────────────────────────────────────────

function PostProductModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const postProduct = usePostProduct()
  const user = useAuthStore((s) => s.user) as any
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('seeds')
  const [price, setPrice] = useState('')
  const [unit, setUnit] = useState('')
  const [stock, setStock] = useState('')
  const [city, setCity] = useState(user?.city ?? '')
  const [state, setState] = useState(user?.state ?? 'MT')
  const [photos, setPhotos] = useState<string[]>([])
  const [success, setSuccess] = useState(false)

  const reset = () => {
    setName(''); setDescription(''); setCategory('seeds'); setPrice('')
    setUnit(''); setStock(''); setCity(user?.city ?? ''); setState(user?.state ?? 'MT')
    setPhotos([]); setSuccess(false)
  }
  const handleClose = () => { reset(); onClose() }

  const addPhotos = async () => {
    const remaining = 5 - photos.length
    if (remaining <= 0) return
    const uris = await pickMultiplePhotos(remaining)
    if (uris.length) setPhotos((p) => [...p, ...uris].slice(0, 5))
  }
  const takePhoto = async () => {
    if (photos.length >= 5) return
    const uri = await choosePhotoSource()
    if (uri) setPhotos((p) => [...p, uri])
  }

  const handleSubmit = () => {
    if (!name.trim() || !description.trim() || !price || !unit.trim() || !city.trim()) {
      Alert.alert('Campos obrigatórios', 'Preencha nome, descrição, preço, unidade e cidade.')
      return
    }
    if (description.trim().length < 10) {
      Alert.alert('Descrição curta', 'A descrição precisa ter pelo menos 10 caracteres.')
      return
    }
    postProduct.mutate({
      name: name.trim(),
      description: description.trim(),
      category,
      price: Number(price.replace(',', '.')),
      unit: unit.trim(),
      city: city.trim(),
      state: state.toUpperCase(),
      images: photos,
      ...(stock && { stock: Number(stock) }),
    }, {
      onSuccess: () => setSuccess(true),
      onError: () => Alert.alert('Erro', 'Não foi possível anunciar o produto.'),
    })
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={m.container} edges={['top']}>
        <LinearGradient
          colors={[colors.primary, colors.primaryLight]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={m.header}
        >
          <Text style={m.headerTitle}>Anunciar produto</Text>
          <TouchableOpacity onPress={handleClose} style={m.closeBtn}>
            <Ionicons name="close" size={24} color={colors.white} />
          </TouchableOpacity>
        </LinearGradient>

        {success ? (
          <View style={m.successContainer}>
            <Text style={m.successIcon}>🎉</Text>
            <Text style={m.successTitle}>Seu produto está no ar!</Text>
            <Text style={m.successSub}>Compradores próximos já podem encontrá-lo.</Text>
            <TouchableOpacity style={m.successBtn} onPress={handleClose}>
              <Text style={m.successBtnText}>Voltar ao Marketplace</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <ScrollView style={m.form} contentContainerStyle={{ paddingBottom: 40 }}>

              {/* Photos strip */}
              <Section title="Fotos do produto" icon="camera-outline">
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
                  {photos.map((uri, i) => (
                    <View key={i} style={m.photoCard}>
                      <Image source={{ uri }} style={m.photoImg} />
                      <TouchableOpacity style={m.photoRemove} onPress={() => setPhotos((p) => p.filter((_, idx) => idx !== i))}>
                        <Ionicons name="close" size={14} color={colors.white} />
                      </TouchableOpacity>
                      <View style={m.photoBadge}><Text style={m.photoBadgeText}>{i + 1}</Text></View>
                    </View>
                  ))}
                  {photos.length < 5 && (
                    <TouchableOpacity style={m.photoAdd} onPress={addPhotos}>
                      <Ionicons name="add" size={28} color={colors.primary} />
                      <Text style={m.photoAddText}>Galeria</Text>
                    </TouchableOpacity>
                  )}
                  {photos.length < 5 && (
                    <TouchableOpacity style={m.photoAdd} onPress={takePhoto}>
                      <Ionicons name="camera-outline" size={28} color={colors.primary} />
                      <Text style={m.photoAddText}>Câmera</Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>
                <Text style={m.hint}>Adicione até 5 fotos. A 1ª é a capa do anúncio.</Text>
              </Section>

              {/* Identity */}
              <Section title="Informações do produto" icon="cube-outline">
                <Field label="Nome do produto *">
                  <TextInput style={m.input} value={name} onChangeText={setName}
                    placeholder="Ex: Semente de Soja TMG 7062" placeholderTextColor={colors.textMuted} />
                </Field>

                <Field label="Categoria *">
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                      {Object.entries(CATEGORY_LABELS).map(([id, label]) => (
                        <TouchableOpacity key={id}
                          style={[m.catChip, category === id && m.catChipActive]}
                          onPress={() => setCategory(id)}
                        >
                          <Text style={m.catEmoji}>{CATEGORY_ICONS[id]}</Text>
                          <Text style={[m.catChipText, category === id && { color: colors.white }]}>
                            {label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </Field>

                <Field label="Descrição *">
                  <TextInput style={[m.input, m.textarea]} value={description} onChangeText={setDescription}
                    multiline numberOfLines={4}
                    placeholder="Especificações técnicas, condição, forma de entrega, prazo..."
                    placeholderTextColor={colors.textMuted} />
                </Field>
              </Section>

              {/* Pricing */}
              <Section title="Preço e estoque" icon="pricetag-outline">
                <View style={m.row}>
                  <View style={{ flex: 1 }}>
                    <Field label="Preço (R$) *">
                      <TextInput style={m.input} value={price} onChangeText={setPrice}
                        keyboardType="decimal-pad" placeholder="0,00" placeholderTextColor={colors.textMuted} />
                    </Field>
                  </View>
                  <View style={{ width: spacing.md }} />
                  <View style={{ flex: 1 }}>
                    <Field label="Unidade *">
                      <TextInput style={m.input} value={unit} onChangeText={setUnit}
                        placeholder="kg, saca, un." placeholderTextColor={colors.textMuted} />
                    </Field>
                  </View>
                </View>

                <Field label="Estoque disponível">
                  <TextInput style={m.input} value={stock} onChangeText={setStock}
                    keyboardType="numeric" placeholder="Ex: 100 unidades" placeholderTextColor={colors.textMuted} />
                </Field>
              </Section>

              {/* Location */}
              <Section title="Onde está o produto" icon="location-outline">
                <View style={m.row}>
                  <View style={{ flex: 2 }}>
                    <Field label="Cidade *">
                      <TextInput style={m.input} value={city} onChangeText={setCity}
                        placeholder="Sorriso" placeholderTextColor={colors.textMuted} />
                    </Field>
                  </View>
                  <View style={{ width: spacing.md }} />
                  <View style={{ flex: 1 }}>
                    <Field label="UF *">
                      <TextInput style={m.input} value={state} onChangeText={(v) => setState(v.toUpperCase())}
                        placeholder="MT" maxLength={2} autoCapitalize="characters"
                        placeholderTextColor={colors.textMuted} />
                    </Field>
                  </View>
                </View>
              </Section>

              <TouchableOpacity style={[m.submitBtn, postProduct.isPending && { opacity: 0.6 }]}
                onPress={handleSubmit} disabled={postProduct.isPending}>
                {postProduct.isPending
                  ? <ActivityIndicator color={colors.white} />
                  : <Text style={m.submitBtnText}>📢 Publicar anúncio</Text>}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </Modal>
  )
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <View style={m.section}>
      <View style={m.sectionHeader}>
        <Ionicons name={icon as any} size={18} color={colors.primary} />
        <Text style={m.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 4, marginTop: spacing.sm }}>
      <Text style={m.fieldLabel}>{label}</Text>
      {children}
    </View>
  )
}

// ─── Product card (improved) ──────────────────────────────────────────────────

function ProductCard({
  product, onPress, owner = false, onToggle, isToggling = false,
}: {
  product: MarketplaceProduct
  onPress: () => void
  owner?: boolean
  onToggle?: () => void
  isToggling?: boolean
}) {
  const icon = CATEGORY_ICONS[product.category] ?? '📦'
  const seller = (product as any).seller
  const hasPhoto = product.images?.[0]
  const isActive = (product as any).active !== false
  const photosCount = product.images?.length ?? 0

  return (
    <TouchableOpacity style={[styles.productCard, shadows.sm]} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.productImageWrap}>
        {hasPhoto ? (
          <Image source={{ uri: product.images[0] }} style={styles.productImage} resizeMode="cover" />
        ) : (
          <View style={styles.productImagePlaceholder}>
            <Text style={styles.productIcon}>{icon}</Text>
          </View>
        )}
        {photosCount > 1 && (
          <View style={styles.photosCountBadge}>
            <Ionicons name="images" size={10} color={colors.white} />
            <Text style={styles.photosCountText}>{photosCount}</Text>
          </View>
        )}
        {product.distanceKm != null && (
          <View style={styles.distanceBadge}>
            <Ionicons name="navigate" size={10} color={colors.white} />
            <Text style={styles.distanceText}>{product.distanceKm}km</Text>
          </View>
        )}
        {owner && (
          <View style={[styles.activeBadge, !isActive && styles.inactiveBadge]}>
            <Text style={styles.activeBadgeText}>{isActive ? 'Ativo' : 'Pausado'}</Text>
          </View>
        )}
      </View>

      <View style={styles.productInfo}>
        <View style={styles.catChip}>
          <Text style={styles.catChipText}>{icon} {CATEGORY_LABELS[product.category]}</Text>
        </View>
        <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>

        <View style={styles.priceRow}>
          <Text style={styles.price}>R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
          <Text style={styles.unit}>/{product.unit}</Text>
        </View>

        {!owner && seller?.name && (
          <View style={styles.sellerRow}>
            {seller.avatarUrl ? (
              <Image source={{ uri: seller.avatarUrl }} style={styles.sellerMiniAvatar} />
            ) : (
              <View style={[styles.sellerMiniAvatar, { backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: colors.white, fontSize: 10, fontWeight: '700' }}>
                  {seller.name?.[0]?.toUpperCase()}
                </Text>
              </View>
            )}
            <Text style={styles.sellerName} numberOfLines={1}>{seller.name}</Text>
          </View>
        )}

        <View style={styles.locationPill}>
          <Ionicons name="location-outline" size={10} color={colors.textMuted} />
          <Text style={styles.locationText} numberOfLines={1}>{product.city}/{product.state}</Text>
        </View>
      </View>

      {owner && (
        <TouchableOpacity
          style={[styles.toggleBtn, !isActive && styles.toggleBtnInactive]}
          onPress={onToggle}
          disabled={isToggling}
        >
          {isToggling
            ? <ActivityIndicator size="small" color={isActive ? colors.warning : colors.success} />
            : (
              <>
                <Ionicons name={isActive ? 'pause' : 'play'} size={12} color={isActive ? colors.warning : colors.success} />
                <Text style={[styles.toggleBtnText, { color: isActive ? colors.warning : colors.success }]}>
                  {isActive ? 'Pausar' : 'Reativar'}
                </Text>
              </>
            )}
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function MarketplaceScreen() {
  const user = useAuthStore((s) => s.user) as any
  const [tab, setTab] = useState<'explore' | 'mine'>('explore')
  const [category, setCategory] = useState('all')
  const [query, setQuery] = useState('')
  const [radius, setRadius] = useState(200)
  const [city, setCity] = useState(user?.city ?? '')
  const [sort, setSort] = useState<typeof SORTS[number]['id']>('recent')
  const [showPost, setShowPost] = useState(false)
  const [selected, setSelected] = useState<MarketplaceProduct | null>(null)

  const explore = useMarketplaceList(category, { q: query, city, radius })
  const mine = useMyProducts()
  const toggle = useToggleProduct()

  const sortedProducts = useMemo(() => {
    const list = [...(explore.data ?? [])]
    switch (sort) {
      case 'distance': return list.sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999))
      case 'priceAsc': return list.sort((a, b) => a.price - b.price)
      case 'priceDsc': return list.sort((a, b) => b.price - a.price)
      default: return list
    }
  }, [explore.data, sort])

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <PostProductModal visible={showPost} onClose={() => setShowPost(false)} />
      {selected && <ProductDetailModal product={selected} onClose={() => setSelected(null)} />}

      {/* Header */}
      <LinearGradient
        colors={[colors.primaryDark, colors.primary]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerLeft}>
          <Ionicons name="storefront" size={26} color={colors.white} />
          <View>
            <Text style={styles.headerTitle}>Marketplace</Text>
            <Text style={styles.headerSub}>Compra e venda no agro</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => setShowPost(true)} style={styles.postBtn}>
          <Ionicons name="add" size={16} color={colors.primaryDark} />
          <Text style={styles.postBtnText}>Vender</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['explore', 'mine'] as const).map((t) => {
          const active = tab === t
          return (
            <TouchableOpacity key={t} style={[styles.tab, active && styles.tabActive]} onPress={() => setTab(t)}>
              <Ionicons
                name={t === 'explore' ? 'compass-outline' : 'bag-handle-outline'}
                size={16}
                color={active ? colors.primary : colors.textMuted}
              />
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {t === 'explore' ? 'Explorar' : `Meus anúncios${mine.data?.length ? ` · ${mine.data.length}` : ''}`}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {tab === 'explore' && (
        <>
          <SearchAndFilterBar
            query={query} onQueryChange={setQuery}
            radius={radius} onRadiusChange={setRadius}
            city={city} onCityChange={setCity}
            sort={sort} onSortChange={setSort}
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {FILTERS.map((item) => (
              <TouchableOpacity key={item}
                style={[styles.filterChip, category === item && styles.filterChipActive]}
                onPress={() => setCategory(item)}>
                {item !== 'all' && <Text style={styles.filterIcon}>{CATEGORY_ICONS[item]}</Text>}
                <Text style={[styles.filterText, category === item && styles.filterTextActive]}>
                  {item === 'all' ? '🔥 Tudo' : CATEGORY_LABELS[item]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {explore.isLoading ? (
            <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>
          ) : sortedProducts.length === 0 ? (
            <View style={styles.center}>
              <Text style={{ fontSize: 48 }}>🛒</Text>
              <Text style={styles.emptyText}>Nenhum produto encontrado</Text>
              <Text style={styles.emptyHint}>Tente aumentar o raio ou trocar a categoria</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowPost(true)}>
                <Text style={styles.emptyBtnText}>📢 Anunciar produto</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={sortedProducts}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              numColumns={2}
              columnWrapperStyle={styles.row}
              refreshControl={<RefreshControl refreshing={explore.isLoading} onRefresh={explore.refetch} colors={[colors.primary]} />}
              renderItem={({ item }) => <ProductCard product={item} onPress={() => setSelected(item)} />}
              ListHeaderComponent={
                <View style={styles.resultsHeader}>
                  <Text style={styles.resultsCount}>{sortedProducts.length} produtos</Text>
                  {radius && <Text style={styles.resultsScope}>num raio de {radius} km</Text>}
                </View>
              }
            />
          )}
        </>
      )}

      {tab === 'mine' && (
        mine.isLoading ? (
          <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>
        ) : (mine.data?.length ?? 0) === 0 ? (
          <View style={styles.center}>
            <Text style={{ fontSize: 48 }}>📋</Text>
            <Text style={styles.emptyText}>Você ainda não tem anúncios</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowPost(true)}>
              <Text style={styles.emptyBtnText}>+ Criar meu primeiro anúncio</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={mine.data ?? []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            numColumns={2}
            columnWrapperStyle={styles.row}
            refreshControl={<RefreshControl refreshing={mine.isLoading} onRefresh={mine.refetch} colors={[colors.primary]} />}
            renderItem={({ item }) => (
              <ProductCard
                product={item}
                onPress={() => setSelected(item)}
                owner
                onToggle={() => toggle.mutate(item.id)}
                isToggling={toggle.isPending && toggle.variables === item.id}
              />
            )}
          />
        )
      )}

      <TouchableOpacity style={styles.fab} onPress={() => setShowPost(true)} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color={colors.white} />
      </TouchableOpacity>
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CARD_WIDTH = '48%'

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 4 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerTitle: { ...typography.h3, color: colors.white, fontWeight: '800' },
  headerSub: { ...typography.caption, color: 'rgba(255,255,255,0.75)' },
  postBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.secondary, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: borderRadius.full },
  postBtnText: { ...typography.label, color: colors.primaryDark, fontWeight: '800' },

  tabs: { flexDirection: 'row', backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.sm + 2, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.primary },
  tabText: { ...typography.label, color: colors.textMuted, fontWeight: '600' },
  tabTextActive: { color: colors.primary, fontWeight: '700' },

  filterRow: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.xs, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  filterChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm + 2, paddingVertical: 6, borderRadius: borderRadius.full, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, gap: 4 },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterIcon: { fontSize: 13 },
  filterText: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
  filterTextActive: { color: colors.white },

  resultsHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: spacing.sm },
  resultsCount: { ...typography.label, color: colors.text, fontWeight: '700' },
  resultsScope: { ...typography.caption, color: colors.textMuted },

  list: { padding: spacing.md, paddingBottom: 100 },
  row: { justifyContent: 'space-between', marginBottom: spacing.md },

  // Product card
  productCard: { width: CARD_WIDTH, backgroundColor: colors.white, borderRadius: borderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  productImageWrap: { position: 'relative' },
  productImage: { width: '100%', height: 120 },
  productImagePlaceholder: { height: 120, backgroundColor: colors.surfaceSecondary, justifyContent: 'center', alignItems: 'center' },
  productIcon: { fontSize: 40 },
  photosCountBadge: {
    position: 'absolute', top: 6, right: 6,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  photosCountText: { fontSize: 10, color: colors.white, fontWeight: '700' },
  distanceBadge: {
    position: 'absolute', top: 6, left: 6,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.primary,
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  distanceText: { fontSize: 10, color: colors.white, fontWeight: '700' },
  activeBadge: {
    position: 'absolute', bottom: 6, left: 6,
    backgroundColor: colors.success,
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  inactiveBadge: { backgroundColor: colors.warning },
  activeBadgeText: { fontSize: 10, color: colors.white, fontWeight: '800' },

  productInfo: { padding: spacing.sm, gap: 3 },
  catChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: 6, paddingVertical: 1,
    borderRadius: borderRadius.sm,
    marginBottom: 2,
  },
  catChipText: { fontSize: 10, color: colors.textSecondary, fontWeight: '600' },
  productName: { ...typography.label, color: colors.text, fontSize: 13, lineHeight: 17, fontWeight: '700' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 2 },
  price: { fontSize: 16, fontWeight: '800', color: colors.primary },
  unit: { ...typography.caption, color: colors.textMuted, marginLeft: 2 },
  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  sellerMiniAvatar: { width: 16, height: 16, borderRadius: 8 },
  sellerName: { ...typography.caption, color: colors.textSecondary, fontWeight: '600', flex: 1 },
  locationPill: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  locationText: { ...typography.caption, color: colors.textMuted },

  toggleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    marginHorizontal: spacing.sm, marginBottom: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    backgroundColor: colors.warning + '15',
    borderWidth: 1, borderColor: colors.warning + '60',
  },
  toggleBtnInactive: { backgroundColor: colors.success + '15', borderColor: colors.success + '60' },
  toggleBtnText: { ...typography.caption, fontWeight: '800' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md, padding: spacing.xl },
  emptyText: { ...typography.body, color: colors.text, fontWeight: '600' },
  emptyHint: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
  emptyBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm + 2, borderRadius: borderRadius.full },
  emptyBtnText: { ...typography.label, color: colors.white, fontSize: 14, fontWeight: '700' },

  fab: {
    position: 'absolute', bottom: 20, right: spacing.md,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.secondary,
    justifyContent: 'center', alignItems: 'center',
    ...shadows.lg,
  },
})

const m = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  headerTitle: { ...typography.h3, color: colors.white, fontWeight: '800' },
  closeBtn: { padding: spacing.xs },
  form: { flex: 1 },
  section: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  sectionTitle: { ...typography.h4, color: colors.text, fontWeight: '700' },
  fieldLabel: { ...typography.label, color: colors.textSecondary, fontWeight: '600' },
  hint: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs, fontStyle: 'italic' },
  input: { backgroundColor: colors.background, borderWidth: 1.5, borderColor: colors.border, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, ...typography.body, color: colors.text },
  textarea: { height: 100, textAlignVertical: 'top' },
  row: { flexDirection: 'row' },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: borderRadius.full, backgroundColor: colors.background, borderWidth: 1.5, borderColor: colors.border },
  catChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  catEmoji: { fontSize: 14 },
  catChipText: { ...typography.label, color: colors.textSecondary },
  photoCard: { width: 100, height: 100, borderRadius: borderRadius.md, overflow: 'hidden', position: 'relative', backgroundColor: colors.surfaceSecondary },
  photoImg: { width: '100%', height: '100%' },
  photoRemove: { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  photoBadge: { position: 'absolute', bottom: 4, left: 4, paddingHorizontal: 6, paddingVertical: 1, borderRadius: borderRadius.sm, backgroundColor: 'rgba(0,0,0,0.6)' },
  photoBadgeText: { fontSize: 10, fontWeight: '700', color: colors.white },
  photoAdd: { width: 100, height: 100, borderRadius: borderRadius.md, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.primary, justifyContent: 'center', alignItems: 'center', gap: 2 },
  photoAddText: { ...typography.caption, color: colors.primary, fontWeight: '700' },

  submitBtn: {
    backgroundColor: colors.primary,
    marginHorizontal: spacing.md, marginTop: spacing.lg,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    ...shadows.md,
  },
  submitBtnText: { ...typography.h4, color: colors.white, fontWeight: '800' },

  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl, gap: spacing.md },
  successIcon: { fontSize: 72 },
  successTitle: { ...typography.h2, color: colors.text, textAlign: 'center' },
  successSub: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  successBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: borderRadius.full, marginTop: spacing.md },
  successBtnText: { ...typography.h4, color: colors.white, fontWeight: '700' },
})

const det = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { ...typography.h4, color: colors.text, flex: 1, textAlign: 'center', fontWeight: '700' },
  closeBtn: { padding: spacing.xs },
  heroImage: { width: 380, height: 280 },
  heroPlaceholder: { height: 200, backgroundColor: colors.surfaceSecondary, justifyContent: 'center', alignItems: 'center' },
  heroIcon: { fontSize: 80 },
  imgDots: { position: 'absolute', bottom: 10, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 4 },
  imgDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  imgDotActive: { backgroundColor: colors.white, width: 20 },
  body: { padding: spacing.lg, gap: spacing.md },
  topRow: { flexDirection: 'row', alignItems: 'flex-start' },
  name: { ...typography.h2, color: colors.text, marginBottom: spacing.xs, fontWeight: '800' },
  catBadge: { alignSelf: 'flex-start', backgroundColor: colors.surfaceSecondary, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.border },
  catBadgeText: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  priceBox: { backgroundColor: colors.primary + '10', borderRadius: borderRadius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.primary + '40' },
  priceLabel: { ...typography.caption, color: colors.textMuted, marginBottom: 2 },
  price: { fontSize: 32, fontWeight: '800', color: colors.primary },
  unit: { fontSize: 16, fontWeight: '400', color: colors.textMuted },
  stock: { ...typography.bodySmall, color: colors.success, marginTop: spacing.xs, fontWeight: '600' },
  section: { gap: spacing.xs },
  sectionTitle: { ...typography.label, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '800' },
  description: { ...typography.body, color: colors.text, lineHeight: 24 },
  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surfaceSecondary, padding: spacing.md, borderRadius: borderRadius.lg },
  sellerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  sellerAvatarImg: { width: 44, height: 44, borderRadius: 22 },
  sellerAvatarText: { ...typography.h4, color: colors.white },
  sellerName: { ...typography.label, color: colors.text, fontWeight: '700' },
  sellerRole: { ...typography.caption, color: colors.textMuted },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  locationText: { ...typography.body, color: colors.textSecondary },
  actionsRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  msgBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary, borderRadius: borderRadius.lg, paddingVertical: spacing.md, ...shadows.md },
  msgBtnText: { ...typography.label, color: colors.white, fontWeight: '700' },
})
