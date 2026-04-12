import type { ReviewGate } from '@taskhelm/core'
import { StatusBadge } from '@/components/status-badge'

interface ReviewPipelineProps {
  gates: readonly ReviewGate[]
}

const GATE_ORDER: Array<ReviewGate['gate_type']> = [
  'spec_compliance',
  'code_quality',
  'runtime_verification',
]

const GATE_LABELS: Record<string, string> = {
  spec_compliance: 'Spec Compliance',
  code_quality: 'Code Quality',
  runtime_verification: 'Runtime Verification',
}

export function ReviewPipeline({ gates }: ReviewPipelineProps) {
  const gateMap = new Map(gates.map(g => [g.gate_type, g]))

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {GATE_ORDER.map((gateType, index) => {
        const gate = gateMap.get(gateType)
        const status = gate?.status ?? 'pending'

        return (
          <div key={gateType} className="flex items-center gap-2">
            {index > 0 && (
              <svg
                className="w-4 h-4 text-zinc-600 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            )}
            <div className="flex flex-col items-center gap-1.5 min-w-[120px] p-3 rounded-lg border border-zinc-800 bg-zinc-900/30">
              <span className="text-xs font-medium text-zinc-300 text-center">
                {GATE_LABELS[gateType]}
              </span>
              <StatusBadge value={status} />
              {gate?.closed_at && (
                <span className="text-xs text-zinc-600 font-mono">
                  {new Date(gate.closed_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
