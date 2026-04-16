import { describe, expect, it } from 'vitest'
import { createInitialExpandedFolders, reconcileExpandedFolders } from './tree-state'

describe('createInitialExpandedFolders', () => {
  it('expands root folders and selected-file ancestors while leaving unrelated nested folders collapsed', () => {
    const expanded = createInitialExpandedFolders(
      ['docs', 'docs/api', 'docs/api/images', 'notes'],
      'docs/api/guide.md',
    )

    expect([...expanded].sort()).toEqual(['docs', 'docs/api', 'notes'])
  })
})

describe('reconcileExpandedFolders', () => {
  it('keeps only valid folder paths without re-opening folders on refresh', () => {
    const expanded = reconcileExpandedFolders(new Set(['docs']), [
      'docs',
      'docs/api',
      'docs/api/images',
      'notes',
    ])

    expect([...expanded]).toEqual(['docs'])
  })
})
