import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { eq, desc, and, ilike, or } from 'drizzle-orm'
import { marketplaceProducts, users } from '@agrolink/database'

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

const CATEGORIES = ['seeds', 'fertilizers', 'pesticides', 'equipment', 'animals', 'grains', 'other'] as const

const productSchema = z.object({
  name: z.string().min(3).max(255),
  description: z.string().min(10),
  category: z.enum(CATEGORIES),
  price: z.number().positive(),
  unit: z.string().min(1).max(50),
  // Accept any non-empty string (https URLs and data: URIs from mobile picker)
  images: z.array(z.string().min(1)).max(8).default([]),
  stock: z.number().int().positive().optional(),
  city: z.string().min(2).max(100),
  state: z.string().length(2),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
})

export const marketplaceRoutes: FastifyPluginAsync = async (fastify) => {
  const db = fastify.db

  // List products
  fastify.get('/marketplace', { onRequest: [fastify.authenticate] }, async (request) => {
    const { q, category, lat, lng, radius } = z
      .object({
        q: z.string().max(100).optional(),
        category: z.enum(CATEGORIES).optional(),
        lat: z.coerce.number().optional(),
        lng: z.coerce.number().optional(),
        radius: z.coerce.number().positive().default(300),
      })
      .parse(request.query)

    const rows = await db
      .select({
        product: marketplaceProducts,
        seller: {
          id: users.id,
          name: users.name,
          username: users.username,
          avatarUrl: users.avatarUrl,
          role: users.role,
        },
      })
      .from(marketplaceProducts)
      .innerJoin(users, eq(marketplaceProducts.userId, users.id))
      .where(
        and(
          eq(marketplaceProducts.active, true),
          category ? eq(marketplaceProducts.category, category) : undefined,
          q
            ? or(
                ilike(marketplaceProducts.name, `%${q}%`),
                ilike(marketplaceProducts.description, `%${q}%`)
              )
            : undefined
        )
      )
      .orderBy(desc(marketplaceProducts.createdAt))
      .limit(60)

    let results = rows.map((r) => ({
      ...r.product,
      seller: r.seller,
      distanceKm: undefined as number | undefined,
    }))

    if (lat != null && lng != null) {
      results = results
        .map((p) => ({
          ...p,
          distanceKm:
            p.latitude != null && p.longitude != null
              ? Math.round(haversineKm(lat, lng, p.latitude, p.longitude))
              : undefined,
        }))
        .filter((p) => p.distanceKm == null || p.distanceKm <= radius)
        .sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999))
    }

    return results
  })

  // Get single product
  fastify.get('/marketplace/:id', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params)

    const rows = await db
      .select({
        product: marketplaceProducts,
        seller: {
          id: users.id,
          name: users.name,
          username: users.username,
          avatarUrl: users.avatarUrl,
          role: users.role,
        },
      })
      .from(marketplaceProducts)
      .innerJoin(users, eq(marketplaceProducts.userId, users.id))
      .where(eq(marketplaceProducts.id, id))

    if (!rows.length) return reply.code(404).send({ message: 'Produto não encontrado' })

    return { ...rows[0].product, seller: rows[0].seller }
  })

  // Post a product
  fastify.post('/marketplace', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const userId = request.user.sub
    const body = productSchema.parse(request.body)

    const [created] = await db.insert(marketplaceProducts).values({ ...body, userId }).returning()

    return reply.code(201).send(created)
  })

  // My products
  fastify.get('/marketplace/mine', { onRequest: [fastify.authenticate] }, async (request) => {
    const userId = request.user.sub
    return db
      .select()
      .from(marketplaceProducts)
      .where(eq(marketplaceProducts.userId, userId))
      .orderBy(desc(marketplaceProducts.createdAt))
  })

  // Toggle active
  fastify.patch('/marketplace/:id/toggle', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params)
    const userId = request.user.sub

    const [p] = await db
      .select()
      .from(marketplaceProducts)
      .where(and(eq(marketplaceProducts.id, id), eq(marketplaceProducts.userId, userId)))

    if (!p) return reply.code(404).send({ message: 'Produto não encontrado' })

    const [updated] = await db
      .update(marketplaceProducts)
      .set({ active: !p.active })
      .where(eq(marketplaceProducts.id, id))
      .returning()

    return updated
  })
}
