'use client'

import { useEvents, type TaskHelmEvent } from '@/lib/use-events'

export function ActivityFeed() {
  const { events, connected } = useEvents()

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-sm font-semibold text-zinc-300">Activity</h3>
        <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
      </div>
      {events.length === 0 ? (
        <p className="text-xs text-zinc-600">No recent activity</p>
      ) : (
        <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto">
          {events.map(event => (
            <EventItem key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  )
}

function EventItem({ event }: { event: TaskHelmEvent }) {
  const label = formatEventLabel(event.event_type)
  const time = new Date(event.created_at).toLocaleTimeString()

  return (
    <div className="text-xs border-l-2 border-zinc-800 pl-2 py-1">
      <span className="text-zinc-400">{time}</span>
      <span className="ml-2 text-zinc-300">{label}</span>
      <span className="ml-1 text-zinc-600 font-mono">{event.entity_id.slice(0, 8)}</span>
    </div>
  )
}

function formatEventLabel(type: string): string {
  const labels: Record<string, string> = {
    'task.phase.advanced': 'Phase advanced',
    'task.blocked': 'Task blocked',
    'task.done': 'Task completed',
    'agent.run.started': 'Agent started',
    'project.created': 'Project created',
    'task.created': 'Task created',
  }
  return labels[type] ?? type.replace(/\./g, ' ')
}
