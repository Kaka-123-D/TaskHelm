import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { ShellAgentAdapter } from '../../src/agents/shell-adapter.js'

let outputDir: string

beforeEach(() => {
  outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'taskhelm-shell-adapter-'))
})

afterEach(() => {
  fs.rmSync(outputDir, { recursive: true, force: true })
})

describe('ShellAgentAdapter', () => {
  it('runs a default stub command and returns success', async () => {
    const adapter = new ShellAgentAdapter(outputDir)

    const result = await adapter.run({
      taskId: 'task-123',
      kind: 'implementer',
      cwd: os.tmpdir(),
      inputRef: null,
    })

    expect(result.success).toBe(true)
    expect(result.outputRef).not.toBeNull()
    expect(result.errorMessage).toBeNull()
  })

  it('captures output to a log file', async () => {
    const adapter = new ShellAgentAdapter(outputDir)
    const message = 'hello from test'

    const result = await adapter.run({
      taskId: 'task-456',
      kind: 'spec_review',
      cwd: os.tmpdir(),
      inputRef: null,
      command: `echo "${message}"`,
    })

    expect(result.success).toBe(true)
    expect(result.outputRef).not.toBeNull()
    const contents = fs.readFileSync(result.outputRef!, 'utf-8')
    expect(contents.trim()).toBe(message)
  })

  it('log file name includes taskId, kind, and timestamp', async () => {
    const adapter = new ShellAgentAdapter(outputDir)

    const result = await adapter.run({
      taskId: 'task-789',
      kind: 'code_review',
      cwd: os.tmpdir(),
      inputRef: null,
    })

    expect(result.outputRef).not.toBeNull()
    const filename = path.basename(result.outputRef!)
    expect(filename).toMatch(/^task-789-code_review-\d+\.log$/)
  })

  it('returns failure result when command exits with non-zero code', async () => {
    const adapter = new ShellAgentAdapter(outputDir)

    const result = await adapter.run({
      taskId: 'task-fail',
      kind: 'implementer',
      cwd: os.tmpdir(),
      inputRef: null,
      command: 'exit 1',
    })

    expect(result.success).toBe(false)
    expect(result.errorMessage).not.toBeNull()
    expect(result.errorMessage).toContain('1')
  })

  it('captures stderr output to log file on failure', async () => {
    const adapter = new ShellAgentAdapter(outputDir)

    const result = await adapter.run({
      taskId: 'task-stderr',
      kind: 'runtime_verify',
      cwd: os.tmpdir(),
      inputRef: null,
      command: 'echo "error output" >&2 && exit 2',
    })

    expect(result.success).toBe(false)
    expect(result.outputRef).not.toBeNull()
    const contents = fs.readFileSync(result.outputRef!, 'utf-8')
    expect(contents).toContain('error output')
  })

  it('uses a custom command override when provided', async () => {
    const adapter = new ShellAgentAdapter(outputDir)

    const result = await adapter.run({
      taskId: 'task-custom',
      kind: 'implementer',
      cwd: os.tmpdir(),
      inputRef: null,
      command: 'echo "custom command output"',
    })

    expect(result.success).toBe(true)
    const contents = fs.readFileSync(result.outputRef!, 'utf-8')
    expect(contents.trim()).toBe('custom command output')
  })

  it('creates outputDir if it does not exist', async () => {
    const nestedDir = path.join(outputDir, 'nested', 'dir')
    const adapter = new ShellAgentAdapter(nestedDir)

    const result = await adapter.run({
      taskId: 'task-nested',
      kind: 'implementer',
      cwd: os.tmpdir(),
      inputRef: null,
    })

    expect(result.success).toBe(true)
    expect(fs.existsSync(nestedDir)).toBe(true)
  })
})
