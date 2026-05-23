import {
  pgTable,
  uuid,
  varchar,
  real,
  timestamp,
  pgEnum,
  boolean,
  jsonb,
} from 'drizzle-orm/pg-core'
import { cultureEnum } from './farms.js'
import { users } from './users.js'

export const priceSourceEnum = pgEnum('price_source', ['CEPEA', 'B3', 'regional'])
export const priceUnitEnum = pgEnum('price_unit', ['saca_60kg', 'arroba', 'tonelada'])

export const marketPrices = pgTable('market_prices', {
  id: uuid('id').primaryKey().defaultRandom(),
  culture: cultureEnum('culture').notNull(),
  price: real('price').notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('BRL'),
  unit: priceUnitEnum('unit').notNull(),
  source: priceSourceEnum('source').notNull(),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 2 }),
  variation24h: real('variation_24h').notNull().default(0),
  variationPercent24h: real('variation_percent_24h').notNull().default(0),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const priceAlerts = pgTable('price_alerts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  culture: cultureEnum('culture').notNull(),
  targetPrice: real('target_price').notNull(),
  condition: varchar('condition', { length: 10 }).notNull(), // 'above' | 'below'
  active: boolean('active').notNull().default(true),
  triggeredAt: timestamp('triggered_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const weatherCache = pgTable('weather_cache', {
  id: uuid('id').primaryKey().defaultRandom(),
  farmId: uuid('farm_id'),
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  // Full WeatherForecast JSON
  data: jsonb('data').notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const offerTypeEnum = pgEnum('offer_type', ['sell', 'buy'])

export const offers = pgTable('offers', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: offerTypeEnum('type').notNull(),
  culture: cultureEnum('culture').notNull(),
  volumeTons: real('volume_tons').notNull(),
  pricePerUnit: real('price_per_unit').notNull(),
  unit: priceUnitEnum('unit').notNull(),
  description: varchar('description', { length: 500 }),
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  city: varchar('city', { length: 100 }).notNull(),
  state: varchar('state', { length: 2 }).notNull(),
  active: boolean('active').notNull().default(true),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
