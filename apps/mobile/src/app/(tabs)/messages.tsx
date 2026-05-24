import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useThreads } from '../../hooks/useSocial.js'
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme.js'
import type { MessageThread } from '@agrolink/types'

function timeAgo(date?: string) {
  if (!date) return ''
  const diff = Date.now() - new Date(date).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

function ThreadRow({ thread }: { thread: MessageThread }) {
  const u = thread.otherUser
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => router.push(`/chat/${thread.id}?name=${encodeURIComponent(u.name)}`)}
    >
      {u.avatarUrl ? (
        <Image source={{ uri: u.avatarUrl }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Text style={styles.avatarText}>{u.name[0].toUpperCase()}</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <View style={styles.topRow}>
          <Text style={styles.name}>{u.name}</Text>
          <Text style={styles.time}>{timeAgo(thread.lastMessageAt)}</Text>
        </View>
        <Text style={[styles.preview, thread.unreadCount > 0 && styles.previewUnread]} numberOfLines={1}>
          {thread.lastMessage ?? 'Iniciar conversa'}
        </Text>
      </View>
      {thread.unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{thread.unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

export default function MessagesScreen() {
  const { data: threads, isLoading } = useThreads()

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mensagens</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/search')}>
          <Ionicons name="create-outline" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : (threads?.length ?? 0) === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>💬</Text>
          <Text style={styles.emptyTitle}>Nenhuma conversa ainda</Text>
          <Text style={styles.emptyText}>Encontre parceiros na busca e inicie uma conversa</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(tabs)/search')}>
            <Text style={styles.emptyBtnText}>Buscar parceiros</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={threads}
          keyExtractor={(t) => t.id}
          renderItem={({ item }) => <ThreadRow thread={item} />}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.primary, flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  headerTitle: { ...typography.h3, color: colors.white },
  list: { padding: spacing.md, gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.white, padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.xs, ...shadows.sm },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  avatarFallback: { backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  avatarText: { ...typography.h3, color: colors.white },
  topRow: { flexDirection: 'row', justifyContent: 'space-between' },
  name: { ...typography.label, color: colors.text },
  time: { ...typography.caption, color: colors.textMuted },
  preview: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 2 },
  previewUnread: { color: colors.text, fontWeight: '600' },
  badge: { backgroundColor: colors.primary, minWidth: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  badgeText: { ...typography.caption, color: colors.white, fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.sm },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.lg },
  emptyBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.full },
  emptyBtnText: { ...typography.label, color: colors.white },
})
