'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Logo } from '../../components/Logo'
import { Briefcase, MapPin, Clock, Navigation, X, Plus } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { useDemoAuth } from '../../hooks/useSocial'

const JOB_TYPE_LABELS: Record<string, string> = {
  seasonal: 'Safra / Temporário',
  permanent: 'Efetivo',
  internship: 'Estágio',
  service: 'Prestação de Serviço',
}

const JOB_TYPE_COLORS: Record<string, string> = {
  seasonal: 'bg-amber-100 text-amber-700',
  permanent: 'bg-green-100 text-green-700',
  internship: 'bg-blue-100 text-blue-700',
  service: 'bg-purple-100 text-purple-700',
}

const CULTURES = [
  { value: '', label: '— Nenhuma —' },
  { value: 'soja', label: '🌾 Soja' },
  { value: 'milho', label: '🌽 Milho' },
  { value: 'algodao', label: '🌿 Algodão' },
  { value: 'cafe', label: '☕ Café' },
  { value: 'boi_gordo', label: '🐄 Boi Gordo' },
  { value: 'trigo', label: '🌾 Trigo' },
  { value: 'arroz', label: '🌾 Arroz' },
  { value: 'feijao', label: '🫘 Feijão' },
  { value: 'cana', label: '🎋 Cana' },
  { value: 'eucalipto', label: '🌲 Eucalipto' },
]

const STATES = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO']

function useJobs(typeFilter: string, geo: { lat?: number; lng?: number }) {
  const ready = useDemoAuth()
  return useQuery({
    queryKey: ['jobs', typeFilter, geo.lat, geo.lng],
    queryFn: () =>
      api.get('/jobs', { params: { ...(typeFilter !== 'all' && { type: typeFilter }), ...(geo.lat != null && { lat: geo.lat, lng: geo.lng, radius: 300 }) } })
         .then((r) => r.data),
    enabled: ready,
  })
}

function usePostJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/jobs', body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  })
}

function Avatar({ name, url, size = 40 }: { name: string; url?: string; size?: number }) {
  if (url) return <img src={url} alt={name} className="rounded-full object-cover flex-shrink-0" style={{ width: size, height: size }} />
  return (
    <div className="rounded-full bg-primary text-white flex items-center justify-center font-bold flex-shrink-0"
      style={{ width: size, height: size, fontSize: size / 2.5 }}>
      {name[0]?.toUpperCase()}
    </div>
  )
}

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

const INPUT = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary transition-colors bg-white"
const SELECT = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary transition-colors bg-white"

function PostJobModal({ onClose }: { onClose: () => void }) {
  const postJob = usePostJob()
  const [form, setForm] = useState({
    title: '', description: '', type: 'seasonal', culture: '',
    salaryMin: '', salaryMax: '', city: '', state: 'MT', deadline: '',
  })
  const [success, setSuccess] = useState(false)

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const body: Record<string, unknown> = {
      title: form.title, description: form.description, type: form.type,
      city: form.city, state: form.state,
      ...(form.culture && { culture: form.culture }),
      ...(form.salaryMin && { salaryMin: Number(form.salaryMin) }),
      ...(form.salaryMax && { salaryMax: Number(form.salaryMax) }),
      ...(form.deadline && { deadline: new Date(form.deadline).toISOString() }),
    }
    postJob.mutate(body, {
      onSuccess: () => setSuccess(true),
      onError: (err: any) => alert(err?.response?.data?.message ?? 'Erro ao publicar vaga'),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Briefcase size={20} className="text-primary" /> Publicar Vaga
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Vaga publicada!</h3>
            <p className="text-gray-500 mb-6">Sua vaga já está visível para candidatos em todo o Brasil.</p>
            <button onClick={onClose} className="btn-primary px-8 py-2">Fechar</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <Field label="Título da vaga" required>
              <input className={INPUT} value={form.title} onChange={(e) => set('title', e.target.value)}
                placeholder="Ex: Operador de Colheitadeira" required minLength={5} />
            </Field>

            <Field label="Descrição completa" required>
              <textarea className={INPUT} rows={4} value={form.description} onChange={(e) => set('description', e.target.value)}
                placeholder="Descreva as responsabilidades, requisitos, benefícios..." required minLength={20} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Tipo de contrato" required>
                <select className={SELECT} value={form.type} onChange={(e) => set('type', e.target.value)}>
                  <option value="seasonal">Safra / Temporário</option>
                  <option value="permanent">Efetivo</option>
                  <option value="service">Prestação de Serviço</option>
                  <option value="internship">Estágio</option>
                </select>
              </Field>
              <Field label="Cultura relacionada">
                <select className={SELECT} value={form.culture} onChange={(e) => set('culture', e.target.value)}>
                  {CULTURES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Salário mínimo (R$)">
                <input className={INPUT} type="number" min="0" value={form.salaryMin} onChange={(e) => set('salaryMin', e.target.value)} placeholder="1800" />
              </Field>
              <Field label="Salário máximo (R$)">
                <input className={INPUT} type="number" min="0" value={form.salaryMax} onChange={(e) => set('salaryMax', e.target.value)} placeholder="3500" />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Cidade" required>
                <input className={INPUT} value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="Sorriso" required />
              </Field>
              <Field label="Estado" required>
                <select className={SELECT} value={form.state} onChange={(e) => set('state', e.target.value)}>
                  {STATES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </Field>
            </div>

            <Field label="Prazo para candidatura">
              <input className={INPUT} type="date" value={form.deadline} onChange={(e) => set('deadline', e.target.value)}
                min={new Date().toISOString().split('T')[0]} />
            </Field>

            <div className="pt-2 flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={postJob.isPending} className="flex-1 btn-primary py-3 font-semibold">
                {postJob.isPending ? 'Publicando...' : 'Publicar Vaga'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function JobCard({ job, onApply }: { job: any; onApply: (id: string) => void }) {
  return (
    <div className="card hover:border-primary/40 border border-transparent transition-colors">
      <div className="flex items-start gap-3">
        <Avatar name={job.poster?.name ?? '?'} url={job.poster?.avatarUrl} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-bold text-gray-800 text-lg leading-tight">{job.title}</h3>
              <div className="text-sm text-gray-500 mt-0.5">{job.poster?.name}</div>
            </div>
            <span className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0 ${JOB_TYPE_COLORS[job.type]}`}>
              {JOB_TYPE_LABELS[job.type]}
            </span>
          </div>
          <p className="text-gray-600 mt-2 text-sm line-clamp-3">{job.description}</p>
          <div className="flex flex-wrap gap-3 mt-3 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <MapPin size={14} className="text-primary" />{job.city}/{job.state}
              {job.distanceKm != null && <span className="text-primary font-medium ml-1">· {job.distanceKm} km</span>}
            </span>
            {job.salaryMin != null && (
              <span className="font-medium text-gray-700">
                R$ {job.salaryMin.toLocaleString('pt-BR')}{job.salaryMax != null && `–${job.salaryMax.toLocaleString('pt-BR')}`}/mês
              </span>
            )}
            {job.deadline && (
              <span className="flex items-center gap-1"><Clock size={14} />até {new Date(job.deadline).toLocaleDateString('pt-BR')}</span>
            )}
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => onApply(job.id)} className="btn-primary text-sm px-4 py-2">Candidatar-se</button>
            <button className="text-sm border border-gray-200 text-gray-600 px-4 py-2 rounded-lg hover:border-primary hover:text-primary transition-colors">
              Ver detalhes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function VagasPage() {
  const [typeFilter, setTypeFilter] = useState('all')
  const [geo, setGeo] = useState<{ lat?: number; lng?: number }>({})
  const [geoLoading, setGeoLoading] = useState(false)
  const [applied, setApplied] = useState<Set<string>>(new Set())
  const [showForm, setShowForm] = useState(false)

  const { data: jobs, isLoading } = useJobs(typeFilter, geo)
  useDemoAuth()

  const enableGeo = () => {
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => { setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGeoLoading(false) },
      () => setGeoLoading(false)
    )
  }

  const handleApply = (jobId: string) => {
    api.post(`/jobs/${jobId}/apply`, { message: 'Tenho interesse nesta vaga.' })
      .then(() => setApplied((prev) => new Set(Array.from(prev).concat(jobId))))
      .catch(() => {})
  }

  const types = [
    { id: 'all', label: 'Todas' }, { id: 'seasonal', label: 'Safra' },
    { id: 'permanent', label: 'Efetivo' }, { id: 'service', label: 'Serviço' },
    { id: 'internship', label: 'Estágio' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {showForm && <PostJobModal onClose={() => setShowForm(false)} />}

      <header className="bg-primary text-white px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Logo size={30} />
          <span className="bg-white/20 text-xs px-2 py-1 rounded-full">Vagas</span>
        </Link>
        <div className="flex gap-4 text-sm items-center">
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 bg-secondary text-white px-4 py-1.5 rounded-full font-semibold text-xs hover:bg-secondary/90 transition-colors">
            <Plus size={14} /> Publicar Vaga
          </button>
          <Link href="/marketplace" className="opacity-80 hover:opacity-100">Marketplace</Link>
          <Link href="/rede" className="opacity-80 hover:opacity-100">Rede</Link>
          <Link href="/dashboard" className="opacity-80 hover:opacity-100">Dashboard</Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <Briefcase className="text-primary" size={32} /> Vagas de Emprego
            </h1>
            <p className="text-gray-500 mt-1">Encontre oportunidades no agronegócio brasileiro</p>
          </div>
          <button onClick={() => setShowForm(true)} className="hidden md:flex items-center gap-2 btn-primary px-5 py-2.5">
            <Plus size={18} /> Publicar Vaga
          </button>
        </div>

        {/* Filters */}
        <div className="card mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-2 flex-wrap">
              {types.map((t) => (
                <button key={t.id} onClick={() => setTypeFilter(t.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${typeFilter === t.id ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {t.label}
                </button>
              ))}
            </div>
            <div className="ml-auto">
              <button onClick={enableGeo} disabled={geoLoading || geo.lat != null}
                className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-full border transition-colors ${geo.lat != null ? 'border-primary bg-green-50 text-primary' : 'border-gray-300 text-gray-600 hover:border-primary hover:text-primary'}`}>
                <Navigation size={14} />
                {geoLoading ? 'Localizando...' : geo.lat != null ? 'Próximas de você' : 'Perto de mim'}
              </button>
            </div>
          </div>
        </div>

        {/* Listings */}
        {isLoading ? (
          <div className="card text-center py-16 text-gray-400">Carregando vagas...</div>
        ) : (jobs?.length ?? 0) === 0 ? (
          <div className="card text-center py-16 text-gray-400">
            <Briefcase size={40} className="mx-auto mb-3 opacity-30" />
            Nenhuma vaga encontrada
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job: any) =>
              applied.has(job.id) ? (
                <div key={job.id} className="card border border-green-200 bg-green-50">
                  <div className="flex items-center gap-3 text-green-700">
                    <span className="text-xl">✅</span>
                    <div>
                      <div className="font-semibold">{job.title}</div>
                      <div className="text-sm">Candidatura enviada com sucesso!</div>
                    </div>
                  </div>
                </div>
              ) : (
                <JobCard key={job.id} job={job} onApply={handleApply} />
              )
            )}
          </div>
        )}

        {/* CTA */}
        <div className="mt-8 card bg-primary/5 border border-primary/20 text-center py-8">
          <Briefcase size={36} className="mx-auto text-primary mb-3" />
          <h3 className="font-bold text-gray-800 text-lg">Quer publicar uma vaga?</h3>
          <p className="text-gray-500 text-sm mt-1 mb-4">Alcance milhares de profissionais do agronegócio</p>
          <button onClick={() => setShowForm(true)} className="btn-primary px-6 py-2">
            <span className="flex items-center gap-2"><Plus size={16} /> Publicar Vaga</span>
          </button>
        </div>
      </div>
    </div>
  )
}
