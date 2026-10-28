import test from 'node:test'
import assert from 'node:assert/strict'
import { app } from '../src/app.js'

test('GET / reports the version and the pod it ran on', async () => {
  const res = await app.request('/')
  assert.equal(res.status, 200)

  const body = await res.json()
  assert.match(body.version, /^\d+\.\d+\.\d+$/)
  assert.ok(body.pod.length > 0)
})

test('GET /healthz answers ok', async () => {
  const res = await app.request('/healthz')
  assert.equal(res.status, 200)
  assert.equal(await res.text(), 'ok')
})

test('unknown routes 404', async () => {
  const res = await app.request('/nope')
  assert.equal(res.status, 404)
})

test('GET /readyz answers ready', async () => {
  const res = await app.request('/readyz')
  assert.equal(res.status, 200)
  assert.equal(await res.text(), 'ready')
})
