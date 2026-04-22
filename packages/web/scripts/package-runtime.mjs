import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'

const webRoot = resolve(new URL('..', import.meta.url).pathname)
const standaloneDir = join(webRoot, '.next', 'standalone')
const staticDir = join(webRoot, '.next', 'static')
const outputDir = join(webRoot, 'runtime')
const packageJson = JSON.parse(readFileSync(join(webRoot, 'package.json'), 'utf-8'))
const version = packageJson.version ?? '0.0.0'
const bundleFile = `taskhelm-web-runtime-${version}.tgz`

function rewriteInternalSymlinks(rootDir, sourceRoot) {
  for (const entry of readdirSync(rootDir, { withFileTypes: true })) {
    const entryPath = join(rootDir, entry.name)
    if (entry.isDirectory()) {
      rewriteInternalSymlinks(entryPath, sourceRoot)
      continue
    }

    if (!entry.isSymbolicLink()) {
      continue
    }

    const linkTarget = readlinkSync(entryPath)
    if (!linkTarget.startsWith(sourceRoot)) {
      continue
    }

    const mappedTarget = linkTarget.replace(sourceRoot, outputStandaloneDir)
    const relativeTarget = relative(dirname(entryPath), mappedTarget)
    rmSync(entryPath, { force: true })
    symlinkSync(relativeTarget, entryPath)
  }
}

function materializeEntry(sourcePath, destinationPath) {
  rmSync(destinationPath, { recursive: true, force: true })
  cpSync(sourcePath, destinationPath, { recursive: true, dereference: true })
}

function materializeSymlink(entryPath) {
  const linkTarget = readlinkSync(entryPath)
  const resolvedTarget = resolve(dirname(entryPath), linkTarget)
  rmSync(entryPath, { recursive: true, force: true })
  cpSync(resolvedTarget, entryPath, { recursive: true, dereference: true })
}

function materializeRuntimeNodeModules(rootDir) {
  const topLevelNodeModules = join(rootDir, 'node_modules')
  const webNodeModules = join(rootDir, 'packages', 'web', 'node_modules')

  for (const entry of readdirSync(topLevelNodeModules, { withFileTypes: true })) {
    if (!entry.isSymbolicLink()) {
      continue
    }

    materializeSymlink(join(topLevelNodeModules, entry.name))
  }

  const pnpmDir = join(topLevelNodeModules, '.pnpm')
  const nextBundleEntry = readdirSync(pnpmDir, { withFileTypes: true }).find(
    entry => entry.isDirectory() && entry.name.startsWith('next@'),
  )

  if (!nextBundleEntry) {
    throw new Error(`Missing next runtime dependency bundle inside ${pnpmDir}`)
  }

  const nextNodeModulesDir = join(pnpmDir, nextBundleEntry.name, 'node_modules')
  for (const entry of readdirSync(nextNodeModulesDir, { withFileTypes: true })) {
    materializeEntry(join(nextNodeModulesDir, entry.name), join(webNodeModules, entry.name))
  }
}

if (!existsSync(standaloneDir)) {
  throw new Error(`Missing standalone output at ${standaloneDir}. Run the web build first.`)
}

rmSync(outputDir, { recursive: true, force: true })
mkdirSync(outputDir, { recursive: true })

const outputStandaloneDir = join(outputDir, 'standalone')
cpSync(standaloneDir, outputStandaloneDir, { recursive: true })
rewriteInternalSymlinks(outputStandaloneDir, standaloneDir)
materializeRuntimeNodeModules(outputStandaloneDir)

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
