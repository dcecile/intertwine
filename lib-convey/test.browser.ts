import type * as conveyContext from '@/context.ts'
import * as conveyScheduler from '@/scheduler.ts'

export interface Convey extends conveyContext.Convey {
  dispose(): void
}

class ConveyImpl implements Convey {
  readonly classNames = new Set<string>()
  readonly document: Readonly<Document>
  readonly scheduler: conveyScheduler.Scheduler =
    conveyScheduler.scheduler()
  readonly styleLayer: Readonly<CSSLayerBlockRule>

  private readonly iframe: Readonly<HTMLIFrameElement>

  constructor() {
    const mutableIframe = window.document.createElement('iframe')
    mutableIframe.style.display = 'none'
    window.document.body.append(mutableIframe)
    const iframeDocument = mutableIframe.contentDocument
    if (!iframeDocument) {
      throw new Error('No iframe document')
    }
    this.iframe = mutableIframe
    this.document = iframeDocument
    const style = this.document.createElement('style')
    this.document.head.append(style)
    const styleSheet = style.sheet
    if (!styleSheet) {
      throw new Error('No style sheet')
    }
    this.styleLayer = styleSheet.cssRules.item(
      styleSheet.insertRule('@layer base {}'),
    ) as CSSLayerBlockRule
  }

  dispose(): void {
    this.iframe.remove()
  }
}

export function convey(): Convey {
  return new ConveyImpl()
}
