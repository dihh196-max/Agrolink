import { pgTable, uuid, varchar, text, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core'
import { users } from './users.js'

export const contextTypeEnum = pgEnum('context_type', [
  'manejo',
  'pragas',
  'mercado',
  'legislacao',
  'clima',
  'credito',
  'geral',
])

export const aiConversations = pgTable('ai_conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  contextType: contextTypeEnum('context_type').notNull().default('geral'),
  safra: varchar('safra', { length: 20 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const aiMessages = pgTable('ai_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id')
    .notNull()
    .references(() => aiConversations.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 10 }).notNull(), // 'user' | 'assistant'
  content: text('content').notNull(),
  // Array of {title, url?, excerpt}
  sources: jsonb('sources').default([]),
  // Array of {label, prompt}
  quickActions: jsonb('quick_actions').default([]),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
