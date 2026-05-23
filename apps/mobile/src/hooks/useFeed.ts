import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api.js'
import type { Post, PostComment } from '@agrolink/types'

export function useFeed() {
  return useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: ({ pageParam }) =>
      api
        .get('/feed', { params: { cursor: pageParam, limit: 20 } })
        .then((r) => r.data),
    getNextPageParam: (last: { hasMore: boolean; nextCursor?: string }) =>
      last.hasMore ? last.nextCursor : undefined,
    initialPageParam: undefined as string | undefined,
  })
}

export function useCreatePost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Post>) => api.post('/posts', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feed'] }),
  })
}

export function useReactToPost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ postId, type }: { postId: string; type: string }) =>
      api.post(`/posts/${postId}/react`, { type }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feed'] }),
  })
}

export function usePostComments(postId: string) {
  return useQuery<PostComment[]>({
    queryKey: ['posts', postId, 'comments'],
    queryFn: () => api.get(`/posts/${postId}/comments`).then((r) => r.data),
  })
}

export function useAddComment(postId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (content: string) =>
      api.post(`/posts/${postId}/comments`, { content }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['posts', postId, 'comments'] }),
  })
}

