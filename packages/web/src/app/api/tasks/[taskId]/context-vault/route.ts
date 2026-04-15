import { NextResponse } from 'next/server'
import { TaskRepository } from '@taskhelm/core'
import { getDb } from '@/lib/db'
import type { PersistedContextVaultFile } from '@/lib/context-vault/persisted-vault'
import { readPersistedContextVault, resolveContextVault } from '@/lib/context-vault/persisted-vault'
import { resolveContextVaultSelection } from '@/lib/context-vault/selection'

type Params = { params: Promise<{ taskId: string }> }

interface ContextVaultPayload {
  readonly rootPath?: string | null
  readonly sources?: readonly string[]
  readonly files?: readonly PersistedContextVaultFile[]
  readonly selectedFile?: string | null
}

function hasOwn(body: ContextVaultPayload, key: keyof ContextVaultPayload) {
  return Object.prototype.hasOwnProperty.call(body, key)
}

function normalizePayload(body: ContextVaultPayload, persisted: ReturnType<typeof readPersistedContextVault>) {
  const sources = hasOwn(body, 'sources')
    ? Array.isArray(body.sources)
      ? body.sources.filter(Boolean)
      : []
    : persisted.sources
  const files = hasOwn(body, 'files')
    ? Array.isArray(body.files)
      ? body.files.filter(file => file?.relativePath && file?.absolutePath)
      : []
    : persisted.files
  const selectedFile = resolveContextVaultSelection({
    files,
    currentSelectedFile: hasOwn(body, 'selectedFile') ? body.selectedFile : persisted.selectedFile,
    persistedSelectedFile: persisted.selectedFile,
  })

  return {
    rootPath: hasOwn(body, 'rootPath') ? (body.rootPath ?? null) : persisted.rootPath,
    sources,
    files,
    selectedFile,
  }
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { taskId } = await params
    const taskRepo = new TaskRepository(getDb())
    const task = taskRepo.findById(taskId)

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const persisted = readPersistedContextVault(task)
    const resolved = resolveContextVault(task)

    if (
      JSON.stringify(persisted.files) !== JSON.stringify(resolved.files) ||
      persisted.rootPath !== resolved.rootPath ||
      persisted.selectedFile !== resolved.selectedFile
    ) {
      taskRepo.update(taskId, {
        context_vault_root_path: resolved.rootPath,
        context_vault_files_json: JSON.stringify(resolved.files),
        context_vault_selected_file: resolved.selectedFile,
      })
    }

    return NextResponse.json(resolved)
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { taskId } = await params
    const taskRepo = new TaskRepository(getDb())
    const task = taskRepo.findById(taskId)

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const normalized = normalizePayload((await request.json()) as ContextVaultPayload, readPersistedContextVault(task))
    taskRepo.update(taskId, {
      context_vault_root_path: normalized.rootPath,
      context_vault_sources_json: JSON.stringify(normalized.sources),
      context_vault_files_json: JSON.stringify(normalized.files),
      context_vault_selected_file: normalized.selectedFile,
    })

    return NextResponse.json(normalized)
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
