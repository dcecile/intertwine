import * as random from '@intertwine/lib-random'
import * as stream from '@intertwine/lib-stream'
import type * as time from '@intertwine/lib-time'
import * as timeBrowser from '@intertwine/lib-time/index.browser.ts'

function main(): void {
  const timeObj = timeBrowser.time()

  const mainCtx: random.Context &
    stream.WorkerServerContext &
    time.Context = {
    random: random.random(),
    streamServer: stream.workerServer({ time: timeObj }),
    time: timeObj,
  }

  const entryPoints: Promise<{
    main(ctx: typeof mainCtx): void
  }>[] = [import('@intertwine/svc-auth-guest-read/main.ts')]

  for (const entryPoint of entryPoints) {
    void (async () => {
      ;(await entryPoint).main(mainCtx)
    })()
  }
}

main()

export {}
