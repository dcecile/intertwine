import * as contrastAtom from '@/atom.ts'
import type * as contrastExpression from '@/expression.ts'

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/box-sizing
 */
export function boxSizing(
  value: contrastExpression.ExpressionOpt<'border-box' | 'content-box'>,
): contrastAtom.Atom {
  return contrastAtom.atom('box-sizing', value)
}
