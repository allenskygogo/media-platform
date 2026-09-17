import test from 'node:test'
import assert from 'node:assert/strict'
import worker from '../worker/index.js'
import { isAIOnly, memberHome, canAccessStudentPath, hasActiveCourseMembership } from '../shared/memberAccess.js'

test('AI products land in tools and cannot navigate to courses or booking', () => {
  for (const tier of ['ai_free', 'ai_trial', 'ai_subscription']) {
    const user = { role: 'student', tier }
    assert.equal(isAIOnly(user), true)
    assert.equal(memberHome(user), '/dashboard/ai-tools')
    for (const path of ['/dashboard/ai-tools', '/dashboard/profile']) {
      assert.equal(canAccessStudentPath(user, path), true)
    }
    for (const path of ['/dashboard', '/dashboard/courses', '/dashboard/courses/1', '/dashboard/trial', '/dashboard/trial-player', '/dashboard/booking', '/dashboard/publisher']) {
      assert.equal(canAccessStudentPath(user, path), false)
    }
  }
})

test('existing memberships and administrative destinations stay unchanged', () => {
  for (const tier of ['basic', 'standard', 'advanced']) {
    assert.equal(memberHome({ tier }), '/dashboard')
    assert.equal(canAccessStudentPath({ tier }, '/dashboard/courses/1'), true)
  }
  assert.equal(memberHome({ role: 'admin' }), '/admin')
  assert.equal(memberHome({ tier: 'managed' }), '/managed')
})

test('only active, unexpired course plans grant course access', () => {
  for (const plan_id of ['trial', 'creator', 'master', 'managed']) {
    assert.equal(hasActiveCourseMembership({ plan_id, status: 'active' }), true)
    assert.equal(hasActiveCourseMembership({ plan_id, status: 'inactive' }), false)
    assert.equal(hasActiveCourseMembership({ plan_id, status: 'active', expires_at: '2000-01-01' }), false)
  }
  for (const plan_id of ['ai_free', 'ai_trial', 'ai_subscription', 'unknown']) {
    assert.equal(hasActiveCourseMembership({ plan_id, status: 'active' }), false)
  }
  assert.equal(hasActiveCourseMembership(null), false)
})

test('Worker blocks AI-only course calls before accessing course or video data', async (t) => {
  const env = { SUPABASE_URL: 'https://auth.example.test', SUPABASE_ANON_KEY: 'test-anon', SUPABASE_SERVICE_ROLE_KEY: 'test-service' }
  let plan = 'ai_trial'
  let profileStatus = 'active'
  let role = 'student'
  let resourceCalls = 0
  t.mock.method(globalThis, 'fetch', async (input) => {
    const url = new URL(input)
    if (url.pathname === '/auth/v1/user') return Response.json({ id: 'test-user' })
    if (url.pathname === '/rest/v1/profiles') return Response.json([{ id: 'test-user', role, status: profileStatus }])
    if (url.pathname === '/rest/v1/memberships') return Response.json([{ plan_id: plan, status: 'active', expires_at: null }])
    if (url.pathname === '/rest/v1/course_catalog') {
      resourceCalls++
      return Response.json([{ courses: [], cf_videos: [], video_assignments: {} }])
    }
    throw new Error(`Unexpected upstream request: ${url.pathname}`)
  })
  const request = (path, method = 'GET') => worker.fetch(new Request(`https://worker.example.test${path}`, {
    method, headers: { Authorization: 'Bearer test-session' },
  }), env)
  for (plan of ['ai_free', 'ai_trial', 'ai_subscription']) {
    for (const [path, method] of [
      ['/api/course-catalog', 'GET'], ['/api/course-progress?courseId=1', 'GET'],
      ['/api/course-progress', 'POST'], ['/api/token/video-id', 'POST'],
      ['/api/videos', 'GET'], ['/api/videos/video-id', 'GET'],
    ]) {
      const response = await request(path, method)
      assert.equal(response.status, 403, `${plan}: ${path}`)
    }
  }
  assert.equal(resourceCalls, 0)
  assert.equal((await worker.fetch(new Request('https://worker.example.test/api/course-catalog'), env)).status, 403)
  for (plan of ['trial', 'creator', 'master']) {
    assert.equal((await request('/api/course-catalog')).status, 200)
  }
  profileStatus = 'inactive'
  assert.equal((await request('/api/course-catalog')).status, 403)
  profileStatus = 'active'
  role = 'admin'
  plan = 'ai_trial'
  assert.equal((await request('/api/course-catalog')).status, 200)
})

test('admin can assign free AI access with optional expiry; retired plans cannot be assigned', async (t) => {
  const env = { SUPABASE_URL: 'https://auth.example.test', SUPABASE_ANON_KEY: 'test-anon', SUPABASE_SERVICE_ROLE_KEY: 'test-service' }
  const writes = []
  let membership = null
  t.mock.method(globalThis, 'fetch', async (input, options = {}) => {
    const url = new URL(input)
    if (url.pathname === '/auth/v1/user') return Response.json({ id: 'admin-user' })
    if (options.method === 'POST' || options.method === 'PATCH') {
      const body = JSON.parse(options.body)
      writes.push({ path: url.pathname, body })
      if (url.pathname === '/rest/v1/memberships') membership = body
      return Response.json([body])
    }
    if (url.pathname === '/rest/v1/profiles') return Response.json([{ id: 'admin-user', role: 'admin', status: 'active', display_name: 'Test' }])
    if (url.pathname === '/rest/v1/memberships') return Response.json(membership ? [membership] : [])
    throw new Error(`Unexpected request: ${url.pathname}`)
  })
  const update = body => worker.fetch(new Request('https://worker.example.test/api/admin/students/00000000-0000-0000-0000-000000000001', {
    method: 'PATCH', headers: { Authorization: 'Bearer admin-session', 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }), env)
  assert.equal((await update({ name: 'New name', planId: 'ai_trial', legacyTier: 'ai_trial' })).status, 400)
  assert.equal(writes.length, 0)
  assert.equal((await update({ planId: 'ai_trial', legacyTier: 'standard', expiresAt: '2027-01-01' })).status, 400)
  assert.equal(writes.length, 0)
  for (const planId of ['ai_trial', 'ai_subscription']) {
    assert.equal((await update({ planId, legacyTier: planId, expiresAt: '2027-01-01' })).status, 400)
  }
  assert.equal(writes.length, 0)
  for (const planId of ['ai_free']) {
    const response = await update({ planId, legacyTier: planId, expiresAt: '2027-01-01' })
    assert.equal(response.status, 200)
    assert.equal(membership.plan_id, planId)
    assert.equal(membership.legacy_tier, planId)
    assert.ok(membership.expires_at)
    assert.equal((await response.json()).student.tier, planId)
  }
  assert.equal((await update({ planId: 'ai_free', legacyTier: 'ai_free', expiresAt: null })).status, 200)
  assert.equal(membership.expires_at, null)
})


test('free and retired AI plans cannot create paid checkout orders', async (t) => {
  const env = { SUPABASE_URL: 'https://auth.example.test', SUPABASE_SERVICE_ROLE_KEY: 'test-service' }
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('Checkout must reject AI before upstream writes') })
  for (const planId of ['ai_free', 'ai_trial', 'ai_subscription']) {
    const response = await worker.fetch(new Request('https://worker.example.test/api/checkout/orders', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', email: 'test@example.test', phone: '0912345678', password: 'test-password', planId }),
    }), env)
    assert.equal(response.status, 400)
    assert.equal((await response.json()).error, 'Invalid checkout plan')
  }
})

test('entry login destinations preserve intent without bypassing role or AI-only boundaries', async () => {
  const { loginDestination } = await import('../shared/memberAccess.js')
  const student = { role: 'student', tier: 'standard' }
  const ai = { role: 'student', tier: 'ai_free' }
  assert.equal(loginDestination(student, '/dashboard/ai-tools'), '/dashboard/ai-tools')
  assert.equal(loginDestination(student, '/dashboard/courses'), '/dashboard/courses')
  assert.equal(loginDestination(ai, '/dashboard/courses'), '/dashboard/ai-tools')
  for (const user of [student, ai]) {
    assert.equal(loginDestination(user, '/dashboard/profile?upgrade=creator'), '/dashboard/profile?upgrade=creator')
    for (const next of ['https://example.com', '//example.com', '/admin', '/dashboard/profile?upgrade=unknown', '/dashboard/courses/private']) {
      assert.equal(loginDestination(user, next), memberHome(user))
    }
  }
  assert.equal(loginDestination({ role: 'admin' }, '/dashboard/ai-tools'), '/admin')
  assert.equal(loginDestination({ tier: 'managed' }, '/dashboard/ai-tools'), '/managed')
})

test('AI member course purchase uses the same account and waits for payment before access changes', async (t) => {
  const env = { SUPABASE_URL: 'https://auth.example.test', SUPABASE_ANON_KEY: 'test-anon', SUPABASE_SERVICE_ROLE_KEY: 'test-service' }
  const orders = []
  t.mock.method(globalThis, 'fetch', async (input, options = {}) => {
    const url = new URL(input)
    if (url.pathname === '/rest/v1/orders' && options.method === 'POST') {
      const order = JSON.parse(options.body)
      orders.push(order)
      return Response.json([{ id: 'test-order', ...order }])
    }
    assert.ok(!options.method || options.method === 'GET', 'no account or membership writes before payment')
    if (url.pathname === '/auth/v1/user') return Response.json({ id: 'existing-ai-user', email: 'ai@example.test' })
    if (url.pathname === '/rest/v1/profiles') return Response.json([{ id: 'existing-ai-user', role: 'student', status: 'active', display_name: 'Test', email: 'ai@example.test' }])
    if (url.pathname === '/rest/v1/memberships') return Response.json([{ user_id: 'existing-ai-user', plan_id: 'ai_free', status: 'active' }])
    throw new Error(`Unexpected request: ${url.pathname}`)
  })
  const response = await worker.fetch(new Request('https://worker.example.test/api/checkout/upgrade', {
    method: 'POST', headers: { Authorization: 'Bearer test-session', 'Content-Type': 'application/json' },
    body: JSON.stringify({ planId: 'creator', phone: '0912345678' }),
  }), env)
  assert.equal(response.status, 200)
  assert.equal(orders.length, 1)
  assert.equal(orders[0].user_id, 'existing-ai-user')
  assert.equal(orders[0].customer_email, 'ai@example.test')
  assert.equal(orders[0].plan_id, 'creator')
  assert.equal(orders[0].status, 'pending')
})
