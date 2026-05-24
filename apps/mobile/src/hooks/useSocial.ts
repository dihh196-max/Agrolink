import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api.js'
import type {
  SearchResults,
  MessageThread,
  DirectMessage,
  Notification,
  PartnerProfile,
  Job,
  MarketplaceProduct,
} from '@agrolink/types'

// ─── Busca ────────────────────────────────────────────────────────────────────
export function useSearch(query: string, type = 'all') {
  return useQuery<SearchResults>({
    queryKey: ['search', query, type],
    queryFn: () => api.get('/search', { params: { q: query, type } }).then((r) => r.data),
    enabled: query.trim().length >= 2,
  })
}

// ─── Parcerias (follow) ─────────────────────────────────────────────────────
export function usePartnershipStats(userId: string) {
  return useQuery<{ followers: number; following: number; isPartner: boolean }>({
    queryKey: ['partnerships', 'stats', userId],
    queryFn: () => api.get(`/partnerships/stats/${userId}`).then((r) => r.data),
    enabled: !!userId,
  })
}

export function useFollowing() {
  return useQuery<PartnerProfile[]>({
    queryKey: ['partnerships', 'following'],
    queryFn: () => api.get('/partnerships/following').then((r) => r.data),
  })
}

export function useTogglePartnership() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, isPartner }: { userId: string; isPartner: boolean }) =>
      isPartner
        ? api.delete(`/partnerships/${userId}`).then((r) => r.data)
        : api.post(`/partnerships/${userId}`).then((r) => r.data),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['partnerships', 'stats', v.userId] })
      qc.invalidateQueries({ queryKey: ['partnerships', 'following'] })
    },
  })
}

// ─── Mensagens (chat) ─────────────────────────────────────────────────────────
export function useThreads() {
  return useQuery<MessageThread[]>({
    queryKey: ['messages', 'threads'],
    queryFn: () => api.get('/messages/threads').then((r) => r.data),
    refetchInterval: 15000,
  })
}

export function useThreadMessages(threadId: string) {
  return useQuery<DirectMessage[]>({
    queryKey: ['messages', 'thread', threadId],
    queryFn: () => api.get(`/messages/threads/${threadId}`).then((r) => r.data),
    enabled: !!threadId,
    refetchInterval: 5000,
  })
}

export function useStartConversation() {
  return useMutation({
    mutationFn: (userId: string) =>
      api.post(`/messages/with/${userId}`).then((r) => r.data as { id: string }),
  })
}

export function useSendMessage(threadId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (content: string) =>
      api.post(`/messages/threads/${threadId}`, { content }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages', 'thread', threadId] })
      qc.invalidateQueries({ queryKey: ['messages', 'threads'] })
    },
  })
}

// ─── Notificações ─────────────────────────────────────────────────────────────
export function useNotifications(unreadOnly = false) {
  return useQuery<Notification[]>({
    queryKey: ['notifications', unreadOnly],
    queryFn: () =>
      api.get('/notifications', { params: { unreadOnly } }).then((r) => r.data),
    refetchInterval: 20000,
  })
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
}

export function useMarkAllRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.patch('/notifications/read-all').then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
}

// ─── Vagas de Emprego ─────────────────────────────────────────────────────────
export function useJobs(typeFilter?: string, geo?: { lat: number; lng: number }) {
  return useQuery<Job[]>({
    queryKey: ['jobs', typeFilter, geo?.lat, geo?.lng],
    queryFn: () =>
      api
        .get('/jobs', {
          params: {
            ...(typeFilter && typeFilter !== 'all' && { type: typeFilter }),
            ...(geo && { lat: geo.lat, lng: geo.lng, radius: 300 }),
          },
        })
        .then((r) => r.data),
  })
}

export function useApplyJob() {
  return useMutation({
    mutationFn: ({ jobId, message }: { jobId: string; message?: string }) =>
      api.post(`/jobs/${jobId}/apply`, { message }).then((r) => r.data),
  })
}

// ─── Marketplace ──────────────────────────────────────────────────────────────
export function useMarketplace(category?: string, geo?: { lat: number; lng: number }) {
  return useQuery<MarketplaceProduct[]>({
    queryKey: ['marketplace', category, geo?.lat, geo?.lng],
    queryFn: () =>
      api
        .get('/marketplace', {
          params: {
            ...(category && category !== 'all' && { category }),
            ...(geo && { lat: geo.lat, lng: geo.lng, radius: 400 }),
          },
        })
        .then((r) => r.data),
  })
}
