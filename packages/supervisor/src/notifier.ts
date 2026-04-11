import { spawnSync } from 'node:child_process'
import type Database from 'better-sqlite3'
import { NotificationRepository } from '@taskhelm/core'
import type { CreateNotificationInput } from '@taskhelm/core'

/**
 * Creates a notification record and attempts to deliver it as a desktop
 * notification on macOS via osascript. Gracefully skips delivery if
 * osascript is unavailable (non-macOS or restricted environment).
 */
export function notify(db: Database.Database, input: CreateNotificationInput): void {
  const repo = new NotificationRepository(db)
  const notification = repo.create(input)

  const delivered = sendDesktopNotification(notification.title, notification.body ?? '')
  if (delivered) {
    repo.markDelivered(notification.id)
  }
}

function sendDesktopNotification(title: string, body: string): boolean {
  if (process.platform !== 'darwin') {
    return false
  }

  try {
    const escapedBody = body.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    const escapedTitle = title.replace(/\\/g, '\\\\').replace(/"/g, '\\"')

    const script =
      body.length > 0
        ? `display notification "${escapedBody}" with title "TaskHelm: ${escapedTitle}"`
        : `display notification "" with title "TaskHelm: ${escapedTitle}"`

    const result = spawnSync('osascript', ['-e', script], {
      timeout: 5000,
      encoding: 'utf-8',
    })

    return result.status === 0
  } catch {
    return false
  }
}
