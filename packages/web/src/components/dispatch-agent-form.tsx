'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface DispatchAgentFormProps {
  readonly taskId: string
}

const AGENT_KINDS = [
  { value: 'implementer', label: 'Implementer' },
  { value: 'spec_review', label: 'Spec Review' },
  { value: 'code_review', label: 'Code Review' },
  { value: 'runtime_verify', label: 'Runtime Verify' },
]

export function DispatchAgentForm({ taskId }: DispatchAgentFormProps) {
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState('implementer')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleDispatch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/tasks/${taskId}/agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to dispatch agent')
      }
      setOpen(false)
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [taskId, kind, router])

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium rounded transition-colors"
      >
        + Run Agent
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={kind}
        onChange={(e) => setKind(e.target.value)}
        className="px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-200 focus:outline-none focus:border-blue-500"
      >
        {AGENT_KINDS.map(k => (
          <option key={k.value} value={k.value}>{k.label}</option>
        ))}
      </select>
      <button
        onClick={handleDispatch}
        disabled={loading}
        className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium rounded transition-colors disabled:opacity-50"
      >
        {loading ? 'Dispatching...' : 'Dispatch'}
      </button>
      <button
        onClick={() => { setOpen(false); setError(null) }}
        className="px-2 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        Cancel
      </button>
      {error && (
        <span className="text-xs text-red-400">{error}</span>
      )}
    </div>
  )
}
