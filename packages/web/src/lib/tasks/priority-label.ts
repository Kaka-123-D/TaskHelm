export function getTaskPriorityLabel(priority: number): string {
  switch (priority) {
    case 1:
      return 'Critical'
    case 2:
      return 'High'
    case 3:
      return 'Normal'
    case 4:
      return 'Low'
    case 5:
      return 'Backlog'
    default:
      return String(priority)
  }
}
