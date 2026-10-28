import { serve } from '@hono/node-server'
import { app } from './app.js'

const port = Number(process.env.PORT ?? 3000)

const server = serve({ fetch: app.fetch, port, hostname: '0.0.0.0' }, (info) => {
  console.log(`listening on http://0.0.0.0:${info.port}`)
})

// Kubernetes sends SIGTERM before it removes the Pod. Close the listener so
// in-flight requests finish instead of being cut off mid-rollout.
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    console.log(`${signal} received, shutting down`)
    server.close(() => process.exit(0))
  })
}
