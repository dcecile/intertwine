import type * as contrastContext from '@/context.ts'
import * as contrastRule from '@/rule.ts'

export interface ExpressionIntern {
  readonly type: (
    | CascadeExpressionIntern
    | PureExpressionIntern
    | ScopeExpressionIntern
  )['type']

  code(propertyName: string): IterableIterator<string>
  extraRules(): IterableIterator<contrastRule.Rule>
  toPure(ctx: contrastContext.Context): PureExpressionIntern
}

export function compilePure(
  value: unknown,
  ...dependencies: readonly PureExpressionIntern[]
): PureExpressionIntern {
  const mutableExtraRules: contrastRule.Rule[] = []
  for (const dependency of dependencies) {
    mutableExtraRules.push(...dependency.extraRules())
  }
  return new PureExpressionIntern(
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- interface is toString()
    `${value}`,
    mutableExtraRules,
  )
}

export function compilePureFunctionSeparator(
  name: string,
  separator: string,
  ...dependencies: readonly PureExpressionIntern[]
): PureExpressionIntern {
  return compilePure(
    `${name}(${dependencies.map((expression) => expression.value).join(separator)})`,
    ...dependencies,
  )
}

export function compilePureFunction(
  name: string,
  ...dependencies: readonly PureExpressionIntern[]
): PureExpressionIntern {
  return compilePureFunctionSeparator(name, ',', ...dependencies)
}

export function compilePureSeparator(
  separator: string,
  ...dependencies: readonly PureExpressionIntern[]
): PureExpressionIntern {
  return compilePure(
    dependencies.map((expression) => expression.value).join(separator),
    ...dependencies,
  )
}

export function compilePureSpaceSeparator(
  ...dependencies: readonly PureExpressionIntern[]
): PureExpressionIntern {
  return compilePureSeparator(' ', ...dependencies)
}

export function compilePureCommaSeparator(
  ...dependencies: readonly PureExpressionIntern[]
): PureExpressionIntern {
  return compilePureSeparator(',', ...dependencies)
}

export class PureExpressionIntern implements ExpressionIntern {
  readonly type = 'pure'

  constructor(
    readonly value: string,
    private readonly extraRulesArray: readonly contrastRule.Rule[],
  ) {}

  *code(propertyName: string): IterableIterator<string> {
    yield propertyName
    yield ':'
    yield this.value
  }

  *extraRules(): IterableIterator<contrastRule.Rule> {
    for (const rule of this.extraRulesArray) {
      yield rule
    }
  }

  toPure(): this {
    return this
  }
}

export function compileCascade(
  ...args: readonly ExpressionIntern[]
): CascadeExpressionIntern {
  return new CascadeExpressionIntern(args)
}

export class CascadeExpressionIntern implements ExpressionIntern {
  readonly type = 'cascade'

  private readonly mutablePure: {
    value: PureExpressionIntern | null
  } = {
    value: null,
  }

  constructor(readonly args: readonly ExpressionIntern[]) {}

  *code(propertyName: string): IterableIterator<string> {
    let scope = false
    let semi = false
    for (const arg of this.args) {
      if (arg.type === 'scope') {
        if (!scope) {
          scope = true
          if (semi) {
            yield ';'
            semi = false
          }
        } else if (semi) {
          yield '}'
          semi = false
        }
        for (const part of arg.code(propertyName)) {
          yield part
        }
      } else {
        if (semi) {
          yield ';'
        } else {
          if (scope) {
            yield '&{'
          }
          semi = true
        }
        for (const part of arg.code(propertyName)) {
          yield part
        }
        semi = true
      }
    }
    if (scope && semi) {
      yield '}'
    }
  }

  *extraRules(): IterableIterator<contrastRule.Rule> {
    for (const arg of this.args) {
      for (const rule of arg.extraRules()) {
        yield rule
      }
    }
  }

  toPure(ctx: contrastContext.Context): PureExpressionIntern {
    if (!this.mutablePure.value) {
      this.mutablePure.value = extractCustomProperty(ctx, this)
    }
    return this.mutablePure.value
  }
}

export function compileScope(
  scope: string,
  body: ExpressionIntern,
): ScopeExpressionIntern {
  return new ScopeExpressionIntern(scope, body)
}

export class ScopeExpressionIntern implements ExpressionIntern {
  readonly type = 'scope'

  private readonly mutablePure: {
    value: PureExpressionIntern | null
  } = {
    value: null,
  }

  constructor(
    readonly scope: string,
    readonly body: ExpressionIntern,
  ) {}

  *code(propertyName: string): IterableIterator<string> {
    yield this.scope
    yield '{'
    for (const part of this.body.code(propertyName)) {
      yield part
    }
    yield '}'
  }

  extraRules(): IterableIterator<contrastRule.Rule> {
    return this.body.extraRules()
  }

  toPure(ctx: contrastContext.Context): PureExpressionIntern {
    if (!this.mutablePure.value) {
      this.mutablePure.value = extractCustomProperty(ctx, this)
    }
    return this.mutablePure.value
  }
}

function extractCustomProperty(
  ctx: contrastContext.Context,
  expressionIntern: ExpressionIntern,
): PureExpressionIntern {
  const className = ctx.contrast.expressionClassName.build()
  const propertyName = ctx.contrast.expressionCustomPropertyName.build()
  const code = expressionIntern.code(propertyName)
  const pseudoElement = null
  const rule = contrastRule.rule(className, pseudoElement, code)
  return new PureExpressionIntern(`var(${propertyName})`, [
    ...expressionIntern.extraRules(),
    rule,
  ])
}

export function compileCustomProperty(
  propertyName: string,
): PureExpressionIntern {
  return compilePure(`var(${propertyName})`)
}

export function compileCustomPropertyOrDefault(
  propertyName: string,
  defaultValue: PureExpressionIntern,
): PureExpressionIntern {
  return compilePure(
    `var(${propertyName},${defaultValue.value})`,
    defaultValue,
  )
}
