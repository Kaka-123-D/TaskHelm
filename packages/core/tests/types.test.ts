import { describe, it, expect } from 'vitest'
import {
  AgentRunKind,
  AgentRunStatus,
  ReviewGateType,
  ReviewGateStatus,
  DevServerStatus,
  NotificationLevel,
} from '../src/types'

describe('AgentRunKind', () => {
  it('has all expected values', () => {
    expect(AgentRunKind.implementer).toBe('implementer')
    expect(AgentRunKind.spec_review).toBe('spec_review')
    expect(AgentRunKind.code_review).toBe('code_review')
    expect(AgentRunKind.runtime_verify).toBe('runtime_verify')
    expect(AgentRunKind.manager_summary).toBe('manager_summary')
  })
})

describe('AgentRunStatus', () => {
  it('has all expected values', () => {
    expect(AgentRunStatus.pending).toBe('pending')
    expect(AgentRunStatus.running).toBe('running')
    expect(AgentRunStatus.completed).toBe('completed')
    expect(AgentRunStatus.failed).toBe('failed')
  })
})

describe('ReviewGateType', () => {
  it('has all expected values', () => {
    expect(ReviewGateType.spec_compliance).toBe('spec_compliance')
    expect(ReviewGateType.code_quality).toBe('code_quality')
    expect(ReviewGateType.runtime_verification).toBe('runtime_verification')
  })
})

describe('ReviewGateStatus', () => {
  it('has all expected values', () => {
    expect(ReviewGateStatus.pending).toBe('pending')
    expect(ReviewGateStatus.open).toBe('open')
    expect(ReviewGateStatus.passed).toBe('passed')
    expect(ReviewGateStatus.failed).toBe('failed')
  })
})

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
