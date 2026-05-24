// ══════════════════════════════════════════════════════
//  AI Service — unified callAI wrapper
//  All AI calls go through this file.
//  To switch to real API: replace callAI() body only.
// ══════════════════════════════════════════════════════

const AI_USAGE_KEY      = 'ai_usage_log'
const FREE_DATE_KEY     = 'free_ai_date'
const FREE_COUNT_KEY    = 'free_ai_count'
const FREE_DAILY_LIMIT  = 3
const MOCK_DELAY_MS     = 1300

// ── Usage Log (localStorage "db") ────────────────────
export function getAIUsageLogs() {
  return JSON.parse(localStorage.getItem(AI_USAGE_KEY) || '[]')
}
function appendAIUsage(record) {
  const logs = getAIUsageLogs()
  logs.push({ ...record, created_at: new Date().toISOString() })
  localStorage.setItem(AI_USAGE_KEY, JSON.stringify(logs))
}

// ── Free daily rate-limit ─────────────────────────────
export function getFreeUsageStatus() {
  const today = new Date().toDateString()
  const savedDate = localStorage.getItem(FREE_DATE_KEY)
  let count = parseInt(localStorage.getItem(FREE_COUNT_KEY) || '0', 10)
  if (savedDate !== today) {
    count = 0
    localStorage.setItem(FREE_DATE_KEY, today)
    localStorage.setItem(FREE_COUNT_KEY, '0')
  }
  return { count, limit: FREE_DAILY_LIMIT, remaining: FREE_DAILY_LIMIT - count }
}
function bumpFreeCount() {
  const today = new Date().toDateString()
  if (localStorage.getItem(FREE_DATE_KEY) !== today) {
    localStorage.setItem(FREE_DATE_KEY, today)
    localStorage.setItem(FREE_COUNT_KEY, '0')
  }
  const n = parseInt(localStorage.getItem(FREE_COUNT_KEY) || '0', 10) + 1
  localStorage.setItem(FREE_COUNT_KEY, String(n))
}

// ── Monthly script quota (standard plan: 50 / month) ──
export function getScriptUsageStatus(userId) {
  const key   = `script_usage_${userId}`
  const month = new Date().toISOString().slice(0, 7)
  const data  = JSON.parse(localStorage.getItem(key) || '{}')
  const count = data.month === month ? (data.count || 0) : 0
  return { count, limit: 50, remaining: 50 - count, month }
}
export function bumpScriptUsage(userId) {
  const key   = `script_usage_${userId}`
  const month = new Date().toISOString().slice(0, 7)
  const data  = JSON.parse(localStorage.getItem(key) || '{}')
  const count = (data.month === month ? (data.count || 0) : 0) + 1
  localStorage.setItem(key, JSON.stringify({ month, count }))
}

// ══════════════════════════════════════════════════════
//  Mock data — replace with real API response later
// ══════════════════════════════════════════════════════
export function getMockData(feature, input) {
  const ind = (input || '你的行業').trim()

  switch (feature) {
    // ── Feature 1: 爆款選題 ──────────────────────────
    case 'topics':
      return [
        `【奇葩】外行人絕對不知道的${ind}黑心操作`,
        `【人群】內向者做${ind}最大的優勢是什麼`,
        `【懷舊】以前的人沒有${ind}，他們是怎麼辦到的`,
        `【最差】評價最差的${ind}服務，到底差在哪`,
        `【頭牌】世界上最貴的${ind}，貴在哪裡`,
        `【荷爾蒙】做${ind}的人，異性緣為什麼特別好`,
        `【反差】窮人和富人做${ind}的差別`,
        `【成本】花十分之一的錢，做到${ind}最好的效果`,
      ]

    // ── Feature 2: 腳本全文 ──────────────────────────
    case 'script':
      return `【鉤子 · 前 3 秒】
如果你在做${ind}，這支影片你不能錯過！

【問題引入 · 30 秒】
90% 做${ind}的人都犯了同一個錯——
他們只知道努力，卻不知道用對方法。
今天我要告訴你，什麼才是${ind}真正的核心。

【核心內容 · 主體】
▌ 第一點：找準你的差異化
在${ind}領域，同質化競爭是最大的陷阱。
你需要找到別人沒有講過的視角，
用「反常識」或「揭秘」的方式切入。

▌ 第二點：結構化你的內容
每支影片只解決一個問題。
用「問題 → 原因 → 解法 → 行動」四段架構，
讓觀眾跟著你的邏輯走，不知不覺看完全片。

▌ 第三點：讓數據說話
用真實案例、前後對比、具體數字，
比空泛的道理更有說服力。
例如：「用這個方法，我 30 天漲了 1 萬粉」。

【結尾 CTA】
這就是今天分享的${ind}核心方法。
如果你覺得有用，幫我按個讚，讓更多人看到！
留言告訴我你目前在${ind}最卡的問題是什麼，
下支影片我直接針對你的問題來拍！`

    // ── Feature 3: 拍攝形式推薦 ─────────────────────
    case 'shooting':
      return `【拍攝形式推薦 · ${ind}】

✅ 主推：坐拍解說（最高完播率）
正面對鏡，清晰說重點，建立專業感。
適合知識型、教學型${ind}內容。

✅ 輔助：Vlog 隨拍（最高親切感）
穿插${ind}真實工作場景，增加真實感。
讓觀眾跟著你「生活」，建立情感連結。

✅ 爆款：對比實驗（最高分享率）
「花 100 元 vs 花 1000 元做${ind}，差別在哪？」
對比類影片在 Reels / TikTok 完播率極高。

⚙️ 建議器材清單
· 手機（旗艦機即可）✓
· 環形燈 / 窗邊自然光
· 麥克風：BOYA BY-M1（入門） / DJI Mic（進階）
· 穩定器（外拍必備）

📐 畫面規格建議
· 豎版 9:16 為主（Reels / TikTok）
· 橫版 16:9 為輔（YouTube）
· 字幕必加——無聲觀看率高達 80%`

    // ── Feature 4: 三個月策劃 ────────────────────────
    case 'planning':
      return `【${ind} · 三個月內容策劃提案】

═══ 第一個月：建立基礎定位 ═══
目標：讓目標受眾認識你、記住你
節奏：每週 3 支短影片 + 1 支長影片

Week 1–2「是什麼」系列
· ${ind}是什麼？一分鐘看懂
· 做${ind}最常見的 5 個誤解
· 我為什麼開始做${ind}（個人故事）

Week 3–4「怎麼做」系列
· 新手做${ind}的第一步是什麼
· ${ind}最基本的工具和資源整理
· 我做${ind}第一個月的真實數據

═══ 第二個月：建立信任深度 ═══
目標：從「認識你」到「信任你」
節奏：每週 2 支深度內容 + 2 支短片

Week 5–6「深度解析」系列
· ${ind}高手和新手的最大差別
· 我在${ind}踩過的 3 個大坑
· 完整拆解一個成功的${ind}案例

Week 7–8「對比實驗」系列
· 1000 元 vs 100 元做${ind}的差別
· 免費 vs 付費${ind}工具大比拼

═══ 第三個月：轉換變現 ═══
目標：建立個人品牌，開始變現準備
節奏：固定時間發布，提升粉絲期待感

Week 9–10「成果展示」系列
· 三個月做${ind}的完整覆盤
· 我的${ind}真實收入揭秘

Week 11–12「社群互動」系列
· 回答粉絲最常問的 10 個${ind}問題
· 直播：${ind}現場示範 + Q&A

📊 三個月 KPI 目標
· 第一個月：100 訂閱 / 粉絲
· 第二個月：500 訂閱 / 粉絲
· 第三個月：1,000+ 訂閱 / 粉絲`

    // ── Feature 5: 行銷文案 ──────────────────────────
    case 'marketing':
      return `【${ind} · 行銷文案組合包】

━━ 短影片封面標題（爆款模板）━━
1.「我靠${ind}月入 5 萬，這是我的完整方法」
2.「沒錢沒資源，我用${ind}3 個月從 0 到 1 萬粉」
3.「${ind}的秘密，從業 10 年的人才知道」
4.「為什麼你的${ind}沒流量？看完這個你就懂了」

━━ Instagram 圖文文案 ━━
做${ind}，你是不是也遇過這種困境？
明明努力了，但就是沒有結果。

問題不在於努力不夠，
而在於沒有找到對的方法。

今天分享 3 個讓我突破瓶頸的核心技巧：
1️⃣ 差異化定位——先找到別人沒做過的視角
2️⃣ 結構化內容——每支影片只解決一個問題
3️⃣ 數據驅動——用事實說話，不要靠感覺

存起來，你會用到的 💾
更多${ind}乾貨，追蹤帳號不錯過 ↗️

━━ 限時動態文案 ━━
「你在做${ind}嗎？
這個方法幫我在 30 天內漲了 XXXX 粉！
限時公開中，點擊查看 👆」`

    // ── Feature 6: 直播話術 ──────────────────────────
    case 'livestream':
      return `【${ind} · 直播話術完整腳本】

🎬 開場白（前 3 分鐘）
「大家好！歡迎來到今天的直播！
我是 [你的名字]，今天我們要聊的是——
讓你的${ind}從 0 開始突破的核心秘密。

先給還在進來的朋友扣個 1，讓我看看今天有多少人！
今天來的人特別有眼光，因為這是我第一次公開這個方法。」

💬 互動話術（每 10 分鐘穿插一次）
・「有沒有在做${ind}的朋友？扣個 👋 讓我看看！」
・「你現在${ind}最卡的問題是什麼？留言告訴我！」
・「今天的重點等下整理成一張圖，追蹤帳號等我發！」

🛍️ 引流話術
「想要完整的${ind}資源清單嗎？
留言『資源』，我等等私訊給你！」

「我有一個${ind}的免費課程，
今天直播的朋友可以優先報名，人數有限！」

📣 結尾 CTA
「今天分享的內容有沒有對你有幫助？
如果有的話，幫我點個愛心讓我知道！❤️

下次直播時間是 [日期]，記得設定提醒，我們下次見！掰掰～👋」`

    default:
      return null
  }
}

// ══════════════════════════════════════════════════════
//  callAI — the single entry point for all AI features
//  TODO: swap the body below for a real fetch() call:
//
//  const res = await fetch('/api/ai', {
//    method: 'POST',
//    headers: { 'Content-Type': 'application/json' },
//    body: JSON.stringify({ feature, input, userPlan }),
//  })
//  if (!res.ok) throw new Error(await res.text())
//  return await res.json()
// ══════════════════════════════════════════════════════
export async function callAI(feature, input, userPlan = 'free', userId = null) {
  await new Promise(r => setTimeout(r, MOCK_DELAY_MS))
  const result = getMockData(feature, input)
  appendAIUsage({ user_id: userId, feature, industry: input, plan: userPlan })
  return result
}

// ── Free-visitor wrapper (rate-limited) ───────────────
export async function callAIFree(feature, input) {
  const { remaining } = getFreeUsageStatus()
  if (remaining <= 0) throw new Error('LIMIT_EXCEEDED')
  bumpFreeCount()
  return callAI(feature, input, 'free', null)
}
