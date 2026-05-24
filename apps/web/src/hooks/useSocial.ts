'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { api } from '../lib/api'

// Demo auto-login so the live API works without a full auth UI
export function useDemoAuth() {
  const [ready, setReady] = useState(false)
  const qc = useQueryClient()
  useEffect(() => {
    if (localStorage.getItem('accessToken')) {
      setReady(true)
      return
    }
    api
      .post('/auth/login', { email: 'joao@fazenda.com', password: 'senha12345' })
      .then((r) => {
        localStorage.setItem('accessToken', r.data.accessToken)
        localStorage.setItem('refreshToken', r.data.refreshToken)
        setReady(true)
        // Refetch queries that may have fired before the token was set
        qc.invalidateQueries()
      })
      .catch(() => setReady(true))
  }, [qc])
  return ready
}

export function useSearch(query: string, type = 'all', enabled = true, geo?: { lat?: number; lng?: number }) {
  return useQuery({
    queryKey: ['search', query, type, geo?.lat, geo?.lng],
    queryFn: () =>
      api
        .get('/search', {
          params: {
            q: query,
            type,
            ...(geo?.lat != null && { lat: geo.lat, lng: geo.lng, radius: 200 }),
          },
        })
        .then((r) => r.data),
    enabled: enabled && query.trim().length >= 2,
  })
}

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then((r) => r.data),
    refetchInterval: 20000,
  })
}

export function useMarkAllRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.patch('/notifications/read-all').then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
}

export function useThreads() {
  return useQuery({
    queryKey: ['threads'],
    queryFn: () => api.get('/messages/threads').then((r) => r.data),
    refetchInterval: 10000,
  })
}

export function useThreadMessages(threadId: string | null) {
  return useQuery({
    queryKey: ['thread', threadId],
    queryFn: () => api.get(`/messages/threads/${threadId}`).then((r) => r.data),
    enabled: !!threadId,
    refetchInterval: 5000,
  })
}

export function useSendMessage(threadId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (content: string) =>
      api.post(`/messages/threads/${threadId}`, { content }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['thread', threadId] })
      qc.invalidateQueries({ queryKey: ['threads'] })
    },
  })
}

export function useStartConversation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => api.post(`/messages/with/${userId}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['threads'] }),
  })
}

export function useTogglePartnership() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, isPartner }: { userId: string; isPartner: boolean }) =>
      isPartner ? api.delete(`/partnerships/${userId}`) : api.post(`/partnerships/${userId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['search'] }),
  })
}

export function useFollowing() {
  return useQuery({
    queryKey: ['following'],
    queryFn: () => api.get('/partnerships/following').then((r) => r.data),
  })
}

export function usePostJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/jobs', body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  })
}

export function usePostProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/marketplace', body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['marketplace'] }),
  })
}
