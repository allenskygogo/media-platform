import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer } from 'vite'

test('anonymous signing previews use only sample data and never read a student account', async t => {
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('Preview must not request student data') })
  // MemoryRouter uses a browser layout effect which is intentionally inactive in this SSR check.
  t.mock.method(console, 'error', () => {})
  const server = await createServer({ server: { middlewareMode: true, watch: null, hmr: false }, appType: 'custom' })
  t.after(() => server.close())
  const { default: Preview } = await server.ssrLoadModule('/src/pages/ContractSigningPreview.jsx')
  for (const [plan, title] of [['creator', '短影音一年達人班合作協議書'], ['master', '頂流私塾一年陪跑合作協議書'], ['online', '年度線上會員報價單'], ['invalid', '短影音一年達人班合作協議書']]) {
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
    for (const privateValue of ['private-student-id', 'private-name', 'private-email']) assert.ok(!html.includes(privateValue))
    for (const formalAction of ['確認並完成簽署', '下一步，確認付款', '送出並通知客服']) assert.ok(!html.includes(formalAction))
  }
})
