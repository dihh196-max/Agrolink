import { useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
  RefreshControl, Alert, Modal, ScrollView, TextInput, KeyboardAvoidingView,
  Platform, Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMarketplace, useStartConversation } from '../../hooks/useSocial.js'
import { api } from '../../lib/api.js'
import { router } from 'expo-router'
import { choosePhotoSource } from '../../lib/media.js'
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

const FILTERS = ['all', 'seeds', 'fertilizers', 'pesticides', 'equipment', 'grains', 'animals', 'other']

const CATEGORIES_LIST = [
  { value: 'seeds', label: '🌱 Sementes' }, { value: 'fertilizers', label: '🧪 Fertilizantes' },
  { value: 'pesticides', label: '🛡️ Defensivos' }, { value: 'equipment', label: '🚜 Equipamentos' },
  { value: 'animals', label: '🐄 Animais' }, { value: 'grains', label: '🌾 Grãos' },
  { value: 'other', label: '📦 Outros' },
]

function usePostProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/marketplace', body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['marketplace'] }),
  })
}

// ─── Product detail modal ─────────────────────────────────────────────────────

function ProductDetailModal({
  product,
  onClose,
}: {
  product: MarketplaceProduct | null
  onClose: () => void
}) {
  const startConversation = useStartConversation()
  if (!product) return null
  const seller = (product as any).seller

  const handleMessage = async () => {
    if (!seller?.id) { Alert.alert('Indisponível', 'Vendedor sem conta ativa.'); return }
    try {
      const thread = await startConversation.mutateAsync(seller.id)
      onClose()
      router.push(`/chat/${thread.id}`)
    } catch {
      Alert.alert('Erro', 'Não foi possível iniciar a conversa.')
    }
  }
  const icon = CATEGORY_ICONS[product.category] ?? '📦'
  const hasPhoto = product.images?.[0]

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
            <Image source={{ uri: product.images[0] }} style={det.heroImage} resizeMode="cover" />
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
                  onPress={() => { onClose(); router.push(`/profile/${seller.username}`) }}
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
                  : <Ionicons name="chatbubble-outline" size={18} color={colors.white} />
                }
                <Text style={det.msgBtnText}>
                  {startConversation.isPending ? 'Abrindo...' : 'Enviar Mensagem'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={det.phoneBtn}
                onPress={() => Alert.alert('Em breve', 'Contato por telefone em breve!')}
              >
                <Ionicons name="call-outline" size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}

// ─── Post product modal ───────────────────────────────────────────────────────

function PostProductModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const postProduct = usePostProduct()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('seeds')
  const [price, setPrice] = useState('')
  const [unit, setUnit] = useState('')
  const [stock, setStock] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('MT')
  const [photo, setPhoto] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const reset = () => {
    setName(''); setDescription(''); setCategory('seeds'); setPrice('')
    setUnit(''); setStock(''); setCity(''); setState('MT'); setPhoto(null); setSuccess(false)
  }

  const handleClose = () => { reset(); onClose() }

  const handleSubmit = () => {
    if (!name.trim() || !description.trim() || !price || !unit.trim() || !city.trim()) {
      Alert.alert('Campos obrigatórios', 'Preencha nome, descrição, preço, unidade e cidade.')
      return
    }
    postProduct.mutate({
      name: name.trim(), description: description.trim(), category,
      price: Number(price), unit: unit.trim(), city: city.trim(), state,
      images: photo ? [photo] : [],
      ...(stock && { stock: Number(stock) }),
    }, {
      onSuccess: () => setSuccess(true),
      onError: () => Alert.alert('Erro', 'Não foi possível anunciar o produto.'),
    })
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={mStyles.container} edges={['top']}>
        <View style={mStyles.header}>
          <Text style={mStyles.headerTitle}>Anunciar Produto</Text>
          <TouchableOpacity onPress={handleClose} style={mStyles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {success ? (
          <View style={mStyles.successContainer}>
            <Text style={mStyles.successIcon}>🛒</Text>
            <Text style={mStyles.successTitle}>Produto anunciado!</Text>
            <Text style={mStyles.successSub}>Seu produto já está visível no Marketplace.</Text>
            <TouchableOpacity style={mStyles.submitBtn} onPress={handleClose}>
              <Text style={mStyles.submitBtnText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <ScrollView style={mStyles.form} contentContainerStyle={{ paddingBottom: 40 }}>
              {/* Photo picker */}
              <Text style={mStyles.fieldLabel}>Foto do produto</Text>
              <TouchableOpacity style={mStyles.photoBtn} onPress={async () => {
                const uri = await choosePhotoSource()
                if (uri) setPhoto(uri)
              }}>
                {photo ? (
                  <Image source={{ uri: photo }} style={mStyles.photoPreview} resizeMode="cover" />
                ) : (
                  <View style={mStyles.photoPlaceholder}>
                    <Ionicons name="camera-outline" size={32} color={colors.textMuted} />
                    <Text style={mStyles.photoPlaceholderText}>Toque para adicionar foto</Text>
                  </View>
                )}
              </TouchableOpacity>
              {photo && (
                <TouchableOpacity onPress={() => setPhoto(null)} style={mStyles.removePhoto}>
                  <Text style={mStyles.removePhotoText}>Remover foto</Text>
                </TouchableOpacity>
              )}

              <Text style={mStyles.fieldLabel}>Nome do produto *</Text>
              <TextInput style={mStyles.input} value={name} onChangeText={setName}
                placeholder="Ex: Semente de Soja TMG 7062" placeholderTextColor={colors.textMuted} />

              <Text style={mStyles.fieldLabel}>Categoria *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.xs }}>
                <View style={{ flexDirection: 'row', gap: spacing.xs, paddingVertical: spacing.xs }}>
                  {CATEGORIES_LIST.map((c) => (
                    <TouchableOpacity key={c.value} style={[mStyles.catChip, category === c.value && mStyles.catChipActive]}
                      onPress={() => setCategory(c.value)}>
                      <Text style={[mStyles.catChipText, category === c.value && mStyles.catChipTextActive]}>{c.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <Text style={mStyles.fieldLabel}>Descrição *</Text>
              <TextInput style={[mStyles.input, mStyles.textarea]} value={description} onChangeText={setDescription}
                multiline numberOfLines={3} placeholder="Especificações, condições, forma de entrega..."
                placeholderTextColor={colors.textMuted} />

              <View style={mStyles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={mStyles.fieldLabel}>Preço (R$) *</Text>
                  <TextInput style={mStyles.input} value={price} onChangeText={setPrice}
                    keyboardType="decimal-pad" placeholder="0,00" placeholderTextColor={colors.textMuted} />
                </View>
                <View style={{ width: spacing.md }} />
                <View style={{ flex: 1 }}>
                  <Text style={mStyles.fieldLabel}>Unidade *</Text>
                  <TextInput style={mStyles.input} value={unit} onChangeText={setUnit}
                    placeholder="kg, saca, un." placeholderTextColor={colors.textMuted} />
                </View>
              </View>

              <Text style={mStyles.fieldLabel}>Estoque disponível</Text>
              <TextInput style={mStyles.input} value={stock} onChangeText={setStock}
                keyboardType="numeric" placeholder="Ex: 100" placeholderTextColor={colors.textMuted} />

              <View style={mStyles.row}>
                <View style={{ flex: 2 }}>
                  <Text style={mStyles.fieldLabel}>Cidade *</Text>
                  <TextInput style={mStyles.input} value={city} onChangeText={setCity}
                    placeholder="Sorriso" placeholderTextColor={colors.textMuted} />
                </View>
                <View style={{ width: spacing.md }} />
                <View style={{ flex: 1 }}>
                  <Text style={mStyles.fieldLabel}>UF *</Text>
                  <TextInput style={mStyles.input} value={state} onChangeText={setState}
                    placeholder="MT" maxLength={2} autoCapitalize="characters" placeholderTextColor={colors.textMuted} />
                </View>
              </View>

              <TouchableOpacity style={[mStyles.submitBtn, postProduct.isPending && { opacity: 0.6 }]}
                onPress={handleSubmit} disabled={postProduct.isPending}>
                <Text style={mStyles.submitBtnText}>{postProduct.isPending ? 'Anunciando...' : 'Anunciar Produto'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </Modal>
  )
}

// ─── Product card ─────────────────────────────────────────────────────────────

function ProductCard({ product, onPress }: { product: MarketplaceProduct; onPress: () => void }) {
  const icon = CATEGORY_ICONS[product.category] ?? '📦'
  const seller = (product as any).seller
  const hasPhoto = product.images?.[0]

  return (
    <TouchableOpacity style={[styles.productCard, shadows.sm]} onPress={onPress} activeOpacity={0.85}>
      {hasPhoto ? (
        <Image source={{ uri: product.images[0] }} style={styles.productImage} resizeMode="cover" />
      ) : (
        <View style={styles.productImagePlaceholder}>
          <Text style={styles.productIcon}>{icon}</Text>
        </View>
      )}
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
        <Text style={styles.productDesc} numberOfLines={2}>{product.description}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
          <Text style={styles.unit}>/{product.unit}</Text>
        </View>
        <View style={styles.locationRow}>
          {seller?.name && <Text style={styles.sellerName} numberOfLines={1}>{seller.name}</Text>}
          <View style={styles.locationPill}>
            <Ionicons name="location-outline" size={11} color={colors.primary} />
            <Text style={styles.locationText}>
              {product.city}/{product.state}
              {product.distanceKm != null ? ` · ${product.distanceKm} km` : ''}
            </Text>
          </View>
        </View>
        {product.stock != null && (
          <Text style={styles.stock}>{product.stock.toLocaleString('pt-BR')} disponíveis</Text>
        )}
      </View>
      <TouchableOpacity style={styles.contactBtn} onPress={onPress}>
        <Text style={styles.contactBtnText}>Ver Produto</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function MarketplaceScreen() {
  const [category, setCategory] = useState('all')
  const [showPost, setShowPost] = useState(false)
  const [selected, setSelected] = useState<MarketplaceProduct | null>(null)
  const { data: products, isLoading, refetch } = useMarketplace(category)

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <PostProductModal visible={showPost} onClose={() => setShowPost(false)} />
      {selected && <ProductDetailModal product={selected} onClose={() => setSelected(null)} />}

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="storefront-outline" size={24} color={colors.white} />
          <Text style={styles.headerTitle}>Marketplace</Text>
        </View>
        <TouchableOpacity onPress={() => setShowPost(true)} style={styles.postBtn}>
          <Ionicons name="add" size={18} color={colors.white} />
          <Text style={styles.postBtnText}>Anunciar</Text>
        </TouchableOpacity>
      </View>

      <View>
        <FlatList
          data={FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.filterRow}
          renderItem={({ item }) => (
            <TouchableOpacity style={[styles.filterChip, category === item && styles.filterChipActive]}
              onPress={() => setCategory(item)}>
              {item !== 'all' && <Text style={styles.filterIcon}>{CATEGORY_ICONS[item]}</Text>}
              <Text style={[styles.filterText, category === item && styles.filterTextActive]}>
                {item === 'all' ? 'Tudo' : CATEGORY_LABELS[item]}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>
      ) : (products ?? []).length === 0 ? (
        <View style={styles.center}>
          <Text style={{ fontSize: 48 }}>🛒</Text>
          <Text style={styles.emptyText}>Nenhum produto encontrado</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowPost(true)}>
            <Text style={styles.emptyBtnText}>Anunciar produto</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={products ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          numColumns={2}
          columnWrapperStyle={styles.row}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} colors={[colors.primary]} />}
          renderItem={({ item }) => <ProductCard product={item} onPress={() => setSelected(item)} />}
        />
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
  header: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 4 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerTitle: { ...typography.h3, color: colors.white },
  postBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.secondary, paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs + 2, borderRadius: borderRadius.full },
  postBtnText: { ...typography.label, color: colors.white, fontSize: 13 },
  filterRow: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.xs, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  filterChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs + 2, borderRadius: borderRadius.full, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, gap: 4 },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterIcon: { fontSize: 13 },
  filterText: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' as const },
  filterTextActive: { color: colors.white },
  list: { padding: spacing.md, paddingBottom: 100 },
  row: { justifyContent: 'space-between', marginBottom: spacing.md },
  productCard: { width: CARD_WIDTH, backgroundColor: colors.surface, borderRadius: borderRadius.lg, overflow: 'hidden' },
  productImage: { width: '100%', height: 110 },
  productImagePlaceholder: { height: 90, backgroundColor: colors.surfaceSecondary, justifyContent: 'center', alignItems: 'center' },
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
  contactBtn: { backgroundColor: colors.primary, marginHorizontal: spacing.sm + 2, marginBottom: spacing.sm + 2, borderRadius: borderRadius.md, paddingVertical: spacing.xs + 2, alignItems: 'center' },
  contactBtnText: { ...typography.caption, color: colors.white, fontWeight: '700' as const },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  emptyText: { ...typography.body, color: colors.textMuted },
  emptyBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm + 2, borderRadius: borderRadius.full },
  emptyBtnText: { ...typography.label, color: colors.white, fontSize: 14 },
  fab: { position: 'absolute', bottom: 20, right: spacing.md, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.secondary, justifyContent: 'center', alignItems: 'center', ...shadows.lg },
})

const mStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { ...typography.h3, color: colors.text },
  closeBtn: { padding: spacing.xs },
  form: { flex: 1, padding: spacing.md },
  fieldLabel: { ...typography.label, color: colors.text, marginBottom: spacing.xs, marginTop: spacing.md },
  input: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, ...typography.body, color: colors.text },
  textarea: { height: 90, textAlignVertical: 'top' },
  row: { flexDirection: 'row' },
  catChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, borderRadius: borderRadius.full, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  catChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  catChipText: { ...typography.label, color: colors.textSecondary },
  catChipTextActive: { color: colors.white },
  photoBtn: { borderRadius: borderRadius.md, overflow: 'hidden', borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed', backgroundColor: colors.surfaceSecondary },
  photoPreview: { width: '100%', height: 180 },
  photoPlaceholder: { height: 120, justifyContent: 'center', alignItems: 'center', gap: spacing.xs },
  photoPlaceholderText: { ...typography.bodySmall, color: colors.textMuted },
  removePhoto: { marginTop: spacing.xs, alignSelf: 'flex-end' },
  removePhotoText: { ...typography.caption, color: colors.error },
  submitBtn: { backgroundColor: colors.primary, borderRadius: borderRadius.lg, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.xl },
  submitBtnText: { ...typography.h4, color: colors.white },
  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl, gap: spacing.md },
  successIcon: { fontSize: 56 },
  successTitle: { ...typography.h2, color: colors.text },
  successSub: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
})

const det = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { ...typography.h4, color: colors.text, flex: 1, textAlign: 'center' },
  closeBtn: { padding: spacing.xs },
  heroImage: { width: '100%', height: 260 },
  heroPlaceholder: { height: 180, backgroundColor: colors.surfaceSecondary, justifyContent: 'center', alignItems: 'center' },
  heroIcon: { fontSize: 72 },
  body: { padding: spacing.lg, gap: spacing.md },
  topRow: { flexDirection: 'row', alignItems: 'flex-start' },
  name: { ...typography.h2, color: colors.text, marginBottom: spacing.xs },
  catBadge: { alignSelf: 'flex-start', backgroundColor: colors.surfaceSecondary, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.border },
  catBadgeText: { ...typography.caption, color: colors.primary, fontWeight: '600' as const },
  priceBox: { backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  priceLabel: { ...typography.caption, color: colors.textMuted, marginBottom: 2 },
  price: { fontSize: 28, fontWeight: '700' as const, color: colors.primary },
  unit: { fontSize: 16, fontWeight: '400' as const, color: colors.textMuted },
  stock: { ...typography.bodySmall, color: colors.success, marginTop: spacing.xs },
  section: { gap: spacing.xs },
  sectionTitle: { ...typography.label, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  description: { ...typography.body, color: colors.text, lineHeight: 24 },
  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surfaceSecondary, padding: spacing.md, borderRadius: borderRadius.lg },
  sellerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  sellerAvatarImg: { width: 44, height: 44, borderRadius: 22 },
  sellerAvatarText: { ...typography.h4, color: colors.white },
  sellerName: { ...typography.label, color: colors.text },
  sellerRole: { ...typography.caption, color: colors.textMuted },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  locationText: { ...typography.body, color: colors.textSecondary },
  actionsRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  msgBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary, borderRadius: borderRadius.lg, paddingVertical: spacing.md },
  msgBtnText: { ...typography.label, color: colors.white },
  phoneBtn: { width: 50, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.primary, borderRadius: borderRadius.lg },
})
