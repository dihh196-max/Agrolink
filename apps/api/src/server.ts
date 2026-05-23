import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import fp from 'fastify-plugin'
import { createDatabase } from '@agrolink/database'
import { env } from './lib/env.js'
import authPlugin from './plugins/auth.js'
import { authRoutes } from './routes/auth.js'
import { postsRoutes } from './routes/posts.js'
import { marketRoutes } from './routes/market.js'
import { aiRoutes } from './routes/ai.js'
import { weatherRoutes } from './routes/weather.js'
import { usersRoutes } from './routes/users.js'
import { notificationsRoutes } from './routes/notifications.js'
import type { Database } from '@agrolink/database'

declare module 'fastify' {
  interface FastifyInstance {
    db: Database
  }
}

const fastify = Fastify({ logger: env.NODE_ENV !== 'production' })

// Security
await fastify.register(helmet, { contentSecurityPolicy: false })
await fastify.register(cors, {
  origin: env.NODE_ENV === 'production' ? ['https://agrolink.com.br', 'https://app.agrolink.com.br'] : true,
  credentials: true,
})
await fastify.register(rateLimit, { max: 100, timeWindow: '1 minute' })

// Database
const db = createDatabase(env.DATABASE_URL)
await fastify.register(
  fp(async (f) => {
    f.decorate('db', db)
  })
)

// Auth
await fastify.register(authPlugin)

// Routes — all under /api/v1
const API_PREFIX = '/api/v1'
await fastify.register(authRoutes, { prefix: API_PREFIX })
await fastify.register(usersRoutes, { prefix: API_PREFIX })
await fastify.register(postsRoutes, { prefix: API_PREFIX })
await fastify.register(marketRoutes, { prefix: API_PREFIX })
await fastify.register(aiRoutes, { prefix: API_PREFIX })
await fastify.register(weatherRoutes, { prefix: API_PREFIX })
await fastify.register(notificationsRoutes, { prefix: API_PREFIX })

// Health check
fastify.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

try {
  await fastify.listen({ port: env.PORT, host: '0.0.0.0' })
  console.log(`AgroLink API running on port ${env.PORT}`)
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}
