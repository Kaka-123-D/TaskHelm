import { nanoid } from 'nanoid'
import type Database from 'better-sqlite3'
import type { ReviewGate, ReviewGateTypeValue, ReviewGateStatusValue } from '../types.js'

export interface CreateReviewGateInput {
  readonly task_id: string
  readonly gate_type: string // ReviewGateTypeValue
}

type ReviewGateRow = {
  id: string
  task_id: string
  gate_type: string
  status: string
  result: string | null
  notes_ref: string | null
  opened_at: string | null
  closed_at: string | null
}

function rowToReviewGate(row: ReviewGateRow): ReviewGate {
  return {
    id: row.id,
    task_id: row.task_id,
    gate_type: row.gate_type as ReviewGateTypeValue,
    status: row.status as ReviewGateStatusValue,
    result: row.result,
    notes_ref: row.notes_ref,
    opened_at: row.opened_at,
    closed_at: row.closed_at,
  }
}

export class ReviewGateRepository {
  constructor(private readonly db: Database.Database) {}

  create(input: CreateReviewGateInput): ReviewGate {
    const id = nanoid()

    this.db
      .prepare(
        `INSERT INTO review_gates (
          id, task_id, gate_type, status, result, notes_ref, opened_at, closed_at
        ) VALUES (
          @id, @task_id, @gate_type, @status, @result, @notes_ref, @opened_at, @closed_at
        )`
      )
      .run({
        id,
        task_id: input.task_id,
        gate_type: input.gate_type,
        status: 'pending',
        result: null,
        notes_ref: null,
        opened_at: null,
        closed_at: null,
      })

    const row = this.db
      .prepare('SELECT * FROM review_gates WHERE id = ?')
      .get(id) as ReviewGateRow
    return rowToReviewGate(row)
  }

  findById(id: string): ReviewGate | null {
    const row = this.db.prepare('SELECT * FROM review_gates WHERE id = ?').get(id) as
      | ReviewGateRow
      | undefined
    return row ? rowToReviewGate(row) : null
  }

  findByTaskId(taskId: string): readonly ReviewGate[] {
    const rows = this.db
      .prepare('SELECT * FROM review_gates WHERE task_id = ? ORDER BY rowid ASC')
      .all(taskId) as ReviewGateRow[]
    return rows.map(rowToReviewGate)
  }

  open(id: string): ReviewGate {
    const now = new Date().toISOString()
    this.db
      .prepare(
        'UPDATE review_gates SET status = @status, opened_at = @opened_at WHERE id = @id'
      )
      .run({ id, status: 'open', opened_at: now })

    const row = this.db
      .prepare('SELECT * FROM review_gates WHERE id = ?')
      .get(id) as ReviewGateRow
    return rowToReviewGate(row)
  }

  pass(id: string, result?: string): ReviewGate {
    const now = new Date().toISOString()
    this.db
      .prepare(
        `UPDATE review_gates SET
          status = @status,
          result = @result,
          closed_at = @closed_at
        WHERE id = @id`
      )
      .run({ id, status: 'passed', result: result ?? null, closed_at: now })

    const row = this.db
      .prepare('SELECT * FROM review_gates WHERE id = ?')
      .get(id) as ReviewGateRow
    return rowToReviewGate(row)
  }

  fail(id: string, result?: string): ReviewGate {
    const now = new Date().toISOString()
    this.db
      .prepare(
        `UPDATE review_gates SET
          status = @status,
          result = @result,
          closed_at = @closed_at
        WHERE id = @id`
      )
      .run({ id, status: 'failed', result: result ?? null, closed_at: now })

    const row = this.db
      .prepare('SELECT * FROM review_gates WHERE id = ?')
      .get(id) as ReviewGateRow
    return rowToReviewGate(row)
  }
}
