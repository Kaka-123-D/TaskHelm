import type { Task } from '@taskhelm/core'
import { StatusBadge } from '@/components/status-badge'

interface DevServerControlsProps {
  task: Task
}

const STATE_DESCRIPTIONS: Record<string, string> = {
  warm: 'Server is warm and ready',
  sleeping: 'Server is sleeping to save resources',
  starting: 'Server is starting up...',
  running: 'Server is running and accepting connections',
  failed: 'Server failed to start',
  stopped: 'Server is stopped',
}

export function DevServerControls({ task }: DevServerControlsProps) {
  const state = task.dev_server_state
  const port = task.port

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-400">State:</span>
          {state ? (
            <StatusBadge value={state} />
          ) : (
            <span className="text-sm text-zinc-600">not configured</span>
          )}
        </div>
        {port != null && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400">Port:</span>
            <span className="font-mono text-sm text-zinc-300">{port}</span>
            {state === 'running' && (
              <a
                href={`http://localhost:${port}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                open ↗
              </a>
            )}
          </div>
        )}
      </div>

      {state && (
        <p className="text-xs text-zinc-500">
          {STATE_DESCRIPTIONS[state] ?? state}
        </p>
      )}

      <div className="flex gap-2">
        <button
          disabled
          className="px-3 py-1.5 text-xs rounded border border-zinc-700 text-zinc-400 bg-zinc-900 cursor-not-allowed opacity-50"
          title="Use CLI to control dev server"
        >
          Start
        </button>
        <button
          disabled
          className="px-3 py-1.5 text-xs rounded border border-zinc-700 text-zinc-400 bg-zinc-900 cursor-not-allowed opacity-50"
          title="Use CLI to control dev server"
        >
          Stop
        </button>
      </div>
      <p className="text-xs text-zinc-600">
        Dev server control is managed via CLI:{' '}
        <code className="font-mono">taskhelm dev start --task {task.id.slice(0, 8)}</code>
      </p>
    </div>
  )
}
