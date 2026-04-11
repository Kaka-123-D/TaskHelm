interface StatusBadgeProps {
  value: string
  variant?: 'status' | 'phase' | 'review'
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-zinc-800 text-zinc-400',
  ready: 'bg-blue-900/30 text-blue-400',
  running: 'bg-green-900/30 text-green-400',
  reviewing: 'bg-yellow-900/30 text-yellow-400',
  blocked: 'bg-red-900/30 text-red-400',
  done: 'bg-emerald-900/30 text-emerald-400',
  archived: 'bg-zinc-800 text-zinc-500',
  pending: 'bg-zinc-800 text-zinc-400',
  open: 'bg-blue-900/30 text-blue-400',
  passed: 'bg-emerald-900/30 text-emerald-400',
  failed: 'bg-red-900/30 text-red-400',
  // phases
  context: 'bg-zinc-800 text-zinc-400',
  planning: 'bg-blue-900/30 text-blue-400',
  implementation: 'bg-violet-900/30 text-violet-400',
  spec_review: 'bg-yellow-900/30 text-yellow-400',
  code_review: 'bg-orange-900/30 text-orange-400',
  runtime_verification: 'bg-cyan-900/30 text-cyan-400',
  final_summary: 'bg-emerald-900/30 text-emerald-400',
}

export function StatusBadge({ value }: StatusBadgeProps) {
  const color = STATUS_COLORS[value] ?? 'bg-zinc-800 text-zinc-400'
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${color}`}>
      {value.replace(/_/g, ' ')}
    </span>
  )
}
