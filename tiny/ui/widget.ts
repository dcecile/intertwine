import * as style from '@tiny/ui/style.ts'
import type * as utilityTypes from 'utility-types'

const listeners = Symbol('listeners')

const context = Symbol('context')

const listenerOptions = Symbol('listenerOptions')

export function advancedListener<T>(
  body: T,
  options: AddEventListenerOptions
): T & { [listenerOptions]: AddEventListenerOptions } {
  return Object.assign(body, {
    [listenerOptions]: options,
  })
}

export type HtmlListeners<E extends Element = Element> = {
  [K in keyof HTMLElementEventMap]?: ((
    this: E,
    ev: HTMLElementEventMap[K]
  ) => void) & {
    [listenerOptions]?: AddEventListenerOptions
  }
}

export type WidgetContext = {
  document: Document
} & style.StyleContext

export function initContext(
  document: Document
): WidgetContext {
  return {
    ...style.initContext(document),
    document,
  }
}

type BodyWidget = {
  body: Widget
}

type RangeWidget = {
  content: Widget[]
}

export type Widget =
  | Node
  | BodyWidget
  | RangeWidget
  | string
  | false
  | undefined
  | null

function replaceChildren(
  ctx: WidgetContext,
  parent: ParentNode,
  children: (Node | string)[]
): void {
  if (parent instanceof HTMLHeadElement) {
    let styleElement: HTMLStyleElement | null = null
    let node = parent.firstChild
    while (node) {
      const nextNode = node.nextSibling
      if (node !== ctx.styleElement) {
        node.remove()
      } else if (!styleElement) {
        styleElement = ctx.styleElement
      }
      node = nextNode
    }
    for (const child of children) {
      parent.insertBefore(
        child instanceof Node
          ? child
          : ctx.document.createTextNode(child),
        styleElement
      )
    }
  } else {
    // TODO Check for replaceChilren
    parent.replaceChildren(...children)
  }
}

const elementProperties = {
  [context]: {
    writable: true,
    value: {},
  },
  styles: {
    set(
      this: Element & { [context]: WidgetContext },
      value: style.Style[]
    ) {
      if (this.classList.length) {
        this.classList.remove(...this.classList)
      }
      for (const styleItem of value) {
        this.classList.add(
          ...style.render(this[context], styleItem)
        )
      }
    },
  },
  listen: {
    set(
      this: Element & {
        [listeners]: Record<
          string,
          EventListener & {
            [listenerOptions]?: AddEventListenerOptions
          }
        >
      },
      value: Record<
        string,
        EventListener & {
          [listenerOptions]?: AddEventListenerOptions
        }
      >
    ) {
      const oldListeners = this[listeners]
      for (const key in oldListeners) {
        const listener = oldListeners[key]
        this.removeEventListener(
          key,
          listener,
          listener[listenerOptions]
        )
      }
      for (const key in value) {
        const listener = value[key]
        this.addEventListener(
          key,
          listener,
          listener[listenerOptions]
        )
      }
    },
  },
  [listeners]: {
    writable: true,
    value: {},
  },
  content: {
    set(
      this: Element & { [context]: WidgetContext },
      value: Widget[]
    ) {
      replaceChildren(this[context], this, collect(value))
    },
  },
}

export function collect(
  items: Widget[]
): (string | Node)[] {
  const results: (string | Node)[] = []

  function loop(item: Widget) {
    if (typeof item == 'string' || item instanceof Node) {
      results.push(item)
    } else if (
      item === false ||
      item === undefined ||
      item === null
    ) {
      // Skip
    } else if (Reflect.has(item, 'body')) {
      loop((item as BodyWidget).body)
    } else {
      for (const subitem of (item as RangeWidget).content) {
        loop(subitem)
      }
    }
  }

  for (const item of items) {
    loop(item)
  }

  return results
}

type WidgetInitializer<
  Body extends Widget & { [Key in keyof Body]: Body[Key] }
> = Partial<Pick<Body, utilityTypes.MutableKeys<Body>>>

type WidgetFunction<
  Body extends Widget & { [Key in keyof Body]: Body[Key] },
  Context extends WidgetContext = WidgetContext
> = (ctx: Context, data: WidgetInitializer<Body>) => Body

export function define<
  Body extends Widget & { [Key in keyof Body]: Body[Key] },
  Context extends WidgetContext = WidgetContext
>(
  body: (ctx: Context) => Body
): WidgetFunction<Body, Context> {
  return (ctx, data) => {
    return Object.assign(body(ctx), data)
  }
}

type HtmlWidget<T extends HTMLElement> = T & {
  styles: style.Style[]
  listen: HtmlListeners<T>
  content: Widget[]
}

export function toHtmlWidget<T extends HTMLElement>(
  ctx: WidgetContext,
  element: T
): HtmlWidget<T> {
  const widget = Object.defineProperties(
    element,
    elementProperties
  ) as HtmlWidget<T>
  ;((widget as unknown) as { [context]: WidgetContext })[
    context
  ] = ctx
  return widget
}

type HtmlWidgetMap = {
  [K in keyof HTMLElementTagNameMap]: WidgetFunction<
    HtmlWidget<HTMLElementTagNameMap[K]>
  >
}

export const html: HtmlWidgetMap = new Proxy(
  {} as HtmlWidgetMap,
  {
    get<K extends keyof HTMLElementTagNameMap>(
      target: unknown,
      property: K
    ) {
      return ((target as Record<
        K,
        WidgetFunction<HtmlWidget<HTMLElementTagNameMap[K]>>
      >)[property] ??= define((ctx) =>
        toHtmlWidget(
          ctx,
          ctx.document.createElement(property)
        )))
    },
  }
)

export const range = define<{
  content: Widget[]
}>((ctx) => {
  const start = ctx.document.createComment('')
  const end = ctx.document.createComment('')
  const content: Widget[] = [start, end]

  return {
    get content() {
      return content
    },
    set content(value: Widget[]) {
      const inner = collect(value)
      const parent = start.parentNode
      if (parent) {
        const siblings: (string | Node)[] = Array.from(
          parent.childNodes
        )
        siblings.splice(
          siblings.indexOf(start) + 1,
          content.length - 2,
          ...inner
        )
        replaceChildren(ctx, parent, siblings)
      }
      content.splice(1, content.length - 2, ...inner)
    },
  }
})