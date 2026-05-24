import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { or, ilike, eq, desc, and, inArray, sql } from 'drizzle-orm'
import { users, posts, newsArticles, offers, jobs, marketplaceProducts } from '@agrolink/database'

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

export const searchRoutes: FastifyPluginAsync = async (fastify) => {
  const db = fastify.db

  fastify.get('/search', { onRequest: [fastify.authenticate] }, async (request) => {
    const { q, type, lat, lng, radius } = z
      .object({
        q: z.string().min(1).max(100),
        type: z
          .enum(['all', 'people', 'companies', 'posts', 'news', 'offers', 'jobs', 'products'])
          .default('all'),
        lat: z.coerce.number().optional(),
        lng: z.coerce.number().optional(),
        radius: z.coerce.number().positive().default(200),
      })
      .parse(request.query)

    const term = `%${q}%`
    const results: Record<string, unknown[]> = {
      people: [],
      companies: [],
      posts: [],
      news: [],
      offers: [],
      jobs: [],
      products: [],
    }

    const wants = (t: string) => type === 'all' || type === t
    const useGeo = lat != null && lng != null

    if (wants('people')) {
      results.people = await db
        .select({
          id: users.id,
          name: users.name,
          username: users.username,
          avatarUrl: users.avatarUrl,
          role: users.role,
          verified: users.verified,
        })
        .from(users)
        .where(
          and(
            or(ilike(users.name, term), ilike(users.username, term)),
            inArray(users.role, ['producer', 'technician'])
          )
        )
        .limit(type === 'people' ? 30 : 5)
    }

    if (wants('companies')) {
      results.companies = await db
        .select({
          id: users.id,
          name: users.name,
          username: users.username,
          avatarUrl: users.avatarUrl,
          role: users.role,
          verified: users.verified,
        })
        .from(users)
        .where(
          and(
            or(ilike(users.name, term), ilike(users.username, term)),
            inArray(users.role, ['supplier', 'cooperative'])
          )
        )
        .limit(type === 'companies' ? 30 : 5)
    }

    if (wants('posts')) {
      const rows = await db
        .select({
          post: posts,
          author: {
            id: users.id,
            name: users.name,
            username: users.username,
            avatarUrl: users.avatarUrl,
            role: users.role,
          },
        })
        .from(posts)
        .innerJoin(users, eq(posts.userId, users.id))
        .where(or(ilike(posts.content, term), sql`${posts.tags}::text ILIKE ${term}`))
        .orderBy(desc(posts.createdAt))
        .limit(type === 'posts' ? 30 : 5)
      results.posts = rows.map((r) => ({ ...r.post, author: r.author }))
    }

    if (wants('news')) {
      results.news = await db
        .select()
        .from(newsArticles)
        .where(or(ilike(newsArticles.title, term), ilike(newsArticles.summary, term)))
        .orderBy(desc(newsArticles.publishedAt))
        .limit(type === 'news' ? 30 : 5)
    }

    if (wants('offers')) {
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
        .where(and(eq(offers.active, true), or(ilike(offers.description, term), ilike(offers.city, term))))
        .orderBy(desc(offers.createdAt))
        .limit(type === 'offers' ? 30 : 5)
      results.offers = rows.map((r) => ({ ...r.offer, seller: r.seller }))
    }

    if (wants('jobs')) {
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
        .where(
          and(
            eq(jobs.active, true),
            or(ilike(jobs.title, term), ilike(jobs.description, term), ilike(jobs.city, term))
          )
        )
        .orderBy(desc(jobs.createdAt))
        .limit(type === 'jobs' ? 30 : 8)

      let jobResults = rows.map((r) => ({
        ...r.job,
        poster: r.poster,
        distanceKm: undefined as number | undefined,
      }))

      if (useGeo) {
        jobResults = jobResults
          .map((j) => ({
            ...j,
            distanceKm:
              j.latitude != null && j.longitude != null
                ? Math.round(haversineKm(lat!, lng!, j.latitude, j.longitude))
                : undefined,
          }))
          .filter((j) => j.distanceKm == null || j.distanceKm <= radius)
          .sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999))
      }

      results.jobs = jobResults
    }

    if (wants('products')) {
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
            or(
              ilike(marketplaceProducts.name, term),
              ilike(marketplaceProducts.description, term),
              ilike(marketplaceProducts.city, term)
            )
          )
        )
        .orderBy(desc(marketplaceProducts.createdAt))
        .limit(type === 'products' ? 30 : 8)

      let productResults = rows.map((r) => ({
        ...r.product,
        seller: r.seller,
        distanceKm: undefined as number | undefined,
      }))

      if (useGeo) {
        productResults = productResults
          .map((p) => ({
            ...p,
            distanceKm:
              p.latitude != null && p.longitude != null
                ? Math.round(haversineKm(lat!, lng!, p.latitude, p.longitude))
                : undefined,
          }))
          .filter((p) => p.distanceKm == null || p.distanceKm <= radius)
          .sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999))
      }

      results.products = productResults
    }

    return results
  })
}
