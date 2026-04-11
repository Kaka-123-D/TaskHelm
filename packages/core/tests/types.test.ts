import { describe, it, expect } from 'vitest'
import {
  TaskStatus,
  TaskPhase,
  AgentRunKind,
  AgentRunStatus,
  ReviewGateType,
  ReviewGateStatus,
  DevServerStatus,
  SpecdownMode,
  NotificationLevel,
} from '../src/types'

describe('TaskStatus', () => {
  it('has all expected values', () => {
    expect(TaskStatus.draft).toBe('draft')
    expect(TaskStatus.ready).toBe('ready')
    expect(TaskStatus.running).toBe('running')
    expect(TaskStatus.reviewing).toBe('reviewing')
    expect(TaskStatus.blocked).toBe('blocked')
    expect(TaskStatus.done).toBe('done')
    expect(TaskStatus.archived).toBe('archived')
  })
})

describe('TaskPhase', () => {
  it('has all expected values', () => {
    expect(TaskPhase.context).toBe('context')
    expect(TaskPhase.planning).toBe('planning')
    expect(TaskPhase.implementation).toBe('implementation')
    expect(TaskPhase.spec_review).toBe('spec_review')
    expect(TaskPhase.code_review).toBe('code_review')
    expect(TaskPhase.runtime_verification).toBe('runtime_verification')
    expect(TaskPhase.final_summary).toBe('final_summary')
  })
})

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

describe('SpecdownMode', () => {
  it('has all expected values', () => {
    expect(SpecdownMode.disabled).toBe('disabled')
    expect(SpecdownMode.linked).toBe('linked')
    expect(SpecdownMode.preferred).toBe('preferred')
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
