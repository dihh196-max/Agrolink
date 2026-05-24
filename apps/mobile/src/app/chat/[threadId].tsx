import { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { useThreadMessages, useSendMessage } from '../../hooks/useSocial.js'
import { useAuthStore } from '../../store/auth.js'
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme.js'
import type { DirectMessage } from '@agrolink/types'

export default function ChatScreen() {
  const { threadId, name } = useLocalSearchParams<{ threadId: string; name?: string }>()
  const me = useAuthStore((s) => s.user)
  const { data: messages } = useThreadMessages(threadId)
  const send = useSendMessage(threadId)
  const [text, setText] = useState('')
  const listRef = useRef<FlatList>(null)

  useEffect(() => {
    if (messages?.length) setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100)
  }, [messages?.length])

  const handleSend = () => {
    const content = text.trim()
    if (!content) return
    setText('')
    send.mutate(content)
  }

  const renderMessage = ({ item }: { item: DirectMessage }) => {
    const mine = item.senderId === me?.id
    return (
      <View style={[styles.bubbleWrap, mine ? styles.bubbleWrapMine : styles.bubbleWrapOther]}>
        <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
          <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{item.content}</Text>
          <Text style={[styles.bubbleTime, mine && styles.bubbleTimeMine]}>
            {new Date(item.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerName}>{name ?? 'Conversa'}</Text>
        <View style={{ width: 26 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={listRef}
          data={messages ?? []}
          keyExtractor={(m) => m.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messages}
        />
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Mensagem..."
            placeholderTextColor={colors.textMuted}
            multiline
          />
          <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={!text.trim()}>
            <Ionicons name="send" size={20} color={colors.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.sm,
  },
  headerName: { ...typography.h4, color: colors.white, flex: 1, textAlign: 'center' },
  messages: { padding: spacing.md, gap: spacing.sm },
  bubbleWrap: { flexDirection: 'row' },
  bubbleWrapMine: { justifyContent: 'flex-end' },
  bubbleWrapOther: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', borderRadius: borderRadius.lg, padding: spacing.sm, paddingHorizontal: spacing.md },
  bubbleMine: { backgroundColor: colors.primary },
  bubbleOther: { backgroundColor: colors.white, ...shadows.sm },
  bubbleText: { ...typography.body, color: colors.text },
  bubbleTextMine: { color: colors.white },
  bubbleTime: { ...typography.caption, color: colors.textMuted, marginTop: 2, alignSelf: 'flex-end' },
  bubbleTimeMine: { color: 'rgba(255,255,255,0.7)' },
  inputRow: {
    flexDirection: 'row', padding: spacing.md, gap: spacing.sm, backgroundColor: colors.white,
    borderTopWidth: 1, borderTopColor: colors.border, alignItems: 'flex-end',
  },
  input: {
    flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, ...typography.body,
    color: colors.text, maxHeight: 100, backgroundColor: colors.background,
  },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
})
