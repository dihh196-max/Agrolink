import type { FastifyPluginAsync } from 'fastify'
import bcrypt from 'bcrypt'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { users } from '@agrolink/database'

const registerSchema = z.object({
  email: z.string().email(),
  phone: z.string().min(10),
  name: z.string().min(2),
  username: z.string().min(3).max(50).regex(/^[a-z0-9_]+$/),
  password: z.string().min(8),
  role: z.enum(['producer', 'supplier', 'technician', 'cooperative']).default('producer'),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  const db = fastify.db

  fastify.post('/auth/register', async (request, reply) => {
    const body = registerSchema.parse(request.body)

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, body.email))
      .limit(1)

    if (existing.length > 0) {
      return reply.code(409).send({ error: 'Email já cadastrado' })
    }

    const passwordHash = await bcrypt.hash(body.password, 12)

    const [user] = await db
      .insert(users)
      .values({
        email: body.email,
        phone: body.phone,
        name: body.name,
        username: body.username,
        passwordHash,
        role: body.role,
      })
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        username: users.username,
        role: users.role,
      })

    const accessToken = fastify.jwt.sign({ sub: user.id, role: user.role }, { expiresIn: '15m' })
    const refreshToken = fastify.jwt.sign({ sub: user.id, role: user.role }, { expiresIn: '30d' })

    return reply.code(201).send({ user, accessToken, refreshToken })
  })

  fastify.post('/auth/login', async (request, reply) => {
    const body = loginSchema.parse(request.body)

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, body.email))
      .limit(1)

    if (!user) {
      return reply.code(401).send({ error: 'Credenciais inválidas' })
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash)
    if (!valid) {
      return reply.code(401).send({ error: 'Credenciais inválidas' })
    }

    const accessToken = fastify.jwt.sign({ sub: user.id, role: user.role }, { expiresIn: '15m' })
    const refreshToken = fastify.jwt.sign({ sub: user.id, role: user.role }, { expiresIn: '30d' })

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        avatarUrl: user.avatarUrl,
        role: user.role,
        verified: user.verified,
        premiumUntil: user.premiumUntil,
      },
      accessToken,
      refreshToken,
    }
  })

  fastify.post('/auth/refresh', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { sub, role } = request.user
    const accessToken = fastify.jwt.sign({ sub, role }, { expiresIn: '15m' })
    return { accessToken }
  })
}
