import * as contrast from '@/index.ts'
import * as contrastTest from '@/test.ts'
import * as test from '@intertwine/lib-test'

export const url = import.meta.url

export const tests = {
  async ['before basic'](ctx: contrast.Context): Promise<void> {
    const style = [
      contrast.before(contrast.background.color('rgb(255, 0, 128)')),
    ]
    const result = await contrastTest.testCompile(ctx, style)

    test.assertDeepEquals(result.classNames, ['a0'])
    test.assertDeepEquals(result.code, [
      contrastTest.dedent(`
        .a0::before {
          background-color: rgb(255, 0, 128);
        }
      `),
    ])
  },

  async ['before advanced'](ctx: contrast.Context): Promise<void> {
    const style = [
      contrast.before(
        contrast.background.color(
          contrast.c(
            'rgb(255, 0, 127)',
            contrast.hover('rgb(255, 0, 128)'),
          ),
        ),
      ),
    ]
    const result = await contrastTest.testCompile(ctx, style)

    test.assertDeepEquals(result.classNames, ['e0', 'a0'])
    test.assertDeepEquals(result.code, [
      contrastTest.dedent(`
        .e0 {
          --e0: rgb(255, 0, 127);
          &:where(:hover) {
            --e0: rgb(255, 0, 128);
          }
        }
      `),
      contrastTest.dedent(`
        .a0::before {
          background-color: var(--e0);
        }
      `),
    ])
  },

  ['before error'](): void {
    const error = test.assertThrows(() => [
      contrast.before(
        contrast.after(
          contrast.background.color(
            contrast.c(
              'rgb(255, 0, 127)',
              contrast.hover('rgb(255, 0, 128)'),
            ),
          ),
        ),
      ),
    ])
    test.assertInstanceOf(error, Error)
    test.assertEquals(
      error.message,
      'background-color atom already has ::after pseudo-element',
    )
  },
}
