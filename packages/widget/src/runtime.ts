import type { Api } from './api'
import type { StaticDeskConfig } from './config'

/** Shared state set up once by the loader and used by every element. */
export interface Runtime {
  config: StaticDeskConfig
  api: Api
}

let runtime: Runtime | null = null

export function setRuntime(value: Runtime) {
  runtime = value
}

export function getRuntime(): Runtime | null {
  return runtime
}
