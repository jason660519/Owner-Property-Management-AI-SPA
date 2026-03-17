import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactCompiler: true,
  devIndicators: false,
  serverExternalPackages: ['chokidar'],
  // Raise Server Action body size limit to support photo uploads (default is 1MB)
  serverActions: {
    bodySizeLimit: '10mb',
  },
}

export default nextConfig
