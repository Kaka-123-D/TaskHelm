import { describe, expect, it } from 'vitest'
import { createInitialExpandedFolders, ensureSelectedFileFoldersExpanded } from './tree-state'

describe('createInitialExpandedFolders', () => {
  it('expands root folders and selected-file ancestors while leaving unrelated nested folders collapsed', () => {
    const expanded = createInitialExpandedFolders(
      ['docs', 'docs/api', 'docs/api/images', 'notes'],
      'docs/api/guide.md',
    )

    expect([...expanded].sort()).toEqual(['docs', 'docs/api', 'notes'])
  })
})

describe('ensureSelectedFileFoldersExpanded', () => {
  it('re-opens ancestor folders after polling refresh', () => {
    const expanded = ensureSelectedFileFoldersExpanded(new Set(['docs']), 'docs/api/guide.md')

    expect([...expanded]).toEqual(['docs', 'docs/api'])
  })
})
