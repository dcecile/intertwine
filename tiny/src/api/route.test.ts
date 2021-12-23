import type * as route from '@tiny/api/route.ts'
import * as test from '@tiny/test/index.ts'

export function mockReqeuest(
  response: Partial<route.Request>
): route.Request {
  return {
    origin: 'http://test',
    path: '/',
    match: {},
    params: {},
    method: 'GET',
    headers: {
      'content-type': 'application/json',
    },
    stream: test.mock([]),
    buffer: test.mock([]),
    text: test.mock([]),
    form: test.mock([]),
    json: test.mock([]),
    ...response,
  }
}
