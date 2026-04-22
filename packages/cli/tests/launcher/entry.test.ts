import { describe, expect, it } from 'vitest'
import { shouldLaunchApp } from '../../src/launcher/argv.js'

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
})
