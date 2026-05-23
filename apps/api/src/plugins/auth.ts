import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import { env } from '../lib/env.js'

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; role: string }
    user: { sub: string; role: string }
  }
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(import('@fastify/jwt'), {
    secret: env.JWT_SECRET,
  })

  fastify.decorate(
    'authenticate',
    async (request: Parameters<typeof fastify.authenticate>[0], reply: Parameters<typeof fastify.authenticate>[1]) => {
      try {
        await request.jwtVerify()
      } catch {
        reply.code(401).send({ error: 'Unauthorized' })
      }
    }
  )
}

export default fp(authPlugin)
