/**
 * Seed script — populate the database with realistic demo data.
 * Run: DATABASE_URL=... npx tsx apps/api/src/lib/seed.ts
 */
import 'dotenv/config'
import { createDatabase, users, farms, farmCultures, marketPrices, posts, offers, newsArticles, jobs, marketplaceProducts } from '@agrolink/database'
import bcrypt from 'bcryptjs'

const db = createDatabase(process.env.DATABASE_URL!)

async function seed() {
  console.log('🌱 Seeding AgroLink database...')

  // ── Reset demo data (idempotent) ──────────────────────────────────────────
  // Truncating users cascades to all user-owned rows via FK; the two tables
  // without a user FK (prices, news) are cleared explicitly.
  const { eq, sql } = await import('drizzle-orm')
  await db.execute(
    sql`TRUNCATE TABLE users, market_prices, news_articles RESTART IDENTITY CASCADE`
  )
  console.log('  ✓ Tabelas de demo limpas')

  // ── Users ────────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('senha12345', 12)

  async function upsertUser(values: typeof users.$inferInsert) {
    await db.insert(users).values(values).onConflictDoNothing()
    const [u] = await db.select().from(users).where(eq(users.email, values.email!))
    return u
  }

  const joao = await upsertUser({ email: 'joao@fazenda.com', phone: '66999887766', name: 'João da Silva', username: 'joaosilva', passwordHash, role: 'producer', verified: true })
  const maria = await upsertUser({ email: 'maria@coop.com', phone: '65988776655', name: 'Maria Souza', username: 'mariasouza', passwordHash, role: 'cooperative', verified: true })
  const pedro = await upsertUser({ email: 'pedro@insumos.com', phone: '66977665544', name: 'Pedro Alves', username: 'pedroalves', passwordHash, role: 'supplier' })
  const ana = await upsertUser({ email: 'ana@agronoma.com', phone: '65966554433', name: 'Ana Rodrigues', username: 'anaagronoma', passwordHash, role: 'technician', verified: true })

  console.log('  ✓ 4 usuários')

  // ── Farms ─────────────────────────────────────────────────────────────────
  if (joao) {
    const [fazendaSJ] = await db.insert(farms).values({
      userId: joao.id, name: 'Fazenda São João',
      areaHectares: 2800, city: 'Sorriso', state: 'MT',
      latitude: -12.549, longitude: -55.720,
    }).onConflictDoNothing().returning()

    if (fazendaSJ) {
      await db.insert(farmCultures).values([
        { farmId: fazendaSJ.id, culture: 'soja', areaHectares: 1800, safra: '24/25', year: 2025 },
        { farmId: fazendaSJ.id, culture: 'milho', areaHectares: 1000, safra: '24/25', year: 2025 },
      ]).onConflictDoNothing()
    }
  }

  if (maria) {
    await db.insert(farms).values({
      userId: maria.id, name: 'Coop Centro-Oeste',
      areaHectares: 15000, city: 'Lucas do Rio Verde', state: 'MT',
      latitude: -13.057, longitude: -55.905,
    }).onConflictDoNothing()
  }

  console.log('  ✓ Fazendas e culturas')

  // ── Market Prices ─────────────────────────────────────────────────────────
  await db.insert(marketPrices).values([
    { culture: 'soja',      price: 118.50, currency: 'BRL', unit: 'saca_60kg', source: 'CEPEA', variation24h:  1.20, variationPercent24h:  1.02 },
    { culture: 'milho',     price:  62.30, currency: 'BRL', unit: 'saca_60kg', source: 'CEPEA', variation24h: -0.50, variationPercent24h: -0.80 },
    { culture: 'boi_gordo', price: 290.00, currency: 'BRL', unit: 'arroba',    source: 'CEPEA', variation24h:  2.10, variationPercent24h:  0.73 },
    { culture: 'algodao',   price:  95.00, currency: 'BRL', unit: 'saca_60kg', source: 'CEPEA', variation24h:  0.30, variationPercent24h:  0.32 },
    { culture: 'cafe',      price: 1250.0, currency: 'BRL', unit: 'saca_60kg', source: 'CEPEA', variation24h:-18.00, variationPercent24h: -1.42 },
    { culture: 'trigo',     price:  72.80, currency: 'BRL', unit: 'saca_60kg', source: 'CEPEA', variation24h:  0.60, variationPercent24h:  0.83 },
  ]).onConflictDoNothing()

  console.log('  ✓ Cotações de mercado')

  // ── Posts ─────────────────────────────────────────────────────────────────
  if (joao) {
    await db.insert(posts).values([
      {
        userId: joao.id,
        content: 'Soja com ótimo desenvolvimento nessa safra! Expectativa de 65 sc/ha. Clima favorável em Sorriso/MT. 🌱',
        tags: ['soja', 'safra2526', 'sorriso', 'mt'],
        city: 'Sorriso', state: 'MT', latitude: -12.55, longitude: -55.72,
        reactionsCount: { like: 47, applause: 12, useful: 31, insightful: 8 },
        commentsCount: 9,
      },
      {
        userId: joao.id,
        content: 'Aplicação de fungicida concluída nas 1.800 ha de soja. Janela de clima perfeita. Estação meteorológica da fazenda registrou umidade ideal. ✅ #manejo',
        tags: ['manejo', 'soja', 'fungicida'],
        city: 'Sorriso', state: 'MT', latitude: -12.55, longitude: -55.72,
        reactionsCount: { like: 23, applause: 5, useful: 41, insightful: 3 },
        commentsCount: 4,
      },
    ]).onConflictDoNothing()
  }

  if (ana) {
    await db.insert(posts).values([
      {
        userId: ana.id,
        content: 'Alerta fitossanitário: identificado foco de ferrugem asiática na região de Sorriso. Produtores devem monitorar as lavouras e acionar aplicação preventiva! 🚨 #ferrugem #soja #alerta',
        tags: ['ferrugem', 'soja', 'alerta', 'fitossanidade'],
        city: 'Sorriso', state: 'MT', latitude: -12.55, longitude: -55.72,
        reactionsCount: { like: 89, applause: 14, useful: 156, insightful: 42 },
        commentsCount: 28,
      },
    ]).onConflictDoNothing()
  }

  if (maria) {
    await db.insert(posts).values([
      {
        userId: maria.id,
        content: 'Cooperativa Centro-Oeste anuncia preço de R$ 120,00/sc para soja com entrega até 31/07. Consulte condições na cooperativa. 📋 #cooperativa #soja #comercializacao',
        tags: ['cooperativa', 'soja', 'comercializacao'],
        city: 'Lucas do Rio Verde', state: 'MT', latitude: -13.05, longitude: -55.90,
        reactionsCount: { like: 112, applause: 8, useful: 95, insightful: 21 },
        commentsCount: 37,
      },
    ]).onConflictDoNothing()
  }

  console.log('  ✓ Posts do feed')

  // ── Offers ────────────────────────────────────────────────────────────────
  if (joao) {
    await db.insert(offers).values([
      {
        userId: joao.id, type: 'sell', culture: 'soja',
        volumeTons: 500, pricePerUnit: 119.50, unit: 'saca_60kg',
        description: 'Soja limpa, safra 24/25. Pronta para entrega em silo próprio.',
        latitude: -12.549, longitude: -55.720, city: 'Sorriso', state: 'MT',
      },
      {
        userId: joao.id, type: 'sell', culture: 'milho',
        volumeTons: 200, pricePerUnit: 63.00, unit: 'saca_60kg',
        description: 'Milho 2ª safra. Umidade 13%.',
        latitude: -12.549, longitude: -55.720, city: 'Sorriso', state: 'MT',
      },
    ]).onConflictDoNothing()
  }

  if (maria) {
    await db.insert(offers).values([
      {
        userId: maria.id, type: 'buy', culture: 'soja',
        volumeTons: 5000, pricePerUnit: 120.00, unit: 'saca_60kg',
        description: 'Cooperativa comprando soja para safra 24/25. Pagamento em 30 dias.',
        latitude: -13.057, longitude: -55.905, city: 'Lucas do Rio Verde', state: 'MT',
      },
    ]).onConflictDoNothing()
  }

  console.log('  ✓ Ofertas de mercado')

  // ── News ──────────────────────────────────────────────────────────────────
  await db.insert(newsArticles).values([
    {
      title: 'USDA eleva projeção de produção de soja no Brasil para 169 milhões de toneladas',
      summary: 'O Departamento de Agricultura dos EUA revisou para cima a estimativa de produção brasileira de soja na safra 24/25, impulsionada pelas condições climáticas favoráveis no Mato Grosso.',
      aiSummary: 'Positivo para produtores: maior oferta pode pressionar preços no curto prazo, mas confirmação da safra forte fortalece posição do Brasil no mercado global.',
      priceImpact: 'negative',
      affectedCultures: ['soja'],
      sourceUrl: 'https://exemplo.com/usda-soja-brasil',
      sourceName: 'Notícia Agrícola',
      publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    {
      title: 'Boi gordo encerra semana em alta com demanda aquecida no mercado interno',
      summary: 'A arroba do boi gordo fechou a semana com valorização de 1,8%, impulsionada pela maior demanda de frigoríficos no Centro-Oeste.',
      aiSummary: 'Momento favorável para pecuaristas com animais prontos para abate. Tendência de alta deve se manter nas próximas 2 semanas.',
      priceImpact: 'positive',
      affectedCultures: ['boi_gordo'],
      sourceUrl: 'https://exemplo.com/boi-gordo-alta',
      sourceName: 'CEPEA Informa',
      publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    },
  ]).onConflictDoNothing()

  console.log('  ✓ Notícias')

  // ── Jobs ──────────────────────────────────────────────────────────────────
  if (joao) {
    await db.insert(jobs).values([
      {
        userId: joao.id, title: 'Operador de Máquinas Agrícolas',
        description: 'Procuramos operador de colheitadeira e trator com experiência mínima de 2 anos em lavouras de soja e milho. Regime de safra (out–mar). Oferecemos moradia e alimentação.',
        type: 'seasonal', culture: 'soja',
        salaryMin: 2800, salaryMax: 3800,
        city: 'Sorriso', state: 'MT', latitude: -12.549, longitude: -55.720,
        deadline: new Date('2025-09-30'),
      },
      {
        userId: joao.id, title: 'Técnico Agrícola – Monitoramento de Pragas',
        description: 'Vaga permanente para técnico agrícola responsável pelo monitoramento de pragas e doenças nas lavouras. Desejável experiência com ferrugem asiática e lagarta do cartucho.',
        type: 'permanent', culture: 'soja',
        salaryMin: 3500, salaryMax: 5000,
        city: 'Sorriso', state: 'MT', latitude: -12.549, longitude: -55.720,
      },
    ]).onConflictDoNothing()
  }

  if (maria) {
    await db.insert(jobs).values([
      {
        userId: maria.id, title: 'Analista de Logística e Armazenagem',
        description: 'Cooperativa busca profissional para gestão de logística de grãos, controle de armazenagem e programação de cargas. Conhecimento em sistemas de gestão (ERP) é um diferencial.',
        type: 'permanent',
        salaryMin: 4000, salaryMax: 6000,
        city: 'Lucas do Rio Verde', state: 'MT', latitude: -13.057, longitude: -55.905,
      },
      {
        userId: maria.id, title: 'Auxiliar de Classificação de Grãos (Safra)',
        description: 'Contratação temporária para período de safra. Responsável pela classificação e pesagem de grãos na unidade armazenadora. Sem experiência necessária — treinamento oferecido.',
        type: 'seasonal',
        salaryMin: 1800, salaryMax: 2200,
        city: 'Lucas do Rio Verde', state: 'MT', latitude: -13.057, longitude: -55.905,
        deadline: new Date('2025-08-31'),
      },
    ]).onConflictDoNothing()
  }

  if (pedro) {
    await db.insert(jobs).values([
      {
        userId: pedro.id, title: 'Representante Comercial – Insumos Agrícolas',
        description: 'Vendedor externo para a linha de defensivos e fertilizantes. Território: MT e GO. Carteira de clientes existente. Veículo próprio necessário.',
        type: 'permanent',
        salaryMin: 3000, salaryMax: 4500,
        city: 'Cuiabá', state: 'MT', latitude: -15.601, longitude: -56.097,
      },
    ]).onConflictDoNothing()
  }

  console.log('  ✓ Vagas de emprego')

  // ── Marketplace Products ───────────────────────────────────────────────────
  if (pedro) {
    await db.insert(marketplaceProducts).values([
      {
        userId: pedro.id, name: 'Semente de Soja TMG 7062 IPRO',
        description: 'Sementes certificadas de soja, variedade TMG 7062 IPRO. Alta produtividade e resistência à ferrugem. Embalagem de 40 kg. Grupo de maturação 6.2.',
        category: 'seeds', price: 480.00, unit: 'saco 40kg',
        stock: 200, city: 'Cuiabá', state: 'MT', latitude: -15.601, longitude: -56.097,
      },
      {
        userId: pedro.id, name: 'Fertilizante MAP 10-52-00 Granulado',
        description: 'Fertilizante fosfatado para aplicação no plantio. Ideal para correção e manutenção do solo em lavouras de soja e milho. Saco de 50 kg.',
        category: 'fertilizers', price: 185.00, unit: 'saco 50kg',
        stock: 500, city: 'Cuiabá', state: 'MT', latitude: -15.601, longitude: -56.097,
      },
      {
        userId: pedro.id, name: 'Herbicida Glifosato 480 g/L',
        description: 'Herbicida sistêmico de amplo espectro para controle de plantas daninhas em lavouras transgênicas. Galão de 20L.',
        category: 'pesticides', price: 140.00, unit: 'galão 20L',
        stock: 150, city: 'Cuiabá', state: 'MT', latitude: -15.601, longitude: -56.097,
      },
    ]).onConflictDoNothing()
  }

  if (joao) {
    await db.insert(marketplaceProducts).values([
      {
        userId: joao.id, name: 'Trator New Holland TL5.100 – 2022',
        description: 'Trator 100cv com apenas 800 horas de uso. Cabine, ar condicionado, tração 4x4. Revisões em dia. Retirada na Fazenda São João, Sorriso/MT.',
        category: 'equipment', price: 280000.00, unit: 'unidade',
        stock: 1, city: 'Sorriso', state: 'MT', latitude: -12.549, longitude: -55.720,
      },
      {
        userId: joao.id, name: 'Soja em Grão – Safra 24/25 (Excedente)',
        description: 'Venda de excedente de produção. Soja limpa, umidade 12%, impurezas < 1%. Disponível no silo da fazenda. Volume: 300 toneladas.',
        category: 'grains', price: 119.50, unit: 'saca 60kg',
        stock: 5000, city: 'Sorriso', state: 'MT', latitude: -12.549, longitude: -55.720,
      },
    ]).onConflictDoNothing()
  }

  if (maria) {
    await db.insert(marketplaceProducts).values([
      {
        userId: maria.id, name: 'Inoculante para Soja – Rizobacter 5L',
        description: 'Inoculante líquido para fixação biológica de nitrogênio em soja. Produto cooperativa, preço especial para associados.',
        category: 'seeds', price: 95.00, unit: 'frasco 5L',
        stock: 300, city: 'Lucas do Rio Verde', state: 'MT', latitude: -13.057, longitude: -55.905,
      },
    ]).onConflictDoNothing()
  }

  console.log('  ✓ Marketplace')
  console.log('\n✅ Seed concluído com sucesso!')
  process.exit(0)
}

seed().catch((err) => {
  console.error('❌ Seed falhou:', err)
  process.exit(1)
})
