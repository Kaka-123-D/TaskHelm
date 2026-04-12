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
    <div className="flex gap-6" style={{ minHeight: '400px' }}>
      {/* Left Panel: Context Files */}
      <div className="flex-1 flex flex-col gap-3">
        <h4
          className="text-[10px] font-medium uppercase tracking-wider"
          style={{ color: 'var(--text-muted)' }}
        >
          Context Files
        </h4>

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

      {/* Right Panel: Workspace + Dev Server */}
      <div className="w-[280px] shrink-0 flex flex-col gap-4">
        <WorkspacePanel task={task} />
        <DevServerPanel task={task} />
      </div>
    </div>
  )
}
