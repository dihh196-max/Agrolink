import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { eq, desc, sql, and } from 'drizzle-orm'
import { posts, postReactions, postComments, users } from '@agrolink/database'

const createPostSchema = z.object({
  content: z.string().min(1).max(5000),
  media: z
    .array(
      z.object({
        type: z.enum(['image', 'video']),
        url: z.string().min(1),
        thumbnailUrl: z.string().optional(),
      })
    )
    .default([]),
  tags: z.array(z.string()).default([]),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  city: z.string().optional(),
  state: z.string().length(2).optional(),
})

export const postsRoutes: FastifyPluginAsync = async (fastify) => {
  const db = fastify.db

  // Feed — cursor-based pagination with userReaction per authenticated user
  fastify.get(
    '/feed',
    { onRequest: [fastify.authenticate] },
    async (request) => {
      const query = request.query as { cursor?: string; limit?: string }
      const limit = Math.min(Number(query.limit ?? 20), 50)
      const userId = request.user.sub

      const rows = await db
        .select({
          post: posts,
          author: {
            id: users.id,
            name: users.name,
            username: users.username,
            avatarUrl: users.avatarUrl,
            role: users.role,
          },
          userReaction: postReactions.type,
        })
        .from(posts)
        .innerJoin(users, eq(posts.userId, users.id))
        .leftJoin(
          postReactions,
          and(eq(postReactions.postId, posts.id), eq(postReactions.userId, userId))
        )
        .orderBy(desc(posts.createdAt))
        .limit(limit + 1)

      const hasMore = rows.length > limit
      const items = rows.slice(0, limit).map((r) => ({
        ...r.post,
        author: r.author,
        userReaction: r.userReaction ?? undefined,
      }))

      return {
        items,
        hasMore,
        nextCursor: hasMore ? items[items.length - 1].createdAt : undefined,
      }
    }
  )

  // Create post
  fastify.post('/posts', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const body = createPostSchema.parse(request.body)
    const userId = request.user.sub

    const [post] = await db
      .insert(posts)
      .values({ ...body, userId })
      .returning()

    return reply.code(201).send(post)
  })

  // Get single post with userReaction
  fastify.get('/posts/:id', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const userId = request.user.sub

    const [row] = await db
      .select({
        post: posts,
        author: {
          id: users.id,
          name: users.name,
          username: users.username,
          avatarUrl: users.avatarUrl,
          role: users.role,
        },
        userReaction: postReactions.type,
      })
      .from(posts)
      .innerJoin(users, eq(posts.userId, users.id))
      .leftJoin(
        postReactions,
        and(eq(postReactions.postId, posts.id), eq(postReactions.userId, userId))
      )
      .where(eq(posts.id, id))
      .limit(1)

    if (!row) return reply.code(404).send({ error: 'Post não encontrado' })

    return { ...row.post, author: row.author, userReaction: row.userReaction ?? undefined }
  })

  // React to post (with toggle and count update)
  fastify.post('/posts/:id/react', { onRequest: [fastify.authenticate] }, async (request) => {
    const { id } = request.params as { id: string }
    const { type } = z
      .object({ type: z.enum(['like', 'applause', 'useful', 'insightful']) })
      .parse(request.body)
    const userId = request.user.sub

    // Check if user already has this exact reaction (toggle off)
    const [existing] = await db
      .select({ type: postReactions.type })
      .from(postReactions)
      .where(and(eq(postReactions.postId, id), eq(postReactions.userId, userId)))
      .limit(1)

    let userReaction: string | null = type

    if (existing?.type === type) {
      // Same reaction → remove (toggle off)
      await db
        .delete(postReactions)
        .where(and(eq(postReactions.postId, id), eq(postReactions.userId, userId)))
      userReaction = null
    } else {
      // New or changed reaction → upsert
      await db
        .insert(postReactions)
        .values({ postId: id, userId, type })
        .onConflictDoUpdate({
          target: [postReactions.postId, postReactions.userId],
          set: { type },
        })
    }

    // Recompute counts from source of truth
    const counts = await db
      .select({ type: postReactions.type, cnt: sql<number>`count(*)::int` })
      .from(postReactions)
      .where(eq(postReactions.postId, id))
      .groupBy(postReactions.type)

    const reactionsCount: Record<string, number> = { like: 0, applause: 0, useful: 0, insightful: 0 }
    for (const row of counts) {
      reactionsCount[row.type] = row.cnt
    }

    await db.update(posts).set({ reactionsCount }).where(eq(posts.id, id))

    return { success: true, reactionsCount, userReaction }
  })

  // Get post comments
  fastify.get('/posts/:id/comments', { onRequest: [fastify.authenticate] }, async (request) => {
    const { id } = request.params as { id: string }

    const rows = await db
      .select({
        comment: postComments,
        author: {
          id: users.id,
          name: users.name,
          username: users.username,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(postComments)
      .innerJoin(users, eq(postComments.userId, users.id))
      .where(eq(postComments.postId, id))
      .orderBy(postComments.createdAt)

    return rows.map((r) => ({ ...r.comment, author: r.author }))
  })

  // Add comment
  fastify.post(
    '/posts/:id/comments',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const { content } = z.object({ content: z.string().min(1).max(2000) }).parse(request.body)
      const userId = request.user.sub

      const [comment] = await db
        .insert(postComments)
        .values({ postId: id, userId, content })
        .returning()

      await db
        .update(posts)
        .set({ commentsCount: sql`${posts.commentsCount} + 1` })
        .where(eq(posts.id, id))

      return reply.code(201).send(comment)
    }
  )

  // Delete post
  fastify.delete('/posts/:id', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const userId = request.user.sub

    const deleted = await db
      .delete(posts)
      .where(and(eq(posts.id, id), eq(posts.userId, userId)))
      .returning({ id: posts.id })

    if (!deleted.length) return reply.code(404).send({ error: 'Post não encontrado' })

    return { success: true }
  })
}
