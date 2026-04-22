import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const workspaceDirs = ['packages/core', 'packages/supervisor', 'packages/cli', 'packages/web']

function getSanitizedEnv() {
  const nextEnv = { ...process.env }

  for (const key of Object.keys(nextEnv)) {
    if (
      key.startsWith('npm_') ||
      key.startsWith('PNPM_') ||
      key === 'INIT_CWD'
    ) {
      delete nextEnv[key]
    }
  }

  return nextEnv
}

for (const workspaceDir of workspaceDirs) {
  const cwd = resolve(process.cwd(), workspaceDir)
  const result = spawnSync('pnpm', ['run', 'build'], {
    cwd,
    env: getSanitizedEnv(),
    stdio: 'inherit',
  })

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}
