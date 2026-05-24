'use client'
import { useState } from 'react'
import Link from 'next/link'
import {
  Search,
  Bell,
  MessageCircle,
  UserPlus,
  UserCheck,
  Send,
  CheckCheck,
  Newspaper,
  Building2,
  User,
  Package,
} from 'lucide-react'
import {
  useDemoAuth,
  useSearch,
  useNotifications,
  useMarkAllRead,
  useThreads,
  useThreadMessages,
  useSendMessage,
  useStartConversation,
  useTogglePartnership,
} from '../../hooks/useSocial'

const ROLE_LABELS: Record<string, string> = {
  producer: 'Produtor',
  technician: 'Técnico',
  supplier: 'Fornecedor',
  cooperative: 'Cooperativa',
}

const NOTIF_ICONS: Record<string, string> = {
  price_alert: '📈', new_follower: '🤝', post_reaction: '❤️', post_comment: '💬',
  new_offer: '📦', message: '✉️', weather_alert: '🌦️', news: '📰',
}

function Avatar({ name, url, size = 44 }: { name: string; url?: string; size?: number }) {
  if (url) return <img src={url} alt={name} className="rounded-full object-cover" style={{ width: size, height: size }} />
  return (
    <div
      className="rounded-full bg-primary-light text-white flex items-center justify-center font-bold flex-shrink-0"
      style={{ width: size, height: size, fontSize: size / 2.5 }}
    >
      {name[0]?.toUpperCase()}
    </div>
  )
}

const TABS = [
  { id: 'all', label: 'Tudo' },
  { id: 'people', label: 'Pessoas' },
  { id: 'companies', label: 'Empresas' },
  { id: 'news', label: 'Notícias' },
  { id: 'posts', label: 'Posts' },
  { id: 'offers', label: 'Ofertas' },
]

export default function RedePage() {
  const ready = useDemoAuth()
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState('all')
  const [activeThread, setActiveThread] = useState<string | null>(null)
  const [msgInput, setMsgInput] = useState('')

  const { data: search, isLoading: searching } = useSearch(query, tab, ready)
  const { data: notifications } = useNotifications()
  const markAll = useMarkAllRead()
  const { data: threads } = useThreads()
  const { data: messages } = useThreadMessages(activeThread)
  const sendMsg = useSendMessage(activeThread)
  const startConv = useStartConversation()
  const togglePartner = useTogglePartnership()

  const unread = notifications?.filter((n: any) => !n.read).length ?? 0
  const show = (k: string) => tab === 'all' || tab === k

  const handleSend = () => {
    const c = msgInput.trim()
    if (!c) return
    setMsgInput('')
    sendMsg.mutate(c)
  }

  const openChatWith = async (userId: string) => {
    const thread = await startConv.mutateAsync(userId)
    setActiveThread(thread.id)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-primary text-white px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-2xl">🌱</span>
          <span className="text-xl font-bold">AgroLink</span>
          <span className="bg-white/20 text-xs px-2 py-1 rounded-full ml-2">Rede</span>
        </Link>
        <div className="flex gap-4 text-sm items-center">
          <Link href="/dashboard" className="opacity-80 hover:opacity-100">Dashboard</Link>
          <div className="relative">
            <Bell size={20} />
            {unread > 0 && (
              <span className="absolute -top-2 -right-2 bg-secondary text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Coluna principal: BUSCA ── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card">
            <div className="flex items-center gap-3 border-2 border-gray-200 rounded-full px-4 py-2 focus-within:border-primary transition-colors">
              <Search size={20} className="text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar pessoas, empresas, notícias, posts e ofertas..."
                className="flex-1 outline-none text-gray-800"
              />
            </div>
            <div className="flex gap-2 mt-3 flex-wrap">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    tab === t.id ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Resultados */}
          {query.trim().length < 2 ? (
            <div className="card text-center py-16 text-gray-400">
              <Search size={40} className="mx-auto mb-3 opacity-40" />
              Digite ao menos 2 letras para buscar na rede
            </div>
          ) : searching ? (
            <div className="card text-center py-16 text-gray-400">Buscando...</div>
          ) : (
            <div className="space-y-4">
              {/* Pessoas */}
              {show('people') && search?.people?.length > 0 && (
                <div className="card">
                  <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2"><User size={16} /> Pessoas</h3>
                  <div className="space-y-2">
                    {search.people.map((p: any) => (
                      <div key={p.id} className="flex items-center gap-3 py-2">
                        <Avatar name={p.name} url={p.avatarUrl} />
                        <div className="flex-1">
                          <div className="font-semibold text-gray-800 flex items-center gap-1">
                            {p.name} {p.verified && <span className="text-primary">✓</span>}
                          </div>
                          <div className="text-sm text-gray-400">@{p.username} · {ROLE_LABELS[p.role]}</div>
                        </div>
                        <button
                          onClick={() => togglePartner.mutate({ userId: p.id, isPartner: false })}
                          className="flex items-center gap-1 text-sm bg-primary text-white px-3 py-1.5 rounded-full hover:bg-primary-light"
                        >
                          <UserPlus size={14} /> Parceria
                        </button>
                        <button
                          onClick={() => openChatWith(p.id)}
                          className="flex items-center gap-1 text-sm border border-primary text-primary px-3 py-1.5 rounded-full hover:bg-green-50"
                        >
                          <MessageCircle size={14} /> Mensagem
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empresas */}
              {show('companies') && search?.companies?.length > 0 && (
                <div className="card">
                  <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2"><Building2 size={16} /> Empresas</h3>
                  <div className="space-y-2">
                    {search.companies.map((c: any) => (
                      <div key={c.id} className="flex items-center gap-3 py-2">
                        <Avatar name={c.name} url={c.avatarUrl} />
                        <div className="flex-1">
                          <div className="font-semibold text-gray-800">{c.name}</div>
                          <div className="text-sm text-gray-400">@{c.username} · {ROLE_LABELS[c.role]}</div>
                        </div>
                        <button
                          onClick={() => togglePartner.mutate({ userId: c.id, isPartner: false })}
                          className="flex items-center gap-1 text-sm bg-primary text-white px-3 py-1.5 rounded-full hover:bg-primary-light"
                        >
                          <UserPlus size={14} /> Parceria
                        </button>
                        <button
                          onClick={() => openChatWith(c.id)}
                          className="flex items-center gap-1 text-sm border border-primary text-primary px-3 py-1.5 rounded-full hover:bg-green-50"
                        >
                          <MessageCircle size={14} /> Mensagem
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notícias */}
              {show('news') && search?.news?.length > 0 && (
                <div className="card">
                  <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2"><Newspaper size={16} /> Notícias</h3>
                  <div className="space-y-3">
                    {search.news.map((n: any) => (
                      <div key={n.id} className="border-b border-gray-100 pb-3 last:border-0">
                        <div className="font-semibold text-gray-800">{n.title}</div>
                        <div className="text-sm text-gray-500 mt-1">{n.summary}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-primary font-medium">{n.sourceName}</span>
                          {n.priceImpact && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              n.priceImpact === 'positive' ? 'bg-green-100 text-green-700' :
                              n.priceImpact === 'negative' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                            }`}>
                              impacto {n.priceImpact === 'positive' ? 'alta' : n.priceImpact === 'negative' ? 'baixa' : 'neutro'}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Posts */}
              {show('posts') && search?.posts?.length > 0 && (
                <div className="card">
                  <h3 className="font-bold text-gray-700 mb-3">Publicações</h3>
                  <div className="space-y-3">
                    {search.posts.map((p: any) => (
                      <div key={p.id} className="border-b border-gray-100 pb-3 last:border-0">
                        <div className="text-sm text-gray-400">@{p.author?.username}</div>
                        <div className="text-gray-800">{p.content}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ofertas */}
              {show('offers') && search?.offers?.length > 0 && (
                <div className="card">
                  <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2"><Package size={16} /> Ofertas</h3>
                  <div className="space-y-2">
                    {search.offers.map((o: any) => (
                      <div key={o.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                        <div>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full mr-2 ${o.type === 'sell' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                            {o.type === 'sell' ? '📤 Venda' : '📥 Compra'}
                          </span>
                          <span className="font-semibold text-gray-800">{o.culture} · {o.volumeTons}t</span>
                          <div className="text-sm text-gray-400">{o.city}/{o.state}</div>
                        </div>
                        <div className="font-bold text-primary">R$ {o.pricePerUnit.toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Sidebar: NOTIFICAÇÕES + MENSAGENS ── */}
        <div className="space-y-6">
          {/* Notificações */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-700 flex items-center gap-2"><Bell size={16} /> Notificações</h3>
              <button onClick={() => markAll.mutate()} className="text-xs text-primary flex items-center gap-1 hover:underline">
                <CheckCheck size={14} /> Ler tudo
              </button>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {(notifications?.length ?? 0) === 0 ? (
                <div className="text-sm text-gray-400 text-center py-6">Nenhuma notificação</div>
              ) : (
                notifications.map((n: any) => (
                  <div key={n.id} className={`flex gap-2 p-2 rounded-lg ${!n.read ? 'bg-green-50' : ''}`}>
                    <span className="text-xl">{NOTIF_ICONS[n.type] ?? '🔔'}</span>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-800">{n.title}</div>
                      <div className="text-xs text-gray-500">{n.body}</div>
                    </div>
                    {!n.read && <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Mensagens */}
          <div className="card">
            <h3 className="font-bold text-gray-700 flex items-center gap-2 mb-3"><MessageCircle size={16} /> Mensagens</h3>
            {activeThread ? (
              <div className="flex flex-col h-80">
                <button onClick={() => setActiveThread(null)} className="text-xs text-primary mb-2 self-start hover:underline">← Voltar às conversas</button>
                <div className="flex-1 overflow-y-auto space-y-2 mb-2">
                  {(messages ?? []).map((m: any) => {
                    const mine = threads?.find((t: any) => t.id === activeThread)?.otherUser?.id !== m.senderId
                    return (
                      <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${mine ? 'bg-primary text-white' : 'bg-gray-100 text-gray-800'}`}>
                          {m.content}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="flex gap-2">
                  <input
                    value={msgInput}
                    onChange={(e) => setMsgInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Mensagem..."
                    className="flex-1 border border-gray-200 rounded-full px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                  <button onClick={handleSend} className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-light">
                    <Send size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {(threads?.length ?? 0) === 0 ? (
                  <div className="text-sm text-gray-400 text-center py-6">
                    Nenhuma conversa.<br />Busque um parceiro e clique em "Mensagem".
                  </div>
                ) : (
                  threads.map((t: any) => (
                    <button
                      key={t.id}
                      onClick={() => setActiveThread(t.id)}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 text-left"
                    >
                      <Avatar name={t.otherUser.name} url={t.otherUser.avatarUrl} size={38} />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-800 text-sm">{t.otherUser.name}</div>
                        <div className="text-xs text-gray-400 truncate">{t.lastMessage ?? 'Iniciar conversa'}</div>
                      </div>
                      {t.unreadCount > 0 && (
                        <span className="bg-primary text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                          {t.unreadCount}
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
