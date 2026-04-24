import { execFileSync, spawn } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

function parseArgs(argv) {
  let coreTarball = ''
  let supervisorTarball = ''
  let cliTarball = ''
  let taskhelmTarball = ''
  let port = '4122'

  for (let index = 2; index < argv.length; index += 1) {
    const value = argv[index]
    if (value === '--core-tarball') {
      coreTarball = resolve(argv[index + 1] ?? '')
      index += 1
      continue
    }

    if (value === '--supervisor-tarball') {
      supervisorTarball = resolve(argv[index + 1] ?? '')
      index += 1
      continue
    }

    if (value === '--cli-tarball') {
      cliTarball = resolve(argv[index + 1] ?? '')
      index += 1
      continue
    }

    if (value === '--taskhelm-tarball') {
      taskhelmTarball = resolve(argv[index + 1] ?? '')
      index += 1
      continue
    }

    if (value === '--port') {
      port = argv[index + 1] ?? port
      index += 1
      continue
    }

    throw new Error(`Unknown argument: ${value}`)
  }

  if (!coreTarball || !supervisorTarball || !cliTarball || !taskhelmTarball) {
    throw new Error(
      'Usage: node scripts/verify-packed-install.mjs --core-tarball <path> --supervisor-tarball <path> --cli-tarball <path> --taskhelm-tarball <path> [--port 4122]',
    )
  }

  return {
    coreTarball,
    supervisorTarball,
    cliTarball,
    taskhelmTarball,
    port: Number(port),
  }
}

function installPackedPackages(projectRoot, {
  coreTarball,
  supervisorTarball,
  cliTarball,
  taskhelmTarball,
}) {
  writeFileSync(
    join(projectRoot, 'package.json'),
    JSON.stringify(
      {
        name: 'taskhelm-packed-install-check',
        private: true,
        overrides: {
          '@taskhelm/core': `file:${coreTarball}`,
          '@taskhelm/supervisor': `file:${supervisorTarball}`,
          '@taskhelm/cli': `file:${cliTarball}`,
        },
      },
      null,
      2,
    ),
  )

  const npmBinary = process.env.TASKHELM_NPM_BIN ?? 'npm'
  execFileSync(
    npmBinary,
    ['install', taskhelmTarball],
    {
      cwd: projectRoot,
      stdio: 'inherit',
      env: {
        ...process.env,
        CI: '1',
      },
    },
  )
}

function findFile(rootDir, matcher, maxDepth = 8, depth = 0) {
  if (depth > maxDepth || !existsSync(rootDir)) return null

  for (const entry of readdirSync(rootDir, { withFileTypes: true })) {
    const entryPath = join(rootDir, entry.name)
    if (entry.isFile() && matcher(entryPath)) {
      return entryPath
    }

    if (entry.isDirectory()) {
      const match = findFile(entryPath, matcher, maxDepth, depth + 1)
      if (match) return match
    }
  }

  return null
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function resolveCliRuntimeCacheModule(projectRoot) {
  const nodeModulesRoot = join(projectRoot, 'node_modules')
  const match = findFile(
    nodeModulesRoot,
    candidate => candidate.replace(/\\/g, '/').endsWith('@taskhelm/cli/dist/src/launcher/runtime-cache.js'),
  )

  if (!match) {
    throw new Error('Packed install is missing the @taskhelm/cli launcher runtime-cache entrypoint')
  }

  return match
}

function resolveTaskHelmPackageRoot(projectRoot) {
  const nodeModulesRoot = join(projectRoot, 'node_modules')
  const packageJsonPath = findFile(
    nodeModulesRoot,
    candidate => candidate.replace(/\\/g, '/').endsWith('/taskhelm/package.json'),
  )

  if (!packageJsonPath) {
    throw new Error('Packed install is missing the taskhelm package root')
  }

  return dirname(packageJsonPath)
}

function resolveInstalledBin(packageRoot, binName) {
  const packageJson = readJson(join(packageRoot, 'package.json'))
  const relativeBin = typeof packageJson.bin === 'string' ? packageJson.bin : packageJson.bin?.[binName]
  if (typeof relativeBin !== 'string' || relativeBin.length === 0) {
    throw new Error(`Installed package at ${packageRoot} is missing bin metadata for ${binName}`)
  }
  return resolve(packageRoot, relativeBin)
}

async function waitForServer(url, timeoutMs = 90000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // keep polling
    }
    await new Promise(resolvePromise => setTimeout(resolvePromise, 300))
  }

  throw new Error(`Packed install verification server did not become ready at ${url}`)
}

async function main() {
  const { coreTarball, supervisorTarball, cliTarball, taskhelmTarball, port } = parseArgs(process.argv)
  const installRoot = mkdtempSync(join(tmpdir(), 'taskhelm-packed-install-'))
  const projectRoot = join(installRoot, 'project')
  const taskhelmHome = join(installRoot, 'taskhelm-home')

  mkdirSync(projectRoot, { recursive: true })

  try {
    installPackedPackages(projectRoot, {
      coreTarball,
      supervisorTarball,
      cliTarball,
      taskhelmTarball,
    })

    process.env.TASKHELM_HOME = taskhelmHome
    const taskHelmPackageRoot = resolveTaskHelmPackageRoot(projectRoot)
    const taskhelmBin = resolveInstalledBin(taskHelmPackageRoot, 'taskhelm')
    if (!existsSync(taskhelmBin)) {
      throw new Error(`Installed taskhelm binary is missing: ${taskhelmBin}`)
    }

    let stdoutLog = ''
    let stderrLog = ''
    const child = spawn(process.execPath, [taskhelmBin], {
      cwd: projectRoot,
      env: {
        ...process.env,
        TASKHELM_HOME: taskhelmHome,
        TASKHELM_OPEN_BROWSER: '0',
        TASKHELM_PORT: String(port),
        PORT: String(port),
        HOSTNAME: '127.0.0.1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    child.stdout?.on('data', chunk => {
      stdoutLog += chunk.toString('utf8')
    })
    child.stderr?.on('data', chunk => {
      stderrLog += chunk.toString('utf8')
    })

    try {
      await waitForServer(`http://127.0.0.1:${port}`)
      process.stdout.write(`Packed install verification passed at http://127.0.0.1:${port}\n`)
    } catch (error) {
      if (stdoutLog) {
        process.stdout.write(`taskhelm stdout:\n${stdoutLog}\n`)
      }
      if (stderrLog) {
        process.stderr.write(`taskhelm stderr:\n${stderrLog}\n`)
      }
      throw error
    } finally {
      child.kill('SIGTERM')
    }
  } finally {
    rmSync(installRoot, { recursive: true, force: true })
  }
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
