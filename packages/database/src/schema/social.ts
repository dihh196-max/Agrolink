import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  pgEnum,
  jsonb,
} from 'drizzle-orm/pg-core'
import { users } from './users.js'
import { cultureEnum } from './farms.js'

export const connectionStatusEnum = pgEnum('connection_status', [
  'pending',
  'accepted',
  'rejected',
])

export const connections = pgTable('connections', {
  id: uuid('id').primaryKey().defaultRandom(),
  requesterId: uuid('requester_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  recipientId: uuid('recipient_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  status: connectionStatusEnum('status').notNull().default('pending'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const groups = pgTable('groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  culture: cultureEnum('culture'),
  state: varchar('state', { length: 2 }),
  membersCount: integer('members_count').notNull().default(0),
  avatarUrl: text('avatar_url'),
  coverUrl: text('cover_url'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const groupMembers = pgTable('group_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id')
    .notNull()
    .references(() => groups.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 20 }).notNull().default('member'),
  joinedAt: timestamp('joined_at').notNull().defaultNow(),
})

export const notificationTypeEnum = pgEnum('notification_type', [
  'price_alert',
  'new_follower',
  'post_reaction',
  'post_comment',
  'new_offer',
  'message',
  'weather_alert',
  'news',
])

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: notificationTypeEnum('type').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  body: text('body').notNull(),
  payload: jsonb('payload'),
  read: boolean('read').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const newsArticles = pgTable('news_articles', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  aiSummary: text('ai_summary'),
  priceImpact: varchar('price_impact', { length: 10 }),
  affectedCultures: jsonb('affected_cultures').notNull().default([]),
  sourceUrl: text('source_url').notNull(),
  sourceName: varchar('source_name', { length: 100 }).notNull(),
  imageUrl: text('image_url'),
  publishedAt: timestamp('published_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
