import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useCallback } from 'react'
import { api } from '../lib/api.js'
import * as SecureStore from 'expo-secure-store'
import Constants from 'expo-constants'
import type { AIConversation, AIMessage } from '@agrolink/types'

const BASE_URL =
  Constants.expoConfig?.extra?.apiUrl ?? 'http://localhost:3001/api/v1'

export function useConversations() {
  return useQuery<AIConversation[]>({
    queryKey: ['ai', 'conversations'],
    queryFn: () => api.get('/ai/conversations').then((r) => r.data),
  })
}

export function useMessages(conversationId: string) {
  return useQuery<AIMessage[]>({
    queryKey: ['ai', 'messages', conversationId],
    queryFn: () =>
      api.get(`/ai/conversations/${conversationId}/messages`).then((r) => r.data),
    enabled: !!conversationId,
  })
}

export function useCreateConversation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<AIConversation>) =>
      api.post('/ai/conversations', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ai', 'conversations'] }),
  })
}

export function useStreamMessage(conversationId: string) {
  const [streamingText, setStreamingText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const qc = useQueryClient()

  const sendMessage = useCallback(
    async (content: string) => {
      setIsStreaming(true)
      setStreamingText('')

      const token = await SecureStore.getItemAsync('accessToken')

      const response = await fetch(
        `${BASE_URL}/ai/conversations/${conversationId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content }),
        }
      )

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter((l) => l.startsWith('data: '))

        for (const line of lines) {
          try {
            const json = JSON.parse(line.slice(6))
            if (json.text) setStreamingText((prev) => prev + json.text)
            if (json.done) {
              setIsStreaming(false)
              qc.invalidateQueries({ queryKey: ['ai', 'messages', conversationId] })
              qc.invalidateQueries({ queryKey: ['ai', 'conversations'] })
            }
          } catch {
            // skip malformed chunks
          }
        }
      }
    },
    [conversationId, qc]
  )

  return { sendMessage, streamingText, isStreaming }
}
