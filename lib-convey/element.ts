import type * as conveyContext from '@/context.ts'
import * as conveyElementAttrs from '@/elementAttrs.ts'
import * as conveyFragment from '@/fragment.ts'
import * as conveyMarker from '@/marker.ts'
import * as compute from '@intertwine/lib-compute'

export function replaceBetween(
  startNode: Readonly<Node>,
  endNode: Readonly<Node>,
  innerNodes: readonly Node[],
): readonly Node[] | null {
  if (startNode.parentElement !== endNode.parentElement) {
    throw new Error("Can't replace with different parents")
  }

  const parentElement = startNode.parentElement
  if (!parentElement) {
    return innerNodes
  }

  const mutableNewNodes: Node[] = []
  let inside = false
  for (const oldNode of parentElement.childNodes) {
    if (oldNode === startNode) {
      mutableNewNodes.push(startNode)
      mutableNewNodes.push(...innerNodes)
      inside = true
    } else if (oldNode === endNode) {
      if (!inside) {
        throw new Error('End before start')
      }
      mutableNewNodes.push(endNode)
      inside = false
    } else if (!inside) {
      mutableNewNodes.push(oldNode)
    }
  }

  parentElement.replaceChildren(...mutableNewNodes)
  return null
}

export class ElementFragment<CustomContext = unknown>
  implements conveyFragment.Fragment<CustomContext>
{
  readonly [conveyMarker.fragmentMarker]: null = null
  private mutableFragment: conveyFragment.Fragment<CustomContext> | null =
    null
  private readonly mutableSubs: compute.Computation<unknown>[] = []

  constructor(
    private readonly namespace: string | null,
    private readonly tag: string,
    private readonly attrs: object,
  ) {}

  async *add(
    ctx: compute.Context & conveyContext.Context & CustomContext,
  ): AsyncIterableIterator<Node> {
    const mutableElement =
      this.namespace ?
        ctx.convey.document.createElementNS(this.namespace, this.tag)
      : ctx.convey.document.createElement(this.tag)

    const mutablePromises: Promise<void>[] = []

    for (const [key, value] of Object.entries(this.attrs) as [
      keyof conveyElementAttrs.AllAttrs,
      never,
    ][]) {
      const attrDefinition = conveyElementAttrs.allAttrs[key]
      if (
        attrDefinition.kind === conveyElementAttrs.ElementAttrKind.listener
      ) {
        this.addElementEventListener(
          ctx,
          mutableElement,
          attrDefinition.name,
          value,
        )
      } else if (
        attrDefinition.kind === conveyElementAttrs.ElementAttrKind.content
      ) {
        mutablePromises.push(
          this.appendFragmentToElement(ctx, mutableElement, value),
        )
      } else if (
        attrDefinition.kind === conveyElementAttrs.ElementAttrKind.onAdd
      ) {
        // TODO
        throw Error()
      } else {
        mutablePromises.push(
          this.bindAttribute(
            mutableElement,
            attrDefinition.kind,
            attrDefinition.name,
            value,
          ),
        )
      }
    }

    await Promise.all(mutablePromises)

    yield mutableElement
  }

  async remove(): Promise<void> {
    if (this.mutableFragment) {
      await this.mutableFragment.remove()
    }
    for (const sub of this.mutableSubs) {
      compute.unsubscribe(sub)
    }
  }

  private addElementEventListener(
    ctx: compute.Context & conveyContext.Context & CustomContext,
    mutableElement: Element,
    type: string,
    listener: (event: Readonly<Event>) => Promise<void> | void,
  ): void {
    mutableElement.addEventListener(type, (event) => {
      void (async () => {
        return ctx.convey.scheduler.run(async () => {
          return compute.txn(ctx, async () => {
            return listener(event)
          })
        })
      })()
    })
  }

  private async appendFragmentToElement(
    ctx: compute.Context & conveyContext.Context & CustomContext,
    mutableElement: Element,
    fragment: conveyFragment.FragmentOpt<CustomContext>,
  ): Promise<void> {
    this.mutableFragment = conveyFragment.toFragment(fragment)
    for await (const node of this.mutableFragment.add(ctx)) {
      mutableElement.append(node)
    }
  }

  private async bindAttribute(
    mutableElement: Element,
    kind:
      | conveyElementAttrs.ElementAttrKind.boolean
      | conveyElementAttrs.ElementAttrKind.string,
    name: string,
    value: compute.ComputationOpt<unknown>,
  ): Promise<void> {
    this.mutableSubs.push(
      await compute.effect((value) => {
        if (
          (kind === conveyElementAttrs.ElementAttrKind.boolean &&
            value === false) ||
          value === null
        ) {
          mutableElement.removeAttribute(name)
        } else {
          const valueItems =
            (
              kind === conveyElementAttrs.ElementAttrKind.boolean &&
              value === true
            ) ?
              ['']
            : Array.isArray(value) ? value
            : [value]
          mutableElement.setAttribute(name, valueItems.join(' '))
        }
      }, value),
    )
  }
}
