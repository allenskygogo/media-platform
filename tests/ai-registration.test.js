import test from 'node:test'
import assert from 'node:assert/strict'
import worker from '../worker/index.js'
import { memberHome, loginDestination, canAccessStudentPath, needsAIReview } from '../shared/memberAccess.js'
const userId = '00000000-0000-0000-0000-000000000001'
const env = { SUPABASE_URL: 'https://auth.example.test', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'service', OPENAI_API_KEY: 'test', AI_REGISTRATION_LIMITER: { limit: async () => ({ success: true }) } }
const request = (path, body = {}, token = '') => new Request(`https://worker.test${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) })
const form = { name: '申請測試', email: 'Applicant@example.test', phone: '0912-345-678', password: 'Password-for-test!', industry: '健身', purpose: '規劃短影音內容' }

test('first-login activation uses verified identity and existing memberships bypass trial creation', async t => {
  let existing = null
  const calls = []
  t.mock.method(globalThis, 'fetch', async (input, options) => {
    const path = new URL(input).pathname
    if (path === '/auth/v1/user') return Response.json({ id: userId })
    if (path === '/rest/v1/memberships') return Response.json(existing ? [existing] : [])
    if (path === '/rest/v1/rpc/start_self_service_ai_trial') {
      calls.push(JSON.parse(options.body))
      return Response.json({ membership: { plan_id: 'ai_free', legacy_tier: 'ai_free', starts_at: '2026-10-01T12:00:00Z', expires_at: '2026-10-08T12:00:00Z' } })
    }
    throw new Error(`Unexpected request ${path}`)
  })
  assert.equal((await worker.fetch(request('/api/memberships/start'), env)).status, 401)
  const response = await worker.fetch(request('/api/memberships/start', { userId: 'forged', days: 365 }, 'session'), env)
  assert.equal(response.status, 200)
  assert.deepEqual(calls, [{ p_user_id: userId }])
  assert.equal((await response.json()).membership.expiresAt, '2026-10-08T12:00:00Z')
  existing = { id: 'course', plan_id: 'creator', legacy_tier: 'standard', starts_at: '2026-09-01', expires_at: '2027-09-01' }
  const course = await worker.fetch(request('/api/memberships/start', {}, 'session'), env)
  assert.equal((await course.json()).membership.planId, 'creator')
  assert.equal(calls.length, 1)
})

test('self signup stores phone and eligibility without starting the trial or changing existing passwords', async t => {
  const writes = []
  let duplicate = false
  t.mock.method(globalThis, 'fetch', async (input, options) => {
    const url = new URL(input)
    writes.push({ path: url.pathname, method: options.method, body: JSON.parse(options.body) })
    if (url.pathname === '/auth/v1/admin/users') return duplicate ? Response.json({ message: 'Email exists' }, { status: 422 }) : Response.json({ id: userId })
    if (url.pathname === '/rest/v1/rpc/register_self_service_ai') return new Response(null, { status: 204 })
    throw new Error('Unexpected request')
  })
  assert.equal((await worker.fetch(request('/api/auth/register-ai', { ...form, role: 'admin', planId: 'master', status: 'approved', expiresAt: '2099-01-01' }), env)).status, 200)
  assert.equal(writes.length, 2)
  assert.deepEqual(writes[1].body, { p_user_id: userId, p_name: form.name, p_email: form.email.toLowerCase(), p_phone: '0912345678', p_industry: form.industry, p_purpose: form.purpose })
  assert.equal(writes[0].body.app_metadata, undefined)
  duplicate = true
  assert.equal((await worker.fetch(request('/api/auth/register-ai', form), env)).status, 409)
  assert.equal(writes.length, 3)
  assert.ok(writes.every(item => item.method === 'POST'))
})

test('signup throttles and validates before any account write; failed application rolls back newly created auth user', async t => {
  const paths = []
  t.mock.method(globalThis, 'fetch', async (input, options) => {
    const path = new URL(input).pathname
    paths.push([path, options.method])
    if (path === '/auth/v1/admin/users') return Response.json({ id: userId })
    if (path === '/rest/v1/rpc/register_self_service_ai') return Response.json({ message: 'unavailable' }, { status: 503 })
    if (path === `/auth/v1/admin/users/${userId}` && options.method === 'DELETE') return Response.json({})
    throw new Error('Unexpected request')
  })
  assert.equal((await worker.fetch(request('/api/auth/register-ai', form), { ...env, AI_REGISTRATION_LIMITER: { limit: async () => ({ success: false }) } })).status, 429)
  assert.equal((await worker.fetch(request('/api/auth/register-ai', { ...form, password: 'short' }), env)).status, 400)
  assert.equal((await worker.fetch(request('/api/auth/register-ai', { ...form, name: 'x'.repeat(81) }), env)).status, 400)
  assert.equal((await worker.fetch(request('/api/auth/register-ai', { ...form, phone: '' }), env)).status, 400)
  assert.equal((await worker.fetch(request('/api/auth/register-ai', { ...form, phone: '123' }), env)).status, 400)
  assert.equal(paths.length, 0)
  assert.equal((await worker.fetch(request('/api/auth/register-ai', form), env)).status, 503)
  assert.deepEqual(paths.at(-1), [`/auth/v1/admin/users/${userId}`, 'DELETE'])
})

test('review is admin only and ignores caller supplied reviewer, plan, expiry and duration', async t => {
  let role = 'student'
  const calls = []
  t.mock.method(globalThis, 'fetch', async (input, options) => {
    const path = new URL(input).pathname
    if (path === '/auth/v1/user') return Response.json({ id: 'real-admin' })
    if (path === '/rest/v1/profiles') return Response.json([{ role, status: 'active' }])
    if (path === '/rest/v1/rpc/review_ai_application') { calls.push(JSON.parse(options.body)); return Response.json({ application: { status: 'approved' } }) }
    throw new Error('Unexpected request')
  })
  const path = `/api/admin/ai-applications/${userId}/review`
  assert.equal((await worker.fetch(request(path, { action: 'approve' }), env)).status, 403)
  assert.equal((await worker.fetch(request(path, { action: 'approve' }, 'student'), env)).status, 403)
  assert.equal(calls.length, 0)
  role = 'admin'
  assert.equal((await worker.fetch(request(path, { action: 'approve', p_admin_id: 'forged', days: 365, planId: 'master', expiresAt: '2099' }, 'admin'), env)).status, 200)
  assert.deepEqual(calls, [{ p_user_id: userId, p_admin_id: 'real-admin', p_action: 'approve' }])
})

test('all AI generation endpoints deny pending, expired and disabled users before making any model call', async t => {
  let membership = null
  let status = 'active'
  t.mock.method(globalThis, 'fetch', async input => {
    const path = new URL(input).pathname
    if (path === '/auth/v1/user') return Response.json({ id: userId })
    if (path === '/rest/v1/profiles') return Response.json([{ role: 'student', status }])
    if (path === '/rest/v1/memberships') return Response.json(membership ? [membership] : [])
    throw new Error(`Must reject before model calls: ${path}`)
  })
  for (const path of ['/api/ai', '/api/ai/planning/conversation', '/api/ai/writing/evaluate']) {
    assert.equal((await worker.fetch(request(path), env)).status, 401)
    membership = null
    assert.equal((await worker.fetch(request(path, {}, 'session'), env)).status, 403)
    membership = { status: 'active', plan_id: 'ai_free', expires_at: '2000-01-01' }
    assert.equal((await worker.fetch(request(path, {}, 'session'), env)).status, 403)
    membership = { status: 'active', plan_id: 'ai_free', starts_at: '2099-01-01', expires_at: '2099-01-08' }
    assert.equal((await worker.fetch(request(path, {}, 'session'), env)).status, 403)
    status = 'inactive'
    assert.equal((await worker.fetch(request(path, {}, 'session'), env)).status, 403)
    status = 'active'
  }
})

test('pending/rejected and exact expiry redirect away from AI and course deep links', () => {
  for (const accessStatus of ['pending', 'rejected', 'expired']) {
    const user = { role: 'student', tier: 'ai_free', accessStatus }
    assert.equal(memberHome(user), '/ai-access')
    assert.equal(loginDestination(user, '/dashboard/ai-tools'), '/ai-access')
    assert.equal(canAccessStudentPath(user, '/dashboard/ai-tools'), false)
    assert.equal(canAccessStudentPath(user, '/dashboard/courses'), false)
  }
  const user = { role: 'student', tier: 'ai_free', accessStatus: 'active', expiresAt: '2026-09-25T12:34:56.000Z' }
  assert.equal(needsAIReview(user, Date.parse(user.expiresAt) - 1), false)
  assert.equal(needsAIReview(user, Date.parse(user.expiresAt)), true)
  assert.equal(memberHome({ role: 'student', tier: 'standard' }), '/dashboard')
})
