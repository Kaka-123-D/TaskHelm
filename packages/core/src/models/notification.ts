import { nanoid } from 'nanoid'
import type Database from 'better-sqlite3'
import type { Notification, NotificationLevelValue } from '../types.js'

export interface CreateNotificationInput {
  readonly task_id?: string
  readonly project_id?: string
  readonly level: string // NotificationLevelValue
  readonly channel: string
  readonly title: string
  readonly body?: string
}

type NotificationRow = {
  id: string
  task_id: string | null
  project_id: string | null
  level: string
  channel: string
  title: string
  body: string | null
  status: string
  created_at: string
  delivered_at: string | null
}

function rowToNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    task_id: row.task_id,
    project_id: row.project_id,
    level: row.level as NotificationLevelValue,
    channel: row.channel,
    title: row.title,
    body: row.body,
    status: row.status,
    created_at: row.created_at,
    delivered_at: row.delivered_at,
  }
}

export class NotificationRepository {
  constructor(private readonly db: Database.Database) {}

  create(input: CreateNotificationInput): Notification {
    const id = nanoid()
    const now = new Date().toISOString()

    this.db
      .prepare(
        `INSERT INTO notifications (
          id, task_id, project_id, level, channel, title, body, status, created_at, delivered_at
        ) VALUES (
          @id, @task_id, @project_id, @level, @channel, @title, @body, @status, @created_at, @delivered_at
        )`
      )
      .run({
        id,
        task_id: input.task_id ?? null,
        project_id: input.project_id ?? null,
        level: input.level,
        channel: input.channel,
        title: input.title,
        body: input.body ?? null,
        status: 'pending',
        created_at: now,
        delivered_at: null,
      })

    const row = this.db
      .prepare('SELECT * FROM notifications WHERE id = ?')
      .get(id) as NotificationRow
    return rowToNotification(row)
  }

  findRecent(limit: number = 50): readonly Notification[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM notifications ORDER BY created_at DESC, rowid DESC LIMIT ?`
      )
      .all(limit) as NotificationRow[]
    return rows.map(rowToNotification)
  }

  markDelivered(id: string): void {
    const now = new Date().toISOString()
    this.db
      .prepare(
        `UPDATE notifications SET status = 'delivered', delivered_at = ? WHERE id = ?`
      )
      .run(now, id)
  }
}
