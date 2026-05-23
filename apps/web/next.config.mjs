/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { typedRoutes: true },
  images: {
    domains: ['media.agrolink.com.br', 'localhost'],
  },
}

export default nextConfig
