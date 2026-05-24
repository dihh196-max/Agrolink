import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { eq, desc, and, ilike, or, sql } from 'drizzle-orm'
import { jobs, jobApplications, users } from '@agrolink/database'

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

const jobSchema = z.object({
  title: z.string().min(5).max(255),
  description: z.string().min(20),
  type: z.enum(['seasonal', 'permanent', 'internship', 'service']),
  culture: z
    .enum(['soja', 'milho', 'algodao', 'cafe', 'boi_gordo', 'trigo', 'arroz', 'feijao', 'cana', 'eucalipto'])
    .optional(),
  salaryMin: z.number().positive().optional(),
  salaryMax: z.number().positive().optional(),
  city: z.string().min(2).max(100),
  state: z.string().length(2),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  deadline: z.string().datetime().optional(),
})

export const jobsRoutes: FastifyPluginAsync = async (fastify) => {
  const db = fastify.db

  // List jobs with optional text search and geo filter
  fastify.get('/jobs', { onRequest: [fastify.authenticate] }, async (request) => {
    const { q, type, lat, lng, radius } = z
      .object({
        q: z.string().max(100).optional(),
        type: z.enum(['seasonal', 'permanent', 'internship', 'service']).optional(),
        lat: z.coerce.number().optional(),
        lng: z.coerce.number().optional(),
        radius: z.coerce.number().positive().default(200),
      })
      .parse(request.query)

    let rows = await db
      .select({
        job: jobs,
        poster: {
          id: users.id,
          name: users.name,
          username: users.username,
          avatarUrl: users.avatarUrl,
          role: users.role,
        },
      })
      .from(jobs)
      .innerJoin(users, eq(jobs.userId, users.id))
      .where(
        and(
          eq(jobs.active, true),
          type ? eq(jobs.type, type) : undefined,
          q ? or(ilike(jobs.title, `%${q}%`), ilike(jobs.description, `%${q}%`)) : undefined
        )
      )
      .orderBy(desc(jobs.createdAt))
      .limit(50)

    let results = rows.map((r) => ({ ...r.job, poster: r.poster, distanceKm: undefined as number | undefined }))

    if (lat != null && lng != null) {
      results = results
        .map((j) => ({
          ...j,
          distanceKm:
            j.latitude != null && j.longitude != null
              ? Math.round(haversineKm(lat, lng, j.latitude, j.longitude))
              : undefined,
        }))
        .filter((j) => j.distanceKm == null || j.distanceKm <= radius)
        .sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999))
    }

    return results
  })

  // Get single job
  fastify.get('/jobs/:id', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params)

    const rows = await db
      .select({
        job: jobs,
        poster: {
          id: users.id,
          name: users.name,
          username: users.username,
          avatarUrl: users.avatarUrl,
          role: users.role,
        },
      })
      .from(jobs)
      .innerJoin(users, eq(jobs.userId, users.id))
      .where(eq(jobs.id, id))

    if (!rows.length) return reply.code(404).send({ message: 'Vaga não encontrada' })

    return { ...rows[0].job, poster: rows[0].poster }
  })

  // Post a job
  fastify.post('/jobs', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const userId = (request as any).user.id
    const body = jobSchema.parse(request.body)

    const [created] = await db
      .insert(jobs)
      .values({ ...body, userId, deadline: body.deadline ? new Date(body.deadline) : undefined })
      .returning()

    return reply.code(201).send(created)
  })

  // Apply to a job
  fastify.post('/jobs/:id/apply', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { id: jobId } = z.object({ id: z.string().uuid() }).parse(request.params)
    const { message } = z.object({ message: z.string().max(1000).optional() }).parse(request.body)
    const userId = (request as any).user.id

    const existing = await db
      .select()
      .from(jobApplications)
      .where(and(eq(jobApplications.jobId, jobId), eq(jobApplications.userId, userId)))

    if (existing.length) return reply.code(409).send({ message: 'Você já se candidatou a esta vaga' })

    const [app] = await db
      .insert(jobApplications)
      .values({ jobId, userId, message })
      .returning()

    return reply.code(201).send(app)
  })

  // My posted jobs
  fastify.get('/jobs/mine', { onRequest: [fastify.authenticate] }, async (request) => {
    const userId = (request as any).user.id
    return db.select().from(jobs).where(eq(jobs.userId, userId)).orderBy(desc(jobs.createdAt))
  })
}
