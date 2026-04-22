export interface NativePickerGate {
  run(task: () => Promise<void>): Promise<boolean>
}

export function createNativePickerGate(): NativePickerGate {
  let active = false

  return {
    async run(task) {
      if (active) {
        return false
      }

      active = true
      try {
        await task()
        return true
      } finally {
        active = false
      }
    },
  }
}
