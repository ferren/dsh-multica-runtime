import type { Context } from '@deepseek-ai/cordis'
import { SENSITIVE_ENV_PATTERN } from '@deepseek-ai/dsh-subprocess'
import { multicaTerminalEnvironment } from './task-env.js'

/**
 * DSH deliberately removes credential-shaped ambient variables from every
 * model-spawned subprocess. Multica's task token is the one narrow exception:
 * its CLI requires the server-minted `mat_` credential to attribute agent
 * reads and writes to the current task. A user PAT or model-provider
 * credential must never pass through this path.
 */
/**
 * Exempt the exact task-token name from DSH's credential-name scrub. This is
 * installed at the scrub policy itself because agent-local PTY realms resolve
 * the subprocess service through a scoped proxy; decorating the host service
 * does not affect those already-composed realms. Every other `*TOKEN*`,
 * `*KEY*`, `*SECRET*`, and `*PASSWORD*` variable remains scrubbed.
 */
export function installMulticaTerminalEnvironment(ctx: Context): void {
  const explicitEnvironment = multicaTerminalEnvironment(process.env)
  if (explicitEnvironment.MULTICA_TOKEN === undefined) return

  const originalTest = SENSITIVE_ENV_PATTERN.test
  const patchedTest = function (this: RegExp, value: string): boolean {
    if (value.toUpperCase() === 'MULTICA_TOKEN') return false
    return originalTest.call(this, value)
  }
  SENSITIVE_ENV_PATTERN.test = patchedTest
  ctx.effect(() => () => {
    if (SENSITIVE_ENV_PATTERN.test === patchedTest) SENSITIVE_ENV_PATTERN.test = originalTest
  }, 'multica task environment forwarding')
}

export { multicaTerminalEnvironment } from './task-env.js'
