import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer } from 'vite'
import { signingPath, loginDestination } from '../shared/memberAccess.js'
import { studentSigningPlan, studentSigningLinks } from '../src/utils/studentSigning.js'

const userId = '00000000-0000-0000-0000-000000000001'
const documentTitles = { creator: '短影音一年達人班合作協議書', master: '頂流私塾一年陪跑合作協議書', online: '頂級流量年度線上會員報價單' }

test('each admin selection produces matching student and preview links without retaining the previous plan', () => {
  const user = { id: userId, tier: 'standard', planId: 'creator' }
  assert.equal(studentSigningPlan(user).id, 'creator')
  assert.equal(studentSigningPlan({ tier: 'online' }).id, 'online')
  for (const planId of ['creator', 'online', 'master', 'online']) {
    const links = studentSigningLinks('https://toplevel-tw.com', user, planId)
    const signing = new URL(links.signing)
    assert.equal(signing.searchParams.get('sign'), planId)
    assert.equal(signing.searchParams.get('student'), userId)
    assert.equal(new URL(links.preview).searchParams.get('plan'), planId)
    assert.equal(links.plan.id, planId)
    assert.equal(loginDestination(user, signing.pathname + signing.search), signingPath(planId, userId))
  }
  assert.throws(() => studentSigningLinks('https://toplevel-tw.com', user, 'unknown'), /簽署方案無效/)
})

test('anonymous signing previews use only sample data and never read a student account', async t => {
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('Preview must not request student data') })
  // MemoryRouter uses a browser layout effect which is intentionally inactive in this SSR check.
  t.mock.method(console, 'error', () => {})
  const server = await createServer({ server: { middlewareMode: true, watch: null, hmr: false }, appType: 'custom' })
  t.after(() => server.close())
  const { default: Preview } = await server.ssrLoadModule('/src/pages/ContractSigningPreview.jsx')
  for (const [plan, title] of Object.entries(documentTitles)) {
    const html = renderToStaticMarkup(createElement(MemoryRouter, {
      initialEntries: [`/preview/signing?plan=${plan}&student=private-student-id&name=private-name&email=private-email`],
    }, createElement(Preview)))
    assert.ok(html.includes(title), plan)
    assert.ok(html.includes('測試學員'))
    assert.ok(html.includes('preview@example.test'))
    assert.ok(html.includes('0900000000'))
    assert.ok(html.includes('完成測試預覽'))
    assert.ok(html.includes('不會送出正式簽署'))
    assert.match(html, /disabled=""[^>]*>完成測試預覽/)
    assert.ok(!html.includes('<select'))
    for (const [otherPlan, otherTitle] of Object.entries(documentTitles)) if (otherPlan !== plan) assert.ok(!html.includes(otherTitle))
    for (const privateValue of ['private-student-id', 'private-name', 'private-email']) assert.ok(!html.includes(privateValue))
    for (const formalAction of ['確認並完成簽署', '下一步，確認付款', '送出並通知客服']) assert.ok(!html.includes(formalAction))
  }
  for (const query of ['', 'plan=invalid', 'plan=online&plan=creator']) {
    const html = renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: [`/preview/signing?${query}`] }, createElement(Preview)))
    assert.ok(html.includes('簽署方案無效'))
    for (const title of Object.values(documentTitles)) assert.ok(!html.includes(title))
  }

  await t.test('formal signing renders only the requested document, without plan comparison or course links', async () => {
    const { StudentSigningDocument } = await server.ssrLoadModule('/src/pages/dashboard/Profile.jsx')
    const { plans } = await server.ssrLoadModule('/src/data/plans.js')
    for (const [planId, title] of Object.entries(documentTitles)) {
      const html = renderToStaticMarkup(createElement(StudentSigningDocument, {
        currentUser: { id: userId, name: '測試學員', email: 'student@example.test' },
        plan: plans.find(plan => plan.id === planId), signingUserId: userId,
      }))
      assert.ok(html.includes(title))
      assert.ok(html.includes('確認並完成簽署'))
      for (const [otherPlan, otherTitle] of Object.entries(documentTitles)) if (otherPlan !== planId) assert.ok(!html.includes(otherTitle))
      for (const unwanted of ['<select', '方案比較', '立即升級', '回到方案比較', 'href="/dashboard/courses"']) assert.ok(!html.includes(unwanted))
    }
  })

  await t.test('signing login identifies the selected plan and omits other course entry points', async () => {
    const { AuthProvider } = await server.ssrLoadModule('/src/context/AuthContext.jsx')
    const { default: Login } = await server.ssrLoadModule('/src/pages/Login.jsx')
    for (const planId of Object.keys(documentTitles)) {
      const next = signingPath(planId, userId)
      const html = renderToStaticMarkup(createElement(MemoryRouter, {
        initialEntries: [`/login?next=${encodeURIComponent(next)}`],
      }, createElement(AuthProvider, null, createElement(Login))))
      assert.ok(html.includes(`${studentSigningPlan({ planId }).name}線上簽署`))
      for (const unwanted of ['回到首頁', '查看線上課程', '註冊申請 AI']) assert.ok(!html.includes(unwanted))
    }
  })
})
