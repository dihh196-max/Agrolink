import {
  pgTable,
  uuid,
  text,
  varchar,
  boolean,
  integer,
  timestamp,
  jsonb,
  real,
  pgEnum,
} from 'drizzle-orm/pg-core'
import { users } from './users.js'

export const reactionTypeEnum = pgEnum('reaction_type', [
  'like',
  'applause',
  'useful',
  'insightful',
])

export const posts = pgTable('posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  // Array of {type, url, thumbnailUrl}
  media: jsonb('media').notNull().default([]),
  // Array of hashtag strings
  tags: jsonb('tags').notNull().default([]),
  latitude: real('latitude'),
  longitude: real('longitude'),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 2 }),
  reactionsCount: jsonb('reactions_count')
    .notNull()
    .default({ like: 0, applause: 0, useful: 0, insightful: 0 }),
  commentsCount: integer('comments_count').notNull().default(0),
  isSponsored: boolean('is_sponsored').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const postReactions = pgTable('post_reactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  postId: uuid('post_id')
    .notNull()
    .references(() => posts.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: reactionTypeEnum('type').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const postComments = pgTable('post_comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  postId: uuid('post_id')
    .notNull()
    .references(() => posts.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const stories = pgTable('stories', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  mediaUrl: text('media_url').notNull(),
  mediaType: varchar('media_type', { length: 10 }).notNull().default('image'),
  temperature: real('temperature'),
  weatherDescription: varchar('weather_description', { length: 100 }),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
