import { nanoid } from 'nanoid'
import type Database from 'better-sqlite3'
import type { AgentRun, AgentRunKindValue, AgentRunStatusValue } from '../types.js'

export interface CreateAgentRunInput {
  readonly task_id: string
  readonly kind: string // AgentRunKindValue
  readonly role?: string
  readonly input_ref?: string
}

type AgentRunRow = {
  id: string
  task_id: string
  kind: string
  role: string | null
  status: string
  input_ref: string | null
  output_ref: string | null
  error_message: string | null
  started_at: string | null
  finished_at: string | null
  created_at: string
}

function rowToAgentRun(row: AgentRunRow): AgentRun {
  return {
    id: row.id,
    task_id: row.task_id,
    kind: row.kind as AgentRunKindValue,
    role: row.role,
    status: row.status as AgentRunStatusValue,
    input_ref: row.input_ref,
    output_ref: row.output_ref,
    error_message: row.error_message,
    started_at: row.started_at,
    finished_at: row.finished_at,
    created_at: row.created_at,
  }
}

export class AgentRunRepository {
  constructor(private readonly db: Database.Database) {}

  create(input: CreateAgentRunInput): AgentRun {
    const id = nanoid()
    const now = new Date().toISOString()

    this.db
      .prepare(
        `INSERT INTO agent_runs (
          id, task_id, kind, role, status,
          input_ref, output_ref, error_message,
          started_at, finished_at, created_at
        ) VALUES (
          @id, @task_id, @kind, @role, @status,
          @input_ref, @output_ref, @error_message,
          @started_at, @finished_at, @created_at
        )`
      )
      .run({
        id,
        task_id: input.task_id,
        kind: input.kind,
        role: input.role ?? null,
        status: 'pending',
        input_ref: input.input_ref ?? null,
        output_ref: null,
        error_message: null,
        started_at: null,
        finished_at: null,
        created_at: now,
      })

    const row = this.db.prepare('SELECT * FROM agent_runs WHERE id = ?').get(id) as AgentRunRow
    return rowToAgentRun(row)
  }

  findById(id: string): AgentRun | null {
    const row = this.db.prepare('SELECT * FROM agent_runs WHERE id = ?').get(id) as
      | AgentRunRow
      | undefined
    return row ? rowToAgentRun(row) : null
  }

  findByTaskId(taskId: string): readonly AgentRun[] {
    const rows = this.db
      .prepare('SELECT * FROM agent_runs WHERE task_id = ? ORDER BY created_at ASC')
      .all(taskId) as AgentRunRow[]
    return rows.map(rowToAgentRun)
  }

  start(id: string): AgentRun {
    const now = new Date().toISOString()
    this.db
      .prepare(
        'UPDATE agent_runs SET status = @status, started_at = @started_at WHERE id = @id'
      )
      .run({ id, status: 'running', started_at: now })

    const row = this.db.prepare('SELECT * FROM agent_runs WHERE id = ?').get(id) as AgentRunRow
    return rowToAgentRun(row)
  }

  complete(id: string, outputRef?: string): AgentRun {
    const now = new Date().toISOString()
    this.db
      .prepare(
        `UPDATE agent_runs SET
          status = @status,
          output_ref = @output_ref,
          finished_at = @finished_at
        WHERE id = @id`
      )
      .run({ id, status: 'completed', output_ref: outputRef ?? null, finished_at: now })

    const row = this.db.prepare('SELECT * FROM agent_runs WHERE id = ?').get(id) as AgentRunRow
    return rowToAgentRun(row)
  }

  fail(id: string, errorMessage: string): AgentRun {
    const now = new Date().toISOString()
    this.db
      .prepare(
        `UPDATE agent_runs SET
          status = @status,
          error_message = @error_message,
          finished_at = @finished_at
        WHERE id = @id`
      )
      .run({ id, status: 'failed', error_message: errorMessage, finished_at: now })

    const row = this.db.prepare('SELECT * FROM agent_runs WHERE id = ?').get(id) as AgentRunRow
    return rowToAgentRun(row)
  }
}
