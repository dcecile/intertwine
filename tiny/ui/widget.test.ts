import * as widget from '@tiny/ui/widget.ts'
import type * as typeFest from 'type-fest'

export function withTempDocument<
  CustomContext extends Record<string, unknown> = Record<
    string,
    unknown
  >
>(
  callback: (
    ctx: CustomContext & widget.Context
  ) => typeFest.Promisable<void>
): (ctx: CustomContext & widget.Context) => Promise<void> {
  return async (baseContext) => {
    const iframe = baseContext.document.createElement(
      'iframe'
    )
    iframe.style.display = 'none'
    baseContext.document.body.append(iframe)
    try {
      const iframeDocument = iframe.contentDocument
      if (!iframeDocument) {
        throw new Error('No iframe document')
      }
      await callback({
        ...baseContext,
        ...widget.initContext(iframeDocument),
      })
    } finally {
      iframe.remove()
    }
  }
}
