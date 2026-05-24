import type { FastifyPluginAsync } from 'fastify'
import { eq, and, desc, sql } from 'drizzle-orm'
import { partnerships, users, notifications } from '@agrolink/database'

export const partnershipsRoutes: FastifyPluginAsync = async (fastify) => {
  const db = fastify.db

  // Become a partner (follow) someone
  fastify.post(
    '/partnerships/:userId',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const { userId } = request.params as { userId: string }
      const followerId = request.user.sub

      if (followerId === userId) {
        return reply.code(400).send({ error: 'Você não pode ser parceiro de si mesmo' })
      }

      const existing = await db
        .select({ id: partnerships.id })
        .from(partnerships)
        .where(and(eq(partnerships.followerId, followerId), eq(partnerships.followingId, userId)))
        .limit(1)

      if (existing.length) {
        return reply.code(409).send({ error: 'Já é parceiro' })
      }

      const [partnership] = await db
        .insert(partnerships)
        .values({ followerId, followingId: userId })
        .returning()

      // Notify the followed user
      const [me] = await db.select({ name: users.name }).from(users).where(eq(users.id, followerId)).limit(1)
      await db.insert(notifications).values({
        userId,
        type: 'new_follower',
        title: 'Nova parceria',
        body: `${me?.name ?? 'Alguém'} agora acompanha você`,
        payload: { followerId },
      })

      return reply.code(201).send(partnership)
    }
  )

  // Stop being a partner (unfollow)
  fastify.delete(
    '/partnerships/:userId',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const { userId } = request.params as { userId: string }
      const deleted = await db
        .delete(partnerships)
        .where(
          and(eq(partnerships.followerId, request.user.sub), eq(partnerships.followingId, userId))
        )
        .returning({ id: partnerships.id })

      if (!deleted.length) return reply.code(404).send({ error: 'Parceria não encontrada' })
      return { success: true }
    }
  )

  // List partners I follow
  fastify.get('/partnerships/following', { onRequest: [fastify.authenticate] }, async (request) => {
    return db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        avatarUrl: users.avatarUrl,
        role: users.role,
        verified: users.verified,
        since: partnerships.createdAt,
      })
      .from(partnerships)
      .innerJoin(users, eq(partnerships.followingId, users.id))
      .where(eq(partnerships.followerId, request.user.sub))
      .orderBy(desc(partnerships.createdAt))
  })

  // List partners who follow me
  fastify.get('/partnerships/followers', { onRequest: [fastify.authenticate] }, async (request) => {
    return db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        avatarUrl: users.avatarUrl,
        role: users.role,
        verified: users.verified,
        since: partnerships.createdAt,
      })
      .from(partnerships)
      .innerJoin(users, eq(partnerships.followerId, users.id))
      .where(eq(partnerships.followingId, request.user.sub))
      .orderBy(desc(partnerships.createdAt))
  })

  // Partnership counts + whether I follow a given user
  fastify.get(
    '/partnerships/stats/:userId',
    { onRequest: [fastify.authenticate] },
    async (request) => {
      const { userId } = request.params as { userId: string }

      const [followers] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(partnerships)
        .where(eq(partnerships.followingId, userId))

      const [following] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(partnerships)
        .where(eq(partnerships.followerId, userId))

      const isPartner = await db
        .select({ id: partnerships.id })
        .from(partnerships)
        .where(
          and(eq(partnerships.followerId, request.user.sub), eq(partnerships.followingId, userId))
        )
        .limit(1)

      return {
        followers: followers?.count ?? 0,
        following: following?.count ?? 0,
        isPartner: isPartner.length > 0,
      }
    }
  )
}
