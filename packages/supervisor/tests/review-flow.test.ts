import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import {
  createDatabase,
  runMigrations,
  ProjectRepository,
  TaskRepository,
  AgentRunRepository,
  ReviewGateRepository,
} from '@taskhelm/core'
import type Database from 'better-sqlite3'
import { runOneCycle } from '../src/loop.js'

const TEST_DB = path.join(import.meta.dirname, '__test_review_flow__.db')
let db: Database.Database

beforeEach(() => {
  db = createDatabase(TEST_DB)
  runMigrations(db)
})

afterEach(() => {
  db.close()
  for (const ext of ['', '-wal', '-shm']) {
    try {
      fs.unlinkSync(TEST_DB + ext)
    } catch {}
  }
})

function createTestProject(database: Database.Database) {
  return new ProjectRepository(database).create({
    name: 'Review Flow Project',
    slug: 'review-flow',
    local_repo_root: '/home/user/review-flow',
  })
}

function setTaskRunning(database: Database.Database, taskId: string, phase: string) {
  database
    .prepare(`UPDATE tasks SET status = 'running', phase = ?, updated_at = ? WHERE id = ?`)
    .run(phase, new Date().toISOString(), taskId)
}

describe('Review Gate Automation', () => {
  describe('gate creation on phase transition', () => {
    it('creates and opens a spec_compliance gate when task enters spec_review', () => {
      const project = createTestProject(db)
      const taskRepo = new TaskRepository(db)
      const agentRunRepo = new AgentRunRepository(db)
      const gateRepo = new ReviewGateRepository(db)

      const task = taskRepo.create({ project_id: project.id, title: 'Gate Creation Task' })
      setTaskRunning(db, task.id, 'implementation')

      // Cycle 1: dispatch implementer
      runOneCycle(db)
      const runId = taskRepo.findById(task.id)!.current_agent_run_id!
      agentRunRepo.complete(runId)

      // Cycle 2: advance to spec_review, gate should be created
      runOneCycle(db)

      const updated = taskRepo.findById(task.id)!
      expect(updated.phase).toBe('spec_review')

      const gates = gateRepo.findByTaskId(task.id)
      expect(gates.length).toBe(1)
      expect(gates[0].gate_type).toBe('spec_compliance')
      expect(gates[0].status).toBe('open')
    })

    it('creates and opens a code_quality gate when task enters code_review', () => {
      const project = createTestProject(db)
      const taskRepo = new TaskRepository(db)
      const agentRunRepo = new AgentRunRepository(db)
      const gateRepo = new ReviewGateRepository(db)

      const task = taskRepo.create({ project_id: project.id, title: 'Code Review Gate Task' })
      setTaskRunning(db, task.id, 'spec_review')

      // Cycle 1: dispatch spec_review
      runOneCycle(db)
      const runId = taskRepo.findById(task.id)!.current_agent_run_id!
      agentRunRepo.complete(runId)

      // Cycle 2: advance to code_review
      runOneCycle(db)

      const updated = taskRepo.findById(task.id)!
      expect(updated.phase).toBe('code_review')

      const gates = gateRepo.findByTaskId(task.id)
      const codeGate = gates.find((g) => g.gate_type === 'code_quality')
      expect(codeGate).toBeDefined()
      expect(codeGate!.status).toBe('open')
    })

    it('creates a runtime_verification gate when task enters runtime_verification', () => {
      const project = createTestProject(db)
      const taskRepo = new TaskRepository(db)
      const agentRunRepo = new AgentRunRepository(db)
      const gateRepo = new ReviewGateRepository(db)

      const task = taskRepo.create({ project_id: project.id, title: 'Runtime Gate Task' })
      setTaskRunning(db, task.id, 'code_review')

      runOneCycle(db)
      const runId = taskRepo.findById(task.id)!.current_agent_run_id!
      agentRunRepo.complete(runId)

      runOneCycle(db)

      const updated = taskRepo.findById(task.id)!
      expect(updated.phase).toBe('runtime_verification')

      const gates = gateRepo.findByTaskId(task.id)
      const runtimeGate = gates.find((g) => g.gate_type === 'runtime_verification')
      expect(runtimeGate).toBeDefined()
      expect(runtimeGate!.status).toBe('open')
    })

    it('does not create a gate for non-review phases like implementation', () => {
      const project = createTestProject(db)
      const taskRepo = new TaskRepository(db)
      const agentRunRepo = new AgentRunRepository(db)
      const gateRepo = new ReviewGateRepository(db)

      const task = taskRepo.create({ project_id: project.id, title: 'No Gate Task' })
      setTaskRunning(db, task.id, 'implementation')

      // Cycle 1: dispatch implementer job
      runOneCycle(db)
      const runId = taskRepo.findById(task.id)!.current_agent_run_id!
      agentRunRepo.complete(runId)

      // Cycle 2: advance to spec_review — but no gate was created for implementation itself
      // (gates are only created when ENTERING a review phase)
      runOneCycle(db)

      // At this point phase is spec_review, which created a gate.
      // The point is: no gate was created for the implementation phase itself.
      const updated = taskRepo.findById(task.id)!
      expect(updated.phase).toBe('spec_review')

      // There is 1 gate now (for spec_review), but none for the implementation phase.
      const gates = gateRepo.findByTaskId(task.id)
      const implementationGate = gates.find((g) => g.gate_type === 'implementation' as string)
      expect(implementationGate).toBeUndefined()
      // Planning/context phases have no gates either
      const planningGate = gates.find((g) => g.gate_type === 'planning' as string)
      expect(planningGate).toBeUndefined()
    })
  })

  describe('gate lifecycle on agent run completion', () => {
    it('passes the spec_compliance gate when spec_review agent completes', () => {
      const project = createTestProject(db)
      const taskRepo = new TaskRepository(db)
      const agentRunRepo = new AgentRunRepository(db)
      const gateRepo = new ReviewGateRepository(db)

      const task = taskRepo.create({ project_id: project.id, title: 'Spec Review Pass Task' })
      setTaskRunning(db, task.id, 'implementation')

      // Cycle 1: dispatch implementer
      runOneCycle(db)
      const implRunId = taskRepo.findById(task.id)!.current_agent_run_id!
      agentRunRepo.complete(implRunId)

      // Cycle 2: advance to spec_review, gate created+opened
      runOneCycle(db)
      expect(taskRepo.findById(task.id)!.phase).toBe('spec_review')

      // Cycle 3: dispatch spec_review agent
      runOneCycle(db)
      const reviewRunId = taskRepo.findById(task.id)!.current_agent_run_id!
      agentRunRepo.complete(reviewRunId)

      // Cycle 4: spec_review agent completed → gate should pass, phase advances
      runOneCycle(db)

      const gates = gateRepo.findByTaskId(task.id)
      const specGate = gates.find((g) => g.gate_type === 'spec_compliance')
      expect(specGate).toBeDefined()
      expect(specGate!.status).toBe('passed')

      const updated = taskRepo.findById(task.id)!
      expect(updated.phase).toBe('code_review')
    })

    it('fails the spec_compliance gate and blocks task when spec_review agent fails', () => {
      const project = createTestProject(db)
      const taskRepo = new TaskRepository(db)
      const agentRunRepo = new AgentRunRepository(db)
      const gateRepo = new ReviewGateRepository(db)

      const task = taskRepo.create({ project_id: project.id, title: 'Spec Review Fail Task' })
      setTaskRunning(db, task.id, 'implementation')

      // Cycle 1: dispatch implementer
      runOneCycle(db)
      const implRunId = taskRepo.findById(task.id)!.current_agent_run_id!
      agentRunRepo.complete(implRunId)

      // Cycle 2: advance to spec_review, gate created+opened
      runOneCycle(db)

      // Cycle 3: dispatch spec_review job
      runOneCycle(db)
      const reviewRunId = taskRepo.findById(task.id)!.current_agent_run_id!
      agentRunRepo.fail(reviewRunId, 'Spec compliance not met')

      // Cycle 4: spec_review agent failed → gate should fail, task blocked
      runOneCycle(db)

      const gates = gateRepo.findByTaskId(task.id)
      const specGate = gates.find((g) => g.gate_type === 'spec_compliance')
      expect(specGate).toBeDefined()
      expect(specGate!.status).toBe('failed')

      const blocked = taskRepo.findById(task.id)!
      expect(blocked.status).toBe('blocked')
      expect(blocked.latest_blocker).toBe('Spec compliance not met')
    })
  })

  describe('full 3-stage review lifecycle', () => {
    it('walks through implementation → spec_review → code_review → runtime_verification → final_summary', () => {
      const project = createTestProject(db)
      const taskRepo = new TaskRepository(db)
      const agentRunRepo = new AgentRunRepository(db)
      const gateRepo = new ReviewGateRepository(db)

      const task = taskRepo.create({ project_id: project.id, title: 'Full Pipeline Task' })
      setTaskRunning(db, task.id, 'implementation')

      // --- IMPLEMENTATION ---
      // Cycle 1: dispatch implementer
      runOneCycle(db)
      let currentRunId = taskRepo.findById(task.id)!.current_agent_run_id!
      expect(agentRunRepo.findById(currentRunId)!.kind).toBe('implementer')
      agentRunRepo.complete(currentRunId)

      // Cycle 2: advance to spec_review, gate created
      runOneCycle(db)
      expect(taskRepo.findById(task.id)!.phase).toBe('spec_review')
      let gates = gateRepo.findByTaskId(task.id)
      expect(gates.find((g) => g.gate_type === 'spec_compliance')?.status).toBe('open')

      // --- SPEC REVIEW ---
      // Cycle 3: dispatch spec_review agent
      runOneCycle(db)
      currentRunId = taskRepo.findById(task.id)!.current_agent_run_id!
      expect(agentRunRepo.findById(currentRunId)!.kind).toBe('spec_review')
      agentRunRepo.complete(currentRunId)

      // Cycle 4: gate passes, advance to code_review
      runOneCycle(db)
      expect(taskRepo.findById(task.id)!.phase).toBe('code_review')
      gates = gateRepo.findByTaskId(task.id)
      expect(gates.find((g) => g.gate_type === 'spec_compliance')?.status).toBe('passed')
      expect(gates.find((g) => g.gate_type === 'code_quality')?.status).toBe('open')

      // --- CODE REVIEW ---
      // Cycle 5: dispatch code_review agent
      runOneCycle(db)
      currentRunId = taskRepo.findById(task.id)!.current_agent_run_id!
      expect(agentRunRepo.findById(currentRunId)!.kind).toBe('code_review')
      agentRunRepo.complete(currentRunId)

      // Cycle 6: gate passes, advance to runtime_verification
      runOneCycle(db)
      expect(taskRepo.findById(task.id)!.phase).toBe('runtime_verification')
      gates = gateRepo.findByTaskId(task.id)
      expect(gates.find((g) => g.gate_type === 'code_quality')?.status).toBe('passed')
      expect(gates.find((g) => g.gate_type === 'runtime_verification')?.status).toBe('open')

      // --- RUNTIME VERIFICATION ---
      // Cycle 7: dispatch runtime_verify agent
      runOneCycle(db)
      currentRunId = taskRepo.findById(task.id)!.current_agent_run_id!
      expect(agentRunRepo.findById(currentRunId)!.kind).toBe('runtime_verify')
      agentRunRepo.complete(currentRunId)

      // Cycle 8: gate passes, advance to final_summary
      runOneCycle(db)
      expect(taskRepo.findById(task.id)!.phase).toBe('final_summary')
      gates = gateRepo.findByTaskId(task.id)
      expect(gates.find((g) => g.gate_type === 'runtime_verification')?.status).toBe('passed')

      // Cycle 9: final_summary with no active run → done
      runOneCycle(db)
      expect(taskRepo.findById(task.id)!.status).toBe('done')

      // All 3 gates should be passed
      gates = gateRepo.findByTaskId(task.id)
      expect(gates).toHaveLength(3)
      expect(gates.every((g) => g.status === 'passed')).toBe(true)
    })

    it('blocks task when code_review agent fails mid-pipeline', () => {
      const project = createTestProject(db)
      const taskRepo = new TaskRepository(db)
      const agentRunRepo = new AgentRunRepository(db)
      const gateRepo = new ReviewGateRepository(db)

      const task = taskRepo.create({ project_id: project.id, title: 'Mid Pipeline Fail Task' })
      setTaskRunning(db, task.id, 'spec_review')

      // Cycle 1: dispatch spec_review
      runOneCycle(db)
      const specRunId = taskRepo.findById(task.id)!.current_agent_run_id!
      agentRunRepo.complete(specRunId)

      // Cycle 2: advance to code_review, gate created
      runOneCycle(db)
      expect(taskRepo.findById(task.id)!.phase).toBe('code_review')

      // Cycle 3: dispatch code_review
      runOneCycle(db)
      const runId = taskRepo.findById(task.id)!.current_agent_run_id!
      agentRunRepo.fail(runId, 'Code does not meet quality standards')

      // Cycle 4: gate fails, task blocked
      runOneCycle(db)

      const blocked = taskRepo.findById(task.id)!
      expect(blocked.status).toBe('blocked')

      const gates = gateRepo.findByTaskId(task.id)
      const codeGate = gates.find((g) => g.gate_type === 'code_quality')
      expect(codeGate).toBeDefined()
      expect(codeGate!.status).toBe('failed')
    })
  })
})
