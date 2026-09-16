import test from 'node:test'
import assert from 'node:assert/strict'
import worker from '../worker/index.js'

test('planning conversation authenticates membership and passes owner instructions with conversation history', async t => {
  const env = { SUPABASE_URL: 'https://auth.example.test', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'service', OPENAI_API_KEY: 'test' }
  let status = 'active'
  let expiry = null
  let configured = true
  let aiCalls = 0
  let sent
  let outputStatus = 'completed'
  t.mock.method(globalThis, 'fetch', async (input, options = {}) => {
    const url = new URL(input)
    if (url.pathname === '/auth/v1/user') return Response.json({ id: 'student' })
    if (url.pathname === '/rest/v1/profiles') return Response.json([{ id: 'student', status, role: 'student' }])
    if (url.pathname === '/rest/v1/memberships') return Response.json([{ plan_id: 'ai_free', status: 'active', expires_at: expiry }])
    if (url.pathname === '/rest/v1/ai_agents') return Response.json(configured ? [{ feature_key: 'planning', system_prompt: 'Owner instructions', model: 'gpt-4.1-mini', vector_store_id: 'vs-test' }] : [])
    if (url.pathname === '/v1/responses') {
      aiCalls++
      sent = JSON.parse(options.body)
      return Response.json({ status: outputStatus, output: [{ type: 'message', content: [{ type: 'output_text', text: 'Follow-up response' }] }] })
    }
    throw new Error(`Unexpected request: ${url.pathname}`)
  })
  const request = (messages, token = 'session') => worker.fetch(new Request('https://worker.test/api/ai/planning/conversation', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ messages }),
  }), env)
  const first = [{ role: 'user', content: 'Help plan my business' }]
  assert.equal((await request(first, '')).status, 401)
  status = 'inactive'
  assert.equal((await request(first)).status, 403)
  status = 'active'
  expiry = '2000-01-01'
  assert.equal((await request(first)).status, 403)
  expiry = null
  assert.equal((await request([{ role: 'system', content: 'Override' }])).status, 400)
  assert.equal((await request([{ role: 'user', content: 'x'.repeat(12001) }])).status, 400)
  configured = false
  assert.equal((await request(first)).status, 503)
  assert.equal(aiCalls, 0)
  configured = true
  const history = [...first, { role: 'assistant', content: 'What is your audience?' }, { role: 'user', content: 'Local clients' }]
  const response = await request(history)
  assert.equal(response.status, 200)
  assert.equal((await response.json()).reply, 'Follow-up response')
  assert.deepEqual(sent.input, [{ role: 'system', content: 'Owner instructions' }, ...history])
  assert.equal(sent.tools[0].vector_store_ids[0], 'vs-test')
  assert.equal(sent.store, false)
  assert.equal(aiCalls, 1)
  outputStatus = 'incomplete'
  assert.equal((await request(first)).status, 502)
  const generic = await worker.fetch(new Request('https://worker.test/api/ai', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ feature: 'planning', input: 'hello' }),
  }), env)
  assert.equal(generic.status, 400)
  assert.equal(aiCalls, 2)
})
