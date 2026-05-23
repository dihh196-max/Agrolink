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
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import {
  useConversations,
  useMessages,
  useCreateConversation,
  useStreamMessage,
} from '../../hooks/useAI.js'
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme.js'
import type { AIMessage, AIConversation } from '@agrolink/types'

const QUICK_PROMPTS = [
  { label: '🌿 Manejo da Soja', prompt: 'Quais são as melhores práticas de manejo para a soja no Mato Grosso?' },
  { label: '🐛 Identificar praga', prompt: 'Como identificar e tratar a lagarta-do-cartucho no milho?' },
  { label: '📈 Analisar mercado', prompt: 'Como está o mercado de soja para os próximos 30 dias?' },
  { label: '📋 Legislação', prompt: 'O que preciso saber sobre o CAR e Reserva Legal da minha fazenda?' },
]

function MessageBubble({ message, isStreaming }: { message: Partial<AIMessage>; isStreaming?: boolean }) {
  const isUser = message.role === 'user'
  return (
    <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
      {!isUser && (
        <View style={styles.aiAvatar}>
          <Text style={styles.aiAvatarText}>IA</Text>
        </View>
      )}
      <View style={[styles.bubbleContent, isUser ? styles.bubbleContentUser : styles.bubbleContentAssistant]}>
        <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>
          {message.content}
          {isStreaming && <Text style={styles.cursor}>▋</Text>}
        </Text>
        {message.quickActions && message.quickActions.length > 0 && (
          <View style={styles.quickActions}>
            {message.quickActions.map((qa, i) => (
              <TouchableOpacity key={i} style={styles.quickAction}>
                <Text style={styles.quickActionText}>{qa.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  )
}

export default function AIScreen() {
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [inputText, setInputText] = useState('')
  const [showConvList, setShowConvList] = useState(false)
  const flatListRef = useRef<FlatList>(null)

  const { data: conversations } = useConversations()
  const { data: messages } = useMessages(activeConvId ?? '')
  const createConv = useCreateConversation()
  const { sendMessage, streamingText, isStreaming } = useStreamMessage(activeConvId ?? '')

  const allMessages: Partial<AIMessage>[] = [
    ...(messages ?? []),
    ...(isStreaming ? [{ id: 'streaming', role: 'assistant' as const, content: streamingText }] : []),
  ]

  useEffect(() => {
    if (allMessages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100)
    }
  }, [allMessages.length])

  const handleSend = async () => {
    const text = inputText.trim()
    if (!text || isStreaming) return

    let convId = activeConvId

    if (!convId) {
      const conv = await createConv.mutateAsync({
        title: text.slice(0, 60),
        contextType: 'geral',
      })
      convId = conv.id
      setActiveConvId(convId)
    }

    setInputText('')
    await sendMessage(text)
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setShowConvList((v) => !v)}>
          <Ionicons name="menu-outline" size={24} color={colors.white} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>AgroIA ✨</Text>
          <Text style={styles.headerSubtitle}>Assistente Inteligente</Text>
        </View>
        <TouchableOpacity onPress={() => { setActiveConvId(null); setInputText('') }}>
          <Ionicons name="add-outline" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Chat or welcome */}
        {allMessages.length === 0 ? (
          <View style={styles.welcome}>
            <Text style={styles.welcomeIcon}>🌱</Text>
            <Text style={styles.welcomeTitle}>Olá! Sou a AgroIA</Text>
            <Text style={styles.welcomeText}>
              Especialista em agronegócio brasileiro. Pergunte sobre manejo, pragas, cotações ou legislação.
            </Text>
            <View style={styles.quickPrompts}>
              {QUICK_PROMPTS.map((qp, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.quickPromptBtn}
                  onPress={() => setInputText(qp.prompt)}
                >
                  <Text style={styles.quickPromptText}>{qp.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={allMessages}
            keyExtractor={(item, i) => item.id ?? String(i)}
            renderItem={({ item }) => (
              <MessageBubble
                message={item}
                isStreaming={item.id === 'streaming'}
              />
            )}
            contentContainerStyle={styles.messages}
          />
        )}

        {/* Input */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Pergunte algo sobre sua lavoura..."
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={4000}
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || isStreaming) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || isStreaming}
          >
            {isStreaming ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Ionicons name="send" size={20} color={colors.white} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { ...typography.h4, color: colors.white },
  headerSubtitle: { ...typography.caption, color: 'rgba(255,255,255,0.7)' },
  welcome: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  welcomeIcon: { fontSize: 56, marginBottom: spacing.md },
  welcomeTitle: { ...typography.h2, color: colors.text, marginBottom: spacing.sm, textAlign: 'center' },
  welcomeText: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl },
  quickPrompts: { width: '100%', gap: spacing.sm },
  quickPromptBtn: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  quickPromptText: { ...typography.body, color: colors.primary, fontWeight: '600' },
  messages: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  bubble: { flexDirection: 'row', gap: spacing.sm, maxWidth: '100%' },
  bubbleUser: { justifyContent: 'flex-end' },
  bubbleAssistant: { justifyContent: 'flex-start' },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    flexShrink: 0,
  },
  aiAvatarText: { ...typography.caption, color: colors.white, fontWeight: '800' },
  bubbleContent: {
    maxWidth: '80%',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  bubbleContentUser: { backgroundColor: colors.primary },
  bubbleContentAssistant: { backgroundColor: colors.white, ...shadows.sm },
  bubbleText: { ...typography.body, color: colors.text, lineHeight: 22 },
  bubbleTextUser: { color: colors.white },
  cursor: { color: colors.primary },
  quickActions: { marginTop: spacing.sm, gap: spacing.xs },
  quickAction: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  quickActionText: { ...typography.bodySmall, color: colors.primary, fontWeight: '600' },
  inputRow: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    color: colors.text,
    maxHeight: 120,
    backgroundColor: colors.background,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: colors.textMuted },
})
