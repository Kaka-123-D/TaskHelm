import { describe, expect, it } from 'vitest'
import { getTaskPriorityLabel } from '@/lib/tasks/priority-label'

describe('getTaskPriorityLabel', () => {
  it('maps known priority values to labels', () => {
    expect(getTaskPriorityLabel(1)).toBe('Critical')
    expect(getTaskPriorityLabel(2)).toBe('High')
    expect(getTaskPriorityLabel(3)).toBe('Normal')
    expect(getTaskPriorityLabel(4)).toBe('Low')
    expect(getTaskPriorityLabel(5)).toBe('Backlog')
  })

  it('falls back to the numeric value for unknown priorities', () => {
    expect(getTaskPriorityLabel(9)).toBe('9')
  })
})
