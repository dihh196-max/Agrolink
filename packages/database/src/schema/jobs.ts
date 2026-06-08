import {
  pgTable,
  uuid,
  varchar,
  text,
  real,
  boolean,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core'
import { users } from './users.js'
import { cultureEnum } from './farms.js'

export const jobTypeEnum = pgEnum('job_type', [
  'seasonal',
  'permanent',
  'internship',
  'service',
])

export const jobApplicationStatusEnum = pgEnum('job_application_status', [
  'pending',
  'accepted',
  'rejected',
])

export const jobs = pgTable('jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  type: jobTypeEnum('type').notNull(),
  culture: cultureEnum('culture'),
  salaryMin: real('salary_min'),
  salaryMax: real('salary_max'),
  city: varchar('city', { length: 100 }).notNull(),
  state: varchar('state', { length: 2 }).notNull(),
  latitude: real('latitude'),
  longitude: real('longitude'),
  deadline: timestamp('deadline'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const jobApplications = pgTable('job_applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id')
    .notNull()
    .references(() => jobs.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  message: text('message'),
  status: jobApplicationStatusEnum('status').notNull().default('pending'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const externalJobs = pgTable('external_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  externalId: text('external_id').notNull().unique(),
  title: varchar('title', { length: 255 }).notNull(),
  company: varchar('company', { length: 255 }).notNull(),
  companyLogo: text('company_logo'),
  description: text('description').notNull(),
  employmentType: varchar('employment_type', { length: 50 }).default('permanent'),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  country: varchar('country', { length: 10 }).default('BR'),
  salaryMin: real('salary_min'),
  salaryMax: real('salary_max'),
  salaryCurrency: varchar('salary_currency', { length: 10 }).default('BRL'),
  applyUrl: text('apply_url').notNull(),
  source: varchar('source', { length: 50 }).notNull().default('jsearch'),
  keywords: text('keywords').array(),
  requiredSkills: text('required_skills').array(),
  postedAt: timestamp('posted_at'),
  expiresAt: timestamp('expires_at'),
  cachedAt: timestamp('cached_at').notNull().defaultNow(),
})
