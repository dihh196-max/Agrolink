import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api.js'
import type { Post, PostComment } from '@agrolink/types'

type FeedPage = { items: Post[]; hasMore: boolean; nextCursor?: string }

export function useFeed() {
  return useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: ({ pageParam }): Promise<FeedPage> =>
      api
        .get('/feed', { params: { cursor: pageParam, limit: 20 } })
        .then((r) => r.data),
    getNextPageParam: (last: FeedPage) =>
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

    onMutate: async ({ postId, type }) => {
      await qc.cancelQueries({ queryKey: ['feed'] })
      await qc.cancelQueries({ queryKey: ['post', postId] })

      const prevFeed = qc.getQueryData(['feed'])
      const prevPost = qc.getQueryData(['post', postId])

      const applyOptimistic = (post: Post) => {
        const isToggle = post.userReaction === type
        const newUserReaction = isToggle ? undefined : (type as any)
        const counts = { ...(post.reactionsCount as any) }
        if (post.userReaction) counts[post.userReaction] = Math.max(0, (counts[post.userReaction] ?? 0) - 1)
        if (!isToggle) counts[type] = (counts[type] ?? 0) + 1
        return { ...post, userReaction: newUserReaction, reactionsCount: counts }
      }

      qc.setQueryData(['feed'], (old: any) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            items: page.items.map((item: Post) =>
              item.id === postId ? applyOptimistic(item) : item
            ),
          })),
        }
      })

      qc.setQueryData(['post', postId], (old: Post | undefined) =>
        old ? applyOptimistic(old) : old
      )

      return { prevFeed, prevPost }
    },

    onError: (_err, { postId }, ctx: any) => {
      if (ctx?.prevFeed) qc.setQueryData(['feed'], ctx.prevFeed)
      if (ctx?.prevPost) qc.setQueryData(['post', postId], ctx.prevPost)
    },

    onSettled: (_data, _err, { postId }) => {
      qc.invalidateQueries({ queryKey: ['feed'] })
      qc.invalidateQueries({ queryKey: ['post', postId] })
    },
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
