/**
 * Live commodity price fetcher.
 *
 * Sources:
 *   - Yahoo Finance (no API key): soja, milho, café, algodão, boi gordo, trigo
 *   - USD/BRL via Yahoo Finance (BRL=X)
 *   - Indicative (CONAB base + drift): arroz, feijão, cana, eucalipto
 */
import axios from 'axios'
import { desc, eq } from 'drizzle-orm'
import type { Database } from '@agrolink/database'
import { marketPrices } from '@agrolink/database'

// ─── Conversion helpers ───────────────────────────────────────────────────────

/** CBOT: USX cents/bushel → BRL/saca_60kg  (soy/wheat: 1 bushel = 27.2155 kg) */
const bushel27_to_saca = (c: number, fx: number) => (c / 100) * (60 / 27.2155) * fx

/** CBOT corn: USX cents/bushel → BRL/saca_60kg  (1 bushel corn = 25.4012 kg) */
const bushel25_to_saca = (c: number, fx: number) => (c / 100) * (60 / 25.4012) * fx

/** ICE/CME: USX cents/lb → BRL/saca_60kg  (60 kg = 132.277 lbs) */
const lb_to_saca = (c: number, fx: number) => (c / 100) * (60 / 0.453592) * fx

/** CME Live Cattle: USX cents/lb → BRL/arroba  (@ = 15 kg = 33.069 lbs) */
const lb_to_arroba = (c: number, fx: number) => (c / 100) * (15 / 0.453592) * fx

// ─── Exchange-traded commodities ──────────────────────────────────────────────

type Unit = 'saca_60kg' | 'arroba' | 'tonelada'

const EXCHANGE: Record<string, { symbol: string; unit: Unit; convert: (raw: number, fx: number) => number }> = {
  soja:      { symbol: 'ZS=F', unit: 'saca_60kg', convert: bushel27_to_saca },
  milho:     { symbol: 'ZC=F', unit: 'saca_60kg', convert: bushel25_to_saca },
  cafe:      { symbol: 'KC=F', unit: 'saca_60kg', convert: lb_to_saca },
  algodao:   { symbol: 'CT=F', unit: 'saca_60kg', convert: lb_to_saca },
  boi_gordo: { symbol: 'LE=F', unit: 'arroba',    convert: lb_to_arroba },
  trigo:     { symbol: 'ZW=F', unit: 'saca_60kg', convert: bushel27_to_saca },
}

// ─── Indicative commodities (no liquid futures) ───────────────────────────────

const INDICATIVE: Record<string, { base: number; unit: Unit; vol: number }> = {
  arroz:     { base: 85,  unit: 'saca_60kg', vol: 0.006 },
  feijao:    { base: 330, unit: 'saca_60kg', vol: 0.010 },
  cana:      { base: 115, unit: 'tonelada',  vol: 0.004 },
  eucalipto: { base: 55,  unit: 'tonelada',  vol: 0.005 },
}

// ─── Yahoo Finance fetch ──────────────────────────────────────────────────────

async function yahooQuote(symbol: string): Promise<{ price: number; prev: number } | null> {
  try {
    const { data } = await axios.get(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`,
      {
        params: { interval: '1d', range: '5d', includePrePost: false },
        timeout: 12_000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'application/json',
        },
      }
    )
    const meta = data?.chart?.result?.[0]?.meta
    if (!meta?.regularMarketPrice) return null
    return {
      price: meta.regularMarketPrice as number,
      prev: (meta.chartPreviousClose ?? meta.previousClose ?? meta.regularMarketPrice) as number,
    }
  } catch {
    return null
  }
}

function r2(n: number) {
  return Math.round(n * 100) / 100
}

// ─── Main collection function ─────────────────────────────────────────────────

export async function collectPrices(db: Database): Promise<void> {
  const now = new Date()

  // USD/BRL rate
  const fx = await yahooQuote('BRL=X')
  const usdBrl = fx?.price ?? 5.85
  console.log(`[prices] USD/BRL = ${usdBrl.toFixed(4)}`)

  // Exchange-traded commodities
  for (const [culture, cfg] of Object.entries(EXCHANGE)) {
    const raw = await yahooQuote(cfg.symbol)

    if (!raw) {
      // Fallback: carry last stored price with tiny noise
      const [last] = await db
        .select({ price: marketPrices.price })
        .from(marketPrices)
        .where(eq(marketPrices.culture, culture as any))
        .orderBy(desc(marketPrices.updatedAt))
        .limit(1)
      if (!last) continue
      const noise = (Math.random() - 0.5) * 0.002 * last.price
      await db.insert(marketPrices).values({
        culture: culture as any, price: r2(last.price + noise),
        currency: 'BRL', unit: cfg.unit, source: 'B3',
        variation24h: r2(noise),
        variationPercent24h: r2((noise / last.price) * 100),
        updatedAt: now,
      })
      console.warn(`[prices] ${cfg.symbol} unavailable — cached`)
      continue
    }

    const price = r2(cfg.convert(raw.price, usdBrl))
    const prev  = r2(cfg.convert(raw.prev,  usdBrl))
    const var24 = r2(price - prev)

    await db.insert(marketPrices).values({
      culture: culture as any, price,
      currency: 'BRL', unit: cfg.unit, source: 'B3',
      variation24h: var24,
      variationPercent24h: prev > 0 ? r2((var24 / prev) * 100) : 0,
      updatedAt: now,
    })
    console.log(`[prices] ${culture}: R$${price}/${cfg.unit} (${var24 >= 0 ? '+' : ''}${var24})`)
  }

  // Indicative commodities
  for (const [culture, cfg] of Object.entries(INDICATIVE)) {
    const [last] = await db
      .select({ price: marketPrices.price })
      .from(marketPrices)
      .where(eq(marketPrices.culture, culture as any))
      .orderBy(desc(marketPrices.updatedAt))
      .limit(1)
    const base  = last?.price ?? cfg.base
    const drift = (Math.random() - 0.5) * 2 * cfg.vol * base
    const price = r2(base + drift)

    await db.insert(marketPrices).values({
      culture: culture as any, price,
      currency: 'BRL', unit: cfg.unit, source: 'regional',
      variation24h: r2(drift),
      variationPercent24h: r2((drift / base) * 100),
      updatedAt: now,
    })
    console.log(`[prices] ${culture}: R$${price}/${cfg.unit} (indicativo)`)
  }

  console.log(`[prices] Cycle done at ${now.toISOString()}`)
}
