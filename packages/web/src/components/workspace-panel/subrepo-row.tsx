'use client'

import { GlassButton } from '@/components/design-system/glass-button'
import { GlassInput } from '@/components/design-system/glass-input'
import { GlassSelect } from '@/components/design-system/glass-select'

export interface SubrepoExistingWorktreeOption {
  readonly path: string
  readonly name: string
  readonly branch: string
}

export interface SubrepoRowState {
  readonly repoPath: string
  readonly id: string | null
  readonly branchName: string | null
  readonly worktreePath: string | null
  readonly preferredPort: number | null
  readonly devCommand: string | null
  readonly devServerState: string | null
  readonly availableExistingWorktrees: readonly SubrepoExistingWorktreeOption[]
}

export interface SubrepoRowEditableState {
  readonly branchInput: string
  readonly portInput: string
  readonly devCommandInput: string
  readonly selectedExistingWorktreePath: string
}

export interface SubrepoRowProps {
  readonly state: SubrepoRowState
  readonly editable: SubrepoRowEditableState
  readonly busy: boolean
  readonly onBranchChange: (value: string) => void
  readonly onPortChange: (value: string) => void
  readonly onDevCommandChange: (value: string) => void
  readonly onSelectedExistingWorktreeChange: (value: string) => void
  readonly onStartDev: () => void
  readonly onStopDev: () => void
}

export function SubrepoRow({
  state,
  editable,
  busy,
  onBranchChange,
  onPortChange,
  onDevCommandChange,
  onSelectedExistingWorktreeChange,
  onStartDev,
  onStopDev,
}: SubrepoRowProps) {
  const initialized = state.id !== null && state.worktreePath !== null
  const running = state.devServerState === 'running' || state.devServerState === 'starting'
  const hasAttachable = !initialized && state.availableExistingWorktrees.length > 0

  return (
    <div className="rounded-md border border-[var(--border-soft)] p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-[var(--text-secondary)]">{state.repoPath}</span>
        <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
          {initialized ? (state.devServerState ?? 'stopped') : 'uninitialized'}
        </span>
      </div>

      {hasAttachable ? (
        <GlassSelect
          label="Attach existing worktree"
          value={editable.selectedExistingWorktreePath}
          onChange={event => onSelectedExistingWorktreeChange(event.target.value)}
          options={[
            { value: '', label: 'Create a new worktree' },
            ...state.availableExistingWorktrees.map(option => ({
              value: option.path,
              label: `${option.name} (${option.branch})`,
            })),
          ]}
        />
      ) : null}

      <GlassInput
        label="Branch"
        value={editable.branchInput}
        onChange={event => onBranchChange(event.target.value)}
        placeholder="feature/subrepo-branch"
      />

      {initialized ? (
        <>
          <GlassInput
            label="Preferred Port"
            value={editable.portInput}
            onChange={event => onPortChange(event.target.value)}
            placeholder="3001"
            type="number"
          />
          <GlassInput
            label="Dev Command (override)"
            value={editable.devCommandInput}
            onChange={event => onDevCommandChange(event.target.value)}
            placeholder="yarn dev"
          />
          <div className="flex gap-2">
            {running ? (
              <GlassButton
                variant="danger"
                onClick={onStopDev}
                loading={busy}
                className="text-xs px-3 py-1.5"
              >
                Stop Dev
              </GlassButton>
            ) : (
              <GlassButton
                variant="primary"
                onClick={onStartDev}
                loading={busy}
                className="text-xs px-3 py-1.5"
              >
                Start Dev
              </GlassButton>
            )}
          </div>
          {state.worktreePath ? (
            <div className="text-[11px] font-mono text-[var(--text-muted)] break-all">
              {state.worktreePath}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
