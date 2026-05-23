import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as usersSchema from './schema/users.js'
import * as farmsSchema from './schema/farms.js'
import * as postsSchema from './schema/posts.js'
import * as marketSchema from './schema/market.js'
import * as aiSchema from './schema/ai.js'
import * as socialSchema from './schema/social.js'

export const schema = {
  ...usersSchema,
  ...farmsSchema,
  ...postsSchema,
  ...marketSchema,
  ...aiSchema,
  ...socialSchema,
}

export type Database = ReturnType<typeof createDatabase>

export function createDatabase(connectionString: string) {
  const client = postgres(connectionString)
  return drizzle(client, { schema })
}

// Re-export schema tables for use in queries
export * from './schema/users.js'
export * from './schema/farms.js'
export * from './schema/posts.js'
export * from './schema/market.js'
export * from './schema/ai.js'
export * from './schema/social.js'
