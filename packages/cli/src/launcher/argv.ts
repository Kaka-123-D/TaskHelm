export interface LauncherRoutingOptions {
  readonly launchAppByDefault?: boolean
}

export function shouldLaunchApp(
  argv: readonly string[],
  options: LauncherRoutingOptions = {},
): boolean {
  if (!options.launchAppByDefault) {
    return false
  }

  return argv.slice(2).length === 0
}
