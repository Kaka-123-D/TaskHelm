import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as childProcess from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import {
  isSpecDownAvailable,
  pullProjectContext,
  pushTaskArtifact,
} from '../../src/specdown/bridge.js'

vi.mock('node:child_process')

describe('SpecDown Bridge', () => {
  const mockedExecSync = vi.mocked(childProcess.execSync)

  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('isSpecDownAvailable', () => {
    it('returns true when specdown-cli is found', () => {
      mockedExecSync.mockReturnValue(Buffer.from('/usr/local/bin/specdown'))

      expect(isSpecDownAvailable()).toBe(true)
      expect(mockedExecSync).toHaveBeenCalledWith('which specdown', {
        stdio: 'pipe',
      })
    })

    it('returns false when specdown-cli is not found', () => {
      mockedExecSync.mockImplementation(() => {
        throw new Error('not found')
      })

      expect(isSpecDownAvailable()).toBe(false)
    })
  })

  describe('pullProjectContext', () => {
    it('returns parsed context when specdown is available', () => {
      const fakeOutput = JSON.stringify({
        project: 'my-project',
        specs: ['spec-1.md', 'spec-2.md'],
      })
      mockedExecSync.mockReturnValue(Buffer.from(fakeOutput))

      const result = pullProjectContext('my-project')

      expect(result).toEqual({
        available: true,
        context: {
          project: 'my-project',
          specs: ['spec-1.md', 'spec-2.md'],
        },
      })
      expect(mockedExecSync).toHaveBeenCalledWith(
        'specdown context --project my-project --json',
        { stdio: 'pipe' }
      )
    })

    it('returns unavailable when specdown fails', () => {
      mockedExecSync.mockImplementation(() => {
        throw new Error('specdown not installed')
      })

      const result = pullProjectContext('my-project')

      expect(result).toEqual({
        available: false,
        context: null,
      })
    })
  })

  describe('pushTaskArtifact', () => {
    let tmpDir: string

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specdown-test-'))
    })

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    })

    it('pushes artifact content when specdown is available', () => {
      mockedExecSync.mockReturnValue(Buffer.from('ok'))

      const artifactPath = path.join(tmpDir, 'review.md')
      fs.writeFileSync(artifactPath, '# Review\nAll passed.')

      const result = pushTaskArtifact({
        projectSlug: 'my-project',
        taskId: 'task-123',
        artifactPath,
      })

      expect(result).toEqual({ pushed: true, error: null })
      expect(mockedExecSync).toHaveBeenCalledWith(
        expect.stringContaining('specdown push-artifact'),
        { stdio: 'pipe' }
      )
    })

    it('returns error when artifact file does not exist', () => {
      const result = pushTaskArtifact({
        projectSlug: 'my-project',
        taskId: 'task-123',
        artifactPath: '/nonexistent/file.md',
      })

      expect(result).toEqual({
        pushed: false,
        error: 'Artifact file not found: /nonexistent/file.md',
      })
    })

    it('returns graceful fallback when specdown fails', () => {
      mockedExecSync.mockImplementation(() => {
        throw new Error('connection refused')
      })

      const artifactPath = path.join(tmpDir, 'review.md')
      fs.writeFileSync(artifactPath, '# Review')

      const result = pushTaskArtifact({
        projectSlug: 'my-project',
        taskId: 'task-123',
        artifactPath,
      })

      expect(result).toEqual({
        pushed: false,
        error: 'connection refused',
      })
    })
  })
})
