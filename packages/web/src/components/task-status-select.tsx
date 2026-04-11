'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface TaskStatusSelectProps {
  readonly taskId: string
  readonly currentStatus: string
}

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft', color: 'text-zinc-400' },
  { value: 'ready', label: 'Ready', color: 'text-yellow-400' },
  { value: 'running', label: 'Running', color: 'text-blue-400' },
  { value: 'reviewing', label: 'Reviewing', color: 'text-purple-400' },
  { value: 'blocked', label: 'Blocked', color: 'text-red-400' },
  { value: 'done', label: 'Done', color: 'text-green-400' },
  { value: 'archived', label: 'Archived', color: 'text-zinc-500' },
]

export function TaskStatusSelect({ taskId, currentStatus }: TaskStatusSelectProps) {
  const [updating, setUpdating] = useState(false)
  const router = useRouter()

  const handleChange = useCallback(
    async (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newStatus = e.target.value
      if (newStatus === currentStatus) return

      setUpdating(true)
      try {
        const res = await fetch(`/api/tasks/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error ?? 'Failed to update status')
        }

        router.refresh()
      } catch (err) {
        console.error('Status update failed:', (err as Error).message)
      } finally {
        setUpdating(false)
      }
    },
    [taskId, currentStatus, router]
  )

  const current = STATUS_OPTIONS.find(s => s.value === currentStatus)

  return (
    <select
      value={currentStatus}
      onChange={handleChange}
      disabled={updating}
      className={`px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs font-medium ${current?.color ?? 'text-zinc-400'} focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50`}
    >
      {STATUS_OPTIONS.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )
}
