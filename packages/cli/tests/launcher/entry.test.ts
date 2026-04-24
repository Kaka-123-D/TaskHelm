import { describe, expect, it } from 'vitest'
import { shouldLaunchApp } from '../../src/launcher/argv.js'
import { resolveTaskHelmPort } from '../../src/launcher/index.js'

describe('launcher argv routing', () => {
  it('does not auto-launch app mode for CLI package zero-arg execution', () => {
    expect(shouldLaunchApp(['node', 'taskhelm'])).toBe(false)
  })

  it('keeps commander mode when subcommands are present', () => {
    expect(
      shouldLaunchApp(['node', 'taskhelm', 'project', 'list'], { launchAppByDefault: true }),
    ).toBe(false)
  })

  it('launches app mode when root package opts into zero-arg launcher behavior', () => {
    expect(shouldLaunchApp(['node', 'taskhelm'], { launchAppByDefault: true })).toBe(true)
  })

  it('defaults the app launcher port to 4100', () => {
    expect(resolveTaskHelmPort({})).toBe(4100)
  })

  it('accepts a TASKHELM_PORT override for smoke tests and CI', () => {
    expect(resolveTaskHelmPort({ TASKHELM_PORT: '4122' })).toBe(4122)
  })
})
