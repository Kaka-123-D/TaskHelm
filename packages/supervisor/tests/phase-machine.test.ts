import { describe, it, expect } from 'vitest'
import { canTransition, nextPhase, phaseIndex } from '../src/phase-machine.js'
import type { TaskPhaseValue } from '@taskhelm/core'

const phases: readonly TaskPhaseValue[] = [
  'context',
  'planning',
  'implementation',
  'spec_review',
  'code_review',
  'runtime_verification',
  'final_summary',
]

describe('phaseIndex', () => {
  it('returns the correct index for each phase', () => {
    expect(phaseIndex('context')).toBe(0)
    expect(phaseIndex('planning')).toBe(1)
    expect(phaseIndex('implementation')).toBe(2)
    expect(phaseIndex('spec_review')).toBe(3)
    expect(phaseIndex('code_review')).toBe(4)
    expect(phaseIndex('runtime_verification')).toBe(5)
    expect(phaseIndex('final_summary')).toBe(6)
  })
})

describe('canTransition', () => {
  it('allows all valid forward (one step) transitions', () => {
    expect(canTransition('context', 'planning')).toBe(true)
    expect(canTransition('planning', 'implementation')).toBe(true)
    expect(canTransition('implementation', 'spec_review')).toBe(true)
    expect(canTransition('spec_review', 'code_review')).toBe(true)
    expect(canTransition('code_review', 'runtime_verification')).toBe(true)
    expect(canTransition('runtime_verification', 'final_summary')).toBe(true)
  })

  it('rejects skip transitions (jumping more than one step forward)', () => {
    expect(canTransition('context', 'implementation')).toBe(false)
    expect(canTransition('context', 'spec_review')).toBe(false)
    expect(canTransition('context', 'final_summary')).toBe(false)
    expect(canTransition('planning', 'spec_review')).toBe(false)
    expect(canTransition('implementation', 'code_review')).toBe(false)
  })

  it('rejects backward transitions', () => {
    expect(canTransition('planning', 'context')).toBe(false)
    expect(canTransition('implementation', 'planning')).toBe(false)
    expect(canTransition('spec_review', 'implementation')).toBe(false)
    expect(canTransition('final_summary', 'context')).toBe(false)
  })

  it('rejects same-phase transitions', () => {
    for (const phase of phases) {
      expect(canTransition(phase, phase)).toBe(false)
    }
  })
})

describe('nextPhase', () => {
  it('returns the correct next phase for each phase', () => {
    expect(nextPhase('context')).toBe('planning')
    expect(nextPhase('planning')).toBe('implementation')
    expect(nextPhase('implementation')).toBe('spec_review')
    expect(nextPhase('spec_review')).toBe('code_review')
    expect(nextPhase('code_review')).toBe('runtime_verification')
    expect(nextPhase('runtime_verification')).toBe('final_summary')
  })

  it('returns null for final_summary', () => {
    expect(nextPhase('final_summary')).toBe(null)
  })
})
