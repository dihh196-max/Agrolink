import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { users, farms, farmCultures, connections } from '@agrolink/database'

export const usersRoutes: FastifyPluginAsync = async (fastify) => {
  const db = fastify.db

  // Get own profile
  fastify.get('/users/me', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        username: users.username,
        phone: users.phone,
        avatarUrl: users.avatarUrl,
        bio: users.bio,
        role: users.role,
        verified: users.verified,
        premiumUntil: users.premiumUntil,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, request.user.sub))
      .limit(1)

    if (!user) return reply.code(404).send({ error: 'Usuário não encontrado' })
    return user
  })

  // Update profile
  fastify.patch('/users/me', { onRequest: [fastify.authenticate] }, async (request) => {
    const body = z
      .object({
        name: z.string().min(2).optional(),
        bio: z.string().max(500).optional(),
        avatarUrl: z.string().url().optional(),
        phone: z.string().optional(),
      })
      .parse(request.body)

    const [updated] = await db
      .update(users)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(users.id, request.user.sub))
      .returning({
        id: users.id,
        name: users.name,
        username: users.username,
        bio: users.bio,
        avatarUrl: users.avatarUrl,
      })

    return updated
  })

  // Get public profile
  fastify.get('/users/:username', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { username } = request.params as { username: string }

    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        avatarUrl: users.avatarUrl,
        bio: users.bio,
        role: users.role,
        verified: users.verified,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.username, username))
      .limit(1)

    if (!user) return reply.code(404).send({ error: 'Usuário não encontrado' })

    const userFarms = await db.select().from(farms).where(eq(farms.userId, user.id))

    return { ...user, farms: userFarms }
  })

  // List user farms
  fastify.get('/users/me/farms', { onRequest: [fastify.authenticate] }, async (request) => {
    return db.select().from(farms).where(eq(farms.userId, request.user.sub))
  })

  // Create farm
  fastify.post('/users/me/farms', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const body = z
      .object({
        name: z.string().min(2),
        areaHectares: z.number().positive(),
        city: z.string(),
        state: z.string().length(2),
        latitude: z.number(),
        longitude: z.number(),
      })
      .parse(request.body)

    const [farm] = await db
      .insert(farms)
      .values({ ...body, userId: request.user.sub })
      .returning()

    return reply.code(201).send(farm)
  })

  // Add culture to farm
  fastify.post(
    '/users/me/farms/:farmId/cultures',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const { farmId } = request.params as { farmId: string }

      const cultureValues = [
        'soja', 'milho', 'algodao', 'cafe', 'boi_gordo',
        'trigo', 'arroz', 'feijao', 'cana', 'eucalipto',
      ] as const

      const body = z
        .object({
          culture: z.enum(cultureValues),
          areaHectares: z.number().positive(),
          safra: z.string(),
          year: z.number().int(),
          notes: z.string().optional(),
        })
        .parse(request.body)

      const [culture] = await db
        .insert(farmCultures)
        .values({ ...body, farmId })
        .returning()

      return reply.code(201).send(culture)
    }
  )

  // Send connection request
  fastify.post(
    '/users/:userId/connect',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const { userId } = request.params as { userId: string }
      const requesterId = request.user.sub

      if (requesterId === userId) {
        return reply.code(400).send({ error: 'Não pode conectar com si mesmo' })
      }

      const [conn] = await db
        .insert(connections)
        .values({ requesterId, recipientId: userId })
        .returning()

      return reply.code(201).send(conn)
    }
  )

  // Accept/reject connection
  fastify.patch(
    '/connections/:id',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const { status } = z.object({ status: z.enum(['accepted', 'rejected']) }).parse(request.body)

      const [updated] = await db
        .update(connections)
        .set({ status })
        .where(and(eq(connections.id, id), eq(connections.recipientId, request.user.sub)))
        .returning()

      if (!updated) return reply.code(404).send({ error: 'Solicitação não encontrada' })
      return updated
    }
  )
}
