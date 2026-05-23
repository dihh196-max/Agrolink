import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { eq, desc, and, gte } from 'drizzle-orm'
import { marketPrices, priceAlerts, offers, users } from '@agrolink/database'

const cultureValues = [
  'soja',
  'milho',
  'algodao',
  'cafe',
  'boi_gordo',
  'trigo',
  'arroz',
  'feijao',
  'cana',
  'eucalipto',
] as const

export const marketRoutes: FastifyPluginAsync = async (fastify) => {
  const db = fastify.db

  // Latest prices for all cultures
  fastify.get('/market/prices', { onRequest: [fastify.authenticate] }, async () => {
    const rows = await db
      .select()
      .from(marketPrices)
      .orderBy(desc(marketPrices.updatedAt))

    // Return latest price per culture
    const latest = new Map<string, typeof rows[0]>()
    for (const row of rows) {
      if (!latest.has(row.culture)) latest.set(row.culture, row)
    }
    return [...latest.values()]
  })

  // Price history for a culture
  fastify.get(
    '/market/prices/:culture/history',
    { onRequest: [fastify.authenticate] },
    async (request) => {
      const { culture } = z
        .object({ culture: z.enum(cultureValues) })
        .parse(request.params)

      const { days } = z.object({ days: z.coerce.number().default(30) }).parse(request.query)

      const since = new Date()
      since.setDate(since.getDate() - days)

      const rows = await db
        .select({ price: marketPrices.price, updatedAt: marketPrices.updatedAt })
        .from(marketPrices)
        .where(
          and(eq(marketPrices.culture, culture), gte(marketPrices.updatedAt, since))
        )
        .orderBy(marketPrices.updatedAt)

      return rows.map((r) => ({ timestamp: r.updatedAt, price: r.price }))
    }
  )

  // Create price alert
  fastify.post('/market/alerts', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const body = z
      .object({
        culture: z.enum(cultureValues),
        targetPrice: z.number().positive(),
        condition: z.enum(['above', 'below']),
      })
      .parse(request.body)

    const [alert] = await db
      .insert(priceAlerts)
      .values({ ...body, userId: request.user.sub })
      .returning()

    return reply.code(201).send(alert)
  })

  // List user price alerts
  fastify.get('/market/alerts', { onRequest: [fastify.authenticate] }, async (request) => {
    return db
      .select()
      .from(priceAlerts)
      .where(eq(priceAlerts.userId, request.user.sub))
      .orderBy(desc(priceAlerts.createdAt))
  })

  // Delete alert
  fastify.delete(
    '/market/alerts/:id',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const deleted = await db
        .delete(priceAlerts)
        .where(and(eq(priceAlerts.id, id), eq(priceAlerts.userId, request.user.sub)))
        .returning({ id: priceAlerts.id })

      if (!deleted.length) return reply.code(404).send({ error: 'Alerta não encontrado' })
      return { success: true }
    }
  )

  // List offers (marketplace)
  fastify.get('/market/offers', { onRequest: [fastify.authenticate] }, async (request) => {
    const query = z
      .object({
        culture: z.enum(cultureValues).optional(),
        type: z.enum(['sell', 'buy']).optional(),
        state: z.string().length(2).optional(),
      })
      .parse(request.query)

    const conditions = [eq(offers.active, true)]
    if (query.culture) conditions.push(eq(offers.culture, query.culture))
    if (query.type) conditions.push(eq(offers.type, query.type))
    if (query.state) conditions.push(eq(offers.state, query.state))

    const rows = await db
      .select({
        offer: offers,
        seller: {
          id: users.id,
          name: users.name,
          username: users.username,
          avatarUrl: users.avatarUrl,
          role: users.role,
        },
      })
      .from(offers)
      .innerJoin(users, eq(offers.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(offers.createdAt))
      .limit(50)

    return rows.map((r) => ({ ...r.offer, seller: r.seller }))
  })

  // Create offer
  fastify.post('/market/offers', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const body = z
      .object({
        type: z.enum(['sell', 'buy']),
        culture: z.enum(cultureValues),
        volumeTons: z.number().positive(),
        pricePerUnit: z.number().positive(),
        unit: z.enum(['saca_60kg', 'arroba', 'tonelada']),
        description: z.string().max(500).optional(),
        latitude: z.number(),
        longitude: z.number(),
        city: z.string(),
        state: z.string().length(2),
        expiresAt: z.string().datetime().optional(),
      })
      .parse(request.body)

    const [offer] = await db
      .insert(offers)
      .values({ ...body, userId: request.user.sub })
      .returning()

    return reply.code(201).send(offer)
  })

  // Suggested price — weighted average of nearby offers
  fastify.get('/market/suggested-price', { onRequest: [fastify.authenticate] }, async (request) => {
    const query = z
      .object({
        culture: z.enum(cultureValues),
        latitude: z.coerce.number(),
        longitude: z.coerce.number(),
        radiusKm: z.coerce.number().default(100),
      })
      .parse(request.query)

    // Simple average of active offers without PostGIS (fallback)
    const activeOffers = await db
      .select({ pricePerUnit: offers.pricePerUnit, latitude: offers.latitude, longitude: offers.longitude })
      .from(offers)
      .where(and(eq(offers.culture, query.culture), eq(offers.active, true)))

    if (!activeOffers.length) {
      // Fall back to CEPEA price
      const [latest] = await db
        .select({ price: marketPrices.price })
        .from(marketPrices)
        .where(eq(marketPrices.culture, query.culture))
        .orderBy(desc(marketPrices.updatedAt))
        .limit(1)

      return {
        culture: query.culture,
        suggestedPrice: latest?.price ?? 0,
        unit: 'saca_60kg',
        basedOnOffersCount: 0,
        radiusKm: query.radiusKm,
        cpeaVariation24h: 0,
        calculatedAt: new Date().toISOString(),
      }
    }

    // Weighted average by inverse distance
    let weightedSum = 0
    let totalWeight = 0
    for (const o of activeOffers) {
      const dLat = o.latitude - query.latitude
      const dLng = o.longitude - query.longitude
      const distKm = Math.sqrt(dLat * dLat + dLng * dLng) * 111
      const weight = distKm < 1 ? 100 : 1 / distKm
      weightedSum += o.pricePerUnit * weight
      totalWeight += weight
    }

    const suggestedPrice = totalWeight > 0 ? weightedSum / totalWeight : 0

    return {
      culture: query.culture,
      suggestedPrice: Math.round(suggestedPrice * 100) / 100,
      unit: 'saca_60kg',
      basedOnOffersCount: activeOffers.length,
      radiusKm: query.radiusKm,
      cpeaVariation24h: 0,
      calculatedAt: new Date().toISOString(),
    }
  })
}
