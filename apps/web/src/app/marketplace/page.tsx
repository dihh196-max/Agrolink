'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Logo } from '../../components/Logo'
import { ShoppingBag, MapPin, Navigation, Package, Plus, X } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { useDemoAuth } from '../../hooks/useSocial'

const CATEGORY_LABELS: Record<string, string> = {
  seeds: '🌱 Sementes', fertilizers: '🧪 Fertilizantes', pesticides: '🛡️ Defensivos',
  equipment: '🚜 Equipamentos', animals: '🐄 Animais', grains: '🌾 Grãos', other: '📦 Outros',
}

const CATEGORY_COLORS: Record<string, string> = {
  seeds: 'bg-green-100 text-green-700', fertilizers: 'bg-blue-100 text-blue-700',
  pesticides: 'bg-orange-100 text-orange-700', equipment: 'bg-gray-100 text-gray-700',
  animals: 'bg-amber-100 text-amber-700', grains: 'bg-yellow-100 text-yellow-700',
  other: 'bg-purple-100 text-purple-700',
}

const STATES = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO']
const CATEGORIES = ['seeds','fertilizers','pesticides','equipment','animals','grains','other'] as const

function useProducts(category: string, geo: { lat?: number; lng?: number }) {
  const ready = useDemoAuth()
  return useQuery({
    queryKey: ['marketplace', category, geo.lat, geo.lng],
    queryFn: () =>
      api.get('/marketplace', { params: { ...(category !== 'all' && { category }), ...(geo.lat != null && { lat: geo.lat, lng: geo.lng, radius: 400 }) } })
         .then((r) => r.data),
    enabled: ready,
  })
}

function usePostProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/marketplace', body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['marketplace'] }),
  })
}

function Avatar({ name, url, size = 36 }: { name: string; url?: string; size?: number }) {
  if (url) return <img src={url} alt={name} className="rounded-full object-cover flex-shrink-0" style={{ width: size, height: size }} />
  return (
    <div className="rounded-full bg-primary text-white flex items-center justify-center font-bold flex-shrink-0"
      style={{ width: size, height: size, fontSize: size / 2.5 }}>
      {name[0]?.toUpperCase()}
    </div>
  )
}

const INPUT = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary transition-colors bg-white"
const SELECT = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary transition-colors bg-white"

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}

function PostProductModal({ onClose }: { onClose: () => void }) {
  const postProduct = usePostProduct()
  const [form, setForm] = useState({
    name: '', description: '', category: 'seeds', price: '',
    unit: '', stock: '', city: '', state: 'MT',
  })
  const [success, setSuccess] = useState(false)
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const body: Record<string, unknown> = {
      name: form.name, description: form.description, category: form.category,
      price: Number(form.price), unit: form.unit, city: form.city, state: form.state,
      ...(form.stock && { stock: Number(form.stock) }),
    }
    postProduct.mutate(body, {
      onSuccess: () => setSuccess(true),
      onError: (err: any) => alert(err?.response?.data?.message ?? 'Erro ao anunciar produto'),
    })
  }

  const UNIT_SUGGESTIONS = ['kg', 'saca 60kg', 'unidade', 'caixa', 'L', 'galão 20L', 'tonelada', 'fardo', 'frasco', 'dose']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <ShoppingBag size={20} className="text-primary" /> Anunciar Produto
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center">
            <div className="text-5xl mb-4">🛒</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Produto anunciado!</h3>
            <p className="text-gray-500 mb-6">Seu produto já está visível no Marketplace.</p>
            <button onClick={onClose} className="btn-primary px-8 py-2">Fechar</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <Field label="Nome do produto" required>
              <input className={INPUT} value={form.name} onChange={(e) => set('name', e.target.value)}
                placeholder="Ex: Semente de Soja TMG 7062" required minLength={3} />
            </Field>

            <Field label="Categoria" required>
              <select className={SELECT} value={form.category} onChange={(e) => set('category', e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </Field>

            <Field label="Descrição" required>
              <textarea className={INPUT} rows={3} value={form.description} onChange={(e) => set('description', e.target.value)}
                placeholder="Descreva o produto, especificações técnicas, condições..." required minLength={10} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Preço (R$)" required>
                <input className={INPUT} type="number" min="0.01" step="0.01" value={form.price}
                  onChange={(e) => set('price', e.target.value)} placeholder="0,00" required />
              </Field>
              <Field label="Unidade de venda" required>
                <input className={INPUT} list="unit-suggestions" value={form.unit} onChange={(e) => set('unit', e.target.value)}
                  placeholder="kg, saca, unidade..." required />
                <datalist id="unit-suggestions">
                  {UNIT_SUGGESTIONS.map((u) => <option key={u} value={u} />)}
                </datalist>
              </Field>
            </div>

            <Field label="Quantidade disponível (estoque)">
              <input className={INPUT} type="number" min="1" value={form.stock}
                onChange={(e) => set('stock', e.target.value)} placeholder="Ex: 100" />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Cidade" required>
                <input className={INPUT} value={form.city} onChange={(e) => set('city', e.target.value)}
                  placeholder="Sorriso" required />
              </Field>
              <Field label="Estado" required>
                <select className={SELECT} value={form.state} onChange={(e) => set('state', e.target.value)}>
                  {STATES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </Field>
            </div>

            <div className="pt-2 flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={postProduct.isPending} className="flex-1 btn-primary py-3 font-semibold">
                {postProduct.isPending ? 'Anunciando...' : 'Anunciar Produto'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function ProductCard({ product, onContact }: { product: any; onContact: (p: any) => void }) {
  const icon = CATEGORY_LABELS[product.category]?.split(' ')[0] ?? '📦'
  const seller = product.seller
  const catLabel = CATEGORY_LABELS[product.category]?.split(' ').slice(1).join(' ')

  return (
    <div className="card hover:border-primary/30 border border-transparent transition-colors flex flex-col">
      <div className="w-full h-36 bg-gradient-to-br from-green-50 to-green-100 rounded-lg mb-3 flex items-center justify-center">
        <span className="text-5xl">{icon}</span>
      </div>
      <div className="flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-gray-800 text-sm leading-tight flex-1">{product.name}</h3>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${CATEGORY_COLORS[product.category]}`}>
            {catLabel}
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
          {product.stock != null && <div className="text-xs text-gray-400">{product.stock.toLocaleString('pt-BR')} disp.</div>}
        </div>
        <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
          <Avatar name={seller?.name ?? '?'} url={seller?.avatarUrl} size={18} />
          <span className="truncate">{seller?.name}</span>
          <span>·</span>
          <MapPin size={10} className="text-primary flex-shrink-0" />
          <span className="truncate">{product.city}/{product.state}{product.distanceKm != null ? ` · ${product.distanceKm} km` : ''}</span>
        </div>
      </div>
      <button onClick={() => onContact(product)} className="btn-primary w-full text-sm py-2 mt-3">
        Ver Produto
      </button>
    </div>
  )
}

function ContactModal({ product, onClose }: { product: any; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800 text-lg">{product.name}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg text-gray-400"><X size={20} /></button>
        </div>
        <div className="space-y-3 text-sm text-gray-600">
          <p>{product.description}</p>
          <div className="grid grid-cols-2 gap-3 bg-gray-50 rounded-xl p-4">
            <div><div className="text-xs text-gray-400">Preço</div><div className="font-bold text-primary text-lg">R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div><div className="text-xs text-gray-400">por {product.unit}</div></div>
            {product.stock && <div><div className="text-xs text-gray-400">Estoque</div><div className="font-bold text-gray-800">{product.stock.toLocaleString('pt-BR')}</div><div className="text-xs text-gray-400">disponíveis</div></div>}
          </div>
          <div className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl">
            <Avatar name={product.seller?.name ?? '?'} url={product.seller?.avatarUrl} size={44} />
            <div>
              <div className="font-semibold text-gray-800">{product.seller?.name}</div>
              <div className="text-gray-400 text-xs">{product.city}/{product.state}</div>
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl font-semibold hover:bg-gray-50">Fechar</button>
          <button className="flex-1 btn-primary py-3 font-semibold">Enviar Mensagem</button>
        </div>
      </div>
    </div>
  )
}

export default function MarketplacePage() {
  const [category, setCategory] = useState('all')
  const [geo, setGeo] = useState<{ lat?: number; lng?: number }>({})
  const [geoLoading, setGeoLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [contactProduct, setContactProduct] = useState<any>(null)

  const { data: products, isLoading } = useProducts(category, geo)
  useDemoAuth()

  const enableGeo = () => {
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => { setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGeoLoading(false) },
      () => setGeoLoading(false)
    )
  }

  const categories = [
    { id: 'all', label: 'Tudo' }, { id: 'seeds', label: '🌱 Sementes' },
    { id: 'fertilizers', label: '🧪 Fertilizantes' }, { id: 'pesticides', label: '🛡️ Defensivos' },
    { id: 'equipment', label: '🚜 Máquinas' }, { id: 'grains', label: '🌾 Grãos' },
    { id: 'animals', label: '🐄 Animais' }, { id: 'other', label: '📦 Outros' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {showForm && <PostProductModal onClose={() => setShowForm(false)} />}
      {contactProduct && <ContactModal product={contactProduct} onClose={() => setContactProduct(null)} />}

      <header className="bg-primary text-white px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Logo size={30} />
          <span className="bg-white/20 text-xs px-2 py-1 rounded-full">Marketplace</span>
        </Link>
        <div className="flex gap-4 text-sm items-center">
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 bg-secondary text-white px-4 py-1.5 rounded-full font-semibold text-xs hover:bg-secondary/90 transition-colors">
            <Plus size={14} /> Anunciar Produto
          </button>
          <Link href="/vagas" className="opacity-80 hover:opacity-100">Vagas</Link>
          <Link href="/rede" className="opacity-80 hover:opacity-100">Rede</Link>
          <Link href="/dashboard" className="opacity-80 hover:opacity-100">Dashboard</Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <ShoppingBag className="text-primary" size={32} /> Marketplace Agrícola
            </h1>
            <p className="text-gray-500 mt-1">Compre e venda produtos, insumos e equipamentos do campo</p>
          </div>
          <button onClick={() => setShowForm(true)} className="hidden md:flex items-center gap-2 btn-primary px-5 py-2.5">
            <Plus size={18} /> Anunciar Produto
          </button>
        </div>

        {/* Filters */}
        <div className="card mb-6">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-2 flex-wrap flex-1">
              {categories.map((c) => (
                <button key={c.id} onClick={() => setCategory(c.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${category === c.id ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {c.label}
                </button>
              ))}
            </div>
            <button onClick={enableGeo} disabled={geoLoading || geo.lat != null}
              className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-full border transition-colors ${geo.lat != null ? 'border-primary bg-green-50 text-primary' : 'border-gray-300 text-gray-600 hover:border-primary hover:text-primary'}`}>
              <Navigation size={14} />
              {geoLoading ? 'Localizando...' : geo.lat != null ? 'Próximos de você' : 'Perto de mim'}
            </button>
          </div>
        </div>

        {/* Products */}
        {isLoading ? (
          <div className="card text-center py-16 text-gray-400">Carregando produtos...</div>
        ) : (products?.length ?? 0) === 0 ? (
          <div className="card text-center py-16 text-gray-400">
            <Package size={40} className="mx-auto mb-3 opacity-30" />
            Nenhum produto encontrado
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map((p: any) => <ProductCard key={p.id} product={p} onContact={setContactProduct} />)}
          </div>
        )}

        {/* CTA */}
        <div className="mt-10 card bg-primary/5 border border-primary/20 text-center py-8">
          <ShoppingBag size={36} className="mx-auto text-primary mb-3" />
          <h3 className="font-bold text-gray-800 text-lg">Quer vender no Marketplace?</h3>
          <p className="text-gray-500 text-sm mt-1 mb-4">Anuncie para compradores em todo o Brasil — é grátis</p>
          <button onClick={() => setShowForm(true)} className="btn-primary px-6 py-2 flex items-center gap-2 mx-auto">
            <Plus size={16} /> Anunciar Produto
          </button>
        </div>
      </div>
    </div>
  )
}
