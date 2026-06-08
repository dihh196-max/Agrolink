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
    { id: 'vagas', icon: '💼', label: 'Vagas' },
    { id: 'ai', icon: '✨', label: 'AgroIA' },
    { id: 'marketplace', icon: '🛒', label: 'Loja' },
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

// ─── FEED SCREEN (com Stories + Vídeos Curtos) ────────────────────────────
function FeedScreen() {
  const stories = [
    { initial: '+', name: 'Seu story', mine: true },
    { initial: 'A', name: 'Ana', dot: '#16a34a' },
    { initial: 'J', name: 'João', dot: '#f5a623' },
    { initial: 'P', name: 'Pedro', dot: '#16a34a' },
    { initial: 'M', name: 'Maria', dot: null },
  ]
  return (
    <div style={{ paddingBottom: 70, background: C.bg }}>
      <StatusBar />
      {/* Header */}
      <div style={{ background: C.primary, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#fff', fontSize: 18, fontWeight: 800 }}>🌱 AgroLink</span>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <span style={{ color: '#fff', fontSize: 18 }}>🔍</span>
          <span style={{ color: '#fff', fontSize: 18 }}>💬</span>
          <div style={{ position: 'relative' }}>
            <span style={{ color: '#fff', fontSize: 18 }}>🔔</span>
            <div style={{ position: 'absolute', top: -4, right: -4, width: 14, height: 14, borderRadius: 7, background: C.secondary, border: '2px solid ' + C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 8, color: '#fff', fontWeight: 800 }}>3</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stories row */}
      <div style={{ background: '#fff', borderBottom: `1px solid ${C.border}`, padding: '10px 0 10px 12px', display: 'flex', gap: 12, overflowX: 'auto' }}>
        {stories.map((s, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                width: 52, height: 52, borderRadius: 26,
                background: s.mine ? C.bg : C.primaryLight,
                border: s.mine ? `2px dashed ${C.primary}` : s.dot ? `2.5px solid ${s.dot}` : `2px solid ${C.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: s.mine ? C.primary : '#fff', fontSize: s.mine ? 22 : 18, fontWeight: 700,
              }}>{s.initial}</div>
              {s.dot && (
                <div style={{ position: 'absolute', bottom: 1, right: 1, width: 12, height: 12, borderRadius: 6, background: s.dot, border: '2px solid #fff' }} />
              )}
            </div>
            <span style={{ fontSize: 10, color: s.mine ? C.primary : C.text, fontWeight: s.mine ? 700 : 400 }}>{s.name}</span>
          </div>
        ))}
      </div>

      {/* New post bar */}
      <div style={{ margin: '8px 12px', padding: '10px 12px', background: '#fff', borderRadius: 14, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 32, height: 32, borderRadius: 16, background: C.primaryLight, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>V</div>
        <span style={{ flex: 1, fontSize: 13, color: C.textMuted }}>O que está acontecendo na lavoura?</span>
        <span style={{ fontSize: 18 }}>🎬</span>
      </div>

      {/* Post 1 — texto + imagem */}
      <div style={{ margin: '0 12px 10px', background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px 6px' }}>
          <div style={{ width: 38, height: 38, borderRadius: 19, background: C.primaryLight, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>A</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Ana Rodrigues <span style={{ color: C.primary }}>✓</span></div>
            <div style={{ fontSize: 11, color: C.textMuted }}>@anaagronoma · Sorriso/MT</div>
          </div>
          <span style={{ fontSize: 16, color: C.textMuted }}>⋯</span>
        </div>
        <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5, padding: '0 12px 8px' }}>
          🚨 Alerta: foco de ferrugem asiática identificado em Sorriso. Monitorem as lavouras!
        </div>
        {/* image placeholder */}
        <div style={{ height: 140, background: 'linear-gradient(135deg,#2d8a42 0%,#8bc34a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>🌿</div>
        <div style={{ display: 'flex', gap: 6, padding: '6px 12px 4px', flexWrap: 'wrap' }}>
          {['ferrugem','soja','alerta'].map((t) => <span key={t} style={{ fontSize: 11, color: C.primary, fontWeight: 600 }}>#{t}</span>)}
        </div>
        <div style={{ display: 'flex', gap: 0, padding: '6px 4px', borderTop: `1px solid ${C.border}` }}>
          {[['❤️','287'],['💬','28'],['↗️','']].map(([ic,ct],i) => (
            <div key={i} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 12, color: C.textSec, padding: '4px 0' }}>
              <span>{ic}</span>{ct && <span>{ct}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Post 2 — VÍDEO CURTO (AgroCurto) */}
      <div style={{ margin: '0 12px 10px', background: '#0f1a0f', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', position: 'relative' }}>
        {/* video thumbnail */}
        <div style={{ height: 200, background: 'linear-gradient(160deg,#0f3d1c 0%,#2d8a42 60%,#8bc34a 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <div style={{ fontSize: 44 }}>🌾</div>
          {/* play button */}
          <div style={{ position: 'absolute', width: 48, height: 48, borderRadius: 24, background: 'rgba(255,255,255,0.25)', border: '2px solid rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 20, marginLeft: 4 }}>▶</span>
          </div>
          {/* AgroCurto badge */}
          <div style={{ position: 'absolute', top: 10, left: 10, background: C.secondary, color: '#fff', fontSize: 9, fontWeight: 800, padding: '3px 7px', borderRadius: 999 }}>🎬 AGROCURTO</div>
          {/* duration */}
          <div style={{ position: 'absolute', bottom: 10, right: 10, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>0:52</div>
          {/* progress bar */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.2)' }}>
            <div style={{ width: '35%', height: '100%', background: C.secondary }} />
          </div>
        </div>
        {/* overlay info */}
        <div style={{ padding: '8px 12px 10px', background: '#0f1a0f' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ width: 32, height: 32, borderRadius: 16, background: '#f5a623', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>J</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>João da Silva</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>Plantio direto safra 25/26 · Sorriso/MT</div>
            </div>
            <div style={{ background: C.primary, color: '#fff', fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 999 }}>+ Seguir</div>
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', lineHeight: 1.4 }}>
            Regulagem da semeadora para soja — 5 ajustes que aumentaram 8 sc/ha na minha lavoura 🌱
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
            {[['❤️','1,2k'],['💬','94'],['↗️','341']].map(([ic,ct],i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
                <span>{ic}</span><span>{ct}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Post 3 — FOTO com legenda */}
      <div style={{ margin: '0 12px 10px', background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px 6px' }}>
          <div style={{ width: 38, height: 38, borderRadius: 19, background: '#b45309', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>M</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Maria Souza</div>
            <div style={{ fontSize: 11, color: C.textMuted }}>@mariasouza · Lucas do Rio Verde/MT</div>
          </div>
          <span style={{ fontSize: 16, color: C.textMuted }}>⋯</span>
        </div>
        <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5, padding: '0 12px 8px' }}>
          Colheita iniciada! Primeira talhão com média de 68 sc/ha. Orgulho da equipe 🚜🌾
        </div>
        {/* photo grid 1 grande + 2 pequenas */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gridTemplateRows: '80px 80px', gap: 2 }}>
          <div style={{ gridRow: '1 / span 2', background: 'linear-gradient(135deg,#8bc34a,#558b2f)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>🚜</div>
          <div style={{ background: 'linear-gradient(135deg,#f5a623,#e65100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🌾</div>
          <div style={{ background: 'linear-gradient(135deg,#2d8a42,#1a5c2a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, position: 'relative' }}>
            <span>☀️</span>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 0 }}>
              <span style={{ color: '#fff', fontSize: 13, fontWeight: 800 }}>+4</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, padding: '6px 12px 4px', flexWrap: 'wrap' }}>
          {['colheita','soja','safra2526'].map((t) => <span key={t} style={{ fontSize: 11, color: C.primary, fontWeight: 600 }}>#{t}</span>)}
        </div>
        <div style={{ display: 'flex', gap: 0, padding: '6px 4px', borderTop: `1px solid ${C.border}` }}>
          {[['❤️','521'],['💬','63'],['↗️','']].map(([ic,ct],i) => (
            <div key={i} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 12, color: C.textSec, padding: '4px 0' }}>
              <span>{ic}</span>{ct && <span>{ct}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Post 4 — patrocinado texto simples */}
      <div style={{ margin: '0 12px 10px', padding: 12, background: '#fff', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ width: 38, height: 38, borderRadius: 19, background: '#f5a623', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>P</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Pedro Alves</div>
            <div style={{ fontSize: 11, color: C.textMuted }}>@pedroagro · Cuiabá/MT</div>
          </div>
          <div style={{ background: '#e6f4ea', color: C.primary, fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 6 }}>📌 Patrocinado</div>
        </div>
        <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5, marginBottom: 8 }}>Defensivos com 10% de desconto esta semana. Sementes certificadas para safra 25/26. 🌱</div>
        <div style={{ display: 'flex', gap: 20, paddingTop: 8, borderTop: `1px solid ${C.border}`, fontSize: 12, color: C.textSec }}>
          <span>❤️ 42</span><span>💬 7</span><span>↗️</span>
        </div>
      </div>

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

// ─── VAGAS SCREEN ──────────────────────────────────────────────────────────────
function VagasScreen() {
  const jobs = [
    { title: 'Operador de Máquinas Agrícolas', poster: 'Fazenda São João', type: 'Safra', typeColor: '#d97706', city: 'Sorriso/MT', salary: 'R$ 2.800–3.800/mês', deadline: '30/09/2025' },
    { title: 'Técnico Agrícola – Monitoramento de Pragas', poster: 'Fazenda São João', type: 'Efetivo', typeColor: '#16a34a', city: 'Sorriso/MT', salary: 'R$ 3.500–5.000/mês' },
    { title: 'Analista de Logística e Armazenagem', poster: 'Coop Centro-Oeste', type: 'Efetivo', typeColor: '#16a34a', city: 'Lucas do Rio Verde/MT', salary: 'R$ 4.000–6.000/mês' },
    { title: 'Representante Comercial – Insumos', poster: 'Pedro Alves', type: 'Efetivo', typeColor: '#16a34a', city: 'Cuiabá/MT', salary: 'R$ 3.000–4.500/mês' },
  ]
  const filters = ['Todas', 'Safra', 'Efetivo', 'Serviço']
  return (
    <div style={{ paddingBottom: 70 }}>
      <StatusBar />
      <div style={{ background: C.primary, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>💼</span>
          <span style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>Vagas</span>
        </div>
        <div style={{ background: '#f5a623', color: '#fff', fontSize: 11, fontWeight: 700, padding: '5px 10px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>+</span> Publicar
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, padding: '8px 12px', background: '#fff', borderBottom: `1px solid ${C.border}`, overflowX: 'auto' }}>
        {filters.map((f, i) => (
          <span key={f} style={{ fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 999, whiteSpace: 'nowrap', background: i === 0 ? C.primary : C.bg, color: i === 0 ? '#fff' : C.textSec, border: i === 0 ? 'none' : `1px solid ${C.border}` }}>{f}</span>
        ))}
      </div>
      <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {jobs.map((j, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 14, padding: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, flex: 1, paddingRight: 6, lineHeight: 1.3 }}>{j.title}</div>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: j.typeColor + '20', color: j.typeColor, whiteSpace: 'nowrap' }}>{j.type}</span>
            </div>
            <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 6 }}>{j.poster}</div>
            <div style={{ fontSize: 11, color: C.textSec, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span>📍 {j.city}</span>
              <span style={{ color: '#16a34a', fontWeight: 600 }}>💰 {j.salary}</span>
              {j.deadline && <span style={{ color: C.textMuted }}>⏱ até {j.deadline}</span>}
            </div>
            <div style={{ marginTop: 8, background: C.primary, borderRadius: 8, padding: '6px 0', textAlign: 'center', color: '#fff', fontSize: 12, fontWeight: 600 }}>Candidatar-se</div>
          </div>
        ))}
      </div>
      <TabBar active="vagas" />
    </div>
  )
}

// ─── MARKETPLACE SCREEN ────────────────────────────────────────────────────────
function MarketplaceScreen() {
  const products = [
    { icon: '🌱', name: 'Semente de Soja TMG 7062 IPRO', price: 'R$ 480,00', unit: 'saco 40kg', seller: 'Pedro Alves', city: 'Cuiabá/MT', cat: 'Sementes', catColor: '#16a34a' },
    { icon: '🧪', name: 'Fertilizante MAP 10-52-00', price: 'R$ 185,00', unit: 'saco 50kg', seller: 'Pedro Alves', city: 'Cuiabá/MT', cat: 'Fertilizante', catColor: '#2563eb' },
    { icon: '🚜', name: 'Trator New Holland TL5.100 2022', price: 'R$ 280.000', unit: 'unidade', seller: 'João da Silva', city: 'Sorriso/MT', cat: 'Máquina', catColor: '#6b7280' },
    { icon: '🌾', name: 'Soja em Grão – Safra 24/25', price: 'R$ 119,50', unit: 'saca 60kg', seller: 'João da Silva', city: 'Sorriso/MT', cat: 'Grãos', catColor: '#d97706' },
  ]
  const filters = ['Tudo', '🌱', '🧪', '🚜', '🌾', '🐄']
  return (
    <div style={{ paddingBottom: 90 }}>
      <StatusBar />
      <div style={{ background: C.primary, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>🛒</span>
          <span style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>Marketplace</span>
        </div>
        <div style={{ background: '#f5a623', color: '#fff', fontSize: 11, fontWeight: 700, padding: '5px 10px', borderRadius: 999 }}>+ Anunciar</div>
      </div>
      <div style={{ display: 'flex', gap: 6, padding: '8px 12px', background: '#fff', borderBottom: `1px solid ${C.border}` }}>
        {filters.map((f, i) => (
          <span key={i} style={{ fontSize: i === 0 ? 11 : 16, fontWeight: 600, padding: '4px 10px', borderRadius: 999, background: i === 0 ? C.primary : C.bg, color: i === 0 ? '#fff' : C.text, border: i === 0 ? 'none' : `1px solid ${C.border}` }}>{f}</span>
        ))}
      </div>
      <div style={{ padding: '8px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {products.map((p, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ height: 60, background: '#f0f7f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>{p.icon}</div>
            <div style={{ padding: '8px 8px 6px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.text, lineHeight: 1.3, marginBottom: 3 }} className="line-clamp-2">{p.name}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: C.primary }}>{p.price}</div>
              <div style={{ fontSize: 10, color: C.textMuted }}>por {p.unit}</div>
              <div style={{ fontSize: 10, color: C.textSec, marginTop: 3 }}>📍 {p.city}</div>
              <div style={{ marginTop: 6, background: C.primary, borderRadius: 6, padding: '4px 0', textAlign: 'center', color: '#fff', fontSize: 10, fontWeight: 700 }}>Ver Produto</div>
            </div>
          </div>
        ))}
      </div>
      {/* FAB */}
      <div style={{ position: 'absolute', bottom: 76, right: 14, width: 44, height: 44, borderRadius: 22, background: '#f5a623', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>+</div>
      <TabBar active="marketplace" />
    </div>
  )
}

// ─── POST JOB FORM SCREEN ──────────────────────────────────────────────────────
function PostJobScreen() {
  const field = (label: string, placeholder: string, type = 'text') => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 4 }}>{label}</div>
      <div style={{ border: `1.5px solid ${C.border}`, borderRadius: 10, padding: '10px 12px', fontSize: 13, color: C.textMuted, background: '#fff' }}>{placeholder}</div>
    </div>
  )
  return (
    <div>
      <StatusBar />
      <div style={{ background: C.primary, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ color: '#fff', fontSize: 22, cursor: 'pointer' }}>✕</span>
        <span style={{ color: '#fff', fontSize: 17, fontWeight: 700, flex: 1, textAlign: 'center' }}>Publicar Vaga</span>
        <span style={{ fontSize: 22 }} />
      </div>
      <div style={{ padding: 14 }}>
        {field('Título da vaga *', 'Ex: Operador de Colheitadeira')}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 6 }}>Tipo de contrato *</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['Safra', 'Efetivo', 'Serviço', 'Estágio'].map((t, i) => (
              <span key={t} style={{ fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 999, background: i === 0 ? C.primary : C.bg, color: i === 0 ? '#fff' : C.textSec, border: i === 0 ? 'none' : `1px solid ${C.border}` }}>{t}</span>
            ))}
          </div>
        </div>
        {field('Descrição *', 'Responsabilidades, requisitos...')}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 4 }}>Salário mín.</div>
            <div style={{ border: `1.5px solid ${C.border}`, borderRadius: 10, padding: '10px 12px', fontSize: 13, color: C.textMuted, background: '#fff' }}>R$ 1.800</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 4 }}>Salário máx.</div>
            <div style={{ border: `1.5px solid ${C.border}`, borderRadius: 10, padding: '10px 12px', fontSize: 13, color: C.textMuted, background: '#fff' }}>R$ 3.500</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <div style={{ flex: 2 }}>{field('Cidade *', 'Sorriso')}</div>
          <div style={{ flex: 1 }}>{field('UF', 'MT')}</div>
        </div>
        <div style={{ background: C.primary, borderRadius: 12, padding: '14px 0', textAlign: 'center', color: '#fff', fontSize: 15, fontWeight: 700, marginTop: 4 }}>Publicar Vaga</div>
      </div>
    </div>
  )
}

// ─── AGROCURTO SCREEN (vídeo curto tela cheia, estilo Reels) ─────────────
function AgroCurtoScreen() {
  const videos = [
    { bg: 'linear-gradient(170deg,#0f3d1c 0%,#2d8a42 55%,#8bc34a 100%)', emoji: '🌾', initial: 'J', name: 'João da Silva', loc: 'Sorriso/MT', caption: 'Regulagem da semeadora para soja — 5 ajustes que deram +8 sc/ha 🔧', tags: ['soja','plantio'], likes: '1,2k', comments: '94', shares: '341', duration: '0:52' },
    { bg: 'linear-gradient(170deg,#1a237e 0%,#1565c0 55%,#42a5f5 100%)', emoji: '🚜', initial: 'M', name: 'Maria Souza', loc: 'Lucas/MT', caption: 'Pulverizador autopropelido na prática — cobertura de 180 ha por dia 💨', tags: ['defensivos','maquinário'], likes: '876', comments: '52', shares: '210', duration: '1:14' },
  ]
  const v = videos[0]
  return (
    <div style={{ height: '100%', background: '#000', position: 'relative', overflow: 'hidden' }}>
      {/* video bg */}
      <div style={{ position: 'absolute', inset: 0, background: v.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 80, opacity: 0.3 }}>{v.emoji}</span>
      </div>
      {/* gradient overlay bottom */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%', background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)' }} />
      {/* top bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '32px 14px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
        <span style={{ color: '#fff', fontSize: 16, fontWeight: 800, letterSpacing: 0.5 }}>🎬 AgroCurtos</span>
        <span style={{ color: '#fff', fontSize: 20 }}>🔍</span>
      </div>
      {/* right actions */}
      <div style={{ position: 'absolute', right: 12, bottom: 110, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, zIndex: 10 }}>
        <div style={{ width: 46, height: 46, borderRadius: 23, border: '2.5px solid #f5a623', background: '#f5a623', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16 }}>{v.initial}</div>
        {[['❤️', v.likes], ['💬', v.comments], ['↗️', v.shares], ['🔖', ''], ['⋯', '']].map(([ic, ct], i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24 }}>{ic}</div>
            {ct && <div style={{ color: '#fff', fontSize: 11, fontWeight: 700, marginTop: 2 }}>{ct}</div>}
          </div>
        ))}
      </div>
      {/* bottom info */}
      <div style={{ position: 'absolute', bottom: 70, left: 12, right: 66, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <div style={{ width: 30, height: 30, borderRadius: 15, background: '#f5a623', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>{v.initial}</div>
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{v.name}</span>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>· {v.loc}</span>
          <div style={{ marginLeft: 'auto', background: C.primary, color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999, border: '1px solid #fff' }}>+ Seguir</div>
        </div>
        <div style={{ color: '#fff', fontSize: 12, lineHeight: 1.5, marginBottom: 6 }}>{v.caption}</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {v.tags.map((t) => <span key={t} style={{ fontSize: 11, color: '#8bc34a', fontWeight: 700 }}>#{t}</span>)}
        </div>
        {/* progress + duration */}
        <div style={{ marginTop: 8 }}>
          <div style={{ height: 2, background: 'rgba(255,255,255,0.3)', borderRadius: 1 }}>
            <div style={{ width: '38%', height: '100%', background: C.secondary, borderRadius: 1 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10 }}>{v.duration}</span>
          </div>
        </div>
      </div>
      {/* swipe hint */}
      <div style={{ position: 'absolute', bottom: 78, left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
        <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, textAlign: 'center' }}>↑ deslize para próximo</div>
      </div>
      {/* tab bar simulated */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 64, background: 'rgba(0,0,0,0.7)', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-around', alignItems: 'center', paddingBottom: 6 }}>
        {[['🏠','Feed'],['🎬','AgroCurtos'],['✨','AgroIA'],['💼','Vagas'],['👤','Perfil']].map(([ic,lb],i) => (
          <div key={i} style={{ textAlign: 'center', flex: 1 }}>
            {i === 1
              ? <div style={{ width: 38, height: 38, borderRadius: 19, background: C.secondary, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 0 }}>{ic}</div>
              : <div style={{ fontSize: 18, opacity: i === 1 ? 1 : 0.5 }}>{ic}</div>}
            <div style={{ fontSize: 10, color: i === 1 ? C.secondary : 'rgba(255,255,255,0.5)', fontWeight: i === 1 ? 700 : 400 }}>{lb}</div>
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
        <PhoneFrame title="AgroCurtos (vídeos curtos)"><AgroCurtoScreen /></PhoneFrame>
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
      <div style={{ textAlign: 'center', margin: '40px 0 24px' }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: C.primary }}>Novo: Vagas · Marketplace · Formulários</h2>
      </div>
      <div style={{ display: 'flex', gap: 32, justifyContent: 'center', flexWrap: 'wrap' }}>
        <PhoneFrame title="Vagas de Emprego"><VagasScreen /></PhoneFrame>
        <PhoneFrame title="Marketplace Agrícola"><MarketplaceScreen /></PhoneFrame>
        <PhoneFrame title="Publicar Vaga (formulário)"><PostJobScreen /></PhoneFrame>
      </div>
    </div>
  )
}
