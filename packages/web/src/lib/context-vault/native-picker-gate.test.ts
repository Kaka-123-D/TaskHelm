import { describe, expect, it, vi } from 'vitest'
import { createNativePickerGate } from './native-picker-gate'

describe('createNativePickerGate', () => {
  it('prevents a second picker launch while one is still active', async () => {
    let resolveFirst!: () => void
    const gate = createNativePickerGate()
    const first = vi.fn(
      () =>
        new Promise<void>(resolve => {
          resolveFirst = resolve
        }),
    )
    const second = vi.fn(async () => {})

    const firstRun = gate.run(first)
    const secondRun = gate.run(second)

    expect(first).toHaveBeenCalledTimes(1)
    expect(second).not.toHaveBeenCalled()
    await expect(secondRun).resolves.toBe(false)

    resolveFirst()
    await expect(firstRun).resolves.toBe(true)
  })

  it('allows a new launch after the active picker finishes', async () => {
    const gate = createNativePickerGate()
    const first = vi.fn(async () => {})
    const second = vi.fn(async () => {})

    await expect(gate.run(first)).resolves.toBe(true)
    await expect(gate.run(second)).resolves.toBe(true)

    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(1)
  })
})
