import { buildApp } from './app'

// App instance created at module level for warm-start reuse.
// Vercel keeps the module in memory between invocations,
// so subsequent requests skip the initialization cost.
const app = buildApp({ logger: true })

/**
 * Vercel serverless handler.
 *
 * - Receives a Web API Request and returns a Response via Fastify's .inject() method.
 * - app.ready() is idempotent — safe to call on every request to ensure plugins are loaded.
 * - Stateless: no request-scoped state persists between invocations.
 * - All route handlers must complete within 10s (Vercel execution limit).
 */
export default async function handler(req: Request): Promise<Response> {
  await app.ready()

  const url = new URL(req.url)
  const body = req.body ? await req.text() : undefined

  const res = await app.inject({
    method: req.method as
      | 'GET'
      | 'POST'
      | 'PUT'
      | 'DELETE'
      | 'PATCH'
      | 'HEAD'
      | 'OPTIONS',
    url: url.pathname + url.search,
    headers: Object.fromEntries(req.headers.entries()),
    body,
  })

  return new Response(res.body, {
    status: res.statusCode,
    headers: res.headers as HeadersInit,
  })
}
