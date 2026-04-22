import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['@taskhelm/core', '@taskhelm/supervisor', 'better-sqlite3'],
  webpack: config => {
    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      {
        module: /better-sqlite3[\\/]lib[\\/]database\.js$/,
        message: /Critical dependency: require function is used in a way in which dependencies cannot be statically extracted/,
      },
    ]

    return config
  },
}

export default nextConfig
