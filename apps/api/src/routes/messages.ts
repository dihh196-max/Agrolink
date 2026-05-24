import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { eq, and, or, desc, sql } from 'drizzle-orm'
import { messageThreads, directMessages, users, notifications } from '@agrolink/database'

export const messagesRoutes: FastifyPluginAsync = async (fastify) => {
  const db = fastify.db

  // Helper: find or create a thread between two users
  async function getOrCreateThread(meId: string, otherId: string) {
    const [existing] = await db
      .select()
      .from(messageThreads)
      .where(
        or(
          and(eq(messageThreads.userAId, meId), eq(messageThreads.userBId, otherId)),
          and(eq(messageThreads.userAId, otherId), eq(messageThreads.userBId, meId))
        )
      )
      .limit(1)

    if (existing) return existing

    const [created] = await db
      .insert(messageThreads)
      .values({ userAId: meId, userBId: otherId })
      .returning()
    return created
  }

  // List my threads (conversations) with the other user's profile + unread count
  fastify.get('/messages/threads', { onRequest: [fastify.authenticate] }, async (request) => {
    const meId = request.user.sub

    const threads = await db
      .select()
      .from(messageThreads)
      .where(or(eq(messageThreads.userAId, meId), eq(messageThreads.userBId, meId)))
      .orderBy(desc(messageThreads.lastMessageAt))

    const result = []
    for (const t of threads) {
      const otherId = t.userAId === meId ? t.userBId : t.userAId
      const [other] = await db
        .select({
          id: users.id,
          name: users.name,
          username: users.username,
          avatarUrl: users.avatarUrl,
          role: users.role,
        })
        .from(users)
        .where(eq(users.id, otherId))
        .limit(1)

      const [unread] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(directMessages)
        .where(
          and(
            eq(directMessages.threadId, t.id),
            eq(directMessages.read, false),
            sql`${directMessages.senderId} <> ${meId}`
          )
        )

      result.push({
        id: t.id,
        otherUser: other,
        lastMessage: t.lastMessage,
        lastMessageAt: t.lastMessageAt,
        unreadCount: unread?.count ?? 0,
        createdAt: t.createdAt,
      })
    }
    return result
  })

  // Get messages in a thread (and mark incoming as read)
  fastify.get(
    '/messages/threads/:threadId',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const { threadId } = request.params as { threadId: string }
      const meId = request.user.sub

      const [thread] = await db
        .select()
        .from(messageThreads)
        .where(eq(messageThreads.id, threadId))
        .limit(1)

      if (!thread || (thread.userAId !== meId && thread.userBId !== meId)) {
        return reply.code(404).send({ error: 'Conversa não encontrada' })
      }

      // Mark incoming as read
      await db
        .update(directMessages)
        .set({ read: true })
        .where(
          and(
            eq(directMessages.threadId, threadId),
            sql`${directMessages.senderId} <> ${meId}`,
            eq(directMessages.read, false)
          )
        )

      return db
        .select()
        .from(directMessages)
        .where(eq(directMessages.threadId, threadId))
        .orderBy(directMessages.createdAt)
    }
  )

  // Start or continue a conversation with a user (returns thread)
  fastify.post(
    '/messages/with/:userId',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const { userId } = request.params as { userId: string }
      const meId = request.user.sub
      if (meId === userId) return reply.code(400).send({ error: 'Não pode conversar consigo mesmo' })

      const thread = await getOrCreateThread(meId, userId)
      return thread
    }
  )

  // Send a message in a thread
  fastify.post(
    '/messages/threads/:threadId',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const { threadId } = request.params as { threadId: string }
      const { content } = z.object({ content: z.string().min(1).max(2000) }).parse(request.body)
      const meId = request.user.sub

      const [thread] = await db
        .select()
        .from(messageThreads)
        .where(eq(messageThreads.id, threadId))
        .limit(1)

      if (!thread || (thread.userAId !== meId && thread.userBId !== meId)) {
        return reply.code(404).send({ error: 'Conversa não encontrada' })
      }

      const [msg] = await db
        .insert(directMessages)
        .values({ threadId, senderId: meId, content })
        .returning()

      await db
        .update(messageThreads)
        .set({ lastMessage: content, lastMessageAt: new Date() })
        .where(eq(messageThreads.id, threadId))

      // Notify recipient
      const recipientId = thread.userAId === meId ? thread.userBId : thread.userAId
      const [me] = await db.select({ name: users.name }).from(users).where(eq(users.id, meId)).limit(1)
      await db.insert(notifications).values({
        userId: recipientId,
        type: 'message',
        title: `Mensagem de ${me?.name ?? 'um parceiro'}`,
        body: content.slice(0, 120),
        payload: { threadId },
      })

      return reply.code(201).send(msg)
    }
  )
}
