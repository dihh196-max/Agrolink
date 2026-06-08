import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api.js'
import type { Story } from '@agrolink/types'

export function useStories() {
  return useQuery<Story[]>({
    queryKey: ['stories'],
    queryFn: () => api.get('/stories').then((r) => r.data),
  })
}

export function useCreateStory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { mediaUrl: string; mediaType?: 'image' | 'video' }) =>
      api.post('/stories', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stories'] }),
  })
}
