import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const webRoot = resolve(new URL('..', import.meta.url).pathname)
const standaloneDir = join(webRoot, '.next', 'standalone')
const staticDir = join(webRoot, '.next', 'static')
const outputDir = join(webRoot, 'runtime')
const packageJson = JSON.parse(readFileSync(join(webRoot, 'package.json'), 'utf-8'))
const version = packageJson.version ?? '0.0.0'
const bundleFile = `taskhelm-web-runtime-${version}.tgz`

if (!existsSync(standaloneDir)) {
  throw new Error(`Missing standalone output at ${standaloneDir}. Run the web build first.`)
}

rmSync(outputDir, { recursive: true, force: true })
mkdirSync(outputDir, { recursive: true })

cpSync(standaloneDir, join(outputDir, 'standalone'), { recursive: true })

if (existsSync(staticDir)) {
  mkdirSync(join(outputDir, 'static'), { recursive: true })
  cpSync(staticDir, join(outputDir, 'static'), { recursive: true })
}

let sha256
let bundleArtifact = bundleFile

try {
  execFileSync('tar', ['-chzf', bundleFile, 'standalone', 'static'], {
    cwd: outputDir,
    env: {
      ...process.env,
      COPYFILE_DISABLE: '1',
      LANG: 'C',
      LC_ALL: 'C',
    },
    stdio: 'inherit',
  })

  sha256 = createHash('sha256').update(readFileSync(join(outputDir, bundleFile))).digest('hex')
} catch (error) {
  bundleArtifact = undefined
  sha256 = undefined
  console.warn(
    '[taskhelm:web] runtime archive packaging skipped; standalone runtime directory is still available.',
  )
}

writeFileSync(
  join(outputDir, 'manifest.json'),
  JSON.stringify(
    {
      version,
      generatedAt: new Date().toISOString(),
      bundleFile: bundleArtifact,
      sha256,
      entrypointCandidates: [
        'standalone/packages/web/server.js',
        'standalone/server.js',
      ],
    },
    null,
    2,
  ),
)
