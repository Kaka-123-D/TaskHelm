import * as fs from 'node:fs'
import * as path from 'node:path'
import { parse } from 'yaml'
import { TaskCapsuleSchema } from './schema.js'
import type { TaskCapsule } from './schema.js'

export function readCapsuleRaw(capsuleDir: string): unknown {
  const yamlPath = path.join(capsuleDir, 'task.yaml')

  if (!fs.existsSync(yamlPath)) {
    throw new Error(`task.yaml not found in capsule directory: ${capsuleDir}`)
  }

  try {
    const content = fs.readFileSync(yamlPath, 'utf-8')
    return parse(content)
  } catch (error) {
    throw new Error(
      `Failed to read or parse task.yaml in ${capsuleDir}: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

export function readCapsule(capsuleDir: string): TaskCapsule {
  const raw = readCapsuleRaw(capsuleDir)

  const result = TaskCapsuleSchema.safeParse(raw)
  if (!result.success) {
    throw new Error(
      `Task capsule validation failed for ${capsuleDir}: ${result.error.message}`,
    )
  }

  return result.data
}
