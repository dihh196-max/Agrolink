'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Logo } from '../../components/Logo'
import { Briefcase, MapPin, Clock, Navigation } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { useDemoAuth } from '../../hooks/useSocial'

const JOB_TYPE_LABELS: Record<string, string> = {
  seasonal: 'Safra',
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

const CULTURE_LABELS: Record<string, string> = {
  soja: '🌾 Soja', milho: '🌽 Milho', algodao: '🌿 Algodão',
  cafe: '☕ Café', boi_gordo: '🐄 Boi Gordo', trigo: '🌾 Trigo',
  arroz: '🌾 Arroz', feijao: '🫘 Feijão', cana: '🎋 Cana', eucalipto: '🌲 Eucalipto',
}

function useJobs(typeFilter: string, geo: { lat?: number; lng?: number }) {
  const ready = useDemoAuth()
  return useQuery({
    queryKey: ['jobs', typeFilter, geo.lat, geo.lng],
    queryFn: () =>
      api
        .get('/jobs', {
          params: {
            ...(typeFilter !== 'all' && { type: typeFilter }),
            ...(geo.lat != null && { lat: geo.lat, lng: geo.lng, radius: 300 }),
          },
        })
        .then((r) => r.data),
    enabled: ready,
  })
}

function Avatar({ name, url, size = 40 }: { name: string; url?: string; size?: number }) {
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
              <MapPin size={14} className="text-primary" />
              {job.city}/{job.state}
              {job.distanceKm != null && <span className="text-primary font-medium ml-1">· {job.distanceKm} km</span>}
            </span>
            {job.culture && (
              <span>{CULTURE_LABELS[job.culture]}</span>
            )}
            {job.salaryMin != null && (
              <span className="font-medium text-gray-700">
                R$ {job.salaryMin.toLocaleString('pt-BR')}
                {job.salaryMax != null && ` – ${job.salaryMax.toLocaleString('pt-BR')}`}/mês
              </span>
            )}
            {job.deadline && (
              <span className="flex items-center gap-1">
                <Clock size={14} />
                até {new Date(job.deadline).toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => onApply(job.id)}
              className="btn-primary text-sm px-4 py-2"
            >
              Candidatar-se
            </button>
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

  const { data: jobs, isLoading } = useJobs(typeFilter, geo)
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

  const handleApply = (jobId: string) => {
    api
      .post(`/jobs/${jobId}/apply`, { message: 'Tenho interesse nesta vaga.' })
      .then(() => setApplied((prev) => new Set([...prev, jobId])))
      .catch(() => {})
  }

  const types = [
    { id: 'all', label: 'Todas' },
    { id: 'seasonal', label: 'Safra' },
    { id: 'permanent', label: 'Efetivo' },
    { id: 'service', label: 'Serviço' },
    { id: 'internship', label: 'Estágio' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary text-white px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Logo size={30} />
          <span className="bg-white/20 text-xs px-2 py-1 rounded-full">Vagas</span>
        </Link>
        <div className="flex gap-4 text-sm items-center">
          <Link href="/marketplace" className="opacity-80 hover:opacity-100">Marketplace</Link>
          <Link href="/rede" className="opacity-80 hover:opacity-100">Rede</Link>
          <Link href="/dashboard" className="opacity-80 hover:opacity-100">Dashboard</Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Briefcase className="text-primary" size={32} />
            Vagas de Emprego
          </h1>
          <p className="text-gray-500 mt-1">Encontre oportunidades no agronegócio brasileiro</p>
        </div>

        {/* Filters */}
        <div className="card mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-2 flex-wrap">
              {types.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTypeFilter(t.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    typeFilter === t.id
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="ml-auto">
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
                {geoLoading ? 'Localizando...' : geo.lat != null ? 'Próximas de você' : 'Perto de mim'}
              </button>
            </div>
          </div>
        </div>

        {/* Job listings */}
        {isLoading ? (
          <div className="card text-center py-16 text-gray-400">Carregando vagas...</div>
        ) : (jobs?.length ?? 0) === 0 ? (
          <div className="card text-center py-16 text-gray-400">
            <Briefcase size={40} className="mx-auto mb-3 opacity-30" />
            Nenhuma vaga encontrada
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job: any) => (
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
            ))}
          </div>
        )}

        {/* Post a job CTA */}
        <div className="mt-8 card bg-primary/5 border border-primary/20 text-center py-8">
          <Briefcase size={36} className="mx-auto text-primary mb-3" />
          <h3 className="font-bold text-gray-800 text-lg">Quer publicar uma vaga?</h3>
          <p className="text-gray-500 text-sm mt-1 mb-4">
            Alcance milhares de profissionais do agronegócio
          </p>
          <button className="btn-primary px-6 py-2">Publicar Vaga</button>
        </div>
      </div>
    </div>
  )
}
