'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Logo } from '../../components/Logo'
import { ShoppingBag, MapPin, Navigation, Package } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { useDemoAuth } from '../../hooks/useSocial'

const CATEGORY_LABELS: Record<string, string> = {
  seeds: '🌱 Sementes',
  fertilizers: '🧪 Fertilizantes',
  pesticides: '🛡️ Defensivos',
  equipment: '🚜 Equipamentos',
  animals: '🐄 Animais',
  grains: '🌾 Grãos',
  other: '📦 Outros',
}

const CATEGORY_COLORS: Record<string, string> = {
  seeds: 'bg-green-100 text-green-700',
  fertilizers: 'bg-blue-100 text-blue-700',
  pesticides: 'bg-orange-100 text-orange-700',
  equipment: 'bg-gray-100 text-gray-700',
  animals: 'bg-amber-100 text-amber-700',
  grains: 'bg-yellow-100 text-yellow-700',
  other: 'bg-purple-100 text-purple-700',
}

function useProducts(category: string, geo: { lat?: number; lng?: number }) {
  const ready = useDemoAuth()
  return useQuery({
    queryKey: ['marketplace', category, geo.lat, geo.lng],
    queryFn: () =>
      api
        .get('/marketplace', {
          params: {
            ...(category !== 'all' && { category }),
            ...(geo.lat != null && { lat: geo.lat, lng: geo.lng, radius: 400 }),
          },
        })
        .then((r) => r.data),
    enabled: ready,
  })
}

function Avatar({ name, url, size = 36 }: { name: string; url?: string; size?: number }) {
  if (url) return <img src={url} alt={name} className="rounded-full object-cover flex-shrink-0" style={{ width: size, height: size }} />
  return (
    <div
      className="rounded-full bg-primary text-white flex items-center justify-center font-bold flex-shrink-0"
      style={{ width: size, height: size, fontSize: size / 2.5 }}
    >
      {name[0]?.toUpperCase()}
    </div>
  )
}

function ProductCard({ product }: { product: any }) {
  return (
    <div className="card hover:border-primary/30 border border-transparent transition-colors flex flex-col">
      {/* Image placeholder */}
      <div className="w-full h-36 bg-gradient-to-br from-green-50 to-green-100 rounded-lg mb-3 flex items-center justify-center">
        <span className="text-4xl">{CATEGORY_LABELS[product.category]?.split(' ')[0] ?? '📦'}</span>
      </div>

      <div className="flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-gray-800 text-sm leading-tight flex-1">{product.name}</h3>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${CATEGORY_COLORS[product.category]}`}>
            {CATEGORY_LABELS[product.category]?.split(' ').slice(1).join(' ')}
          </span>
        </div>

        <p className="text-gray-500 text-xs mt-1 line-clamp-2">{product.description}</p>

        <div className="mt-3 flex items-end justify-between">
          <div>
            <div className="text-xl font-bold text-primary">
              R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-gray-400">por {product.unit}</div>
          </div>
          {product.stock != null && (
            <div className="text-xs text-gray-400">{product.stock} disponíveis</div>
          )}
        </div>

        <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
          <Avatar name={product.seller?.name ?? '?'} url={product.seller?.avatarUrl} size={18} />
          <span>{product.seller?.name}</span>
          <span>·</span>
          <MapPin size={10} className="text-primary" />
          <span>{product.city}/{product.state}</span>
          {product.distanceKm != null && (
            <span className="text-primary font-medium">{product.distanceKm} km</span>
          )}
        </div>
      </div>

      <button className="btn-primary w-full text-sm py-2 mt-3">
        Ver Produto
      </button>
    </div>
  )
}

export default function MarketplacePage() {
  const [category, setCategory] = useState('all')
  const [geo, setGeo] = useState<{ lat?: number; lng?: number }>({})
  const [geoLoading, setGeoLoading] = useState(false)

  const { data: products, isLoading } = useProducts(category, geo)
  useDemoAuth()

  const enableGeo = () => {
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setGeoLoading(false)
      },
      () => setGeoLoading(false)
    )
  }

  const categories = [
    { id: 'all', label: 'Tudo' },
    { id: 'seeds', label: '🌱 Sementes' },
    { id: 'fertilizers', label: '🧪 Fertilizantes' },
    { id: 'pesticides', label: '🛡️ Defensivos' },
    { id: 'equipment', label: '🚜 Máquinas' },
    { id: 'grains', label: '🌾 Grãos' },
    { id: 'animals', label: '🐄 Animais' },
    { id: 'other', label: '📦 Outros' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary text-white px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Logo size={30} />
          <span className="bg-white/20 text-xs px-2 py-1 rounded-full">Marketplace</span>
        </Link>
        <div className="flex gap-4 text-sm items-center">
          <Link href="/vagas" className="opacity-80 hover:opacity-100">Vagas</Link>
          <Link href="/rede" className="opacity-80 hover:opacity-100">Rede</Link>
          <Link href="/dashboard" className="opacity-80 hover:opacity-100">Dashboard</Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <ShoppingBag className="text-primary" size={32} />
            Marketplace Agrícola
          </h1>
          <p className="text-gray-500 mt-1">Compre e venda produtos, insumos e equipamentos do campo</p>
        </div>

        {/* Filters */}
        <div className="card mb-6">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-2 flex-wrap flex-1">
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    category === c.id
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <button
              onClick={enableGeo}
              disabled={geoLoading || geo.lat != null}
              className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-full border transition-colors ${
                geo.lat != null
                  ? 'border-primary bg-green-50 text-primary'
                  : 'border-gray-300 text-gray-600 hover:border-primary hover:text-primary'
              }`}
            >
              <Navigation size={14} />
              {geoLoading ? 'Localizando...' : geo.lat != null ? 'Próximos de você' : 'Perto de mim'}
            </button>
          </div>
        </div>

        {/* Products grid */}
        {isLoading ? (
          <div className="card text-center py-16 text-gray-400">Carregando produtos...</div>
        ) : (products?.length ?? 0) === 0 ? (
          <div className="card text-center py-16 text-gray-400">
            <Package size={40} className="mx-auto mb-3 opacity-30" />
            Nenhum produto encontrado
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map((p: any) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-8 card bg-primary/5 border border-primary/20 text-center py-8">
          <ShoppingBag size={36} className="mx-auto text-primary mb-3" />
          <h3 className="font-bold text-gray-800 text-lg">Quer vender no Marketplace?</h3>
          <p className="text-gray-500 text-sm mt-1 mb-4">
            Anuncie seus produtos para compradores em todo o Brasil
          </p>
          <button className="btn-primary px-6 py-2">Anunciar Produto</button>
        </div>
      </div>
    </div>
  )
}
