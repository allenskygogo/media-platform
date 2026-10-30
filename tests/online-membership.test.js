import test from 'node:test'
import assert from 'node:assert/strict'
import worker from '../worker/index.js'
import { hasActiveCourseMembership, canAccessStudentPath, loginDestination, signingPath, isSigningPath, memberHome } from '../shared/memberAccess.js'
import { onlineAnnualAccessExpired, onlineServiceDates, ONLINE_QUOTE_VERSION, ONLINE_QUOTE_CONSENT, ONLINE_QUOTE_TERMS, ONLINE_QUOTE_ITEMS } from '../shared/onlineMembership.js'
import { hasFreeCoursePlayback } from '../shared/coursePlayback.js'
import { renderOnlineQuoteHtml } from '../shared/onlineQuoteHtml.js'
import { canAccessCourse } from '../src/data/mockData.js'

const userId = '00000000-0000-0000-0000-000000000001'
const contractId = '00000000-0000-0000-0000-000000000002'
const orderId = '00000000-0000-0000-0000-000000000003'
const env = { SUPABASE_URL: 'https://auth.test', SUPABASE_ANON_KEY: 'test', SUPABASE_SERVICE_ROLE_KEY: 'service', OPENAI_API_KEY: 'test' }
const signature = 'data:image/png;base64,aGVsbG8='
const request = (path, body, method = 'POST') => new Request(`https://worker.test${path}`, { method, headers: { Authorization: 'Bearer test-session', 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) })
const form = { planId: 'online', billingCycle: 'annual', signerName: '測試學員', signerEmail: 'student@example.test', signerPhone: '0912345678', signerSignatureDataUrl: signature, acceptedContract: true, signingUserId: userId }

test('unsigned sessions receive login-required status before accessing signatures or student data', async t => {
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('Must reject before reading private data') })
  t.mock.method(console, 'error', () => {})
  for (const [path, method] of [['/api/admin/students', 'GET'], ['/api/contracts/sign', 'POST']]) {
    const response = await worker.fetch(new Request(`https://worker.test${path}`, { method }), env)
    assert.equal(response.status, 401)
    assert.equal((await response.json()).error, 'Missing authorization token')
  }
})

test('online members keep all video courses after annual AI expires, without offline booking', () => {
  const membership = { plan_id: 'online', status: 'active', expires_at: '2000-01-01' }
  const user = { tier: 'online', planId: 'online', expiresAt: membership.expires_at }
  assert.equal(hasActiveCourseMembership(membership), true)
  assert.equal(hasActiveCourseMembership({ ...membership, status: 'inactive' }), false)
  assert.equal(onlineAnnualAccessExpired(user), true)
  assert.equal(onlineAnnualAccessExpired({ ...user, expiresAt: '2026-10-30T00:00:00Z' }, Date.parse('2026-10-30T00:00:00Z')), true)
  for (const access of [['trial'], ['standard'], ['advanced']]) assert.equal(canAccessCourse('online', access), true)
  assert.equal(hasFreeCoursePlayback(user), true)
  assert.equal(canAccessStudentPath(user, '/dashboard/courses/1'), true)
  assert.equal(canAccessStudentPath(user, '/dashboard/booking'), false)
  assert.equal(canAccessStudentPath(user, '/dashboard/publisher'), false)
  const dates = onlineServiceDates('2026-10-30T17:00:00Z')
  assert.equal(dates.startsAt, '2026-10-31T16:00:00.000Z')
  assert.equal(Date.parse(dates.expiresAt) - Date.parse(dates.startsAt), 365 * 86400000)
})

test('signature links survive login and reject arbitrary destinations', () => {
  const link = signingPath('online', userId)
  assert.equal(isSigningPath(link), true)
  assert.equal(loginDestination({ tier: 'online' }, link), link)
  assert.equal(loginDestination({ tier: 'ai_free', accessStatus: 'expired' }, link), link)
  const expiredTrial = { role: 'student', tier: 'basic', expiresAt: '2000-01-01' }
  assert.equal(loginDestination(expiredTrial, link), link)
  assert.equal(memberHome(expiredTrial), '/dashboard/profile')
  assert.equal(canAccessStudentPath(expiredTrial, '/dashboard/profile'), true)
  assert.equal(canAccessStudentPath(expiredTrial, '/dashboard/courses'), false)
  assert.equal(canAccessStudentPath(expiredTrial, '/dashboard/ai-tools'), false)
  for (const bad of [link + '&redirect=https://example.test', signingPath('unknown', userId), 'https://other.test' + link]) assert.equal(isSigningPath(bad), false)
})

test('signing requires identity, phone, signature and consent, fixes price on the server and does not open access', async t => {
  const writes = []
  t.mock.method(globalThis, 'fetch', async (input, options = {}) => {
    const path = new URL(input).pathname
    if (path === '/auth/v1/user') return Response.json({ id: userId })
    if (path === '/rest/v1/profiles') return Response.json([{ id: userId, email: form.signerEmail, display_name: form.signerName, role: 'student', status: 'active' }])
    if (path === '/rest/v1/contract_signatures' && options.method === 'POST') {
      const body = JSON.parse(options.body); writes.push(body)
      return Response.json([{ ...body, id: contractId, signed_at: '2026-10-30T08:00:00Z' }])
    }
    throw new Error(`Must not change membership or payment: ${path}`)
  })
  for (const change of [{ acceptedContract: false }, { signerPhone: '' }, { signerPhone: '12345678' }, { signerSignatureDataUrl: '' }, { signerName: 'x' }, { billingCycle: 'monthly' }]) {
    assert.equal((await worker.fetch(request('/api/contracts/sign', { ...form, ...change }), env)).status, 400)
  }
  assert.equal((await worker.fetch(request('/api/contracts/sign', { ...form, signingUserId: orderId }), env)).status, 403)
  assert.equal(writes.length, 0)
  const response = await worker.fetch(request('/api/contracts/sign', { ...form, amount: 1, amountLabel: 'NT$1', signedAt: '1900-01-01' }), env)
  assert.equal(response.status, 200)
  assert.equal(writes[0].amount, 6800)
  assert.equal(writes[0].contract_version, ONLINE_QUOTE_VERSION)
  assert.equal(writes[0].consent_text, ONLINE_QUOTE_CONSENT)
  assert.equal(writes[0].signed_at, undefined)
  assert.equal((await response.json()).contract.signedAt, '2026-10-30T08:00:00Z')
})

test('online checkout requires the same user signed quote, creates 6800 pending order and links the document', async t => {
  const writes = []
  let quoteOwner = orderId
  const quote = { id: contractId, plan_id: 'online', amount: 6800, contract_version: ONLINE_QUOTE_VERSION, status: 'signed', signer_signature_data_url: signature, consent_text: ONLINE_QUOTE_CONSENT, signer_phone: form.signerPhone, signer_name: form.signerName }
  t.mock.method(globalThis, 'fetch', async (input, options = {}) => {
    const path = new URL(input).pathname
    if (path === '/auth/v1/user') return Response.json({ id: userId })
    if (path === '/rest/v1/profiles') return Response.json([{ email: form.signerEmail, role: 'student', status: 'active' }])
    if (path === '/rest/v1/memberships') { assert.ok(!options.method || options.method === 'GET'); return Response.json([{ plan_id: 'ai_free' }]) }
    if (path === '/rest/v1/contract_signatures') {
      if (options.method === 'PATCH') { writes.push({ path, body: JSON.parse(options.body) }); return new Response(null, { status: 204 }) }
      return Response.json([{ ...quote, user_id: quoteOwner }])
    }
    if (path === '/rest/v1/orders' && options.method === 'POST') { const body = JSON.parse(options.body); writes.push({ path, body }); return Response.json([{ ...body, id: orderId }]) }
    throw new Error(`Unexpected request ${path}`)
  })
  const checkout = body => worker.fetch(request('/api/checkout/upgrade', { planId: 'online', phone: form.signerPhone, ...body }), env)
  assert.equal((await checkout({})).status, 400)
  assert.equal((await checkout({ contractId })).status, 403)
  assert.equal(writes.length, 0)
  quoteOwner = userId
  const response = await checkout({ contractId, amount: 1 })
  assert.equal(response.status, 200)
  assert.equal(writes[0].body.amount, 6800)
  assert.equal(writes[0].body.status, 'pending')
  assert.equal(writes[0].body.legacy_tier, 'online')
  assert.equal(writes[0].body.signed_contract_id, contractId)
  assert.deepEqual(writes[1].body, { order_id: orderId })
})

test('expired online member may fetch course catalog but AI is denied before model calls', async t => {
  t.mock.method(globalThis, 'fetch', async input => {
    const path = new URL(input).pathname
    if (path === '/auth/v1/user') return Response.json({ id: userId })
    if (path === '/rest/v1/profiles') return Response.json([{ role: 'student', status: 'active' }])
    if (path === '/rest/v1/memberships') return Response.json([{ plan_id: 'online', status: 'active', expires_at: '2000-01-01' }])
    if (path === '/rest/v1/course_catalog') return Response.json([{ courses: [], cf_videos: [], video_assignments: {} }])
    throw new Error(`Unexpected request ${path}`)
  })
  assert.equal((await worker.fetch(request('/api/course-catalog', null, 'GET'), env)).status, 200)
  assert.equal((await worker.fetch(request('/api/ai', { feature: 'script', input: 'test' }), env)).status, 403)
})

test('download keeps all six benefits, ten terms, contact information, signature and timestamp', () => {
  const html = renderOnlineQuoteHtml({ id: contractId, user_id: userId, signer_name: '<script>bad</script>', signer_email: form.signerEmail, signer_phone: form.signerPhone, signer_signature_data_url: signature, signed_at: '2026-10-30T08:00:00Z' })
  for (const [item, duration] of ONLINE_QUOTE_ITEMS) { assert.ok(html.includes(item)); assert.ok(html.includes(duration)) }
  for (const term of ONLINE_QUOTE_TERMS) { assert.ok(html.includes(term.title)); assert.ok(html.includes(term.text)) }
  assert.ok(html.includes(signature))
  assert.ok(html.includes(form.signerEmail))
  assert.ok(html.includes(form.signerPhone))
  assert.ok(html.includes('2026/10/30'))
  assert.ok(html.includes('應付總額優惠（含稅）：NT$6,800'))
  assert.ok(html.includes('&lt;script&gt;'))
  assert.ok(!html.includes('<script>bad</script>'))
})

test('admin signature status matches current paid plan and also recognizes a trial student pending activation', async t => {
  const profiles = [{ id: userId, display_name: '線上會員', role: 'student', email: 'online@example.test' }, { id: orderId, display_name: '體驗學生', role: 'student', email: 'trial@example.test' }]
  t.mock.method(globalThis, 'fetch', async input => {
    const url = new URL(input)
    if (url.pathname === '/auth/v1/user') return Response.json({ id: 'admin' })
    if (url.pathname === '/rest/v1/profiles') return Response.json(url.searchParams.has('id') ? [{ id: 'admin', role: 'admin', status: 'active' }] : profiles)
    if (url.pathname === '/rest/v1/memberships') return Response.json([{ user_id: userId, plan_id: 'online' }, { user_id: orderId, plan_id: 'trial' }])
    if (url.pathname === '/rest/v1/ai_access_applications') return Response.json([])
    if (url.pathname === '/auth/v1/admin/users') return Response.json({ users: [] })
    if (url.pathname === '/rest/v1/contract_signatures') return Response.json([
      { id: 'new-creator', user_id: userId, plan_id: 'creator', status: 'signed', signed_at: '2026-10-30' },
      { id: 'online-signed', user_id: userId, plan_id: 'online', status: 'signed', signed_at: '2026-10-29' },
      { id: 'trial-pending-activation', user_id: orderId, plan_id: 'online', status: 'signed', signed_at: '2026-10-28' },
    ])
    throw new Error(`Unexpected admin lookup ${url.pathname}`)
  })
  const response = await worker.fetch(request('/api/admin/students', null, 'GET'), env)
  assert.equal(response.status, 200)
  const { students } = await response.json()
  assert.equal(students[0].latestContract.id, 'new-creator')
  assert.equal(students[0].currentContract.id, 'online-signed')
  assert.equal(students[1].currentContract.id, 'trial-pending-activation')
})

test('admin manual payment activates online AI for the next-day annual period', async t => {
  let activation
  const order = { id: orderId, user_id: userId, plan_id: 'online', legacy_tier: 'online', status: 'pending', amount: 6800 }
  t.mock.method(globalThis, 'fetch', async (input, options = {}) => {
    const url = new URL(input)
    if (url.pathname === '/auth/v1/user') return Response.json({ id: 'admin' })
    if (url.pathname === '/rest/v1/profiles') return Response.json([{ role: 'admin', status: 'active' }])
    if (url.pathname === '/rest/v1/orders') return Response.json([{ ...order, ...(options.body ? JSON.parse(options.body) : {}) }])
    if (url.pathname === '/rest/v1/memberships' && options.method === 'POST') { activation = JSON.parse(options.body); return Response.json([activation]) }
    throw new Error(`Unexpected payment request ${url.pathname}`)
  })
  const response = await worker.fetch(request(`/api/admin/orders/${orderId}`, { status: 'paid' }, 'PATCH'), env)
  assert.equal(response.status, 200)
  assert.equal(activation.plan_id, 'online')
  assert.equal(activation.status, 'active')
  assert.equal(activation.expires_at, onlineServiceDates(activation.starts_at).expiresAt)
})
