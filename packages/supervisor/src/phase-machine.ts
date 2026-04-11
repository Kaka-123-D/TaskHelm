import { type TaskPhaseValue } from '@taskhelm/core'

// Ordered phases — linear, deterministic
export const PHASE_ORDER: readonly TaskPhaseValue[] = [
  'context',
  'planning',
  'implementation',
  'spec_review',
  'code_review',
  'runtime_verification',
  'final_summary',
]

/**
 * Returns the index of a phase in PHASE_ORDER.
 */
export function phaseIndex(phase: TaskPhaseValue): number {
  return PHASE_ORDER.indexOf(phase)
}

/**
 * Returns true only if `to` is exactly the next phase after `from`.
 * No skipping forward, no backwards movement, no same-phase.
 */
export function canTransition(from: TaskPhaseValue, to: TaskPhaseValue): boolean {
  const fromIdx = phaseIndex(from)
  const toIdx = phaseIndex(to)
  return toIdx === fromIdx + 1
}

/**
 * Returns the next phase after `current`, or null if already at final_summary.
 */
export function nextPhase(current: TaskPhaseValue): TaskPhaseValue | null {
  const idx = phaseIndex(current)
  if (idx < 0 || idx >= PHASE_ORDER.length - 1) {
    return null
  }
  return PHASE_ORDER[idx + 1]
}
