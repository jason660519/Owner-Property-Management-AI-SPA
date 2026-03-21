import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactCompiler: true,
  devIndicators: false,
  serverExternalPackages: ['chokidar'],
  // Raise Server Action body size limit to support document/contract uploads (default is 1MB)
  serverActions: {
    bodySizeLimit: '20mb',
  },
}

export default nextConfig
