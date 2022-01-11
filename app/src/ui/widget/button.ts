import * as widget from '@tiny/ui/widget.ts'

const button = widget.html.button

export const custom = widget.define(
  (
    ctx: widget.Context
  ): {
    body: widget.Widget
    listen: widget.HtmlListeners
  } => {
    const body = button(ctx, {
      content: ['OK'],
    })
    return {
      body,
      set listen(value: widget.HtmlListeners) {
        body.listen = value
      },
    }
  }
)
