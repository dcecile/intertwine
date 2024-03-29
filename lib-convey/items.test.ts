/* eslint-disable @typescript-eslint/no-empty-function */
import * as convey from '@/index.ts'
import * as compute from '@intertwine/lib-compute'
import * as test from '@intertwine/lib-test'
import arrayFromAsync from 'core-js-pure/actual/array/from-async'

export const url = import.meta.url

export const tests = {
  async ['items pure'](
    ctx: compute.Context & convey.Context,
  ): Promise<void> {
    const fragment = convey.each(
      (x) => convey.html.div({ content: x }),
      (x) => x,
      ['a', 'b', 'c'],
    )
    const body = ctx.convey.document.body
    body.append(...(await arrayFromAsync(fragment.add(ctx))))
    test.assertEquals(body.textContent, 'abc')
  },

  async ['items inner state'](
    ctx: compute.Context & convey.Context,
  ): Promise<void> {
    const items = compute.state([
      { id: 0, name: 'a' },
      { id: 1, name: 'b' },
      { id: 2, name: 'c' },
    ])

    const [init, initHistory] = test.repeatMockWithHistory(
      3,
      (_name: string) => {},
    )
    const custom = convey.defineCustom<
      unknown,
      {
        readonly name: compute.ComputationOpt<string>
      }
    >(async (_ctx, attrs) => {
      init(await compute.value(attrs.name))
      return convey.html.div({ content: attrs.name })
    })
    const fragment = convey.each(
      (item) => custom({ name: item.name }),
      (item) => item.id,
      items,
    )
    const body = ctx.convey.document.body
    body.append(...(await arrayFromAsync(fragment.add(ctx))))
    test.assertEquals(body.textContent, 'abc')
    test.assertDeepEquals(initHistory, [['a'], ['b'], ['c']])

    await compute.txn(ctx, async () => {
      await compute.set(ctx, items, [
        await compute.value(items[0]),
        await compute.value(items[1]),
        { id: 2, name: 'd' },
      ])
    })
    test.assertEquals(body.textContent, 'abd')
    test.assertDeepEquals(initHistory, [['a'], ['b'], ['c']])
  },

  async ['items move'](
    ctx: compute.Context & convey.Context,
  ): Promise<void> {
    const items = compute.state([
      { id: 0, name: 'a' },
      { id: 1, name: 'b' },
      { id: 2, name: 'c' },
    ])

    const [init, initHistory] = test.repeatMockWithHistory(
      3,
      (_name: string) => {},
    )
    const custom = convey.defineCustom<
      unknown,
      {
        readonly name: compute.ComputationOpt<string>
      }
    >(async (_ctx, attrs) => {
      init(await compute.value(attrs.name))
      return convey.html.div({ content: attrs.name })
    })
    const fragment = convey.each(
      (item) => custom({ name: item.name }),
      (item) => item.id,
      items,
    )
    const body = ctx.convey.document.body
    body.append(...(await arrayFromAsync(fragment.add(ctx))))
    test.assertEquals(body.textContent, 'abc')
    test.assertDeepEquals(initHistory, [['a'], ['b'], ['c']])

    await compute.txn(ctx, async () => {
      await compute.set(ctx, items, [
        await compute.value(items[2]),
        await compute.value(items[0]),
        await compute.value(items[1]),
      ])
    })
    test.assertEquals(body.textContent, 'cab')
    test.assertDeepEquals(initHistory, [['a'], ['b'], ['c']])
  },

  async ['items remove'](
    ctx: compute.Context & convey.Context,
  ): Promise<void> {
    const items = compute.state([
      { id: 0, name: 'a' },
      { id: 1, name: 'b' },
      { id: 2, name: 'c' },
    ])

    const [init, initHistory] = test.repeatMockWithHistory(
      3,
      (_name: string) => {},
    )
    const custom = convey.defineCustom<
      unknown,
      {
        readonly name: compute.ComputationOpt<string>
      }
    >(async (_ctx, attrs) => {
      init(await compute.value(attrs.name))
      return convey.html.div({ content: attrs.name })
    })
    const fragment = convey.each(
      (item) => custom({ name: item.name }),
      (item) => item.id,
      items,
    )
    const body = ctx.convey.document.body
    body.append(...(await arrayFromAsync(fragment.add(ctx))))
    test.assertEquals(body.textContent, 'abc')
    test.assertDeepEquals(initHistory, [['a'], ['b'], ['c']])

    await compute.txn(ctx, async () => {
      await compute.set(ctx, items, [
        await compute.value(items[0]),
        await compute.value(items[2]),
      ])
    })
    test.assertEquals(body.textContent, 'ac')
    test.assertDeepEquals(initHistory, [['a'], ['b'], ['c']])
  },

  async ['items add'](
    ctx: compute.Context & convey.Context,
  ): Promise<void> {
    const items = compute.state([
      { id: 0, name: 'a' },
      { id: 1, name: 'b' },
      { id: 2, name: 'c' },
    ])

    const [init, initHistory] = test.repeatMockWithHistory(
      4,
      (_name: string) => {},
    )
    const custom = convey.defineCustom<
      unknown,
      {
        readonly name: compute.ComputationOpt<string>
      }
    >(async (_ctx, attrs) => {
      init(await compute.value(attrs.name))
      return convey.html.div({ content: attrs.name })
    })
    const fragment = convey.each(
      (item) => custom({ name: item.name }),
      (item) => item.id,
      items,
    )
    const body = ctx.convey.document.body
    body.append(...(await arrayFromAsync(fragment.add(ctx))))
    test.assertEquals(body.textContent, 'abc')
    test.assertDeepEquals(initHistory, [['a'], ['b'], ['c']])

    await compute.txn(ctx, async () => {
      await compute.set(ctx, items, [
        await compute.value(items[0]),
        await compute.value(items[1]),
        { id: 3, name: 'd' },
        await compute.value(items[2]),
      ])
    })
    test.assertEquals(body.textContent, 'abdc')
    test.assertDeepEquals(initHistory, [['a'], ['b'], ['c'], ['d']])

    await fragment.remove()
    await compute.txn(ctx, async () => {
      await compute.set(ctx, items, [
        await compute.value(items[0]),
        await compute.value(items[1]),
        { id: 4, name: 'e' },
        await compute.value(items[2]),
      ])
    })
    test.assertEquals(body.textContent, 'abdc')
    test.assertDeepEquals(initHistory, [['a'], ['b'], ['c'], ['d']])
  },
}
