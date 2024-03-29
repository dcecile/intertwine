import * as compute from '@intertwine/lib-compute'
import * as convey from '@intertwine/lib-convey'
import type * as random from '@intertwine/lib-random'
import type * as stream from '@intertwine/lib-stream'
import type * as time from '@intertwine/lib-time'

const custom = convey.defineCustom<
  unknown,
  {
    readonly title: compute.ComputationOpt<string>
  }
>((ctx, attrs) => {
  const countState = compute.state(0)

  return [
    convey.html.div({
      onClick: compute.handler(async (_event, count) => {
        await compute.set(ctx, countState, count + 1)
      }, countState),

      content: compute.map(
        (title, count) => `${title} / ${count}`,
        attrs.title,
        countState,
      ),
    }),
    convey.svg.svg({
      height: 50,
      viewBox: [0, 0, 100, 100],
      width: 50,

      content: convey.svg.rect({
        height: 80,
        width: 80,
        x: 10,
        y: 10,
      }),
    }),
  ]
})

export async function main(
  ctx: compute.Context &
    convey.Context &
    random.Context &
    stream.ClientContext &
    time.Context,
): Promise<void> {
  const clientSource = ctx.streamClient.connect(
    'svc-auth-guest-read',
    (data) => {
      // eslint-disable-next-line no-console
      console.log('client data', data)
    },
  )
  void clientSource.send(ctx, 'ping')

  const fragment = custom({ title: 'hello' })
  const body = ctx.convey.document.body
  for await (const node of fragment.add(ctx)) {
    body.append(node)
  }
}
