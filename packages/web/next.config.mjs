import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  outputFileTracingRoot: resolve(packageRoot, '..', '..'),
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
