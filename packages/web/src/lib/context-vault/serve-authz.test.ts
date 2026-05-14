import { describe, expect, it } from 'vitest'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import type { Task } from '@taskhelm/core'
import { authorizeServePath, FileServeAuthorizationError } from './serve-authz'

function makeTask(sources: readonly string[]): Task {
  return {
    id: 't',
    project_id: 'p',
    key: null,
    title: 't',
    goal: null,
    refer_link: null,
    priority: 3,
    branch_name: null,
    workspace_name: null,
    workspace_branch: null,
    workspace_subrepo_branches_json: null,
    preferred_port: null,
    worktree_path: null,
    port: null,
    dev_server_state: null,
    context_vault_root_path: null,
    context_vault_sources_json: JSON.stringify(sources),
    context_vault_files_json: null,
    context_vault_selected_file: null,
    latest_blocker: null,
    created_at: '2026-05-14T00:00:00.000Z',
    updated_at: '2026-05-14T00:00:00.000Z',
  }
}

describe('authorizeServePath', () => {
  it('allows files inside a registered source root', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'taskhelm-authz-'))
    try {
      const filePath = path.join(root, 'image.png')
      fs.writeFileSync(filePath, Buffer.from([0]))

      const result = authorizeServePath(makeTask([root]), filePath)
      expect(result.canonicalPath).toBe(fs.realpathSync.native(filePath))
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  })

  it('allows the source root itself when it points at a single file', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'taskhelm-authz-singlefile-'))
    try {
      const filePath = path.join(root, 'doc.md')
      fs.writeFileSync(filePath, '# hi')

      const result = authorizeServePath(makeTask([filePath]), filePath)
      expect(result.canonicalPath).toBe(fs.realpathSync.native(filePath))
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  })

  it('rejects paths outside the registered roots', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'taskhelm-authz-out-'))
    try {
      const outside = '/etc/passwd'
      expect(() =>
        authorizeServePath(makeTask([root]), outside),
      ).toThrow(FileServeAuthorizationError)
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  })

  it('rejects path-traversal attempts even when they resolve outside the root', () => {
    const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'taskhelm-authz-traversal-'))
    try {
      const inside = path.join(parent, 'inside')
      const outside = path.join(parent, 'outside')
      fs.mkdirSync(inside)
      fs.mkdirSync(outside)
      fs.writeFileSync(path.join(outside, 'secret.txt'), 'shh')

      const traversal = path.join(inside, '..', 'outside', 'secret.txt')
      expect(() =>
        authorizeServePath(makeTask([inside]), traversal),
      ).toThrow(FileServeAuthorizationError)
    } finally {
      fs.rmSync(parent, { recursive: true, force: true })
    }
  })

  it('rejects when the task has no registered absolute sources', () => {
    expect(() =>
      authorizeServePath(makeTask([]), '/Users/me/file.png'),
    ).toThrow(FileServeAuthorizationError)
    expect(() =>
      // Native-picker root names (no leading slash) aren't authoritative.
      authorizeServePath(makeTask(['just-a-folder-name']), '/Users/me/file.png'),
    ).toThrow(FileServeAuthorizationError)
  })

  it('rejects relative requested paths', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'taskhelm-authz-rel-'))
    try {
      expect(() =>
        authorizeServePath(makeTask([root]), 'image.png'),
      ).toThrow(FileServeAuthorizationError)
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  })
})
