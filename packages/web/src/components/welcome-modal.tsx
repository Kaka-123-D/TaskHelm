'use client'

import { useEffect, useState, useCallback } from 'react'
import { GlassModal } from '@/components/design-system/glass-modal'
import { GlassButton } from '@/components/design-system/glass-button'

const STORAGE_KEY = 'taskhelm.onboard.v1.seen'

const SECTIONS: ReadonlyArray<{
  readonly title: string
  readonly body: React.ReactNode
}> = [
  {
    title: 'What TaskHelm does',
    body: (
      <p>
        TaskHelm is your <strong>local control plane</strong> for running many software projects in
        parallel. Each task gets its own branch, worktree, allocated port, dev server, agent runs, and
        review gates — all coordinated from one workbench. State lives on your machine; nothing leaves
        the laptop unless you push it.
      </p>
    ),
  },
  {
    title: 'A typical workflow',
    body: (
      <ol className="welcome-modal-list">
        <li>
          <strong>Create a project</strong> — point TaskHelm at a Git repo on disk. Set a default
          branch and dev command.
        </li>
        <li>
          <strong>Create a task</strong> — give it a title, goal, and optional refer link.
        </li>
        <li>
          <strong>Init workspace</strong> — TaskHelm creates a branch + worktree under{' '}
          <code>.worktrees/</code>, optionally pulling the latest base branch.
        </li>
        <li>
          <strong>Start dev server</strong> — runs your project&apos;s dev command inside the worktree on
          a unique port. Pooled per project; pops a modal if the port is squatted.
        </li>
        <li>
          <strong>Attach context</strong> — pick a folder from the task detail page; markdown, images,
          videos, and code files become previewable inline.
        </li>
      </ol>
    ),
  },
  {
    title: 'Vault file references',
    body: (
      <>
        <p>
          Inside any markdown file in the context vault, embed images and videos with the{' '}
          <code>[@path]</code> syntax:
        </p>
        <pre className="welcome-modal-pre">
{`[@tickets/LRC-12424/gyazo/spec.png]
[@assets/diagram.svg]
[@gyazo/demo.mp4]`}
        </pre>
        <p>
          Paths are matched flexibly — relative to the vault root, relative to the project root, or
          even just the file&apos;s suffix. If the file exists in the vault and the extension is
          recognized (png/jpg/jpeg/webp/gif/svg/mp4/webm/mov), it embeds inline; otherwise the raw
          text is preserved.
        </p>
      </>
    ),
  },
  {
    title: 'Where state lives',
    body: (
      <ul className="welcome-modal-list">
        <li>
          <code>~/.taskhelm/taskhelm.db</code> — SQLite (WAL). All runtime state. Override with{' '}
          <code>TASKHELM_DB</code>.
        </li>
        <li>
          <code>~/.taskhelm/runtime/&lt;version&gt;</code> — prepared web runtime cache. Override with{' '}
          <code>TASKHELM_HOME</code>.
        </li>
        <li>
          Default port <code>4100</code> — override with <code>TASKHELM_PORT</code> or <code>PORT</code>.
        </li>
      </ul>
    ),
  },
]

interface WelcomeModalProps {
  readonly open: boolean
  readonly onClose: () => void
}

function WelcomeModalContent({ onClose }: { readonly onClose: () => void }) {
  const [step, setStep] = useState(0)
  const isLast = step === SECTIONS.length - 1
  const section = SECTIONS[step]

  return (
    <div className="welcome-modal-body">
      <div className="welcome-modal-progress" aria-label={`Step ${step + 1} of ${SECTIONS.length}`}>
        {SECTIONS.map((_, index) => (
          <span
            key={index}
            className="welcome-modal-progress-dot"
            data-active={index === step}
            data-done={index < step}
          />
        ))}
      </div>
      <h3 className="welcome-modal-section-title">{section.title}</h3>
      <div className="welcome-modal-section-body">{section.body}</div>
      <div className="welcome-modal-actions">
        <span className="welcome-modal-step-counter">
          {step + 1} / {SECTIONS.length}
        </span>
        <div className="flex gap-2">
          {step > 0 ? (
            <GlassButton variant="ghost" onClick={() => setStep(step - 1)} className="text-xs px-3 py-1.5">
              Back
            </GlassButton>
          ) : null}
          {!isLast ? (
            <GlassButton variant="primary" onClick={() => setStep(step + 1)} className="text-xs px-3 py-1.5">
              Next
            </GlassButton>
          ) : (
            <GlassButton variant="primary" onClick={onClose} className="text-xs px-3 py-1.5">
              Got it
            </GlassButton>
          )}
        </div>
      </div>
    </div>
  )
}

export function WelcomeModal({ open, onClose }: WelcomeModalProps) {
  return (
    <GlassModal open={open} onClose={onClose} title="Welcome to TaskHelm" maxWidth="max-w-xl">
      <WelcomeModalContent onClose={onClose} />
    </GlassModal>
  )
}

export function OnboardingTrigger() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return
      if (window.localStorage.getItem(STORAGE_KEY) === '1') return
      setOpen(true)
    } catch {
      // localStorage unavailable (e.g. private mode) — silently skip auto-open
    }
  }, [])

  const handleClose = useCallback(() => {
    setOpen(false)
    try {
      window.localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      // ignore storage errors
    }
  }, [])

  useEffect(() => {
    function handleHelpRequest() {
      setOpen(true)
    }

    window.addEventListener('taskhelm:open-onboarding', handleHelpRequest)
    return () => window.removeEventListener('taskhelm:open-onboarding', handleHelpRequest)
  }, [])

  return <WelcomeModal open={open} onClose={handleClose} />
}
