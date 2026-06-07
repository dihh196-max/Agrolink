// ─── User & Auth ────────────────────────────────────────────────────────────

export type UserRole = 'producer' | 'supplier' | 'technician' | 'cooperative'

export interface User {
  id: string
  email: string
  phone: string
  name: string
  username: string
  avatarUrl?: string
  coverUrl?: string
  bio?: string
  role: UserRole
  verified: boolean
  premiumUntil?: string
  city?: string
  state?: string
  occupation?: string
  experienceYears?: string
  cultures?: string
  website?: string
  instagram?: string
  birthDate?: string
  createdAt: string
  updatedAt: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

// ─── Farm ────────────────────────────────────────────────────────────────────

export type Culture =
  | 'soja'
  | 'milho'
  | 'algodao'
  | 'cafe'
  | 'boi_gordo'
  | 'trigo'
  | 'arroz'
  | 'feijao'
  | 'cana'
  | 'eucalipto'

export interface GeoPoint {
  lat: number
  lng: number
}

export interface Farm {
  id: string
  userId: string
  name: string
  areaHectares: number
  city: string
  state: string
  location: GeoPoint
  polygon?: GeoPoint[]
  createdAt: string
}

export interface FarmCulture {
  id: string
  farmId: string
  culture: Culture
  areaHectares: number
  safra: string
  year: number
}

// ─── Feed / Posts ─────────────────────────────────────────────────────────────

export type ReactionType = 'like' | 'applause' | 'useful' | 'insightful'

export interface PostMedia {
  type: 'image' | 'video'
  url: string
  thumbnailUrl?: string
}

export interface Post {
  id: string
  userId: string
  author: Pick<User, 'id' | 'name' | 'username' | 'avatarUrl' | 'role'>
  content: string
  media: PostMedia[]
  tags: string[]
  location?: GeoPoint
  city?: string
  state?: string
  reactionsCount: Record<ReactionType, number>
  commentsCount: number
  userReaction?: ReactionType
  isSponsored: boolean
  createdAt: string
}

export interface PostComment {
  id: string
  postId: string
  userId: string
  author: Pick<User, 'id' | 'name' | 'username' | 'avatarUrl'>
  content: string
  createdAt: string
}

export interface Story {
  id: string
  userId: string
  author: Pick<User, 'id' | 'name' | 'username' | 'avatarUrl'>
  mediaUrl: string
  mediaType: 'image' | 'video'
  temperature?: number
  weatherDescription?: string
  expiresAt: string
  createdAt: string
}

// ─── Market Prices ────────────────────────────────────────────────────────────

export interface MarketPrice {
  id: string
  culture: Culture
  price: number
  currency: 'BRL'
  unit: 'saca_60kg' | 'arroba' | 'tonelada'
  source: 'CEPEA' | 'B3' | 'regional'
  city?: string
  state?: string
  variation24h: number
  variationPercent24h: number
  updatedAt: string
}

export interface PriceHistory {
  timestamp: string
  price: number
}

export interface PriceAlert {
  id: string
  userId: string
  culture: Culture
  targetPrice: number
  condition: 'above' | 'below'
  active: boolean
  triggeredAt?: string
  createdAt: string
}

// ─── Weather ──────────────────────────────────────────────────────────────────

export interface WeatherDay {
  date: string
  tempMin: number
  tempMax: number
  humidity: number
  precipitationMm: number
  windKmh: number
  description: string
  icon: string
  soilMoisture?: number
  frostRisk?: boolean
}

export interface WeatherForecast {
  farmId?: string
  location: GeoPoint
  current: WeatherDay
  forecast: WeatherDay[]
  plantingWindowAlert?: string
  sprayingWindowAlert?: string
  harvestWindowAlert?: string
  updatedAt: string
}

// ─── Offers (Marketplace) ─────────────────────────────────────────────────────

export type OfferType = 'sell' | 'buy'

export interface Offer {
  id: string
  userId: string
  seller: Pick<User, 'id' | 'name' | 'username' | 'avatarUrl' | 'role'>
  type: OfferType
  culture: Culture
  volumeTons: number
  pricePerUnit: number
  unit: 'saca_60kg' | 'tonelada'
  description?: string
  location: GeoPoint
  city: string
  state: string
  distanceKm?: number
  active: boolean
  expiresAt?: string
  reputationScore?: number
  createdAt: string
}

export interface SuggestedPrice {
  culture: Culture
  suggestedPrice: number
  unit: string
  basedOnOffersCount: number
  radiusKm: number
  cpeaVariation24h: number
  calculatedAt: string
}

// ─── AgroIA ───────────────────────────────────────────────────────────────────

export interface AIConversation {
  id: string
  userId: string
  title: string
  contextType: 'manejo' | 'pragas' | 'mercado' | 'legislacao' | 'clima' | 'credito' | 'geral'
  safra?: string
  createdAt: string
  updatedAt: string
}

export interface AIMessage {
  id: string
  conversationId: string
  role: 'user' | 'assistant'
  content: string
  sources?: { title: string; url?: string; excerpt: string }[]
  quickActions?: { label: string; prompt: string }[]
  createdAt: string
}

// ─── Notifications ────────────────────────────────────────────────────────────

export type NotificationType =
  | 'price_alert'
  | 'new_follower'
  | 'post_reaction'
  | 'post_comment'
  | 'new_offer'
  | 'message'
  | 'weather_alert'
  | 'news'

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  body: string
  payload?: Record<string, unknown>
  read: boolean
  createdAt: string
}

// ─── Connections ──────────────────────────────────────────────────────────────

export type ConnectionStatus = 'pending' | 'accepted' | 'rejected'

export interface Connection {
  id: string
  requesterId: string
  recipientId: string
  status: ConnectionStatus
  createdAt: string
}

// ─── Parcerias (follow) ─────────────────────────────────────────────────────

export interface Partnership {
  id: string
  followerId: string
  followingId: string
  createdAt: string
}

export interface PartnerProfile extends Pick<User, 'id' | 'name' | 'username' | 'avatarUrl' | 'role' | 'verified'> {
  isPartner: boolean
}

// ─── Mensagens diretas (chat) ────────────────────────────────────────────────

export interface MessageThread {
  id: string
  otherUser: Pick<User, 'id' | 'name' | 'username' | 'avatarUrl' | 'role'>
  lastMessage?: string
  lastMessageAt?: string
  unreadCount: number
  createdAt: string
}

export interface DirectMessage {
  id: string
  threadId: string
  senderId: string
  content: string
  read: boolean
  createdAt: string
}

// ─── Busca ────────────────────────────────────────────────────────────────────

export interface SearchResults {
  people: (Pick<User, 'id' | 'name' | 'username' | 'avatarUrl' | 'role' | 'verified'>)[]
  companies: (Pick<User, 'id' | 'name' | 'username' | 'avatarUrl' | 'role' | 'verified'>)[]
  posts: Post[]
  news: NewsArticle[]
  offers: Offer[]
  jobs: Job[]
  products: MarketplaceProduct[]
}

// ─── Groups ───────────────────────────────────────────────────────────────────

export interface Group {
  id: string
  name: string
  description: string
  culture?: Culture
  state?: string
  membersCount: number
  avatarUrl?: string
  coverUrl?: string
  createdAt: string
}

// ─── News ─────────────────────────────────────────────────────────────────────

export interface NewsArticle {
  id: string
  title: string
  summary: string
  aiSummary?: string
  priceImpact?: 'positive' | 'negative' | 'neutral'
  affectedCultures: Culture[]
  sourceUrl: string
  sourceName: string
  imageUrl?: string
  publishedAt: string
}

// ─── Vagas de Emprego ─────────────────────────────────────────────────────────

export type JobType = 'seasonal' | 'permanent' | 'internship' | 'service'
export type JobApplicationStatus = 'pending' | 'accepted' | 'rejected'

export interface Job {
  id: string
  userId: string
  poster: Pick<User, 'id' | 'name' | 'username' | 'avatarUrl' | 'role'>
  title: string
  description: string
  type: JobType
  culture?: Culture
  salaryMin?: number
  salaryMax?: number
  city: string
  state: string
  latitude?: number
  longitude?: number
  distanceKm?: number
  deadline?: string
  active: boolean
  createdAt: string
}

export interface JobApplication {
  id: string
  jobId: string
  userId: string
  message?: string
  status: JobApplicationStatus
  createdAt: string
}

export interface ExternalJob {
  id: string
  externalId: string
  title: string
  company: string
  companyLogo?: string
  description: string
  employmentType?: string
  city?: string
  state?: string
  country?: string
  salaryMin?: number
  salaryMax?: number
  salaryCurrency?: string
  applyUrl: string
  source: string
  keywords?: string[]
  requiredSkills?: string[]
  postedAt?: string
  expiresAt?: string
  cachedAt: string
  distanceKm?: number
}

// ─── Marketplace ──────────────────────────────────────────────────────────────

export type ProductCategory =
  | 'seeds'
  | 'fertilizers'
  | 'pesticides'
  | 'equipment'
  | 'animals'
  | 'grains'
  | 'other'

export interface MarketplaceProduct {
  id: string
  userId: string
  seller: Pick<User, 'id' | 'name' | 'username' | 'avatarUrl' | 'role'>
  name: string
  description: string
  category: ProductCategory
  price: number
  unit: string
  images: string[]
  stock?: number
  city: string
  state: string
  latitude?: number
  longitude?: number
  distanceKm?: number
  active: boolean
  createdAt: string
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  hasNextPage: boolean
}

export interface CursorPaginatedResult<T> {
  items: T[]
  nextCursor?: string
  hasMore: boolean
}
