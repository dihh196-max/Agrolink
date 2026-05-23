import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ANTHROPIC_API_KEY: z.string().startsWith('sk-ant-'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_S3_BUCKET: z.string().default('agrolink-media'),
  AWS_REGION: z.string().default('us-east-1'),
  CLOUDFRONT_URL: z.string().url().optional(),
  WEATHER_API_KEY: z.string().optional(),
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

export const env = envSchema.parse(process.env)
