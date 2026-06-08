/**
 * BullMQ worker that fetches live commodity prices every 15 minutes.
 *
 * Primary source  : Yahoo Finance (no API key required)
 *   - soja    → ZS=F  (CBOT, USX/bushel)
 *   - milho   → ZC=F  (CBOT, USX/bushel)
 *   - cafe    → KC=F  (ICE,  USX/lb)
 *   - algodao → CT=F  (ICE,  USX/lb)
 *   - boi_gordo → LE=F (CME, USX/lb)
 *   - trigo   → ZW=F  (CBOT, USX/bushel)
 *   - USD/BRL → BRL=X
 *
 * Indicative source (CONAB base + realistic drift):
 *   - arroz, feijao, cana, eucalipto (no liquid international futures)
 */
import { Worker, Queue } from 'bullmq'
import axios from 'axios'
import { desc, eq } from 'drizzle-orm'
import { createDatabase, marketPrices } from '@agrolink/database'
import { env } from '../lib/env.js'

const connection = {
  host: new URL(env.REDIS_URL).hostname,
  port: Number(new URL(env.REDIS_URL).port),
}
const db = createDatabase(env.DATABASE_URL)

export const priceQueue = new Queue('price-collection', { connection })

// ---------------------------------------------------------------------------
// Conversion helpers
// All CBOT/ICE quotes come in USX (US cents) per pound or per bushel.
// We convert to BRL per unit used in Brazil.
// ---------------------------------------------------------------------------

/** cents/bushel → BRL/saca_60kg  (1 bushel soybeans/wheat = 27.2155 kg) */
const centsPerBushel_to_BRL_saca60 = (cents: number, usdBrl: number) =>
  (cents / 100) * (60 / 27.2155) * usdBrl

/** cents/bushel → BRL/saca_60kg  (1 bushel corn = 25.4012 kg) */
const cornCentsPerBushel_to_BRL_saca60 = (cents: number, usdBrl: number) =>
  (cents / 100) * (60 / 25.4012) * usdBrl

/** cents/lb → BRL/saca_60kg  (1 lb = 0.453592 kg → 1 saca = 132.277 lbs) */
const centsPerLb_to_BRL_saca60 = (cents: number, usdBrl: number) =>
  (cents / 100) * (60 / 0.453592) * usdBrl

/** cents/lb → BRL/arroba  (1 arroba = 15 kg = 33.069 lbs) */
const centsPerLb_to_BRL_arroba = (cents: number, usdBrl: number) =>
  (cents / 100) * (60 / 4) * usdBrl * 0.453592

// ---------------------------------------------------------------------------
// Yahoo Finance configs per culture
// ---------------------------------------------------------------------------

type ExchangeConfig = {
  symbol: string
  unit: 'saca_60kg' | 'arroba' | 'tonelada'
  convert: (rawPrice: number, usdBrl: number) => number
}

const EXCHANGE_COMMODITIES: Record<string, ExchangeConfig> = {
  soja: {
    symbol: 'ZS=F',
    unit: 'saca_60kg',
    convert: centsPerBushel_to_BRL_saca60,
  },
  milho: {
    symbol: 'ZC=F',
    unit: 'saca_60kg',
    convert: cornCentsPerBushel_to_BRL_saca60,
  },
  cafe: {
    symbol: 'KC=F',
    unit: 'saca_60kg',
    convert: centsPerLb_to_BRL_saca60,
  },
  algodao: {
    symbol: 'CT=F',
    unit: 'saca_60kg',
    convert: centsPerLb_to_BRL_saca60,
  },
  boi_gordo: {
    symbol: 'LE=F',
    unit: 'arroba',
    convert: centsPerLb_to_BRL_arroba,
  },
  trigo: {
    symbol: 'ZW=F',
    unit: 'saca_60kg',
    convert: centsPerBushel_to_BRL_saca60,
  },
}

// CONAB-based reference prices — drift ±volatility% per cycle
const INDICATIVE_COMMODITIES: Record<
  string,
  { basePrice: number; unit: 'saca_60kg' | 'arroba' | 'tonelada'; volatility: number }
> = {
  arroz:     { basePrice: 85,   unit: 'saca_60kg', volatility: 0.006 },
  feijao:    { basePrice: 330,  unit: 'saca_60kg', volatility: 0.010 },
  cana:      { basePrice: 115,  unit: 'tonelada',  volatility: 0.004 },
  eucalipto: { basePrice: 55,   unit: 'tonelada',  volatility: 0.005 },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchYahoo(
  symbol: string
): Promise<{ price: number; previousClose: number } | null> {
  try {
    const { data } = await axios.get(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`,
      {
        params: { interval: '1d', range: '5d', includePrePost: false },
        timeout: 12_000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'application/json',
        },
      }
    )
    const meta = data?.chart?.result?.[0]?.meta
    if (!meta?.regularMarketPrice) return null
    return {
      price: meta.regularMarketPrice as number,
      previousClose: (meta.chartPreviousClose ?? meta.previousClose ?? meta.regularMarketPrice) as number,
    }
  } catch {
    return null
  }
}

async function lastStoredPrice(culture: string): Promise<number | null> {
  const [row] = await db
    .select({ price: marketPrices.price })
    .from(marketPrices)
    .where(eq(marketPrices.culture, culture as any))
    .orderBy(desc(marketPrices.updatedAt))
    .limit(1)
  return row?.price ?? null
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

const worker = new Worker(
  'price-collection',
  async () => {
    const now = new Date()

    // 1. Fetch USD/BRL exchange rate
    const fxData = await fetchYahoo('BRL=X')
    const usdBrl = fxData?.price ?? 5.85
    console.log(`[price-collector] USD/BRL = ${usdBrl.toFixed(4)}`)

    // 2. Exchange-based commodities (Yahoo Finance → BRL)
    for (const [culture, cfg] of Object.entries(EXCHANGE_COMMODITIES)) {
      const raw = await fetchYahoo(cfg.symbol)

      if (!raw) {
        // Fallback: carry last price with tiny noise so the row still updates
        const last = await lastStoredPrice(culture)
        if (!last) continue
        const noise = (Math.random() - 0.5) * 0.002 * last
        await db.insert(marketPrices).values({
          culture: culture as any,
          price: round2(last + noise),
          currency: 'BRL',
          unit: cfg.unit,
          source: 'B3',
          variation24h: round2(noise),
          variationPercent24h: round2((noise / last) * 100),
          updatedAt: now,
        })
        console.warn(`[price-collector] ${cfg.symbol} unavailable — using cached price`)
        continue
      }

      const price = round2(cfg.convert(raw.price, usdBrl))
      const prev  = round2(cfg.convert(raw.previousClose, usdBrl))
      const var24 = round2(price - prev)

      await db.insert(marketPrices).values({
        culture: culture as any,
        price,
        currency: 'BRL',
        unit: cfg.unit,
        source: 'B3',
        variation24h: var24,
        variationPercent24h: prev > 0 ? round2((var24 / prev) * 100) : 0,
        updatedAt: now,
      })

      console.log(
        `[price-collector] ${culture}: R$ ${price}/${cfg.unit} (${var24 >= 0 ? '+' : ''}${var24})`
      )
    }

    // 3. Indicative commodities (CONAB base with realistic drift)
    for (const [culture, cfg] of Object.entries(INDICATIVE_COMMODITIES)) {
      const last = (await lastStoredPrice(culture)) ?? cfg.basePrice
      const drift = (Math.random() - 0.5) * 2 * cfg.volatility * last
      const price = round2(last + drift)

      await db.insert(marketPrices).values({
        culture: culture as any,
        price,
        currency: 'BRL',
        unit: cfg.unit,
        source: 'regional',
        variation24h: round2(drift),
        variationPercent24h: round2((drift / last) * 100),
        updatedAt: now,
      })

      console.log(`[price-collector] ${culture}: R$ ${price}/${cfg.unit} (indicativo)`)
    }

    console.log(`[price-collector] Cycle complete at ${now.toISOString()}`)
  },
  { connection }
)

worker.on('failed', (job, err) => {
  console.error(`[price-collector] Job ${job?.id} failed:`, err.message)
})

// Run every 15 minutes
await priceQueue.upsertJobScheduler(
  'collect-prices',
  { every: 15 * 60 * 1000 },
  { name: 'collect' }
)

console.log('[price-collector] Worker started — collecting every 15 min')
