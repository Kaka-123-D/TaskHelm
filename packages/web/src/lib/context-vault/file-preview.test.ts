import { describe, expect, it } from 'vitest'
import {
  classifyContextVaultFile,
  supportedContextVaultFile,
} from '@/lib/context-vault/file-preview'

describe('supportedContextVaultFile', () => {
  it('accepts text/code, markdown, and image extensions', () => {
    expect(supportedContextVaultFile('context.md')).toBe(true)
    expect(supportedContextVaultFile('schema.json')).toBe(true)
    expect(supportedContextVaultFile('notes.txt')).toBe(true)
    expect(supportedContextVaultFile('config.yaml')).toBe(true)
    expect(supportedContextVaultFile('component.tsx')).toBe(true)
    expect(supportedContextVaultFile('diagram.png')).toBe(true)
    expect(supportedContextVaultFile('movie.mp4')).toBe(true)
  })

  it('rejects unsupported binary files', () => {
    expect(supportedContextVaultFile('archive.zip')).toBe(false)
  })
})

describe('classifyContextVaultFile', () => {
  it('classifies markdown separately from plain text and images', () => {
    expect(classifyContextVaultFile('context.md')).toMatchObject({ category: 'markdown' })
    expect(classifyContextVaultFile('schema.json')).toMatchObject({ category: 'text' })
    expect(classifyContextVaultFile('diagram.png')).toMatchObject({ category: 'image' })
    expect(classifyContextVaultFile('movie.mp4')).toMatchObject({ category: 'video' })
    expect(classifyContextVaultFile('archive.zip')).toMatchObject({ category: 'unsupported' })
  })
})
