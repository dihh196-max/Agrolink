import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { or, ilike, eq, desc, and, inArray, sql } from 'drizzle-orm'
import { users, posts, newsArticles, offers } from '@agrolink/database'

export const searchRoutes: FastifyPluginAsync = async (fastify) => {
  const db = fastify.db

  // Global search across people, companies, posts, news and offers
  fastify.get('/search', { onRequest: [fastify.authenticate] }, async (request) => {
    const { q, type } = z
      .object({
        q: z.string().min(1).max(100),
        type: z.enum(['all', 'people', 'companies', 'posts', 'news', 'offers']).default('all'),
      })
      .parse(request.query)

    const term = `%${q}%`
    const results: Record<string, unknown[]> = {
      people: [],
      companies: [],
      posts: [],
      news: [],
      offers: [],
    }

    const wants = (t: string) => type === 'all' || type === t

    // People — producers and technicians
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

    // Companies — suppliers and cooperatives
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

    // Posts — content and tags
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

    // News — title and summary
    if (wants('news')) {
      results.news = await db
        .select()
        .from(newsArticles)
        .where(or(ilike(newsArticles.title, term), ilike(newsArticles.summary, term)))
        .orderBy(desc(newsArticles.publishedAt))
        .limit(type === 'news' ? 30 : 5)
    }

    // Offers — description and city
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

    return results
  })
}
