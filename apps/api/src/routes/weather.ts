import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { weatherCache, farms } from '@agrolink/database'
import axios from 'axios'
import { env } from '../lib/env.js'

// Open-Meteo is free and requires no API key
const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast'

function mockWeather(lat: number, lng: number) {
  const seed = Math.abs(Math.round(lat * 10 + lng))
  const base = 26 + (seed % 8)
  const today = new Date()
  const icons = ['☀️', '⛅', '🌧️', '⛈️', '🌤️']
  const descs = ['Céu limpo', 'Parcialmente nublado', 'Chuva leve', 'Pancadas de chuva', 'Principalmente limpo']
  const forecast = Array.from({ length: 15 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    const r = (seed + i * 3) % 5
    return {
      date: d.toISOString().slice(0, 10),
      tempMin: base - 4 + (i % 3),
      tempMax: base + 4 + (i % 4),
      humidity: 60 + (seed + i) % 30,
      precipitationMm: r < 2 ? 0 : r * 2.5,
      windKmh: 10 + (seed + i) % 15,
      description: descs[r],
      icon: icons[r],
      frostRisk: false,
    }
  })
  return { current: forecast[0], forecast, updatedAt: new Date().toISOString() }
}

async function fetchWeather(lat: number, lng: number) {
  try {
    const { data } = await axios.get(OPEN_METEO_URL, {
      params: {
        latitude: lat,
        longitude: lng,
        daily: [
          'temperature_2m_max',
          'temperature_2m_min',
          'precipitation_sum',
          'windspeed_10m_max',
          'weathercode',
          'relative_humidity_2m_max',
        ].join(','),
        current_weather: true,
        timezone: 'America/Cuiaba',
        forecast_days: 15,
      },
      timeout: 8000,
    })

    const wmoDescriptions: Record<number, string> = {
    0: 'Céu limpo',
    1: 'Principalmente limpo',
    2: 'Parcialmente nublado',
    3: 'Nublado',
    45: 'Neblina',
    51: 'Chuvisco leve',
    61: 'Chuva leve',
    63: 'Chuva moderada',
    65: 'Chuva forte',
    80: 'Pancadas de chuva leve',
    81: 'Pancadas de chuva moderada',
    82: 'Pancadas de chuva forte',
    95: 'Trovoada',
  }

    const daily = data.daily
    const forecast = daily.time.map((date: string, i: number) => ({
      date,
      tempMin: daily.temperature_2m_min[i],
      tempMax: daily.temperature_2m_max[i],
      humidity: daily.relative_humidity_2m_max[i] ?? 0,
      precipitationMm: daily.precipitation_sum[i] ?? 0,
      windKmh: daily.windspeed_10m_max[i] ?? 0,
      description: wmoDescriptions[daily.weathercode[i]] ?? 'Variável',
      icon: `wmo-${daily.weathercode[i]}`,
      frostRisk: daily.temperature_2m_min[i] < 2,
    }))

    const current = forecast[0]
    return { current, forecast, updatedAt: new Date().toISOString() }
  } catch {
    return mockWeather(lat, lng)
  }
}

export const weatherRoutes: FastifyPluginAsync = async (fastify) => {
  const db = fastify.db
  const CACHE_TTL_HOURS = 3

  fastify.get('/weather', { onRequest: [fastify.authenticate] }, async (request) => {
    const query = z
      .object({
        latitude: z.coerce.number(),
        longitude: z.coerce.number(),
        farmId: z.string().uuid().optional(),
      })
      .parse(request.query)

    // Check cache
    const cacheAge = new Date()
    cacheAge.setHours(cacheAge.getHours() - CACHE_TTL_HOURS)

    const cached = await db
      .select()
      .from(weatherCache)
      .where(
        and(
          eq(weatherCache.latitude, query.latitude),
          eq(weatherCache.longitude, query.longitude)
        )
      )
      .limit(1)

    if (cached.length && new Date(cached[0].updatedAt) > cacheAge) {
      return { ...(cached[0].data as Record<string, unknown>), fromCache: true }
    }

    const weatherData = await fetchWeather(query.latitude, query.longitude)

    // Upsert cache
    if (cached.length) {
      await db
        .update(weatherCache)
        .set({ data: weatherData, updatedAt: new Date() })
        .where(eq(weatherCache.id, cached[0].id))
    } else {
      await db.insert(weatherCache).values({
        farmId: query.farmId,
        latitude: query.latitude,
        longitude: query.longitude,
        data: weatherData,
      })
    }

    return { ...weatherData, location: { lat: query.latitude, lng: query.longitude } }
  })

  fastify.get(
    '/weather/farm/:farmId',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const { farmId } = request.params as { farmId: string }

      const [farm] = await db
        .select()
        .from(farms)
        .where(and(eq(farms.id, farmId), eq(farms.userId, request.user.sub)))
        .limit(1)

      if (!farm) return reply.code(404).send({ error: 'Fazenda não encontrada' })

      const weatherData = await fetchWeather(farm.latitude, farm.longitude)
      return { ...weatherData, farmId, location: { lat: farm.latitude, lng: farm.longitude } }
    }
  )
}
