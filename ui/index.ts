import * as message from '@fe/core/message.ts'
import * as button from '@fe/ui/button.ts'
import * as style from '@tiny/ui/style.ts'
import * as widget from '@tiny/ui/widget.ts'

console.log(message.hi)

const green = style.build([
  {
    backgroundColor: 'green',
  },
])
const blue = style.build([
  {
    backgroundColor: 'blue',
  },
])
const red = style.build([
  {
    backgroundColor: 'red',
  },
  blue,
  style.useSelector('&:hover', [green]),
])
const bold = style.build([
  {
    fontWeight: 'bold',
  },
])

const li = widget.html.li
const div = widget.html.div
const ul = widget.html.ul
const span = widget.html.span
const title = widget.html.title

const myCounter = widget.define<{
  readonly body: widget.Widget
  value: number
}>(() => {
  let value: number
  const body = span({})
  const result = {
    body,
    get value() {
      return value
    },
    set value(newValue) {
      value = newValue
      body.content = [value.toString()]
    },
  }
  result.value = 0
  return result
})

async function main(): Promise<void> {
  widget.initConfig(window.document)
  style.initConfig(window.document)

  const counter = myCounter({})

  const listContents = widget.range({
    content: [
      li({
        styles: [bold],
        content: ['init'],
      }),
    ],
  })

  function onClick(event: MouseEvent): void {
    console.log(event)
    counter.value += 1
    listContents.content = [
      li({
        styles: [red],
        content: [counter.value.toString()],
      }),
      li({
        content: [(counter.value * 2).toString()],
      }),
    ]
  }

  const rootDiv = div({
    content: [
      'HI ',
      button.custom({
        listen: {
          click: onClick,
        },
      }),
      ' ',
      counter,
      ul({
        content: [
          li({
            content: ['+'],
          }),
          listContents,
          li({
            content: ['-'],
          }),
        ],
      }),
    ],
  })

  const head = widget.toHtmlWidget(window.document.head)
  const body = widget.toHtmlWidget(window.document.body)

  head.content = [title({ content: ['Fertile Earth'] })]
  body.content = [rootDiv]

  if (import.meta.env.MODE === 'development') {
    await runAllUiTests()
  }
}

async function runAllUiTests() {
  const test = await import('@tiny/test/index.ts')
  const coreTest = await import('@fe/core/index.t.ts')
  const uiTest = await import('@fe/ui/index.t.ts')
  await test.runAll([coreTest, uiTest])
}

main().catch(console.error)
