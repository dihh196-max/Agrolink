import { pgTable, uuid, varchar, text, boolean, timestamp, pgEnum } from 'drizzle-orm/pg-core'

export const userRoleEnum = pgEnum('user_role', [
  'producer',
  'supplier',
  'technician',
  'cooperative',
])

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  cpf: varchar('cpf', { length: 14 }).unique(),
  phone: varchar('phone', { length: 20 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  avatarUrl: text('avatar_url'),
  coverUrl: text('cover_url'),
  bio: text('bio'),
  role: userRoleEnum('role').notNull().default('producer'),
  verified: boolean('verified').notNull().default(false),
  premiumUntil: timestamp('premium_until'),
  totalAreaHectares: text('total_area_hectares'),
  // Facebook-style profile fields
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 2 }),
  occupation: varchar('occupation', { length: 100 }),
  experienceYears: text('experience_years'),
  cultures: text('cultures'),
  website: varchar('website', { length: 255 }),
  instagram: varchar('instagram', { length: 50 }),
  birthDate: text('birth_date'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
