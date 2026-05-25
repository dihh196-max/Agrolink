import type { FastifyPluginAsync } from 'fastify'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { eq, or } from 'drizzle-orm'
import { users } from '@agrolink/database'

const registerSchema = z.object({
  email: z.string().email(),
  phone: z.string().min(8),
  name: z.string().min(2).max(100),
  username: z.string().min(3).max(30).regex(/^[a-z0-9_]+$/, 'Apenas letras minúsculas, números e _'),
  password: z.string().min(8),
  role: z.enum(['producer', 'supplier', 'technician', 'cooperative']).default('producer'),
  bio: z.string().max(500).optional(),
  acceptedTerms: z.literal(true, { errorMap: () => ({ message: 'Aceite os termos' }) }),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  const db = fastify.db

  // Check username/email availability (no auth required)
  fastify.get('/auth/check', async (request, reply) => {
    const { username, email } = request.query as { username?: string; email?: string }

    if (username) {
      if (!/^[a-z0-9_]{3,30}$/.test(username)) {
        return { available: false, reason: 'Formato inválido' }
      }
      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username, username))
        .limit(1)
      return { available: !existing }
    }

    if (email) {
      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1)
      return { available: !existing }
    }

    return reply.code(400).send({ error: 'Informe username ou email' })
  })

  fastify.post('/auth/register', async (request, reply) => {
    let body: z.infer<typeof registerSchema>
    try {
      body = registerSchema.parse(request.body)
    } catch (err: any) {
      const msg = err.errors?.[0]?.message ?? 'Dados inválidos'
      return reply.code(400).send({ error: msg })
    }

    // Normalize
    const email = body.email.toLowerCase().trim()
    const username = body.username.toLowerCase().trim()

    // Check both email and username uniqueness in one query
    const existing = await db
      .select({ id: users.id, email: users.email, username: users.username })
      .from(users)
      .where(or(eq(users.email, email), eq(users.username, username)))

    for (const row of existing) {
      if (row.email === email) return reply.code(409).send({ error: 'Este email já está cadastrado' })
      if (row.username === username) return reply.code(409).send({ error: 'Este nome de usuário já está em uso' })
    }

    const passwordHash = await bcrypt.hash(body.password, 12)

    const [user] = await db
      .insert(users)
      .values({
        email,
        phone: body.phone.replace(/\D/g, ''),
        name: body.name.trim(),
        username,
        bio: body.bio?.trim() || null,
        passwordHash,
        role: body.role,
      })
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        username: users.username,
        avatarUrl: users.avatarUrl,
        role: users.role,
        verified: users.verified,
        bio: users.bio,
      })

    const accessToken = fastify.jwt.sign({ sub: user.id, role: user.role }, { expiresIn: '15m' })
    const refreshToken = fastify.jwt.sign({ sub: user.id, role: user.role }, { expiresIn: '30d' })

    return reply.code(201).send({ user, accessToken, refreshToken })
  })

  fastify.post('/auth/login', async (request, reply) => {
    let body: z.infer<typeof loginSchema>
    try {
      body = loginSchema.parse(request.body)
    } catch {
      return reply.code(400).send({ error: 'Email e senha são obrigatórios' })
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, body.email.toLowerCase().trim()))
      .limit(1)

    if (!user) return reply.code(401).send({ error: 'Email ou senha incorretos' })

    const valid = await bcrypt.compare(body.password, user.passwordHash)
    if (!valid) return reply.code(401).send({ error: 'Email ou senha incorretos' })

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
        bio: user.bio,
        premiumUntil: user.premiumUntil,
      },
      accessToken,
      refreshToken,
    }
  })

  fastify.post('/auth/refresh', { onRequest: [fastify.authenticate] }, async (request) => {
    const { sub, role } = request.user
    const accessToken = fastify.jwt.sign({ sub, role }, { expiresIn: '15m' })
    return { accessToken }
  })
}
