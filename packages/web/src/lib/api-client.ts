const BASE = '/api'

export async function fetchProjects() {
  const res = await fetch(`${BASE}/projects`)
  if (!res.ok) throw new Error('Failed to fetch projects')
  return res.json()
}

export async function fetchTasks(projectId: string, status?: string) {
  const params = new URLSearchParams({ projectId })
  if (status) params.set('status', status)
  const res = await fetch(`${BASE}/tasks?${params}`)
  if (!res.ok) throw new Error('Failed to fetch tasks')
  return res.json()
}

export async function fetchTask(taskId: string) {
  const res = await fetch(`${BASE}/tasks/${taskId}`)
  if (!res.ok) throw new Error('Failed to fetch task')
  return res.json()
}
