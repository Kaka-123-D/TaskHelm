import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { discoverSubrepos } from '@/lib/workspace/subrepo-discovery'

let repoRoot: string

beforeEach(() => {
  repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'taskhelm-subrepos-'))
  fs.mkdirSync(path.join(repoRoot, '.git'))
})

afterEach(() => {
  fs.rmSync(repoRoot, { recursive: true, force: true })
})

describe('discoverSubrepos', () => {
  it('returns nested repos sorted by relative path and excludes the root repo', () => {
    fs.mkdirSync(path.join(repoRoot, 'apps', 'web', '.git'), { recursive: true })
    fs.mkdirSync(path.join(repoRoot, 'packages', 'core', '.git'), { recursive: true })

    expect(discoverSubrepos(repoRoot)).toEqual([
      path.join('apps', 'web'),
      path.join('packages', 'core'),
    ])
  })

  it('ignores node_modules and .worktrees', () => {
    fs.mkdirSync(path.join(repoRoot, 'node_modules', 'fake', '.git'), { recursive: true })
    fs.mkdirSync(path.join(repoRoot, '.worktrees', 'nested', '.git'), { recursive: true })

    expect(discoverSubrepos(repoRoot)).toEqual([])
  })
})
