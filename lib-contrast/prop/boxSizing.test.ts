import * as contrast from '@/index.ts'
import * as contrastTest from '@/test.ts'

export const url = import.meta.url

export const tests = {
  async ['box sizing'](ctx: contrast.Context): Promise<void> {
    const style = [contrast.boxSizing('border-box')]
    const code = 'box-sizing: border-box'
    await contrastTest.assertCompileBasicEquals(ctx, style, code)
  },
}
