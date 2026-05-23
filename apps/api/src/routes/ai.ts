import type { FastifyPluginAsync } from 'fastify'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { eq, desc } from 'drizzle-orm'
import { aiConversations, aiMessages, users, farms, farmCultures } from '@agrolink/database'
import { env } from '../lib/env.js'

const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `Você é a AgroIA, assistente especializada em agronegócio brasileiro.
Responda sempre em português do Brasil com linguagem clara e objetiva.
Suas especialidades: manejo de culturas (soja, milho, algodão, café, boi gordo), pragas e doenças,
fertilização, legislação ambiental (APP, RL, CAR), cotações de mercado, financiamento rural e clima.
Use a base técnica da Embrapa e dados do CEPEA quando relevante.
Ao final de respostas complexas, sugira até 3 perguntas de acompanhamento como "Ações Rápidas".
Nunca invente cotações ou dados sem avisar que é uma estimativa.`

export const aiRoutes: FastifyPluginAsync = async (fastify) => {
  const db = fastify.db

  // List conversations
  fastify.get('/ai/conversations', { onRequest: [fastify.authenticate] }, async (request) => {
    return db
      .select()
      .from(aiConversations)
      .where(eq(aiConversations.userId, request.user.sub))
      .orderBy(desc(aiConversations.updatedAt))
      .limit(50)
  })

  // Create conversation
  fastify.post(
    '/ai/conversations',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const body = z
        .object({
          title: z.string().min(1).max(255),
          contextType: z
            .enum(['manejo', 'pragas', 'mercado', 'legislacao', 'clima', 'credito', 'geral'])
            .default('geral'),
          safra: z.string().optional(),
        })
        .parse(request.body)

      const [conv] = await db
        .insert(aiConversations)
        .values({ ...body, userId: request.user.sub })
        .returning()

      return reply.code(201).send(conv)
    }
  )

  // Get conversation messages
  fastify.get(
    '/ai/conversations/:id/messages',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      const [conv] = await db
        .select()
        .from(aiConversations)
        .where(eq(aiConversations.id, id))
        .limit(1)

      if (!conv || conv.userId !== request.user.sub) {
        return reply.code(404).send({ error: 'Conversa não encontrada' })
      }

      return db
        .select()
        .from(aiMessages)
        .where(eq(aiMessages.conversationId, id))
        .orderBy(aiMessages.createdAt)
    }
  )

  // Send message (streaming)
  fastify.post(
    '/ai/conversations/:id/messages',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const { content } = z.object({ content: z.string().min(1).max(4000) }).parse(request.body)
      const userId = request.user.sub

      const [conv] = await db
        .select()
        .from(aiConversations)
        .where(eq(aiConversations.id, id))
        .limit(1)

      if (!conv || conv.userId !== userId) {
        return reply.code(404).send({ error: 'Conversa não encontrada' })
      }

      // Save user message
      await db.insert(aiMessages).values({ conversationId: id, role: 'user', content })

      // Build context from user profile & farm
      const [user] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)

      const userFarms = await db
        .select({ city: farms.city, state: farms.state })
        .from(farms)
        .where(eq(farms.userId, userId))
        .limit(3)

      const contextInfo = userFarms.length
        ? `Produtor: ${user?.name}. Localização: ${userFarms.map((f) => `${f.city}/${f.state}`).join(', ')}.`
        : `Produtor: ${user?.name}.`

      // Fetch recent history (last 10 messages)
      const history = await db
        .select({ role: aiMessages.role, content: aiMessages.content })
        .from(aiMessages)
        .where(eq(aiMessages.conversationId, id))
        .orderBy(desc(aiMessages.createdAt))
        .limit(10)

      const messages = history
        .reverse()
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

      // Stream response
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      })

      let fullContent = ''

      const stream = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: `${SYSTEM_PROMPT}\n\nContexto do usuário: ${contextInfo}`,
        messages,
        stream: true,
      })

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          fullContent += event.delta.text
          reply.raw.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
        }
      }

      // Extract quick actions from response (simple heuristic)
      const quickActions: { label: string; prompt: string }[] = []
      const actionMatches = fullContent.match(/\*\*Ações Rápidas:\*\*\n((?:- .+\n?)+)/i)
      if (actionMatches) {
        const lines = actionMatches[1].split('\n').filter(Boolean)
        for (const line of lines.slice(0, 3)) {
          const label = line.replace(/^- /, '').trim()
          quickActions.push({ label, prompt: label })
        }
      }

      // Save assistant message
      const [assistantMsg] = await db
        .insert(aiMessages)
        .values({
          conversationId: id,
          role: 'assistant',
          content: fullContent,
          quickActions,
        })
        .returning()

      reply.raw.write(`data: ${JSON.stringify({ done: true, messageId: assistantMsg.id, quickActions })}\n\n`)
      reply.raw.end()

      // Update conversation updatedAt
      await db
        .update(aiConversations)
        .set({ updatedAt: new Date() })
        .where(eq(aiConversations.id, id))
    }
  )

  // Delete conversation
  fastify.delete(
    '/ai/conversations/:id',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const deleted = await db
        .delete(aiConversations)
        .where(eq(aiConversations.id, id))
        .returning({ id: aiConversations.id })

      if (!deleted.length) return reply.code(404).send({ error: 'Conversa não encontrada' })
      return { success: true }
    }
  )
}
