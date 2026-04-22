import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

const repoRoot = process.cwd()
const sourceRoot = resolve(repoRoot, 'packages/web/runtime')
const targetRoot = resolve(repoRoot, 'runtime')

if (!existsSync(sourceRoot)) {
  throw new Error(`Missing packaged web runtime at ${sourceRoot}. Run packages/web build first.`)
}

rmSync(targetRoot, { recursive: true, force: true })
mkdirSync(targetRoot, { recursive: true })

for (const name of ['standalone', 'static', 'manifest.json']) {
  const from = resolve(sourceRoot, name)
  if (!existsSync(from)) continue
  cpSync(from, resolve(targetRoot, name), { recursive: true })
}
