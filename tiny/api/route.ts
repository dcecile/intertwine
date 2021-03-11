import * as http from 'http'
import * as stream from 'stream'
import * as streamPromises from 'stream/promises'
import type * as typeFest from 'type-fest'

export type Request = {
  url: URL
  match: Record<string, string>
  method: string
  headers: Record<string, string>
  stream: stream.Readable
}

export async function readRequestBuffer(
  request: Request
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const buffer = Buffer.alloc(0)
    request.stream.on('data', (chunk) => {
      buffer.write(chunk)
    })
    request.stream.on('end', () => {
      resolve(buffer)
    })
    request.stream.on('error', reject)
  })
}

export async function readRequestText(
  request: Request
): Promise<string> {
  return (await readRequestBuffer(request)).toString()
}

export async function readRequestObject(
  request: Request
): Promise<typeFest.JsonObject> {
  const result: unknown = JSON.parse(
    await readRequestText(request)
  )
  if (typeof result === 'object' && result !== null) {
    return result
  } else {
    throw Error('Invalid type')
  }
}

export type Response = typeFest.Promisable<
  | {
      status: number
      headers: Record<string, string>
      body: typeFest.Promisable<
        | string
        | Buffer
        | Uint8Array
        | stream.Readable
        | typeFest.JsonObject
      >
    }
  | http.RequestListener
>

export type Handler<Context> = (
  ctx: Context,
  request: Request
) => Response

export type Route<Context> = {
  methods: string[] | undefined
  match: RegExp
  handler: Handler<Context>
}

export function define<Context = unknown>(
  methods: string[] | undefined,
  match: RegExp,
  handler: Handler<Context>
): Route<Context> {
  return { methods, match, handler }
}

export function handle<Context>(
  ctx: Context,
  routes: Route<Context>[]
): http.RequestListener {
  return (req, res) => {
    void handleRequest(ctx, routes, req, res)
  }
}

async function handleRequest<Context>(
  ctx: Context,
  routes: Route<Context>[],
  req: http.IncomingMessage,
  res: http.ServerResponse
): Promise<void> {
  if (!req.method) {
    console.error('Missing method')
    return
  }
  if (!req.url) {
    console.error('Missing URL')
    return
  }
  req.on('error', console.error)
  res.on('error', console.error)
  try {
    const request = {
      url: new URL(
        req.url,
        `http://${req.headers.host || 'localhost'}`
      ),
      match: {},
      method: req.method,
      headers: Object.fromEntries(
        Object.entries(req.headers).filter(
          ([_key, value]) => typeof value === 'string'
        ) as [string, string][]
      ),
      stream: req,
    }
    const response = match(ctx, request, routes)
    const headResponse = await Promise.resolve(response)
    if (typeof headResponse === 'function') {
      headResponse(req, res)
    } else {
      res.writeHead(
        headResponse.status,
        headResponse.headers
      )
      const body = await Promise.resolve(headResponse.body)
      if (typeof body === 'string') {
        res.write(body)
      } else if (body instanceof Buffer) {
        res.write(body)
      } else if (body instanceof Uint8Array) {
        res.write(body)
      } else if (body instanceof stream.Readable) {
        await streamPromises.pipeline(body, res)
      } else {
        const result = JSON.stringify(body)
        res.write(result)
      }
      res.end()
    }
  } catch (error) {
    console.error(error)
    if (res.headersSent) {
      console.error('Headers already sent')
    } else {
      res.writeHead(500)
    }
    res.end()
  }
}

export function match<Context>(
  ctx: Context,
  request: Request,
  routes: Route<Context>[]
): Response {
  let response: Response | undefined = undefined
  for (const route of routes) {
    const match =
      (route.methods === undefined ||
        route.methods.indexOf(request.method) >= 0) &&
      route.match.exec(request.url.pathname)
    if (match) {
      response = route.handler(ctx, {
        ...request,
        match: match.groups ?? {},
      })
      break
    }
  }
  if (!response) {
    throw new Error('No route found')
  }
  return response
}

export function forward<Context>(
  ctx: Context,
  request: Request,
  match: Record<string, string>,
  route: Route<Context>
): Response {
  return route.handler(ctx, {
    ...request,
    match,
  })
}