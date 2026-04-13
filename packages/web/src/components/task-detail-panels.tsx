'use client'

import { useState, useEffect } from 'react'
import type { Task, Project } from '@taskhelm/core'
import { ContextFileList } from '@/components/context-file-list'
import { ContextFilePreview } from '@/components/context-file-preview'
import { WorkspacePanel } from '@/components/workspace-panel'
import { DevServerPanel } from '@/components/dev-server-panel'

interface ContextFile {
  readonly name: string
  readonly content: string | null
}

interface TaskDetailPanelsProps {
  readonly task: Task
  readonly project: Project
}

export function TaskDetailPanels({ task, project }: TaskDetailPanelsProps) {
  const [files, setFiles] = useState<readonly ContextFile[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadFiles() {
      try {
        const res = await fetch(`/api/tasks/${task.id}/context-files`)
        if (res.ok) {
          const data = await res.json()
          setFiles(data.files)
          if (data.files.length > 0) {
            setSelectedFile(data.files[0].name)
          }
        }
      } catch {
        // Context files not available — expected for tasks without workspace
      } finally {
        setLoading(false)
      }
    }
    loadFiles()
  }, [task.id])

  const selectedContent = files.find(f => f.name === selectedFile)?.content ?? null

  const specdownRef = project.specdown_project_ref
  const specdownUrl = specdownRef ? `/${specdownRef}` : null

  return (
    <div className="task-detail-grid" style={{ minHeight: '400px' }}>
      <div className="task-pane">
        <div className="task-pane-header">
          <div>
            <div className="task-pane-label">Context Files</div>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Browse the task capsule and preview implementation context in place.</p>
          </div>
          {specdownUrl && (
            <a
              href={specdownUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border px-3 py-1.5 text-xs font-semibold text-[var(--accent-ink)]"
              style={{ borderColor: 'rgba(47, 109, 246, 0.12)', background: 'var(--accent-muted)' }}
            >
              Open SpecDown
            </a>
          )}
        </div>
        <div className="task-pane-body flex flex-col gap-3">
          {loading ? (
            <p className="text-sm text-[var(--text-muted)]">Loading...</p>
          ) : (
            <>
              <ContextFileList
                files={files}
                selectedFile={selectedFile}
                onSelect={setSelectedFile}
                specdownUrl={specdownUrl}
              />
              <ContextFilePreview filename={selectedFile} content={selectedContent} />
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <WorkspacePanel task={task} />
        <DevServerPanel task={task} />
      </div>
    </div>
  )
}
