import os from 'node:os'
import { createRequire } from 'node:module'
import { Hono } from 'hono'

const { version } = createRequire(import.meta.url)('../package.json')

// In the cluster these come from the Downward API (see the GitOps repo's
// Deployment manifest). Locally they fall back to something sensible.
const pod = process.env.POD_NAME ?? os.hostname()
const namespace = process.env.POD_NAMESPACE ?? 'local'
const node = process.env.NODE_NAME ?? 'local'

// Set by CI at build time so you can see exactly which image is serving.
const commit = process.env.GIT_SHA ?? 'dev'

export const app = new Hono()

// What the demo is for: hit this repeatedly during a rollout and watch the
// pod name and version change as the new ReplicaSet takes over.
app.get('/', (c) =>
  c.json({
    message: 'Hello from Hono on k3s',
    version,
    commit,
    pod,
    namespace,
    node,
    uptime: Math.round(process.uptime()),
  })
)

app.get('/version', (c) => c.json({ version, commit }))

// Liveness and readiness probes point here. Keep it dependency-free: it must
// answer even when everything else is unhappy.
app.get('/healthz', (c) => c.text('ok'))

// Readiness probe: distinct from healthz. Liveness asks "is the process
// alive?"; readiness asks "should traffic be routed here right now?" A pod
// can be alive but not ready (e.g. still warming up).
app.get('/readyz', (c) => c.text('ready'))

export default app

