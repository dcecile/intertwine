import type * as compute from '@intertwine/lib-compute'
import type * as contrast from '@intertwine/lib-contrast'
import type * as convey from '@intertwine/lib-convey'
import type * as random from '@intertwine/lib-random'
import type * as stream from '@intertwine/lib-stream'
import type * as test from '@intertwine/lib-test'
import type * as timeTest from '@intertwine/lib-time/test.ts'

export const all: test.TestCollection<
  compute.Context &
    contrast.Context &
    convey.Context &
    random.Context &
    stream.Context &
    timeTest.Context
> = () => [
  import('@intertwine/lib-collection/index.test.ts'),
  import('@intertwine/lib-compute/index.test.ts'),
  import('@intertwine/lib-contrast/index.test.ts'),
  import('@intertwine/lib-convey/index.test.ts'),
  import('@intertwine/lib-error/index.test.ts'),
  import('@intertwine/lib-hex/index.test.ts'),
  import('@intertwine/lib-payload/index.test.ts'),
  import('@intertwine/lib-random/index.test.ts'),
  import('@intertwine/lib-stream/index.test.ts'),
  import('@intertwine/lib-time/index.test.ts'),
]
