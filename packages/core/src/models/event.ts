import { nanoid } from 'nanoid'
import type Database from 'better-sqlite3'
import type { AppEvent } from '../types.js'

export interface CreateEventInput {
  readonly entity_type: string
  readonly entity_id: string
  readonly event_type: string
  readonly payload_json?: string
}

type EventRow = {
  id: string
  entity_type: string
  entity_id: string
  event_type: string
  payload_json: string | null
  created_at: string
}

function rowToAppEvent(row: EventRow): AppEvent {
  return {
    id: row.id,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    event_type: row.event_type,
    payload_json: row.payload_json,
    created_at: row.created_at,
  }
}

export class EventRepository {
  constructor(private readonly db: Database.Database) {}

  append(input: CreateEventInput): AppEvent {
    const id = nanoid()
    const now = new Date().toISOString()

    this.db
      .prepare(
        `INSERT INTO events (
          id, entity_type, entity_id, event_type, payload_json, created_at
        ) VALUES (
          @id, @entity_type, @entity_id, @event_type, @payload_json, @created_at
        )`
      )
      .run({
        id,
        entity_type: input.entity_type,
        entity_id: input.entity_id,
        event_type: input.event_type,
        payload_json: input.payload_json ?? null,
        created_at: now,
      })

    const row = this.db.prepare('SELECT * FROM events WHERE id = ?').get(id) as EventRow
    return rowToAppEvent(row)
  }

  findByEntity(entityType: string, entityId: string): readonly AppEvent[] {
    const rows = this.db
      .prepare(
        'SELECT * FROM events WHERE entity_type = ? AND entity_id = ? ORDER BY created_at ASC'
      )
      .all(entityType, entityId) as EventRow[]
    return rows.map(rowToAppEvent)
  }

  findByType(eventType: string): readonly AppEvent[] {
    const rows = this.db
      .prepare('SELECT * FROM events WHERE event_type = ? ORDER BY created_at ASC')
      .all(eventType) as EventRow[]
    return rows.map(rowToAppEvent)
  }

  findRecent(limit = 50): readonly AppEvent[] {
    const rows = this.db
      .prepare('SELECT * FROM events ORDER BY created_at DESC LIMIT ?')
      .all(limit) as EventRow[]
    return rows.map(rowToAppEvent)
  }
}
