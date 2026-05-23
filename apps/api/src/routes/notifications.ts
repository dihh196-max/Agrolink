import type { FastifyPluginAsync } from 'fastify'
import { eq, and, desc } from 'drizzle-orm'
import { notifications } from '@agrolink/database'

export const notificationsRoutes: FastifyPluginAsync = async (fastify) => {
  const db = fastify.db

  fastify.get('/notifications', { onRequest: [fastify.authenticate] }, async (request) => {
    const query = request.query as { unreadOnly?: string; limit?: string }
    const limit = Math.min(Number(query.limit ?? 30), 100)
    const userId = request.user.sub

    const conditions = [eq(notifications.userId, userId)]
    if (query.unreadOnly === 'true') conditions.push(eq(notifications.read, false))

    return db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
  })

  fastify.patch(
    '/notifications/:id/read',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const updated = await db
        .update(notifications)
        .set({ read: true })
        .where(and(eq(notifications.id, id), eq(notifications.userId, request.user.sub)))
        .returning({ id: notifications.id })

      if (!updated.length) return reply.code(404).send({ error: 'Notificação não encontrada' })
      return { success: true }
    }
  )

  fastify.patch(
    '/notifications/read-all',
    { onRequest: [fastify.authenticate] },
    async (request) => {
      await db
        .update(notifications)
        .set({ read: true })
        .where(eq(notifications.userId, request.user.sub))
      return { success: true }
    }
  )
}
