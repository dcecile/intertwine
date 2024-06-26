import type * as contrastContext from '@/context.ts'
import * as contrastExpressionIntern from '@/expressionIntern.ts'

export type ExpressionOpt<Value> =
  | Expression<Value>
  | readonly ExpressionOpt<Value>[]
  | (Value extends symbol ? never : Value)
  | null

export const expressionMarker = Symbol('expressionMarker')
export const expressionValueMarker = Symbol('internValueMarker')

export interface Expression<Value> {
  readonly [expressionMarker]: null

  compile(
    ctx: contrastContext.Context,
  ): contrastExpressionIntern.ExpressionIntern

  [expressionValueMarker](): Value | null
}

export type ExpressionInternTuple<
  Tuple extends readonly ExpressionOpt<unknown>[],
> = {
  readonly [I in keyof Tuple]: Tuple[I] extends ExpressionOpt<unknown> ?
    contrastExpressionIntern.ExpressionIntern
  : never
} & {
  readonly length: Tuple['length']
}

export class ExpressionImpl<
  Value,
  InternCompile extends (
    ...args: never
  ) => contrastExpressionIntern.ExpressionIntern,
> implements Expression<Value>
{
  readonly [expressionMarker] = null

  constructor(
    private readonly internCompile: InternCompile,
    private readonly args: (
      ctx: contrastContext.Context,
    ) => Readonly<ReadonlyParameters<InternCompile>>,
  ) {}

  compile(
    ctx: contrastContext.Context,
  ): contrastExpressionIntern.ExpressionIntern {
    const internArgs = this.args(ctx)
    return ctx.contrast.expressionIntern.get(
      this.internCompile as never,
      ...internArgs,
    )
  }

  [expressionValueMarker](): Value | null {
    return null
  }
}

type ReadonlyParameters<T extends (...args: never) => unknown> =
  T extends (...args: readonly [...infer P]) => unknown ? P : never

export function expression<
  Value,
  InternCompile extends (
    ...args: never
  ) => contrastExpressionIntern.ExpressionIntern,
>(
  internCompile: InternCompile,
  args: (
    ctx: contrastContext.Context,
  ) => Readonly<ReadonlyParameters<InternCompile>>,
): ExpressionImpl<Value, InternCompile> {
  return new ExpressionImpl(internCompile, args)
}

export function isExpression<Value>(
  expression: unknown,
): expression is Expression<Value> {
  return (
    typeof expression === 'object' &&
    expression !== null &&
    expressionMarker in expression
  )
}

export function compile<Value>(
  ctx: contrastContext.Context,
  expr: ExpressionOpt<Value>,
): contrastExpressionIntern.ExpressionIntern {
  return toExpression(expr).compile(ctx)
}

export function compileToPure<Value>(
  ctx: contrastContext.Context,
  expr: ExpressionOpt<Value>,
): contrastExpressionIntern.PureExpressionIntern {
  return compile(ctx, expr).toPure(ctx)
}

export function toExpression<Value>(
  expr: ExpressionOpt<Value>,
): Expression<Value> {
  if (typeof expr === 'object') {
    if (expr === null) {
      return expression(
        contrastExpressionIntern.compileMulti,
        () => [] as const,
      ) as never
    } else if (Array.isArray(expr)) {
      return expression(contrastExpressionIntern.compileMulti, (ctx) =>
        expr.map((item) => compile(ctx, item)),
      ) as never
    } else if (isExpression<Value>(expr)) {
      return expr
    }
  }
  return expression(
    contrastExpressionIntern.compilePure,
    () => [expr] as const,
  ) as never
}
