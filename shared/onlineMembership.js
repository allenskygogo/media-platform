export const ONLINE_PLAN_ID = 'online'
export const ONLINE_MEMBERSHIP_AMOUNT = 6800
export const ONLINE_QUOTE_VERSION = 'online-member-6800-20261030-v1'
export const ONLINE_QUOTE_FILE = 'online-member-quote-6800.xlsx'
export const ONLINE_QUOTE_TITLE = '頂級流量年度線上會員報價單'
export const ONLINE_QUOTE_CONSENT = '本人已審閱本報價單及附註，了解方案內容、服務期限、含稅總價與退費結算原則。'
export const ONLINE_QUOTE_ITEMS = [
  ['百萬流量線上內容大課', '永久觀看；線上隨到隨學'],
  ['頂級流量 AI 使用權', '1 年'],
  ['選題靈感＋選題拆解', '每週提供，會員期間內'],
  ['內部直播閉門課', '每月提供，會員期間內'],
  ['在線群組實操指導', '365 天'],
  ['實用 SOP 工具包', '8 套'],
]
export const ONLINE_QUOTE_TERMS = [
  { title: '1. 付款與啟用', text: '簽約前提供至少 3 日條款審閱期間；簽約後一次付清含稅總額。會員年度服務自學員收到可正常使用的帳號或開通通知之次日起算 365 天，並以書面或電子通知確認起訖日。' },
  { title: '2. 永久觀看範圍', text: '百萬流量線上內容大課於購買範圍內永久觀看，不因年度會員到期而停止。永久觀看不等於永久享有 AI、直播或群組服務；平台更換時應提供替代觀看方式，無法履行時依法處理。' },
  { title: '3. 年度權益與交付', text: 'AI 使用權為一年。每週選題靈感與拆解、每月內部直播閉門課及群組實操指導於會員期間提供。直播時間提前公告，異動另行通知並安排補課或等值替代服務；SOP 工具包共 8 套。' },
  { title: '4. 指導與服務範圍', text: '本方案為線上課程與群組學習指導，不含實體課、到場陪拍、影片代製或一對一顧問。365 天係服務期間，非每日 24 小時即時回覆；升級或加購項目、費用及折抵須另行書面確認。' },
  { title: '5. 個人因素與期限', text: '因工作、時間安排、未登入、未參與直播或未提交作業，會員期限不自動暫停或延長；特殊情形可提出申請，經雙方書面同意另行安排。本項不影響學員依法解除、終止與申請退費之權利。' },
  { title: '6. 帳號與教材使用', text: '會員帳號限本人使用，未經書面同意不得共用、出租或轉讓。課程影片、講義、SOP 與工具不得擅自複製散布、轉售或供他人授課使用；學員可將所學方法用於自身內容創作及營運。' },
  { title: '7. 成效與課程說明', text: '本服務提供教學、工具與學習指導。實際成效受產業、投入程度、執行方式及平台機制等影響，不保證特定流量、粉絲數、諮詢量、成交或營收；此說明不免除約定服務及廣告承諾的履行責任。' },
  { title: '8. 解除、終止與退費', text: '學員可透過原聯絡管道以書面或可留存電子訊息提出。符合通訊交易解除權者依法辦理；一般終止依實付優惠總額、已提供服務比例及適用法規列明結算明細，退還未提供部分。不得事後按原價追扣、任設扣款比例或扣除贈品價額。' },
  { title: '9. 數位內容與持續服務', text: '不以完成付款、帳號開通或提供教材，即認定全部年度服務已交付或一律不得退費。數位內容如依法得排除 7 日解除權，須在提供前另行清楚告知並取得明確同意；年度持續服務及網際網路教學適用規定仍應遵守。' },
  { title: '10. 服務異常與其他事項', text: '如因服務方或平台因素無法提供服務，應修復並依實際情形補足期間、提供等值替代或依法退費。學員可洽 07-2367660 或原報名聯絡管道申訴，於接獲後 15 日內妥適處理；本報價自製表日起 7 日內有效。' },
]

export function isOnlineMember(user) {
  return (user?.planId || user?.plan_id || user?.tier) === ONLINE_PLAN_ID
}

export function onlineAnnualAccessExpired(user, now = Date.now()) {
  return isOnlineMember(user) && Boolean(user.expiresAt || user.expires_at) &&
    new Date(user.expiresAt || user.expires_at).getTime() <= now
}

export function onlineServiceDates(activatedAt) {
  const activated = new Date(activatedAt)
  if (!Number.isFinite(activated.getTime())) throw new Error('Invalid activation date')
  const date = activated.toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' })
  const start = new Date(`${date}T00:00:00+08:00`)
  start.setUTCDate(start.getUTCDate() + 1)
  return { startsAt: start.toISOString(), expiresAt: new Date(start.getTime() + 365 * 86400000).toISOString() }
}
