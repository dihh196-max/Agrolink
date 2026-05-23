import {
  pgTable,
  uuid,
  varchar,
  real,
  timestamp,
  pgEnum,
  integer,
  text,
} from 'drizzle-orm/pg-core'
import { users } from './users.js'

export const cultureEnum = pgEnum('culture', [
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
])

export const farms = pgTable('farms', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  areaHectares: real('area_hectares').notNull(),
  city: varchar('city', { length: 100 }).notNull(),
  state: varchar('state', { length: 2 }).notNull(),
  // Stored as "lat,lng" — use PostGIS geometry in production
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const farmCultures = pgTable('farm_cultures', {
  id: uuid('id').primaryKey().defaultRandom(),
  farmId: uuid('farm_id')
    .notNull()
    .references(() => farms.id, { onDelete: 'cascade' }),
  culture: cultureEnum('culture').notNull(),
  areaHectares: real('area_hectares').notNull(),
  safra: varchar('safra', { length: 20 }).notNull(),
  year: integer('year').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
