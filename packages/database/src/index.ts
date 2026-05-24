import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as usersSchema from './schema/users.js'
import * as farmsSchema from './schema/farms.js'
import * as postsSchema from './schema/posts.js'
import * as marketSchema from './schema/market.js'
import * as aiSchema from './schema/ai.js'
import * as socialSchema from './schema/social.js'
import * as jobsSchema from './schema/jobs.js'
import * as marketplaceSchema from './schema/marketplace.js'

export const schema = {
  ...usersSchema,
  ...farmsSchema,
  ...postsSchema,
  ...marketSchema,
  ...aiSchema,
  ...socialSchema,
  ...jobsSchema,
  ...marketplaceSchema,
}

export type Database = ReturnType<typeof createDatabase>

export function createDatabase(connectionString: string) {
  const client = postgres(connectionString)
  return drizzle(client, { schema })
}

export * from './schema/users.js'
export * from './schema/farms.js'
export * from './schema/posts.js'
export * from './schema/market.js'
export * from './schema/ai.js'
export * from './schema/social.js'
export * from './schema/jobs.js'
export * from './schema/marketplace.js'
