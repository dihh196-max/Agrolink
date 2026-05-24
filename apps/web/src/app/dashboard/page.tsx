'use client'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { TrendingUp, TrendingDown, Leaf, CloudSun, ShoppingCart, MessageCircle } from 'lucide-react'

// Mock data for dashboard preview (no auth required)
const MOCK_PRICES = [
  { culture: 'soja', label: 'Soja', icon: '🌿', price: 118.5, variation: 1.2, unit: '/sc' },
  { culture: 'milho', label: 'Milho', icon: '🌽', price: 62.3, variation: -0.8, unit: '/sc' },
  { culture: 'boi_gordo', label: 'Boi Gordo', icon: '🐄', price: 290.0, variation: 2.1, unit: '/@' },
  { culture: 'algodao', label: 'Algodão', icon: '☁️', price: 95.0, variation: 0.3, unit: '/sc' },
  { culture: 'cafe', label: 'Café', icon: '☕', price: 1250.0, variation: -1.5, unit: '/sc' },
]

const MOCK_CHART = Array.from({ length: 30 }, (_, i) => ({
  day: `${i + 1}/05`,
  soja: 115 + Math.sin(i / 4) * 5 + i * 0.1,
  milho: 60 + Math.cos(i / 5) * 3 + i * 0.05,
}))

const MOCK_OFFERS = [
  { id: '1', type: 'sell', culture: 'Soja 🌿', volume: '200t', price: 'R$ 119/sc', city: 'Sorriso/MT', distance: '45km' },
  { id: '2', type: 'buy', culture: 'Milho 🌽', volume: '500t', price: 'R$ 63/sc', city: 'Lucas/MT', distance: '120km' },
  { id: '3', type: 'sell', culture: 'Boi Gordo 🐄', volume: '80 cabeças', price: 'R$ 291/@', city: 'Rondonópolis/MT', distance: '12km' },
]

const MOCK_WEATHER = {
  city: 'Rondonópolis, MT',
  temp: 28,
  description: 'Parcialmente Nublado',
  humidity: 65,
  rain: 2.4,
  forecast: [
    { day: 'Sex', icon: '⛅', max: 30, min: 22 },
    { day: 'Sab', icon: '🌧️', max: 26, min: 21 },
    { day: 'Dom', icon: '☀️', max: 32, min: 23 },
    { day: 'Seg', icon: '⛅', max: 29, min: 22 },
    { day: 'Ter', icon: '🌧️', max: 25, min: 20 },
  ],
}

function PriceCard({ item }: { item: typeof MOCK_PRICES[0] }) {
  const isUp = item.variation >= 0
  return (
    <div className="card flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-3xl">{item.icon}</span>
        <div>
          <div className="font-bold text-gray-800">{item.label}</div>
          <div className="text-xs text-gray-400">CEPEA/ESALQ</div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-xl font-bold text-gray-800">
          R$ {item.price.toFixed(2).replace('.', ',')}
          <span className="text-sm font-normal text-gray-400">{item.unit}</span>
        </div>
        <div className={`flex items-center gap-1 justify-end text-sm font-semibold ${isUp ? 'text-green-600' : 'text-red-500'}`}>
          {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {isUp ? '+' : ''}{item.variation}%
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-primary text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🌱</span>
          <span className="text-xl font-bold">AgroLink</span>
          <span className="bg-white/20 text-xs px-2 py-1 rounded-full ml-2">Dashboard</span>
        </div>
        <div className="flex gap-4 text-sm items-center">
          <button className="hover:underline opacity-80">Feed</button>
          <a href="/rede" className="hover:underline opacity-80">Rede</a>
          <button className="hover:underline opacity-80">AgroIA</button>
          <button className="bg-secondary px-4 py-2 rounded-full font-semibold hover:bg-secondary-light transition-colors">
            Minha Conta
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Prices */}
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              <TrendingUp size={20} className="text-primary" />
              Cotações do Dia
            </h2>
            <div className="grid gap-3">
              {MOCK_PRICES.map((p) => <PriceCard key={p.culture} item={p} />)}
            </div>
          </div>

          {/* Chart */}
          <div className="card">
            <h3 className="font-bold text-gray-800 mb-4">Histórico 30 dias — Soja vs Milho</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={MOCK_CHART}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} interval={4} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v: number, name: string) => [`R$ ${v.toFixed(2)}`, name === 'soja' ? 'Soja' : 'Milho']}
                />
                <Line type="monotone" dataKey="soja" stroke="#1a5c2a" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="milho" stroke="#f5a623" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Offers */}
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              <ShoppingCart size={20} className="text-primary" />
              Ofertas na Região
            </h2>
            <div className="space-y-3">
              {MOCK_OFFERS.map((o) => (
                <div key={o.id} className="card flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${o.type === 'sell' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                      {o.type === 'sell' ? '📤 Venda' : '📥 Compra'}
                    </span>
                    <div>
                      <div className="font-semibold text-gray-800">{o.culture}</div>
                      <div className="text-sm text-gray-400">{o.volume} • {o.city} • {o.distance}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-primary">{o.price}</div>
                    <button className="text-xs text-primary hover:underline mt-1">Ver detalhes</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Weather */}
          <div className="card bg-gradient-to-br from-primary to-primary-light text-white">
            <div className="flex items-center gap-2 mb-4">
              <CloudSun size={20} />
              <span className="font-bold">Clima — {MOCK_WEATHER.city}</span>
            </div>
            <div className="text-center mb-4">
              <div className="text-5xl font-extrabold">{MOCK_WEATHER.temp}°C</div>
              <div className="text-sm opacity-80 mt-1">{MOCK_WEATHER.description}</div>
              <div className="flex justify-center gap-4 mt-3 text-sm opacity-75">
                <span>💧 {MOCK_WEATHER.humidity}%</span>
                <span>🌧 {MOCK_WEATHER.rain}mm</span>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-1">
              {MOCK_WEATHER.forecast.map((d) => (
                <div key={d.day} className="text-center text-xs">
                  <div className="opacity-70">{d.day}</div>
                  <div className="text-lg my-1">{d.icon}</div>
                  <div className="font-bold">{d.max}°</div>
                  <div className="opacity-60">{d.min}°</div>
                </div>
              ))}
            </div>
          </div>

          {/* AgroIA CTA */}
          <div className="card bg-gradient-to-br from-primary-dark to-primary text-white">
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle size={20} />
              <span className="font-bold">AgroIA ✨</span>
            </div>
            <p className="text-sm opacity-80 mb-4">
              Pergunte sobre manejo, pragas, cotações ou legislação em linguagem do campo.
            </p>
            <div className="space-y-2">
              {['Como está o mercado de soja?', 'Identificar lagarta-do-cartucho', 'CAR e Reserva Legal'].map((q) => (
                <button key={q} className="w-full text-left text-sm bg-white/10 hover:bg-white/20 px-3 py-2 rounded-xl transition-colors">
                  {q}
                </button>
              ))}
            </div>
            <button className="w-full mt-4 bg-secondary hover:bg-secondary-light text-white py-2 rounded-xl font-semibold transition-colors">
              Abrir AgroIA
            </button>
          </div>

          {/* Quick stats */}
          <div className="card">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Leaf size={18} className="text-primary" />
              Resumo da Plataforma
            </h3>
            <div className="space-y-3">
              {[
                ['Produtores ativos', '12.483'],
                ['Ofertas abertas', '847'],
                ['Perguntas à AgroIA hoje', '3.291'],
                ['Volume negociado', 'R$ 4,2M'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-bold text-gray-800">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
