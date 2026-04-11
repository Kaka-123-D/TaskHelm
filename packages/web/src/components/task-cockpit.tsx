import type { Task, AgentRun, ReviewGate, AppEvent } from '@taskhelm/core'
import { StatusBadge } from '@/components/status-badge'
import { AgentRunList } from '@/components/agent-run-list'
import { ReviewPipeline } from '@/components/review-pipeline'
import { DevServerControls } from '@/components/dev-server-controls'

interface TaskCockpitProps {
  task: Task
  agentRuns: readonly AgentRun[]
  reviewGates: readonly ReviewGate[]
  recentEvents: readonly AppEvent[]
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/40">
        <h3 className="text-sm font-medium text-zinc-300">{title}</h3>
      </div>
      <div className="px-4 py-4">
        {children}
      </div>
    </div>
  )
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <span className="text-sm text-zinc-500 w-36 shrink-0">{label}</span>
      <span className="text-sm text-zinc-200">{value}</span>
    </div>
  )
}

export function TaskCockpit({ task, agentRuns, reviewGates, recentEvents }: TaskCockpitProps) {
  const recentEventsSlice = [...recentEvents].slice(-10).reverse()

  return (
    <div className="space-y-4">
      {/* Task Summary */}
      <Section title="Task Summary">
        <div className="divide-y divide-zinc-800/60">
          <MetaRow label="Title" value={<span className="font-medium">{task.title}</span>} />
          {task.key && <MetaRow label="Key" value={<span className="font-mono">{task.key}</span>} />}
          {task.goal && (
            <MetaRow label="Goal" value={<span className="text-zinc-300 whitespace-pre-line">{task.goal}</span>} />
          )}
          <MetaRow
            label="Status"
            value={<StatusBadge value={task.status} variant="status" />}
          />
          <MetaRow
            label="Phase"
            value={<StatusBadge value={task.phase} variant="phase" />}
          />
          <MetaRow label="Priority" value={<span className="font-mono">{task.priority}</span>} />
          {task.source_type && (
            <MetaRow
              label="Source"
              value={
                <span>
                  <span className="font-mono text-xs bg-zinc-800 px-1.5 py-0.5 rounded">{task.source_type}</span>
                  {task.source_ref && (
                    <span className="ml-1 font-mono text-zinc-400">{task.source_ref}</span>
                  )}
                </span>
              }
            />
          )}
          <MetaRow
            label="Created"
            value={
              <span className="font-mono text-xs text-zinc-400">
                {new Date(task.created_at).toLocaleString()}
              </span>
            }
          />
          <MetaRow
            label="Updated"
            value={
              <span className="font-mono text-xs text-zinc-400">
                {new Date(task.updated_at).toLocaleString()}
              </span>
            }
          />
        </div>
      </Section>

      {/* Workspace */}
      <Section title="Workspace">
        <div className="divide-y divide-zinc-800/60">
          {task.branch_name ? (
            <MetaRow
              label="Branch"
              value={<span className="font-mono text-sm">{task.branch_name}</span>}
            />
          ) : (
            <MetaRow label="Branch" value={<span className="text-zinc-600">not assigned</span>} />
          )}
          {task.worktree_path && (
            <MetaRow
              label="Worktree"
              value={<span className="font-mono text-xs text-zinc-400 break-all">{task.worktree_path}</span>}
            />
          )}
          {task.port != null && (
            <MetaRow label="Port" value={<span className="font-mono">{task.port}</span>} />
          )}
          {task.dev_server_state && (
            <MetaRow
              label="Dev Server"
              value={<StatusBadge value={task.dev_server_state} />}
            />
          )}
        </div>
      </Section>

      {/* Review Pipeline */}
      <Section title="Review Pipeline">
        <ReviewPipeline gates={reviewGates} />
      </Section>

      {/* Agent Runs */}
      <Section title={`Agent Runs (${agentRuns.length})`}>
        <AgentRunList agentRuns={agentRuns} />
      </Section>

      {/* Dev Server Controls */}
      <Section title="Dev Server Controls">
        <DevServerControls task={task} />
      </Section>

      {/* Recent Events */}
      <Section title="Recent Events">
        {recentEventsSlice.length === 0 ? (
          <p className="text-sm text-zinc-500 text-center py-4">No events yet</p>
        ) : (
          <div className="space-y-1">
            {recentEventsSlice.map(event => (
              <div key={event.id} className="flex items-start gap-3 py-1.5 border-b border-zinc-800/60 last:border-0">
                <span className="font-mono text-xs text-zinc-600 shrink-0 pt-0.5">
                  {new Date(event.created_at).toLocaleTimeString()}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-zinc-300">{event.event_type}</span>
                  <span className="text-xs text-zinc-500 ml-2">{event.entity_type}/{event.entity_id.slice(0, 8)}</span>
                  {event.payload_json && (
                    <pre className="mt-1 text-xs text-zinc-500 font-mono truncate">
                      {event.payload_json}
                    </pre>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Blocker */}
      {task.latest_blocker && (
        <div className="border border-red-900/50 rounded-lg p-4 bg-red-950/20">
          <h3 className="text-sm font-medium text-red-400 mb-1">Active Blocker</h3>
          <p className="text-sm text-red-300">{task.latest_blocker}</p>
        </div>
      )}
    </div>
  )
}
