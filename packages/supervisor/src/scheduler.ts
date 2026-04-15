import type Database from 'better-sqlite3'

export interface ScheduledJob {
  readonly taskId: string
  readonly kind: string
}

/**
 * Phase-based scheduling has been removed from TaskHelm.
 * Tasks are now managed directly through local context, workspaces, and runtime actions.
 */
export function getSchedulableJobs(db: Database.Database): readonly ScheduledJob[] {
  void db
  return []
}
