export function rule(
  className: string,
  pseudoElement: string | null,
  code: IterableIterator<string>,
): Rule {
  return new Rule(
    className,
    ''.concat(
      '.',
      className,
      ...(pseudoElement ? ['::', pseudoElement] : []),
      '{',
      ...code,
      '}',
    ),
  )
}

export class Rule {
  constructor(
    readonly className: string,
    readonly code: string,
  ) {}
}
