import { ONLINE_QUOTE_TITLE, ONLINE_QUOTE_VERSION, ONLINE_QUOTE_ITEMS, ONLINE_QUOTE_TERMS, ONLINE_QUOTE_CONSENT, ONLINE_QUOTE_FILE } from './onlineMembership.js'

const escape = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')

export function renderOnlineQuoteHtml(contract, appUrl = 'https://toplevel-tw.com') {
  const signedAt = new Date(contract.signed_at).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${ONLINE_QUOTE_TITLE} - ${escape(contract.signer_name)}</title>
  <style>body{font:15px/1.8 system-ui,sans-serif;color:#17202b;max-width:920px;margin:auto;padding:28px;overflow-wrap:anywhere}h1{font-size:25px}h2{font-size:17px}table{width:100%;border-collapse:collapse;margin:18px 0}td,th{border:1px solid #bbb;padding:8px;text-align:left}th{background:#edf1f5}.parties{display:grid;grid-template-columns:1fr 1fr;gap:20px}.signature{width:240px;max-width:100%;height:90px;object-fit:contain;display:block}.total{font-size:20px;font-weight:bold}.meta{color:#56616d;font-size:12px}@media(max-width:560px){body{padding:16px}.parties{grid-template-columns:1fr}td,th{padding:6px}}@media print{body{padding:0}section,.parties{break-inside:avoid}}</style></head><body>
  <h1>${ONLINE_QUOTE_TITLE}</h1><p>製表日期 / 2026.10.30</p>
  <p>TO / ATTN：${escape(contract.signer_name)}<br>TEL：${escape(contract.signer_phone)}<br>Email：${escape(contract.signer_email)}<br>統編：${escape(contract.signer_identity)}<br>帳號：${escape(contract.signer_email)}</p>
  <p>FROM：天生驕傲品牌創意有限公司<br>TEL：07-2367660<br>PROJECT：頂級流量年度線上會員</p>
  <table><thead><tr><th>項次</th><th>會員權益</th><th>服務內容／期限</th><th>金額</th></tr></thead><tbody>${ONLINE_QUOTE_ITEMS.map(([item, duration], i) => `<tr><td>${i + 1}</td><td>${escape(item)}</td><td>${escape(duration)}</td><td>${i === 0 ? '9,800' : ''}</td></tr>`).join('')}</tbody></table>
  <p>原價 NT$9,800（未稅）<br>本期特惠 NT$6,800（未稅）<br>付款方式：簽約後一次付清含稅總額</p>
  <p>小計（未稅）：NT$9,800<br>營業稅（5%）：NT$490</p><p class="total">應付總額優惠（含稅）：NT$6,800</p>
  <p>會員起訖：自收到可正常使用的帳號或開通通知之次日起算 365 天，以開通通知確認起訖日。</p>
  <p>線上學習、隨到隨學；AI 及年度服務按下列附註第 1、3 點計期。</p>
  <h2>附註：線上會員建議條款</h2>${ONLINE_QUOTE_TERMS.map(term => `<section><h2>${escape(term.title)}</h2><p>${escape(term.text)}</p></section>`).join('')}
  <p>確認聲明：${ONLINE_QUOTE_CONSENT}</p><div class="parties"><section><h2>客戶簽名</h2><img class="signature" src="${escape(contract.signer_signature_data_url)}" alt="客戶電子簽名"><p>真實姓名：${escape(contract.signer_name)}<br>Email：${escape(contract.signer_email)}<br>聯絡電話：${escape(contract.signer_phone)}<br>簽署日期：${signedAt}</p></section><section><h2>服務方確認</h2><p>天生驕傲品牌創意有限公司<br>聯絡電話：07-2367660<br>確認日期：${signedAt}</p></section></div>
  <p><a href="${escape(appUrl.replace(/\/$/, ''))}/contract-assets/${ONLINE_QUOTE_FILE}">原始報價單（Excel）</a></p>
  <p class="meta">版本：${escape(contract.contract_version || ONLINE_QUOTE_VERSION)}<br>簽署紀錄：${escape(contract.id)}<br>學員帳號：${escape(contract.user_id)}<br>IP：${escape(contract.ip_address)}</p></body></html>`
}
