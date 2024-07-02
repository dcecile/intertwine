import type * as contrastDataAngle from '@/data/angle.ts'
import type * as contrastDataPercentage from '@/data/percentage.ts'
import * as contrastExpression from '@/expression.ts'
import * as contrastExpressionIntern from '@/expressionIntern.ts'

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/color_value
 */
export type Color = `#${string}` | `${'hsl' | 'rgb'}${'' | 'a'}(${string})`

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/light-dark
 */
export function lightDark(
  light: contrastExpression.ExpressionOpt<Color>,
  dark: contrastExpression.ExpressionOpt<Color>,
): contrastExpression.Expression<Color> {
  return contrastExpression.expression(
    contrastExpressionIntern.compilePureFunction,
    (ctx) => [
      'light-dark',
      ...contrastExpression.compileAllToPure(ctx, light, dark),
    ],
  )
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/rgb
 */
export function hsl(
  h: contrastExpression.ExpressionOpt<contrastDataAngle.Angle>,
  s: contrastExpression.ExpressionOpt<contrastDataPercentage.Pct>,
  l: contrastExpression.ExpressionOpt<contrastDataPercentage.Pct>,
  a: contrastExpression.ExpressionOpt<contrastDataPercentage.Pct>,
): contrastExpression.Expression<Color> {
  return contrastExpression.expression(compileColor, (ctx) => [
    'hsl',
    ...contrastExpression.compileAllToPure(ctx, h, s, l, a),
  ])
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/rgb
 */
export function rgb(
  r: contrastExpression.ExpressionOpt<contrastDataPercentage.Pct>,
  g: contrastExpression.ExpressionOpt<contrastDataPercentage.Pct>,
  b: contrastExpression.ExpressionOpt<contrastDataPercentage.Pct>,
  a: contrastExpression.ExpressionOpt<contrastDataPercentage.Pct>,
): contrastExpression.Expression<Color> {
  return contrastExpression.expression(compileColor, (ctx) => [
    'rgb',
    ...contrastExpression.compileAllToPure(ctx, r, g, b, a),
  ])
}

export function compileColor(
  name: string,
  value0: contrastExpressionIntern.PureExpressionIntern,
  value1: contrastExpressionIntern.PureExpressionIntern,
  value2: contrastExpressionIntern.PureExpressionIntern,
  value3: contrastExpressionIntern.PureExpressionIntern,
): contrastExpressionIntern.PureExpressionIntern {
  return contrastExpressionIntern.compilePure(
    `${name}(${value0.value} ${value1.value} ${value2.value} / ${value3.value})`,
    value0,
    value1,
    value2,
    value3,
  )
}
