import type { AgentRun } from '@taskhelm/core'
import { StatusBadge } from '@/components/status-badge'

interface AgentRunListProps {
  agentRuns: readonly AgentRun[]
}

function formatTimestamp(ts: string | null): string {
  if (!ts) return '—'
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function formatDuration(startedAt: string | null, finishedAt: string | null): string {
  if (!startedAt || !finishedAt) return '—'
  const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime()
  if (ms < 1000) return `${ms}ms`
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rem = s % 60
  return `${m}m ${rem}s`
}

export function AgentRunList({ agentRuns }: AgentRunListProps) {
  if (agentRuns.length === 0) {
    return (
      <div className="text-sm text-zinc-500 text-center py-6">
        No agent runs yet
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-zinc-700 text-left">
            <th className="px-3 py-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">Kind</th>
            <th className="px-3 py-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">Role</th>
            <th className="px-3 py-2 text-xs font-medium text-zinc-500 uppercase tracking-wider w-24">Status</th>
            <th className="px-3 py-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">Started</th>
            <th className="px-3 py-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">Duration</th>
            <th className="px-3 py-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">Error</th>
          </tr>
        </thead>
        <tbody>
          {agentRuns.map(run => (
            <tr key={run.id} className="border-b border-zinc-800 hover:bg-zinc-900/30 transition-colors">
              <td className="px-3 py-2">
                <span className="font-mono text-xs text-zinc-300">{run.kind.replace(/_/g, ' ')}</span>
              </td>
              <td className="px-3 py-2 text-xs text-zinc-400">
                {run.role ?? '—'}
              </td>
              <td className="px-3 py-2">
                <StatusBadge value={run.status} />
              </td>
              <td className="px-3 py-2 text-xs text-zinc-400 font-mono">
                {formatTimestamp(run.started_at)}
              </td>
              <td className="px-3 py-2 text-xs text-zinc-400 font-mono">
                {formatDuration(run.started_at, run.finished_at)}
              </td>
              <td className="px-3 py-2">
                {run.error_message ? (
                  <span className="text-xs text-red-400 line-clamp-2" title={run.error_message}>
                    {run.error_message}
                  </span>
                ) : (
                  <span className="text-xs text-zinc-600">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
