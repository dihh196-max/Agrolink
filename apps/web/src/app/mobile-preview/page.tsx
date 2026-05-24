/**
 * Mobile design preview — renders the React Native screens (Feed, Market, AgroIA)
 * inside phone frames so the mobile UI can be reviewed without an emulator.
 * Mirrors apps/mobile theme (colors/spacing) and screen layouts 1:1.
 */
const C = {
  primary: '#1a5c2a',
  primaryLight: '#2d8a42',
  secondary: '#f5a623',
  bg: '#f8f9fa',
  surface: '#ffffff',
  border: '#e0e8e0',
  text: '#1a1a1a',
  textSec: '#6b7280',
  textMuted: '#9ca3af',
  success: '#16a34a',
  error: '#dc2626',
}

function PhoneFrame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <span className="text-sm font-semibold text-gray-500">{title}</span>
      <div
        style={{
          width: 320,
          height: 680,
          borderRadius: 40,
          border: '10px solid #1a1a1a',
          overflow: 'hidden',
          background: C.bg,
          boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
          position: 'relative',
        }}
      >
        {/* notch */}
        <div
          style={{
            position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
            width: 120, height: 26, background: '#1a1a1a',
            borderBottomLeftRadius: 14, borderBottomRightRadius: 14, zIndex: 50,
          }}
        />
        <div style={{ height: '100%', overflowY: 'auto' }}>{children}</div>
      </div>
    </div>
  )
}

function StatusBar() {
  return (
    <div style={{ height: 30, background: C.primary }} />
  )
}

function Header({ title, right }: { title: string; right?: string }) {
  return (
    <div style={{ background: C.primary, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>{title}</span>
      {right && <span style={{ color: '#fff', fontSize: 20 }}>{right}</span>}
    </div>
  )
}

function TabBar({ active }: { active: string }) {
  const tabs = [
    { id: 'feed', icon: '🏠', label: 'Feed' },
    { id: 'market', icon: '📈', label: 'Mercado' },
    { id: 'ai', icon: '✨', label: 'AgroIA' },
    { id: 'offers', icon: '🔄', label: 'Ofertas' },
    { id: 'profile', icon: '👤', label: 'Perfil' },
  ]
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, height: 64,
      background: '#fff', borderTop: `1px solid ${C.border}`,
      display: 'flex', justifyContent: 'space-around', alignItems: 'center', paddingBottom: 6,
    }}>
      {tabs.map((t) => {
        const isActive = t.id === active
        const isAi = t.id === 'ai'
        return (
          <div key={t.id} style={{ textAlign: 'center', flex: 1 }}>
            <div style={{
              fontSize: 18,
              ...(isAi ? {
                width: 42, height: 42, borderRadius: 21, margin: '0 auto',
                background: isActive ? C.primary : '#f0f4f0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              } : {}),
              opacity: isActive || isAi ? 1 : 0.4,
            }}>{t.icon}</div>
            {!isAi && <div style={{ fontSize: 10, color: isActive ? C.primary : C.textMuted, fontWeight: 600 }}>{t.label}</div>}
          </div>
        )
      })}
    </div>
  )
}

// ─── FEED SCREEN ───────────────────────────────────────────────────────────
function FeedScreen() {
  const posts = [
    {
      name: 'Ana Rodrigues', user: 'anaagronoma', initial: 'A', loc: 'Sorriso/MT',
      content: 'Alerta fitossanitário: identificado foco de ferrugem asiática na região de Sorriso. Produtores devem monitorar as lavouras! 🚨',
      tags: ['ferrugem', 'soja', 'alerta'], likes: 287, comments: 28,
    },
    {
      name: 'João da Silva', user: 'joaosilva', initial: 'J', loc: 'Sorriso/MT',
      content: 'Soja com ótimo desenvolvimento nessa safra! Expectativa de 65 sc/ha. Clima favorável. 🌱',
      tags: ['soja', 'safra2526'], likes: 98, comments: 9,
    },
  ]
  return (
    <div style={{ paddingBottom: 70 }}>
      <StatusBar />
      <Header title="🌱 AgroLink" right="🔔" />
      <div style={{ margin: 12, padding: 12, background: '#fff', borderRadius: 16, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8, color: C.textMuted, fontSize: 13 }}>
        <span style={{ fontSize: 18 }}>➕</span> O que está acontecendo na sua lavoura?
      </div>
      {posts.map((p, i) => (
        <div key={i} style={{ margin: '0 12px 10px', padding: 12, background: '#fff', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 40, height: 40, borderRadius: 20, background: C.primaryLight, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{p.initial}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{p.name}</div>
              <div style={{ fontSize: 11, color: C.textMuted }}>@{p.user} • {p.loc}</div>
            </div>
          </div>
          <div style={{ fontSize: 14, color: C.text, lineHeight: 1.5, marginBottom: 8 }}>{p.content}</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
            {p.tags.map((t) => <span key={t} style={{ fontSize: 11, color: C.primary, fontWeight: 600 }}>#{t}</span>)}
          </div>
          <div style={{ display: 'flex', gap: 20, paddingTop: 8, borderTop: `1px solid ${C.border}`, fontSize: 13, color: C.textSec }}>
            <span>❤️ {p.likes}</span>
            <span>💬 {p.comments}</span>
            <span>↗️</span>
          </div>
        </div>
      ))}
      <TabBar active="feed" />
    </div>
  )
}

// ─── MARKET SCREEN ─────────────────────────────────────────────────────────
function MarketScreen() {
  const prices = [
    { icon: '🌿', name: 'Soja', price: '118,50', unit: '/sc', var: '+1,02%', up: true },
    { icon: '🌽', name: 'Milho', price: '62,30', unit: '/sc', var: '-0,80%', up: false },
    { icon: '🐄', name: 'Boi Gordo', price: '290,00', unit: '/@', var: '+0,73%', up: true },
    { icon: '☁️', name: 'Algodão', price: '95,00', unit: '/sc', var: '+0,32%', up: true },
    { icon: '☕', name: 'Café', price: '1.250,00', unit: '/sc', var: '-1,42%', up: false },
  ]
  return (
    <div style={{ paddingBottom: 70 }}>
      <StatusBar />
      <Header title="Mercado" right="🔔" />
      <div style={{ display: 'flex', gap: 8, padding: 12, background: '#fff', borderBottom: `1px solid ${C.border}` }}>
        <span style={{ background: C.primary, color: '#fff', fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 999 }}>Cotações</span>
        <span style={{ background: C.bg, color: C.textSec, fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 999 }}>Meus Alertas</span>
      </div>
      <div style={{ padding: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>Cotações CEPEA/ESALQ</div>
        <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 10 }}>Atualizado a cada 15 min</div>
        {prices.map((p) => (
          <div key={p.name} style={{ background: '#fff', borderRadius: 16, padding: 12, marginBottom: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 26 }}>{p.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{p.name}</div>
                <div style={{ fontSize: 11, color: C.textMuted }}>CEPEA • ESALQ</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: p.up ? '#dcfce7' : '#fee2e2', color: p.up ? C.success : C.error }}>
                {p.up ? '↗' : '↘'} {p.var}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: C.text }}>R$ {p.price}</span>
              <span style={{ fontSize: 14, color: C.textSec }}>{p.unit}</span>
            </div>
          </div>
        ))}
      </div>
      <TabBar active="market" />
    </div>
  )
}

// ─── AGROIA SCREEN ─────────────────────────────────────────────────────────
function AIScreen() {
  return (
    <div style={{ paddingBottom: 70, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <div style={{ background: C.primary, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ color: '#fff', fontSize: 20 }}>☰</span>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>AgroIA ✨</div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>Assistente Inteligente</div>
        </div>
        <span style={{ color: '#fff', fontSize: 20 }}>＋</span>
      </div>
      <div style={{ flex: 1, padding: 12 }}>
        {/* user message */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <div style={{ maxWidth: '80%', background: C.primary, color: '#fff', borderRadius: 16, padding: 12, fontSize: 14 }}>
            Como identificar ferrugem asiática na soja?
          </div>
        </div>
        {/* assistant message */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 16, background: C.primary, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>IA</div>
          <div style={{ maxWidth: '80%', background: '#fff', borderRadius: 16, padding: 12, fontSize: 14, color: C.text, lineHeight: 1.5, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            A ferrugem asiática (<i>Phakopsora pachyrhizi</i>) aparece como pústulas marrom-claras na face inferior das folhas. Sinais principais:
            <br /><br />
            • Pontos amarelados na face superior<br />
            • Pústulas que liberam pó (urédias)<br />
            • Início no terço inferior da planta
            <br /><br />
            <b>Ações Rápidas:</b>
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {['Quais fungicidas usar?', 'Momento ideal de aplicação', 'Custo por hectare'].map((a) => (
                <div key={a} style={{ background: '#f0f4f0', border: `1px solid ${C.border}`, borderRadius: 12, padding: 8, fontSize: 12, color: C.primary, fontWeight: 600 }}>{a}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, padding: 12, background: '#fff', borderTop: `1px solid ${C.border}` }}>
        <div style={{ flex: 1, border: `1.5px solid ${C.border}`, borderRadius: 16, padding: '10px 12px', fontSize: 13, color: C.textMuted, background: C.bg }}>
          Pergunte algo sobre sua lavoura...
        </div>
        <div style={{ width: 42, height: 42, borderRadius: 21, background: C.primary, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>➤</div>
      </div>
      <TabBar active="ai" />
    </div>
  )
}

// ─── SEARCH SCREEN ─────────────────────────────────────────────────────────
function SearchScreen() {
  const people = [
    { initial: 'A', name: 'Ana Rodrigues', role: 'Técnico', user: 'anaagronoma', v: true },
    { initial: 'J', name: 'João da Silva', role: 'Produtor', user: 'joaosilva', v: true },
  ]
  const companies = [{ initial: 'M', name: 'Maria Souza', role: 'Cooperativa', user: 'mariasouza', v: true }]
  return (
    <div>
      <StatusBar />
      <Header title="Pesquisar" />
      <div style={{ margin: 12, display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: `1.5px solid ${C.border}`, borderRadius: 999, padding: '10px 14px' }}>
        <span style={{ color: C.textMuted }}>🔍</span>
        <span style={{ fontSize: 14, color: C.text }}>soja</span>
      </div>
      <div style={{ display: 'flex', gap: 6, padding: '0 12px 8px', overflowX: 'auto' }}>
        {['Tudo', 'Pessoas', 'Empresas', 'Posts', 'Notícias'].map((f, i) => (
          <span key={f} style={{ fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 999, whiteSpace: 'nowrap', background: i === 0 ? C.primary : '#fff', color: i === 0 ? '#fff' : C.textSec, border: i === 0 ? 'none' : `1px solid ${C.border}` }}>{f}</span>
        ))}
      </div>
      <div style={{ padding: '0 12px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: C.textSec, textTransform: 'uppercase', margin: '8px 0' }}>Empresas</div>
        {companies.map((p) => <SearchRow key={p.user} {...p} />)}
        <div style={{ fontSize: 11, fontWeight: 600, color: C.textSec, textTransform: 'uppercase', margin: '12px 0 8px' }}>Pessoas</div>
        {people.map((p) => <SearchRow key={p.user} {...p} />)}
        <div style={{ fontSize: 11, fontWeight: 600, color: C.textSec, textTransform: 'uppercase', margin: '12px 0 8px' }}>Notícias</div>
        <div style={{ background: '#fff', borderRadius: 12, padding: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>USDA eleva projeção de soja do Brasil para 169 mi t</div>
          <div style={{ fontSize: 11, color: C.primary, marginTop: 4 }}>Notícia Agrícola</div>
        </div>
      </div>
    </div>
  )
}
function SearchRow({ initial, name, role, user, v }: any) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', padding: 10, borderRadius: 12, marginBottom: 6, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ width: 40, height: 40, borderRadius: 20, background: C.primaryLight, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{initial}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{name} {v && <span style={{ color: C.primary }}>✓</span>}</div>
        <div style={{ fontSize: 11, color: C.textMuted }}>@{user} · {role}</div>
      </div>
      <span style={{ color: C.textMuted }}>›</span>
    </div>
  )
}

// ─── MESSAGES SCREEN ───────────────────────────────────────────────────────
function MessagesScreen() {
  const threads = [
    { initial: 'M', name: 'Maria Souza', last: 'Oi João! Compramos sim. O preço hoje está R$ 120,00/sc...', time: '2min', unread: 1 },
    { initial: 'P', name: 'Pedro Alves', last: 'Tenho defensivos com 10% de desconto para...', time: '1h', unread: 0 },
  ]
  return (
    <div>
      <StatusBar />
      <Header title="Mensagens" right="✎" />
      <div style={{ padding: 12 }}>
        {threads.map((t) => (
          <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', padding: 12, borderRadius: 12, marginBottom: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ width: 50, height: 50, borderRadius: 25, background: C.primaryLight, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18 }}>{t.initial}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{t.name}</span>
                <span style={{ fontSize: 11, color: C.textMuted }}>{t.time}</span>
              </div>
              <div style={{ fontSize: 12, color: t.unread ? C.text : C.textSec, fontWeight: t.unread ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.last}</div>
            </div>
            {t.unread > 0 && <div style={{ background: C.primary, minWidth: 20, height: 20, borderRadius: 10, color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{t.unread}</div>}
          </div>
        ))}
        {/* chat preview */}
        <div style={{ marginTop: 8, background: '#fff', borderRadius: 12, padding: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 8 }}>Conversa com Maria Souza</div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
            <div style={{ maxWidth: '80%', background: C.primary, color: '#fff', borderRadius: 14, padding: '8px 12px', fontSize: 13 }}>Tenho 500t de soja. Qual o preço?</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ maxWidth: '80%', background: '#f0f4f0', color: C.text, borderRadius: 14, padding: '8px 12px', fontSize: 13 }}>R$ 120,00/sc, entrega até 31/07 👍</div>
          </div>
        </div>
      </div>
      <TabBar active="" />
    </div>
  )
}

// ─── NOTIFICATIONS SCREEN ──────────────────────────────────────────────────
function NotificationsScreen() {
  const notifs = [
    { icon: '✉️', title: 'Mensagem de Maria Souza', body: 'Oi João! Compramos sim. O preço hoje...', unread: true },
    { icon: '🤝', title: 'Nova parceria', body: 'Maria Souza agora acompanha você', unread: true },
    { icon: '❤️', title: 'Ana curtiu seu post', body: 'Soja com ótimo desenvolvimento...', unread: false },
    { icon: '📈', title: 'Alerta de preço: Soja', body: 'Soja atingiu R$ 118,50/sc (+1,02%)', unread: false },
    { icon: '📰', title: 'Boletim do dia', body: 'USDA eleva projeção de soja do Brasil', unread: false },
  ]
  return (
    <div>
      <StatusBar />
      <div style={{ background: C.primary, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#fff', fontSize: 20 }}>‹</span>
        <span style={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>Notificações</span>
        <span style={{ color: '#fff', fontSize: 12 }}>Ler tudo</span>
      </div>
      <div style={{ padding: 12 }}>
        {notifs.map((n, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: n.unread ? '#f0f7f1' : '#fff', padding: 12, borderRadius: 12, marginBottom: 6, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <span style={{ fontSize: 24 }}>{n.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{n.title}</div>
              <div style={{ fontSize: 12, color: C.textSec }}>{n.body}</div>
            </div>
            {n.unread && <div style={{ width: 10, height: 10, borderRadius: 5, background: C.primary }} />}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function MobilePreview() {
  return (
    <div style={{ minHeight: '100vh', background: '#e8ede8', padding: '40px 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: C.primary }}>🌱 AgroLink — App Mobile</h1>
        <p style={{ color: C.textSec, marginTop: 8 }}>React Native (Expo) · iOS + Android · Preview das telas</p>
      </div>
      <div style={{ display: 'flex', gap: 32, justifyContent: 'center', flexWrap: 'wrap' }}>
        <PhoneFrame title="Feed Social"><FeedScreen /></PhoneFrame>
        <PhoneFrame title="Mercado / Cotações"><MarketScreen /></PhoneFrame>
        <PhoneFrame title="AgroIA (chat)"><AIScreen /></PhoneFrame>
      </div>
      <div style={{ textAlign: 'center', margin: '40px 0 24px' }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: C.primary }}>Novidades: Busca · Mensagens · Notificações</h2>
      </div>
      <div style={{ display: 'flex', gap: 32, justifyContent: 'center', flexWrap: 'wrap' }}>
        <PhoneFrame title="Busca (pessoas, empresas, notícias)"><SearchScreen /></PhoneFrame>
        <PhoneFrame title="Mensagens (chat direto)"><MessagesScreen /></PhoneFrame>
        <PhoneFrame title="Notificações"><NotificationsScreen /></PhoneFrame>
      </div>
    </div>
  )
}
