import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useNotifications, useMarkNotificationRead, useMarkAllRead } from '../hooks/useSocial.js'
import { colors, spacing, typography, borderRadius, shadows } from '../constants/theme.js'
import type { Notification, NotificationType } from '@agrolink/types'

const ICONS: Record<NotificationType, string> = {
  price_alert: '📈',
  new_follower: '🤝',
  post_reaction: '❤️',
  post_comment: '💬',
  new_offer: '📦',
  message: '✉️',
  weather_alert: '🌦️',
  news: '📰',
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

export default function NotificationsScreen() {
  const { data: notifications, isLoading } = useNotifications()
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllRead()

  const handlePress = (n: Notification) => {
    if (!n.read) markRead.mutate(n.id)
    const p = n.payload as any
    if (n.type === 'message' && p?.threadId) router.push(`/chat/${p.threadId}`)
  }

  const renderItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.row, !item.read && styles.rowUnread]}
      onPress={() => handlePress(item)}
    >
      <Text style={styles.icon}>{ICONS[item.type] ?? '🔔'}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
        <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
      </View>
      {!item.read && <View style={styles.dot} />}
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notificações</Text>
        <TouchableOpacity onPress={() => markAll.mutate()}>
          <Text style={styles.markAll}>Ler tudo</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : (notifications?.length ?? 0) === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyText}>Nenhuma notificação ainda</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(n) => n.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  headerTitle: { ...typography.h4, color: colors.white },
  markAll: { ...typography.bodySmall, color: colors.white },
  list: { padding: spacing.md, gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.white, padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.xs, ...shadows.sm },
  rowUnread: { backgroundColor: '#f0f7f1' },
  icon: { fontSize: 26 },
  title: { ...typography.label, color: colors.text },
  body: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 2 },
  time: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyText: { ...typography.body, color: colors.textMuted },
})
