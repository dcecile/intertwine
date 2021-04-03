import type * as random from '@tiny/util/random.ts'
import * as time from '@tiny/util/time.ts'
import type * as typeFest from 'type-fest'

export type Context = time.Context & random.Context

export type RetryConfig = {
  minDelayMs: number
  windowMs: number
  maxAttempts: number
  onError: (
    error: unknown,
    attempt: number,
    nextDelayMs: number
  ) => void
}

export async function retry<Result>(
  ctx: Context,
  callback: () => typeFest.Promisable<Result>,
  config: RetryConfig
): Promise<Result> {
  const startMs = ctx.performanceNow()
  let attempt = 0

  while (true) {
    try {
      return await callback()
    } catch (error: unknown) {
      if (attempt === config.maxAttempts - 1) {
        throw error
      }

      const nowMs = ctx.performanceNow()
      const delayMs = Math.max(
        config.minDelayMs,
        ctx.randomNumber() *
          config.minDelayMs *
          Math.pow(2, attempt)
      )
      if (nowMs + delayMs >= startMs + config.windowMs) {
        throw error
      }

      config.onError(error, attempt, delayMs)
      await time.delay(ctx, delayMs)
      attempt += 1
    }
  }
}
