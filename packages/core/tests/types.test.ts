import { describe, it, expect } from 'vitest'
import { DevServerStatus, NotificationLevel } from '../src/types'

describe('DevServerStatus', () => {
  it('has all expected values', () => {
    expect(DevServerStatus.warm).toBe('warm')
    expect(DevServerStatus.sleeping).toBe('sleeping')
    expect(DevServerStatus.starting).toBe('starting')
    expect(DevServerStatus.running).toBe('running')
    expect(DevServerStatus.failed).toBe('failed')
    expect(DevServerStatus.stopped).toBe('stopped')
  })
})

describe('NotificationLevel', () => {
  it('has all expected values', () => {
    expect(NotificationLevel.info).toBe('info')
    expect(NotificationLevel.warning).toBe('warning')
    expect(NotificationLevel.error).toBe('error')
    expect(NotificationLevel.success).toBe('success')
  })
})
