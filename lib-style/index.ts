/* eslint-disable functional/no-let */
/* eslint-disable functional/immutable-data */
/* eslint-disable functional/type-declaration-immutability */
/* eslint-disable functional/prefer-immutable-types */

export interface Context {
  style: {
    element: HTMLStyleElement
    renderCount: number
    renderMap: Map<string, Map<Style, string[]>>
    sheet: CSSStyleSheet
  }
}

let globalStyleNameCount = 0

export function initContext(document: Document): Context {
  const element = document.createElement('style')
  document.head.appendChild(element)
  const sheet = element.sheet
  if (!sheet) {
    throw Error('Problem adding style element')
  }
  const renderMap = new Map<string, Map<Style, string[]>>()
  const renderCount = 0
  return {
    style: {
      element,
      renderCount,
      renderMap,
      sheet,
    },
  }
}

const styleNameBase = 36

type StyleProps = {
  [TStyleName in keyof CSSStyleDeclaration]?: NonNullable<
    CSSStyleDeclaration[TStyleName]
  >
}

enum StyleNesting {
  combinatorSelector = 0,
  selector = 1,
}

type StyleSelector = [
  {
    nesting: StyleNesting.selector
    selector: string
  },
  StyleBody,
]

type StyleCombinatorSelector = [
  {
    combinatorSelector: string
    nesting: StyleNesting.combinatorSelector
  },
  StyleBody,
]

type StyleBody = (
  | Style
  | StyleCombinatorSelector
  | StyleProps
  | StyleSelector
)[]

export interface Style {
  body: StyleBody
  name: string
}

export function build(body: StyleBody): Style {
  const styleNameClass = `s${globalStyleNameCount.toString(styleNameBase)}`
  globalStyleNameCount += 1
  return {
    body,
    name: styleNameClass,
  }
}

export function useSelector(
  selectorValue: string,
  body: StyleBody,
): StyleSelector {
  return [
    {
      nesting: StyleNesting.selector,
      selector: selectorValue,
    },
    body,
  ]
}

export function useCombinatorSelector(
  combinatorSelectorValue: string,
  body: StyleBody,
): StyleCombinatorSelector {
  return [
    {
      combinatorSelector: combinatorSelectorValue,
      nesting: StyleNesting.combinatorSelector,
    },
    body,
  ]
}

export function render(ctx: Context, style: Style): string[] {
  return renderNestedStyle(ctx, style, '', '', false)
}

function renderNestedStyle(
  ctx: Context,
  style: Style,
  combinatorSelectorValue: string,
  selectorValue: string,
  newStyleName: boolean,
): string[] {
  const fullSelectorValue = `${combinatorSelectorValue}${selectorValue}`
  let fullSelectorStyleMap = ctx.style.renderMap.get(fullSelectorValue)
  if (!fullSelectorStyleMap) {
    fullSelectorStyleMap = new Map<Style, string[]>()
    ctx.style.renderMap.set(fullSelectorValue, fullSelectorStyleMap)
  }

  const existingStyleClasses = fullSelectorStyleMap.get(style)
  if (existingStyleClasses) {
    return existingStyleClasses
  }

  let styleName: string
  if (newStyleName && (combinatorSelectorValue || selectorValue)) {
    styleName = `r${ctx.style.renderCount.toString(styleNameBase)}`
    ctx.style.renderCount += 1
  } else {
    styleName = style.name
  }
  const styleClasses = [styleName]
  for (const styleItem of style.body) {
    if (Array.isArray(styleItem)) {
      const nestedStyleItem = styleItem
      const nesting = nestedStyleItem[0].nesting
      if (nesting === StyleNesting.selector) {
        styleClasses.push(
          ...renderStyleSelector(
            ctx,
            styleName,
            nestedStyleItem as StyleSelector,
            combinatorSelectorValue,
            selectorValue,
          ),
        )
      } else {
        styleClasses.push(
          ...renderStyleCombinatorSelector(
            ctx,
            styleName,
            nestedStyleItem as StyleCombinatorSelector,
            combinatorSelectorValue,
            selectorValue,
          ),
        )
      }
    } else {
      const flatStyleItem = styleItem
      if (Reflect.has(flatStyleItem, 'name')) {
        styleClasses.push(
          ...renderNestedStyle(
            ctx,
            flatStyleItem as Style,
            combinatorSelectorValue,
            selectorValue,
            true,
          ),
        )
      } else {
        renderStyleProps(
          ctx,
          styleName,
          flatStyleItem as StyleProps,
          combinatorSelectorValue,
          selectorValue,
        )
      }
    }
  }
  fullSelectorStyleMap.set(style, styleClasses)
  return Array.from(new Set(styleClasses))
}

function renderStyleSelector(
  ctx: Context,
  styleName: string,
  style: StyleSelector,
  combinatorSelectorValue: string,
  selectorValue: string,
): string[] {
  return renderNestedStyle(
    ctx,
    { body: style[1], name: styleName },
    combinatorSelectorValue,
    selectorValue ?
      `${selectorValue}${style[0].selector.substring(1)}`
    : style[0].selector,
    false,
  )
}

function renderStyleCombinatorSelector(
  ctx: Context,
  styleName: string,
  style: StyleCombinatorSelector,
  combinatorSelectorValue: string,
  selectorValue: string,
): string[] {
  if (combinatorSelectorValue) {
    throw Error(
      `Style combinator "${combinatorSelectorValue}" already set, cannot use "${style[0].combinatorSelector}"`,
    )
  }
  return renderNestedStyle(
    ctx,
    { body: style[1], name: styleName },
    style[0].combinatorSelector,
    selectorValue,
    false,
  )
}

function renderStyleProps(
  ctx: Context,
  styleName: string,
  style: StyleProps,
  combinatorSelectorValue: string,
  selectorValue: string,
): void {
  const styleRules = ctx.style.sheet.cssRules
  const styleIndex = styleRules.length
  ctx.style.sheet.insertRule(
    `${combinatorSelectorValue.substring(
      0,
      combinatorSelectorValue.length - 1,
    )}.${styleName}${selectorValue.substring(1)} {}`,
    styleIndex,
  )
  const styleRule = styleRules[styleIndex] as CSSStyleRule
  const styleDeclaration = styleRule.style
  Object.assign(styleDeclaration, style)
}
