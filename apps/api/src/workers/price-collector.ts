/**
 * BullMQ worker that fetches CEPEA prices every 15 minutes.
 * Runs as a separate process: `tsx src/workers/price-collector.ts`
 */
import { Worker, Queue } from 'bullmq'
import axios from 'axios'
import { createDatabase, marketPrices } from '@agrolink/database'
import { env } from '../lib/env.js'

const connection = { host: new URL(env.REDIS_URL).hostname, port: Number(new URL(env.REDIS_URL).port) }
const db = createDatabase(env.DATABASE_URL)

export const priceQueue = new Queue('price-collection', { connection })

// Mock CEPEA data (replace with real scraper/API integration)
const MOCK_PRICES = [
  { culture: 'soja' as const, price: 118.5, unit: 'saca_60kg' as const, source: 'CEPEA' as const },
  { culture: 'milho' as const, price: 62.3, unit: 'saca_60kg' as const, source: 'CEPEA' as const },
  { culture: 'algodao' as const, price: 95.0, unit: 'saca_60kg' as const, source: 'CEPEA' as const },
  { culture: 'cafe' as const, price: 1250.0, unit: 'saca_60kg' as const, source: 'CEPEA' as const },
  { culture: 'boi_gordo' as const, price: 290.0, unit: 'arroba' as const, source: 'CEPEA' as const },
]

const worker = new Worker(
  'price-collection',
  async () => {
    const now = new Date()

    // In production, replace with actual CEPEA API calls
    for (const mock of MOCK_PRICES) {
      const variation = (Math.random() - 0.5) * 2
      await db.insert(marketPrices).values({
        ...mock,
        currency: 'BRL',
        variation24h: variation,
        variationPercent24h: (variation / mock.price) * 100,
        updatedAt: now,
      })
    }

    console.log(`[price-collector] Prices updated at ${now.toISOString()}`)
  },
  { connection }
)

worker.on('failed', (job, err) => {
  console.error(`[price-collector] Job ${job?.id} failed:`, err.message)
})

// Schedule job every 15 minutes
await priceQueue.upsertJobScheduler('collect-prices', { every: 15 * 60 * 1000 }, { name: 'collect' })

console.log('[price-collector] Worker started, collecting every 15 minutes')
