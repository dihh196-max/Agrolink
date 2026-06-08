import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { eq, desc, gt, and } from 'drizzle-orm'
import { stories, users } from '@agrolink/database'

const createStorySchema = z.object({
  mediaUrl: z.string().min(1),
  mediaType: z.enum(['image', 'video']).default('image'),
  temperature: z.number().optional(),
  weatherDescription: z.string().max(100).optional(),
})

export const storiesRoutes: FastifyPluginAsync = async (fastify) => {
  const db = fastify.db

  // List active stories (not expired), newest first, with author
  fastify.get('/stories', { onRequest: [fastify.authenticate] }, async () => {
    const rows = await db
      .select({
        story: stories,
        author: {
          id: users.id,
          name: users.name,
          username: users.username,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(stories)
      .innerJoin(users, eq(stories.userId, users.id))
      .where(gt(stories.expiresAt, new Date()))
      .orderBy(desc(stories.createdAt))

    return rows.map((r) => ({ ...r.story, author: r.author }))
  })

  // Create a story (expires in 24h)
  fastify.post('/stories', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const body = createStorySchema.parse(request.body)
    const userId = request.user.sub
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

    const [story] = await db
      .insert(stories)
      .values({ ...body, userId, expiresAt })
      .returning()

    return reply.code(201).send(story)
  })

  // Delete own story
  fastify.delete('/stories/:id', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const userId = request.user.sub

    const deleted = await db
      .delete(stories)
      .where(and(eq(stories.id, id), eq(stories.userId, userId)))
      .returning({ id: stories.id })

    if (!deleted.length) return reply.code(404).send({ error: 'Story não encontrado' })
    return { success: true }
  })
}
