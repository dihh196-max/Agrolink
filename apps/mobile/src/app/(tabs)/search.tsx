import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useSearch } from '../../hooks/useSocial.js'
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme.js'

const ROLE_LABELS: Record<string, string> = {
  producer: 'Produtor',
  technician: 'Técnico',
  supplier: 'Fornecedor',
  cooperative: 'Cooperativa',
}

const FILTERS = [
  { id: 'all', label: 'Tudo' },
  { id: 'people', label: 'Pessoas' },
  { id: 'companies', label: 'Empresas' },
  { id: 'posts', label: 'Posts' },
  { id: 'news', label: 'Notícias' },
  { id: 'offers', label: 'Ofertas' },
]

function PersonRow({ p }: { p: any }) {
  return (
    <TouchableOpacity style={styles.row} onPress={() => router.push(`/profile/${p.username}`)}>
      {p.avatarUrl ? (
        <Image source={{ uri: p.avatarUrl }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Text style={styles.avatarText}>{p.name[0].toUpperCase()}</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{p.name}</Text>
          {p.verified && <Ionicons name="checkmark-circle" size={14} color={colors.primary} />}
        </View>
        <Text style={styles.meta}>@{p.username} · {ROLE_LABELS[p.role]}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </TouchableOpacity>
  )
}

export default function SearchScreen() {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const { data, isLoading } = useSearch(query, filter)

  const show = (k: string) => filter === 'all' || filter === k

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pesquisar</Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar pessoas, empresas, notícias..."
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          autoFocus
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters} contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.md }}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.id}
            style={[styles.filterBtn, filter === f.id && styles.filterBtnActive]}
            onPress={() => setFilter(f.id)}
          >
            <Text style={[styles.filterText, filter === f.id && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {query.trim().length < 2 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyText}>Digite ao menos 2 letras para buscar</Text>
        </View>
      ) : isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : (
        <ScrollView contentContainerStyle={styles.results}>
          {/* People */}
          {show('people') && (data?.people?.length ?? 0) > 0 && (
            <>
              <Text style={styles.section}>Pessoas</Text>
              {data!.people.map((p) => <PersonRow key={p.id} p={p} />)}
            </>
          )}
          {/* Companies */}
          {show('companies') && (data?.companies?.length ?? 0) > 0 && (
            <>
              <Text style={styles.section}>Empresas</Text>
              {data!.companies.map((c) => <PersonRow key={c.id} p={c} />)}
            </>
          )}
          {/* News */}
          {show('news') && (data?.news?.length ?? 0) > 0 && (
            <>
              <Text style={styles.section}>Notícias</Text>
              {data!.news.map((n) => (
                <View key={n.id} style={styles.card}>
                  <Text style={styles.newsTitle}>{n.title}</Text>
                  <Text style={styles.newsSummary} numberOfLines={2}>{n.summary}</Text>
                  <Text style={styles.newsSource}>{n.sourceName}</Text>
                </View>
              ))}
            </>
          )}
          {/* Posts */}
          {show('posts') && (data?.posts?.length ?? 0) > 0 && (
            <>
              <Text style={styles.section}>Publicações</Text>
              {data!.posts.map((p: any) => (
                <View key={p.id} style={styles.card}>
                  <Text style={styles.meta}>@{p.author?.username}</Text>
                  <Text style={styles.postContent} numberOfLines={3}>{p.content}</Text>
                </View>
              ))}
            </>
          )}
          {/* Offers */}
          {show('offers') && (data?.offers?.length ?? 0) > 0 && (
            <>
              <Text style={styles.section}>Ofertas</Text>
              {data!.offers.map((o: any) => (
                <View key={o.id} style={styles.card}>
                  <Text style={styles.offerTitle}>{o.type === 'sell' ? '📤 Venda' : '📥 Compra'} · {o.culture} · {o.volumeTons}t</Text>
                  <Text style={styles.meta}>R$ {o.pricePerUnit.toFixed(2)} · {o.city}/{o.state}</Text>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  headerTitle: { ...typography.h3, color: colors.white },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.white, margin: spacing.md, paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full, borderWidth: 1.5, borderColor: colors.border, height: 46,
  },
  searchInput: { flex: 1, ...typography.body, color: colors.text },
  filters: { maxHeight: 44, marginBottom: spacing.sm },
  filterBtn: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: borderRadius.full, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, height: 32 },
  filterBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { ...typography.bodySmall, color: colors.textSecondary },
  filterTextActive: { color: colors.white, fontWeight: '600' },
  results: { padding: spacing.md, gap: spacing.sm, paddingBottom: 100 },
  section: { ...typography.label, color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.xs, textTransform: 'uppercase' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.white, padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.xs, ...shadows.sm },
  avatar: { width: 42, height: 42, borderRadius: 21 },
  avatarFallback: { backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  avatarText: { ...typography.h4, color: colors.white },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { ...typography.label, color: colors.text },
  meta: { ...typography.caption, color: colors.textMuted },
  card: { backgroundColor: colors.white, padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.xs, ...shadows.sm },
  newsTitle: { ...typography.label, color: colors.text, marginBottom: 4 },
  newsSummary: { ...typography.bodySmall, color: colors.textSecondary },
  newsSource: { ...typography.caption, color: colors.primary, marginTop: 4 },
  postContent: { ...typography.body, color: colors.text, marginTop: 2 },
  offerTitle: { ...typography.label, color: colors.text },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyText: { ...typography.body, color: colors.textMuted },
})
