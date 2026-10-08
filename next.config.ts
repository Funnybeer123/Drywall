import type { NextConfig } from 'next'

// NEXT_STANDALONE=true builds a self-contained server for hosts like Azure App Service.
// Image optimization is off there because the build machine's `sharp` binary may not match the host.
const standalone = process.env.NEXT_STANDALONE === 'true'

const nextConfig: NextConfig = {
  ...(standalone && { output: 'standalone' }),
  // PGlite ships WASM + data files that must be loaded from node_modules at runtime.
  serverExternalPackages: ['@electric-sql/pglite', '@react-pdf/renderer'],
  experimental: {
    serverActions: { bodySizeLimit: '4mb' },
  },
  images: {
    unoptimized: standalone,
    remotePatterns: [{ protocol: 'https', hostname: '*.public.blob.vercel-storage.com' }],
  },
}

export default nextConfig
