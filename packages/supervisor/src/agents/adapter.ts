export interface AgentRunResult {
  readonly success: boolean
  readonly outputRef: string | null
  readonly errorMessage: string | null
}

export interface AgentRunOptions {
  readonly taskId: string
  readonly kind: string
  readonly cwd: string
  readonly inputRef: string | null
  readonly command?: string
}

export interface AgentAdapter {
  run(options: AgentRunOptions): Promise<AgentRunResult>
}
