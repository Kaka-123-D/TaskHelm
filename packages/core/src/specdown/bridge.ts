import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'

export function isSpecDownAvailable(): boolean {
  try {
    execSync('which specdown', { stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

export interface PullContextResult {
  readonly available: boolean
  readonly context: Record<string, unknown> | null
}

export function pullProjectContext(projectSlug: string): PullContextResult {
  try {
    const output = execSync(
      `specdown context --project ${projectSlug} --json`,
      { stdio: 'pipe' }
    )
    const context = JSON.parse(output.toString()) as Record<string, unknown>
    return { available: true, context }
  } catch {
    return { available: false, context: null }
  }
}

export interface PushArtifactInput {
  readonly projectSlug: string
  readonly taskId: string
  readonly artifactPath: string
}

export interface PushArtifactResult {
  readonly pushed: boolean
  readonly error: string | null
}

export function pushTaskArtifact(input: PushArtifactInput): PushArtifactResult {
  if (!existsSync(input.artifactPath)) {
    return {
      pushed: false,
      error: `Artifact file not found: ${input.artifactPath}`,
    }
  }

  try {
    execSync(
      `specdown push-artifact --project ${input.projectSlug} --task ${input.taskId} --file ${input.artifactPath}`,
      { stdio: 'pipe' }
    )
    return { pushed: true, error: null }
  } catch (err) {
    return {
      pushed: false,
      error: (err as Error).message,
    }
  }
}
