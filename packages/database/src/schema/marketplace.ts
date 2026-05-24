import {
  pgTable,
  uuid,
  varchar,
  text,
  real,
  integer,
  boolean,
  timestamp,
  pgEnum,
  jsonb,
} from 'drizzle-orm/pg-core'
import { users } from './users.js'

export const productCategoryEnum = pgEnum('product_category', [
  'seeds',
  'fertilizers',
  'pesticides',
  'equipment',
  'animals',
  'grains',
  'other',
])

export const marketplaceProducts = pgTable('marketplace_products', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description').notNull(),
  category: productCategoryEnum('category').notNull(),
  price: real('price').notNull(),
  unit: varchar('unit', { length: 50 }).notNull(),
  images: jsonb('images').notNull().default([]),
  stock: integer('stock'),
  city: varchar('city', { length: 100 }).notNull(),
  state: varchar('state', { length: 2 }).notNull(),
  latitude: real('latitude'),
  longitude: real('longitude'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
