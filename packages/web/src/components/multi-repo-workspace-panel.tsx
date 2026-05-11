'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Task, Project } from '@taskhelm/core'

interface SubrepoSummary {
  readonly repoPath: string
  readonly id: string | null
  readonly worktreePath: string | null
  readonly devServerState: string | null
}

interface WorkspaceResponse {
  readonly detectedSubrepos: readonly string[]
  readonly subrepos?: readonly SubrepoSummary[]
}

interface MultiRepoWorkspacePanelProps {
  readonly task: Task
  readonly project: Project
}

export function MultiRepoWorkspacePanel({ task, project }: MultiRepoWorkspacePanelProps) {
  const [detectedCount, setDetectedCount] = useState<number | null>(null)
  const [initializedCount, setInitializedCount] = useState(0)
  const [runningCount, setRunningCount] = useState(0)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/${task.id}/workspace`)
      if (!res.ok) return
      const payload = (await res.json()) as WorkspaceResponse
      setDetectedCount(payload.detectedSubrepos.length)
      const subrepos = payload.subrepos ?? []
      setInitializedCount(subrepos.filter(s => s.id !== null).length)
      setRunningCount(
        subrepos.filter(s => s.devServerState === 'running' || s.devServerState === 'starting').length,
      )
    } catch {
      // ignore — summary panel is best-effort
    }
  }, [task.id])

  useEffect(() => {
    void refresh()
    const intervalId = setInterval(refresh, 4000)
    return () => clearInterval(intervalId)
  }, [refresh])

  // Compute worktree group path: <worktree_root>/<task.key ?? task.id>/
  const worktreeRoot = project.worktree_root ?? `${project.local_repo_root}/.worktrees`
  const taskKey = task.key ?? task.id
  const worktreeGroupPath = `${worktreeRoot}/${taskKey}/`

  return (
    <div className="utility-panel">
      <div className="utility-panel-header">
        <h4 className="task-pane-label">Workspace</h4>
      </div>

      <div className="space-y-2 text-sm">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
            Worktree group
          </span>
          <div className="mt-1 break-all font-mono text-xs text-[var(--text-secondary)]">
            {worktreeGroupPath}
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 pt-1">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
              Initialized
            </span>
            <div className="mt-1 font-mono text-sm text-[var(--text-primary)]">
              {initializedCount}
              {detectedCount != null ? ` / ${detectedCount}` : ''} subrepos
            </div>
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
              Dev running
            </span>
            <div className="mt-1 font-mono text-sm text-[var(--text-primary)]">{runningCount}</div>
          </div>
        </div>
        <p className="utility-panel-copy">
          This is a multi-repo project. Configure each subrepo (branch, port, dev command) in the
          Subrepos panel below. There is no outer worktree — each subrepo lives at the group path.
        </p>
      </div>
    </div>
  )
}
