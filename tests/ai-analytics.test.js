import test from 'node:test'
import assert from 'node:assert/strict'
import worker from '../worker/index.js'
import { questionExcerpt, questionTopics, newestUsageFirst } from '../shared/aiUsage.js'
const env = { SUPABASE_URL: 'https://db.test', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'service' }
const alice = '00000000-0000-0000-0000-000000000001'
const bob = '00000000-0000-0000-0000-000000000002'

test('admin analytics resolves actual account names and returns only short summaries, newest first', async t => {
  let role = 'student'
  let usageReads = 0
  t.mock.method(globalThis, 'fetch', async (input, options = {}) => {
    const url = new URL(input)
    if (url.pathname === '/auth/v1/user') return Response.json({ id: 'admin-id' })
    if (url.pathname === '/rest/v1/profiles' && url.searchParams.get('select') === 'role,status') return Response.json([{ role, status: 'active' }])
    if (url.pathname === '/rest/v1/ai_usage_logs') {
      usageReads++
      assert.equal(url.searchParams.get('order'), 'created_at.desc,id.desc')
      assert.equal(url.searchParams.get('limit'), '1000')
      assert.equal(options.headers.Authorization, 'Bearer service')
      return Response.json([
        { id: 'old', user_id: alice, feature: 'topics', industry: '餐飲選題', plan: 'standard', created_at: '2026-09-18T08:00:00Z', input_payload: { entire_prompt: 'PRIVATE OLD PROMPT' } },
        { id: 'new', user_id: bob, feature: 'planning', industry: '請調整定位', plan: 'free', created_at: '2026-09-20T08:00:00Z', input_payload: { question_summary: '請調整定位', membership_plan: 'ai_free', messages: ['PRIVATE HISTORY'], user_name: 'FAKE NAME' } },
      ])
    }
    if (url.pathname === '/rest/v1/profiles') {
      assert.ok(url.searchParams.get('id').includes(alice))
      assert.ok(url.searchParams.get('id').includes(bob))
      return Response.json([{ id: alice, display_name: '甲學員', email: 'a@example.test' }, { id: bob, display_name: '乙學員', email: 'b@example.test' }])
    }
    throw new Error(`Unexpected request ${url}`)
  })
  const request = token => new Request('https://worker.test/api/admin/ai-usage?limit=99999', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  assert.equal((await worker.fetch(request(), env)).status, 403)
  assert.equal((await worker.fetch(request('student'), env)).status, 403)
  assert.equal(usageReads, 0)
  role = 'admin'
  const response = await worker.fetch(request('admin'), env)
  const result = await response.json()
  assert.equal(response.status, 200)
  assert.deepEqual(result.logs.map(row => row.id), ['new', 'old'])
  assert.equal(result.logs[0].user_name, '乙學員')
  assert.equal(result.logs[0].user_email, 'b@example.test')
  assert.equal(result.logs[0].plan, 'ai_free')
  assert.deepEqual(result.logs[0].topics, ['帳號定位'])
  assert.ok(!JSON.stringify(result).includes('PRIVATE'))
  assert.ok(!JSON.stringify(result).includes('FAKE NAME'))
  assert.ok(!('input_payload' in result.logs[0]))
})

test('question excerpts are bounded and redact email, mobile and URL without saving dialogue', () => {
  const excerpt = questionExcerpt('請幫我定位，信箱 test@example.com，手機 0912-345-678，網址 https://example.com ' + '測試'.repeat(200))
  assert.ok(Array.from(excerpt).length <= 161)
  assert.ok(!excerpt.includes('test@example.com'))
  assert.ok(!excerpt.includes('0912-345-678'))
  assert.ok(!excerpt.includes('https://'))
  assert.deepEqual(questionTopics('想修正帳號名稱、簡介與三個月更新策略', 'planning'), ['帳號名稱與簡介', '內容更新策略'])
  assert.deepEqual(questionTopics('幫我改一下', 'planning'), ['企劃定位'])
})

test('chronological sort handles unsorted sources without reversing or mutating them', () => {
  const records = [{ id: 'a', created_at: '2026-09-19T01:00:00Z' }, { id: 'b', created_at: '2026-09-20T01:00:00Z' }, { id: 'c', created_at: '2026-09-18T01:00:00Z' }]
  assert.deepEqual(newestUsageFirst(records).map(row => row.id), ['b', 'a', 'c'])
  assert.deepEqual(records.map(row => row.id), ['a', 'b', 'c'])
})
