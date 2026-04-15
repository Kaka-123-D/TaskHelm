import { NextResponse } from 'next/server'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { execSync } from 'node:child_process'
import { classifyContextVaultFile, supportedContextVaultFile } from '@/lib/context-vault/file-preview'

interface DirEntry {
  readonly name: string
  readonly path: string
  readonly isGitRepo: boolean
}

interface FileEntry {
  readonly name: string
  readonly path: string
  readonly category: string
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const dirPath = searchParams.get('path') ?? os.homedir()

    const resolved = path.resolve(dirPath)

    if (!fs.existsSync(resolved)) {
      return NextResponse.json({ error: 'Directory not found' }, { status: 404 })
    }

    const stat = fs.statSync(resolved)
    if (!stat.isDirectory()) {
      return NextResponse.json({ error: 'Not a directory' }, { status: 400 })
    }

    const entries = fs.readdirSync(resolved, { withFileTypes: true })
    const dirs: DirEntry[] = entries
      .filter(e => e.isDirectory() && !e.name.startsWith('.'))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(e => {
        const fullPath = path.join(resolved, e.name)
        return {
          name: e.name,
          path: fullPath,
          isGitRepo: fs.existsSync(path.join(fullPath, '.git')),
        }
      })
    const files: FileEntry[] = entries
      .filter(e => e.isFile() && !e.name.startsWith('.') && supportedContextVaultFile(e.name))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(e => ({
        name: e.name,
        path: path.join(resolved, e.name),
        category: classifyContextVaultFile(e.name).category,
      }))

    const isGitRepo = fs.existsSync(path.join(resolved, '.git'))

    let gitRoot: string | null = null
    if (isGitRepo) {
      try {
        gitRoot = execSync('git rev-parse --show-toplevel', {
          cwd: resolved,
          stdio: 'pipe',
        }).toString().trim()
      } catch {
        gitRoot = resolved
      }
    }

    return NextResponse.json({
      current: resolved,
      parent: path.dirname(resolved),
      isGitRepo,
      gitRoot,
      dirs,
      files,
    })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
