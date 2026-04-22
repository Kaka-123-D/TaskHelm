# Context Vault Input Update Vault Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace File System Access picker usage with input-based file/folder import, add `Update Vault` manual refresh semantics, and support video preview in task context vault.

**Architecture:** The web app will stop depending on persisted local path re-reads and instead persist imported snapshot entries derived from browser `File` objects. `ContextVaultExplorer` becomes an input-driven import/update surface, while preview rendering expands to video and existing task detail copy is updated to match snapshot semantics.

**Tech Stack:** Next.js app router, React 19, TypeScript, Vitest, existing TaskHelm context vault persistence API, browser `input[type=file]` with `webkitdirectory`, object URLs for image/video preview.

---

## File Map

- Modify: `packages/web/src/components/context-vault-explorer.tsx`
  - Replace File System Access picker flow with hidden file inputs and `Update Vault` re-pick behavior.
- Modify: `packages/web/src/components/task-detail-panels.tsx`
  - Update main action copy and remove live-polling language.
- Modify: `packages/web/src/components/context-file-preview.tsx`
  - Add video preview support.
- Modify: `packages/web/src/lib/context-vault/native-picker.ts`
  - Generalize selection discovery from native handles to browser `FileList` snapshots or replace with input import helpers.
- Create: `packages/web/src/lib/context-vault/input-selection.ts`
  - Convert browser-selected files into persisted context vault snapshot entries, preserving folder hierarchy via `webkitRelativePath`.
- Modify: `packages/web/src/lib/context-vault/file-preview.ts`
  - Add video classification support.
- Modify: `packages/web/src/app/globals.css`
  - Add video preview styles and any modal/action copy layout adjustments.
- Test: `packages/web/src/components/context-vault-explorer.test.tsx`
- Test: `packages/web/src/components/task-detail-panels.test.tsx`
- Test: `packages/web/src/components/context-file-preview.test.tsx`
- Test: `packages/web/src/lib/context-vault/input-selection.test.ts`

### Task 1: Replace Picker Contract With Input Snapshot Import

**Files:**
- Create: `packages/web/src/lib/context-vault/input-selection.ts`
- Test: `packages/web/src/lib/context-vault/input-selection.test.ts`

- [ ] **Step 1: Write the failing test for folder snapshot import preserving hierarchy**

```ts
import { describe, expect, it } from 'vitest'
import { filesToContextVaultSnapshot } from './input-selection'

function createBrowserFile(
  name: string,
  content: string,
  webkitRelativePath = '',
  type = 'text/plain',
): File & { webkitRelativePath: string } {
  const file = new File([content], name, { type }) as File & { webkitRelativePath: string }
  Object.defineProperty(file, 'webkitRelativePath', {
    configurable: true,
    value: webkitRelativePath,
  })
  return file
}

describe('filesToContextVaultSnapshot', () => {
  it('preserves relative paths from webkitRelativePath during folder import', async () => {
    const snapshot = await filesToContextVaultSnapshot([
      createBrowserFile('context.md', '# Context', 'docs/context.md', 'text/markdown'),
      createBrowserFile('diagram.png', 'binary', 'docs/images/diagram.png', 'image/png'),
    ])

    expect(snapshot.rootPath).toBe('docs')
    expect(snapshot.files.map(file => file.relativePath)).toEqual([
      'context.md',
      'images/diagram.png',
    ])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --dir packages/web exec vitest run src/lib/context-vault/input-selection.test.ts`
Expected: FAIL with missing module or missing export for `filesToContextVaultSnapshot`.

- [ ] **Step 3: Write minimal input snapshot helper**

```ts
import type { PersistedContextVaultFile } from '@/lib/context-vault/persisted-vault'
import { classifyContextVaultFile, supportedContextVaultFile } from '@/lib/context-vault/file-preview'

export async function filesToContextVaultSnapshot(
  files: readonly (File & { webkitRelativePath?: string })[],
): Promise<{
  readonly rootPath: string
  readonly files: readonly PersistedContextVaultFile[]
}> {
  const supported = files.filter(file => supportedContextVaultFile(file.name))
  const rootPrefix =
    supported.find(file => file.webkitRelativePath)?.webkitRelativePath.split('/')[0] ??
    supported[0]?.name ??
    ''

  const snapshot = await Promise.all(
    supported.map(async file => {
      const preview = classifyContextVaultFile(file.name)
      const relativePath = file.webkitRelativePath
        ? file.webkitRelativePath.split('/').slice(1).join('/')
        : file.name
      const content =
        preview.category === 'image' || preview.category === 'video'
          ? null
          : await file.text()

      return {
        relativePath,
        absolutePath: file.webkitRelativePath || file.name,
        content,
        category: preview.category,
        mediaType: preview.mediaType,
      } satisfies PersistedContextVaultFile
    }),
  )

  return {
    rootPath: rootPrefix,
    files: snapshot.sort((left, right) => left.relativePath.localeCompare(right.relativePath)),
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --dir packages/web exec vitest run src/lib/context-vault/input-selection.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/lib/context-vault/input-selection.ts packages/web/src/lib/context-vault/input-selection.test.ts
git commit -m "feat: add input-based context vault snapshot helper"
```

### Task 2: Add Video Classification And Preview

**Files:**
- Modify: `packages/web/src/lib/context-vault/file-preview.ts`
- Modify: `packages/web/src/components/context-file-preview.tsx`
- Test: `packages/web/src/components/context-file-preview.test.tsx`

- [ ] **Step 1: Write the failing test for video preview rendering**

```tsx
import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ContextFilePreview } from '@/components/context-file-preview'

describe('ContextFilePreview', () => {
  it('renders a video player for video files', () => {
    const markup = renderToStaticMarkup(
      <ContextFilePreview
        file={{
          relativePath: 'clips/demo.mp4',
          absolutePath: 'clips/demo.mp4',
          content: 'blob:test',
          category: 'video',
          mediaType: 'video/mp4',
        }}
      />,
    )

    expect(markup).toContain('<video')
    expect(markup).toContain('controls')
    expect(markup).toContain('playsinline')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --dir packages/web exec vitest run src/components/context-file-preview.test.tsx`
Expected: FAIL because video category is unsupported.

- [ ] **Step 3: Implement minimal video support**

```ts
// file-preview.ts
if (extension === 'mp4' || extension === 'webm' || extension === 'mov' || extension === 'm4v') {
  return { category: 'video', mediaType: inferredMediaType }
}
```

```tsx
// context-file-preview.tsx
if (file?.category === 'video' && file.content) {
  return (
    <div className="context-preview-video-frame">
      <video className="context-preview-video" controls playsInline src={file.content} />
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --dir packages/web exec vitest run src/components/context-file-preview.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/lib/context-vault/file-preview.ts packages/web/src/components/context-file-preview.tsx packages/web/src/components/context-file-preview.test.tsx
git commit -m "feat: add video support to context preview"
```

### Task 3: Convert Explorer Modal To Hidden File Inputs

**Files:**
- Modify: `packages/web/src/components/context-vault-explorer.tsx`
- Test: `packages/web/src/components/context-vault-explorer.test.tsx`
- Modify: `packages/web/src/lib/context-vault/native-picker.ts`
- Modify or remove: `packages/web/src/lib/context-vault/native-picker-gate.ts`

- [ ] **Step 1: Write the failing test for input-driven explorer actions**

```tsx
import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ContextVaultExplorer } from '@/components/context-vault-explorer'

describe('ContextVaultExplorer', () => {
  it('renders hidden file inputs and Update Vault-friendly actions instead of native picker copy', () => {
    const markup = renderToStaticMarkup(
      <ContextVaultExplorer
        open
        loading={false}
        error={null}
        initialPath=""
        onClose={() => {}}
        onExplore={() => {}}
      />,
    )

    expect(markup).toContain('Choose folder')
    expect(markup).toContain('Choose file')
    expect(markup).not.toContain('Native picker ready')
    expect(markup).not.toContain('Use fallback browser')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --dir packages/web exec vitest run src/components/context-vault-explorer.test.tsx`
Expected: FAIL because current modal still references native picker / fallback browser flow.

- [ ] **Step 3: Implement hidden input flow**

```tsx
const folderInputRef = useRef<HTMLInputElement | null>(null)
const fileInputRef = useRef<HTMLInputElement | null>(null)

<input
  ref={folderInputRef}
  hidden
  type="file"
  multiple
  // @ts-expect-error webkitdirectory is non-standard
  webkitdirectory=""
  onChange={event => void importSelectedFiles(Array.from(event.target.files ?? []), 'folder')}}
/>

<input
  ref={fileInputRef}
  hidden
  type="file"
  accept=".md,.mdx,.txt,.json,.yml,.yaml,.js,.jsx,.ts,.tsx,.mjs,.cjs,.css,.scss,.html,.xml,.sh,.bash,.zsh,.env,.log,.toml,.ini,.sql,.csv,.png,.jpg,.jpeg,.webp,.gif,.svg,.mp4,.webm,.mov,.m4v"
  onChange={event => void importSelectedFiles(Array.from(event.target.files ?? []), 'file')}}
/>
```

```tsx
<GlassButton type="button" variant="secondary" onClick={() => folderInputRef.current?.click()}>
  Choose folder
</GlassButton>
<GlassButton type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
  Choose file
</GlassButton>
```

Use `filesToContextVaultSnapshot()` to produce persisted snapshot entries and forward them through the existing persistence callback.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --dir packages/web exec vitest run src/components/context-vault-explorer.test.tsx src/lib/context-vault/input-selection.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/components/context-vault-explorer.tsx packages/web/src/components/context-vault-explorer.test.tsx packages/web/src/lib/context-vault/native-picker.ts packages/web/src/lib/context-vault/input-selection.ts packages/web/src/lib/context-vault/input-selection.test.ts
git commit -m "feat: switch context vault explorer to input-based import"
```

### Task 4: Change Task Detail Semantics To Manual Update Vault

**Files:**
- Modify: `packages/web/src/components/task-detail-panels.tsx`
- Test: `packages/web/src/components/task-detail-panels.test.tsx`

- [ ] **Step 1: Write the failing test for Update Vault copy**

```tsx
import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { TaskDetailPanelsView } from '@/components/task-detail-panels'

describe('TaskDetailPanelsView', () => {
  it('uses Update Vault copy and removes live polling messaging', () => {
    const markup = renderToStaticMarkup(
      <TaskDetailPanelsView
        task={task}
        project={project}
        rootPath="docs"
        sourceCount={1}
        files={files}
        selectedFile="context.md"
        statusMessage={null}
        onSelectFile={() => {}}
        onToggleFileListCollapse={() => {}}
        onOpenExplorer={() => {}}
      />,
    )

    expect(markup).toContain('Update Vault')
    expect(markup).not.toContain('re-reads local files every 3 seconds')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --dir packages/web exec vitest run src/components/task-detail-panels.test.tsx`
Expected: FAIL because current copy still references background re-reads and uses old action wording.

- [ ] **Step 3: Implement manual-refresh copy**

```tsx
{rootPath ? 'Update Vault' : 'Explore Context Vault'}
```

```tsx
{rootPath
  ? `Tracking ${files.length} file${files.length === 1 ? '' : 's'} from ${sourceCount} source${sourceCount === 1 ? '' : 's'}. Use Update Vault to reselect the local source and refresh the snapshot.`
  : `Choose one local folder or one supported text, markdown, image, or video file to import into this task vault.`}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --dir packages/web exec vitest run src/components/task-detail-panels.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/components/task-detail-panels.tsx packages/web/src/components/task-detail-panels.test.tsx
git commit -m "feat: update context vault copy for manual refresh"
```

### Task 5: End-to-End Verification And Cleanup

**Files:**
- Modify: `packages/web/src/app/globals.css`
- Test: `packages/web/src/components/context-file-preview.test.tsx`
- Test: `packages/web/src/components/context-vault-explorer.test.tsx`
- Test: `packages/web/src/components/task-detail-panels.test.tsx`

- [ ] **Step 1: Add any missing styles for video preview and updated modal layout**

```css
.context-preview-video-frame {
  display: flex;
  min-height: 100%;
  align-items: center;
  justify-content: center;
}

.context-preview-video {
  max-width: 100%;
  max-height: 100%;
  border: 1px solid rgba(120, 97, 59, 0.2);
  border-radius: 1rem;
  box-shadow: var(--shadow-card);
}
```

- [ ] **Step 2: Run focused web tests**

Run:

```bash
pnpm --dir packages/web exec vitest run \
  src/lib/context-vault/input-selection.test.ts \
  src/components/context-vault-explorer.test.tsx \
  src/components/task-detail-panels.test.tsx \
  src/components/context-file-preview.test.tsx
```

Expected: all PASS

- [ ] **Step 3: Run web typecheck**

Run: `pnpm --dir packages/web run typecheck`
Expected: PASS

- [ ] **Step 4: Run web build**

Run: `pnpm --dir packages/web run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/app/globals.css \
  packages/web/src/lib/context-vault/input-selection.ts \
  packages/web/src/lib/context-vault/input-selection.test.ts \
  packages/web/src/components/context-vault-explorer.tsx \
  packages/web/src/components/context-vault-explorer.test.tsx \
  packages/web/src/components/task-detail-panels.tsx \
  packages/web/src/components/task-detail-panels.test.tsx \
  packages/web/src/components/context-file-preview.tsx \
  packages/web/src/components/context-file-preview.test.tsx \
  packages/web/src/lib/context-vault/file-preview.ts
git commit -m "feat: move context vault to input-based snapshots"
```

## Self-Review

- Spec coverage:
  - input/webkitdirectory migration: Task 1 + Task 3
  - `Update Vault` semantics: Task 4
  - video preview support: Task 2 + Task 5
  - remove live polling messaging: Task 4
  - preserve hierarchy via `webkitRelativePath`: Task 1
- Placeholder scan:
  - no `TBD`, `TODO`, or implicit “add tests later” steps remain
- Type consistency:
  - plan consistently uses `filesToContextVaultSnapshot`
  - `Update Vault` remains a UI label, not a backend API name
