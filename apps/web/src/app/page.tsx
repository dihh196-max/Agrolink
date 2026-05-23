import Link from 'next/link'

const FEATURES = [
  { icon: '📱', title: 'Feed Social Agrícola', desc: 'Posts, stories e comunidades por cultura e região. Algoritmo que prioriza seu contexto.' },
  { icon: '✨', title: 'AgroIA', desc: 'Assistente IA treinada com base técnica da Embrapa. Responde sobre manejo, pragas e mercado.' },
  { icon: '📈', title: 'Cotações em Tempo Real', desc: 'CEPEA/ESALQ atualizado a cada 15 min. Alertas de preço e sugestão de momento de venda.' },
  { icon: '🌦️', title: 'Clima por Fazenda', desc: 'Previsão de 15 dias pela coordenada GPS da sua propriedade. Janelas de plantio e colheita.' },
  { icon: '🤝', title: 'Oferta e Demanda', desc: 'Negociação direta entre produtores e cooperativas. Preço sugerido por algoritmo regional.' },
  { icon: '🌐', title: 'Network Profissional', desc: 'Conexões, grupos por cultura e vagas de mão de obra sazonal no estilo AgriLinkedIn.' },
]

const CULTURES = [
  { emoji: '🌿', name: 'Soja' },
  { emoji: '🌽', name: 'Milho' },
  { emoji: '☁️', name: 'Algodão' },
  { emoji: '☕', name: 'Café' },
  { emoji: '🐄', name: 'Boi Gordo' },
  { emoji: '🌾', name: 'Trigo' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="bg-primary text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌱</span>
          <span className="text-xl font-bold">AgroLink</span>
        </div>
        <div className="flex gap-4 items-center">
          <Link href="/dashboard" className="hover:underline text-sm">Dashboard</Link>
          <Link href="/login" className="bg-secondary text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-secondary-light transition-colors">
            Entrar
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-b from-primary to-primary-light text-white py-24 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-5xl font-extrabold mb-4 leading-tight">
            A Plataforma Social do<br />Agronegócio Brasileiro
          </h1>
          <p className="text-xl opacity-90 mb-8">
            Rede social, cotações em tempo real, IA especializada e marketplace de grãos — tudo em um único app.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/register" className="bg-secondary hover:bg-secondary-light text-white px-8 py-4 rounded-2xl font-bold text-lg transition-colors">
              Criar conta grátis
            </Link>
            <Link href="/dashboard" className="border-2 border-white text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-white/10 transition-colors">
              Ver demonstração
            </Link>
          </div>
          <div className="flex gap-8 justify-center mt-12 flex-wrap">
            {[['27M+', 'produtores no Brasil'], ['R$ 2T', 'PIB do agronegócio'], ['73%', 'com smartphone']].map(([v, l]) => (
              <div key={l} className="text-center">
                <div className="text-3xl font-extrabold">{v}</div>
                <div className="text-sm opacity-75">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cultures strip */}
      <section className="bg-primary-dark text-white py-4 overflow-hidden">
        <div className="flex gap-8 justify-center flex-wrap px-6">
          {CULTURES.map((c) => (
            <div key={c.name} className="flex items-center gap-2 text-sm font-medium opacity-80">
              <span className="text-xl">{c.emoji}</span>
              {c.name}
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-4">
          Tudo que o produtor precisa, em um lugar só
        </h2>
        <p className="text-center text-gray-500 mb-12">
          Deixe de usar WhatsApp, planilha, TV e telefone separados
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="card hover:shadow-md transition-shadow">
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">{f.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary text-white py-16 px-6 text-center">
        <h2 className="text-3xl font-bold mb-4">Pronto para entrar na rede do campo?</h2>
        <p className="opacity-80 mb-8 text-lg">Cadastro gratuito. Sem cartão de crédito.</p>
        <Link href="/register" className="bg-secondary hover:bg-secondary-light text-white px-10 py-4 rounded-2xl font-bold text-lg inline-block transition-colors">
          Criar conta agora
        </Link>
      </section>

      {/* Footer */}
      <footer className="bg-primary-dark text-white/60 py-8 px-6 text-center text-sm">
        <p>© 2026 AgroLink · Rondonópolis, MT · Feito para o campo brasileiro 🌾</p>
      </footer>
    </div>
  )
}
