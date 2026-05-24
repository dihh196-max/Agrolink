import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api.js'
import type { MarketPrice, Offer, SuggestedPrice, PriceAlert, Culture } from '@agrolink/types'

export function useMarketPrices() {
  return useQuery<MarketPrice[]>({
    queryKey: ['market', 'prices'],
    queryFn: () => api.get('/market/prices').then((r) => r.data),
    refetchInterval: 15 * 60 * 1000, // 15 min
    staleTime: 10 * 60 * 1000,
  })
}

export function usePriceHistory(culture: Culture, days = 30) {
  return useQuery({
    queryKey: ['market', 'history', culture, days],
    queryFn: () =>
      api.get(`/market/prices/${culture}/history`, { params: { days } }).then((r) => r.data),
  })
}

export function useOffers(params?: { culture?: Culture; type?: 'sell' | 'buy'; state?: string }) {
  return useQuery<Offer[]>({
    queryKey: ['market', 'offers', params],
    queryFn: () => api.get('/market/offers', { params }).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  })
}

export function useSuggestedPrice(params: {
  culture: Culture
  latitude: number
  longitude: number
}) {
  return useQuery<SuggestedPrice>({
    queryKey: ['market', 'suggested-price', params],
    queryFn: () => api.get('/market/suggested-price', { params }).then((r) => r.data),
    enabled: !!params.latitude && !!params.longitude,
  })
}

export function usePriceAlerts() {
  return useQuery<PriceAlert[]>({
    queryKey: ['market', 'alerts'],
    queryFn: () => api.get('/market/alerts').then((r) => r.data),
  })
}

export function useCreateOffer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Offer>) => api.post('/market/offers', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['market', 'offers'] }),
  })
}

export function useCreatePriceAlert() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<PriceAlert>) =>
      api.post('/market/alerts', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['market', 'alerts'] }),
  })
}

export function useDeletePriceAlert() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/market/alerts/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['market', 'alerts'] }),
  })
}
