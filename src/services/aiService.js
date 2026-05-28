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
  const ind = (typeof input === 'string' ? input : '') || '你的行業'

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

    // ── Feature 7: 帳號定位策劃 ─────────────────────
    case 'account': {
      const industry = (typeof input === 'object' ? input?.industry : input) || '你的行業'
      const goal     = (typeof input === 'object' ? input?.goal     : '') || '個人品牌'
      const region   = (typeof input === 'object' ? input?.region   : '') || '台灣'
      const name     = (typeof input === 'object' ? input?.name     : '') || '你'
      return {
        analysis: {
          trend:     `${industry}行業在${region}市場正處於快速增長期，短影音創作者數量在過去一年增加了 40%，但真正有穩定流量的帳號不到 5%。知識型 + 揭秘型內容是目前表現最好的內容形態。`,
          painPoint: `大多數${industry}創作者面臨三大痛點：① 內容同質化嚴重，缺乏差異化定位；② 發布頻率不穩定，導致算法推薦減少；③ 流量來了卻無法轉換，變現路徑不清晰。`,
          strategy:  `建議以「揭秘 + 教學」為核心內容策略，結合個人真實案例建立差異化 IP。在${region}市場，${industry}相關帳號的黃金發布時間是平日晚間 7–9 點、週末下午 2–5 點。`,
        },
        branding: {
          avatar: `建議選用高飽和度、暖色系的真人照片。表情自然帶笑，背景簡潔（純色或與${industry}相關的場景）。避免過度修圖，真實感帶來更高的信任度。`,
          names: [
            `${industry}解密師`,
            `跟著${name || '我'}學${industry}`,
            `${industry}日記｜${name || '真實記錄'}`,
          ],
          bios: [
            `深耕${industry}多年 | 幫你少走彎路，直達結果 | 每週分享${industry}實戰乾貨 💡`,
            `${industry}從業者 | 分享那些書上沒有的真相 | ${region}在地觀點，全球適用 🌏`,
            `用${industry}養活自己的人 | 真實記錄創業過程 | 關注我，看普通人如何逆風翻盤 🔥`,
          ],
        },
        threemonth: [
          {
            label: '第一個月',
            goal:      `建立基礎定位，讓目標受眾認識你`,
            ratio:     `教學內容 60% + 個人故事 30% + 互動內容 10%`,
            direction: `${industry}入門教學、常見誤區揭秘、個人背景介紹`,
            publish:   `每週 3–4 支短影音，固定週二、週四、週六發布`,
            live:      `月底進行第一次直播，主題：我是如何開始做${industry}的`,
          },
          {
            label: '第二個月',
            goal:      `深化信任，建立行業權威感`,
            ratio:     `深度教學 50% + 案例拆解 30% + 幕後故事 20%`,
            direction: `完整案例拆解、${industry}行業潛規則、真實數據分享`,
            publish:   `每週 4–5 支，嘗試不同時長（30 秒、60 秒、3 分鐘）`,
            live:      `每月 2 次直播，主題：${industry}實戰問答 + 帳號覆盤`,
          },
          {
            label: '第三個月',
            goal:      `轉換變現，建立穩定收入模型`,
            ratio:     `變現引導 40% + 教學乾貨 40% + 社群互動 20%`,
            direction: `${goal}相關內容，直接對齊商業目標`,
            publish:   `固定發布節奏，每支影片結尾加入明確 CTA`,
            live:      `每月 4 次直播，引入產品 / 服務介紹，測試轉換率`,
          },
        ],
        business: {
          monetize:     `建議採用「內容引流 → 私域沉澱 → 產品成交」三步變現模型。短期目標：知識付費（課程 / 工作坊）；長期目標：${industry}相關產品或服務，對齊你的核心目標——${goal}。`,
          privateLayer: `• 普通粉絲：追蹤帳號，接收公開內容\n• 核心粉絲：加入 LINE 群，獲取獨家資訊\n• 高意向用戶：一對一諮詢，推進成交\n• 付費學員：VIP 社群，持續服務`,
          maintenance:  `每週固定在私域發一次「獨家乾貨」，每月一次線上分享，保持高頻觸達。設計「老帶新」機制，讓滿意的學員自然介紹新客戶。`,
        },
        topicSets: {
          knowledge: [
            `外行人不知道的${industry}黑心操作`,
            `內向者做${industry}最大的優勢是什麼`,
            `${industry}新手最常犯的 5 個錯誤`,
            `${industry}高手從不告訴你的核心秘密`,
            `用一分鐘搞懂${industry}的底層邏輯`,
            `${industry}從 0 到 1 的完整路線圖`,
            `做${industry}必知的 3 個核心原則`,
            `${industry}最省錢又高效的入門方法`,
            `為什麼 90% 的${industry}新手都失敗了`,
            `${industry}行業最顛覆認知的 3 個事實`,
          ],
          opinion: [
            `為什麼大多數人做${industry}都做不起來`,
            `我對${industry}行業最大的一個誤解`,
            `${industry}的本質，99% 的人都搞錯了`,
            `如果重新來過，我做${industry}會怎麼選擇`,
            `${industry}行業最讓我失望的 3 件事`,
            `${industry}未來 3 年最大的機會在哪裡`,
            `我為什麼不建議新手直接學${industry}`,
            `${industry}和其他行業最本質的差別`,
            `真正做好${industry}，最重要的一個能力`,
            `關於${industry}，我想說一個不受歡迎的真相`,
          ],
          story: [
            `我從零開始做${industry}的第一個月`,
            `做${industry}讓我最難忘的一次失敗`,
            `一個讓我頓悟${industry}本質的客戶`,
            `我在${industry}賺到第一個 10 萬的故事`,
            `做${industry}遇到最困難時期，我是怎麼撐過來的`,
            `我見過把${industry}做到最好的人，他有什麼不同`,
            `做${industry}三年，最讓我意外的一件事`,
            `一個改變我${industry}認知的深夜對話`,
            `我在${industry}犯過最貴的一個錯誤`,
            `從${industry}小白到專家，我的完整成長路`,
          ],
          process: [
            `我的${industry}一天工作流程完整公開`,
            `拆解一個成功的${industry}案例，從頭到尾`,
            `帶你看我是怎麼做${industry}準備的`,
            `我的${industry}工具清單大公開`,
            `真實紀錄：做${industry}的一週花費`,
            `從想法到執行，${industry}的完整流程`,
            `帶你看一個${industry}項目從 0 到完成`,
            `我的${industry}工作空間大公開`,
            `記錄我做${industry}的真實日常`,
            `${industry}直播全程記錄，每個細節都給你看`,
          ],
        },
      }
    }

    // ── Feature 8: 我有一個想法 → 選題 ──────────────
    case 'idea': {
      const ideaText = (typeof input === 'string' ? input : '') || '你的創作想法'
      const kw = ideaText.slice(0, 15).replace(/[，。？！、]/g, '')
      return [
        `【奇葩】${kw}背後的黑心真相大揭秘`,
        `【人群】為什麼懂行的人都這樣處理「${kw}」`,
        `【懷舊】這個做法其實幾十年前就有人用了`,
        `【最差】做得最差的案例到底錯在哪裡`,
        `【頭牌】頂尖高手是怎麼面對這個問題的`,
        `【荷爾蒙】做好這件事，你會讓人完全刮目相看`,
        `【反差】普通人和專家面對「${kw}」的最大差別`,
        `【成本】花最少的時間和錢，做出最好的效果`,
      ]
    }

    // ── Feature 9: 社群貼文 ──────────────────────────
    case 'socialPost': {
      const topic = (typeof input === 'string' ? input : '') || '你的主題'
      return {
        ig: `✨ 關於「${topic}」，90%的人都想錯了。

今天我來說一個真實故事——

一個學員問我：「我努力了三個月，為什麼還是沒有成長？」
我看了她的帳號，馬上找到問題所在。
不是她不夠努力，而是方向完全走偏了。

這件事讓我明白：${topic}的關鍵，從來不是你以為的那樣。

你有過類似的體驗嗎？留言告訴我 👇

#${topic.slice(0, 8)} #創作者日常 #真實故事 #漲粉心法 #台灣創作者 #內容創作 #社群經營 #短影音`,
        fb: `想跟大家分享一件關於「${topic}」的事，希望對你有幫助。

很多人問我：「做${topic}最難的是什麼？」

說實話，一開始我也不知道答案。直到遇到了一個讓我完全改觀的案例——

一位從事${topic}的創作者，三個月內從 200 粉成長到破萬。
她沒有特別的資源，也沒有完美的設備。
她做對了一件事：找到自己真正的差異化。

這個故事後來成為我最常分享的例子。

你在${topic}這條路上遇過什麼困難？歡迎下方留言分享，我們一起討論！`,
        threads: `說說關於「${topic}」我最近的體悟：

大家都說要找對方法，但其實最重要的是——先找對心態。

${topic}這件事，我花了兩年才搞懂一個核心：
真正的突破，不是來自更努力，而是來自更清晰地看見自己。

你同意嗎？`,
        universal: `【關於「${topic}」，我想說一個你可能沒聽過的真相】

很多人在${topic}這條路上卡關，不是因為不努力，而是找錯了方向。

今天分享三個讓我頓悟的關鍵：
1️⃣ 差異化比努力更重要——先想清楚你和別人的不同在哪裡
2️⃣ 真實感比完美感更有力——不完美的真實，比完美的包裝更打動人
3️⃣ 堅持選對的事，比什麼都強——方向對了，剩下的只是時間問題

收藏起來，你一定用得到 💡
有問題歡迎留言，我盡量一一回覆！`,
      }
    }

    // ── Feature 10: 爆款解析 ─────────────────────────
    case 'videoAnalysis': {
      return {
        elements: ['奇葩', '反差', '人群'],
        reasons: [
          '開頭前3秒使用「反常識」切入，直接打破觀眾預期，大幅提升完播率',
          '選題鎖定明確痛點，讓目標受眾立刻產生「這在說我」的共鳴感',
          '結構清晰：問題→原因→解法，觀眾能跟著邏輯走，不容易跳出',
          '結尾CTA明確，引導留言互動，算法推薦自然提升',
        ],
        replicateSteps: [
          '找出你行業內「反常識」的知識點，作為爆款選題切入點',
          '開頭用一句話點出觀眾的最大痛點，直接讓他們停下來看',
          '用你自己的真實案例替換模板中的數字和細節，建立可信度',
          '在1分20秒前加入核心乾貨，完播率決定推薦量',
          '結尾問一個只有真正有興趣的人才會回答的問題，過濾精準受眾',
        ],
      }
    }

    // ── Feature 11: 對標分析 ─────────────────────────
    case 'competitorAnalysis': {
      const industry2 = ind
      return {
        videoTypes: [
          { type: `${industry2}揭秘型`, desc: '用「外行人不知道的秘密」切入，點擊率高達行業均值3倍，適合建立專家形象' },
          { type: `${industry2}教學型`, desc: '手把手教學，完播率高，適合積累忠實粉絲，但需要穩定輸出頻率' },
          { type: '對比實驗型', desc: '「花100元vs花1000元」的對比形式，分享率極高，特別適合購買決策類內容' },
          { type: '真實記錄型', desc: '真人出鏡紀錄過程，信任感強，適合需要長期變現的個人IP帳號' },
          { type: '反駁觀點型', desc: '針對行業常見誤解進行反駁，容易引發討論，評論數是普通影片的5倍以上' },
        ],
        patterns: [
          '爆款影片95%都在前3秒完成「提問+懸念」設置，讓觀眾不得不繼續看',
          '字幕覆蓋率100%——無聲瀏覽佔整體播放量的60%以上',
          '影片長度集中在45秒–90秒，超過2分鐘完播率驟降50%',
          '評論區前10個留言決定算法是否繼續推薦，需要主動引導互動',
        ],
        directions: [
          `「${industry2}的秘密」系列：每週一個行業內幕，以揭秘口吻呈現，建立差異化定位`,
          `真實數據公開系列：用真實的收入、粉絲、轉化數字說話，增加帳號可信度`,
          `反駁常識系列：選取${industry2}最廣為流傳的錯誤觀念，用事實和案例逐一破解`,
        ],
      }
    }

    // ── Feature: 流量熱點 ────────────────────────────
    case 'hotspots':
      return [
        { title: '台灣選舉話題延燒，網路輿論如何影響消費行為', traffic: 'high' },
        { title: '2026年AI工具大爆發，哪些行業最受影響', traffic: 'high' },
        { title: '小資族理財新招，月薪3萬如何存到第一桶金', traffic: 'high' },
        { title: '台灣咖啡市場競爭白熱化，獨立咖啡廳如何突圍', traffic: 'medium' },
        { title: '健康意識抬頭，低醣飲食在台灣的流行趨勢', traffic: 'medium' },
        { title: '遠端工作新常態，工作與生活的界線在哪裡', traffic: 'medium' },
        { title: '台灣電商市場的下一個風口是什麼', traffic: 'high' },
        { title: '社群平台的演算法改變，創作者如何應對', traffic: 'low' },
        { title: '寵物經濟崛起，台灣毛孩市場商機解析', traffic: 'medium' },
        { title: '年輕人不婚不生的背後，藏著哪些商機', traffic: 'low' },
      ]

    // ── Feature 12: 企劃欄位修正 ─────────────────────
    case 'fieldCorrection': {
      const { field, original, correction } = (typeof input === 'object' ? input : {})
      return `${original}\n\n【根據補充修正】${correction}：以上分析已根據你的說明重新調整，請確認是否符合你的實際情況。`
    }

    // ── Feature 13: 頂流AI助理 ──────────────────────
    case 'assistant': {
      const msg = (typeof input === 'string' ? input : '') || '你的創作問題'
      const kw  = msg.slice(0, 20).replace(/[，。？！、]/g, '').trim()
      return {
        message: `根據你的描述，我幫你梳理了幾個創作方向：

📌 核心定位建議
你的核心優勢在於——你的真實經驗和專業視角。建議用「揭秘 + 教學」型內容切入，這是目前流量轉化率最高的內容形態。

🎯 三個內容角度
① 行業秘密型：揭露外行人不知道的業內真相，天然具備高點擊率
② 痛點解決型：聚焦目標受眾最常碰到的問題，直接給出解決方案
③ 對比反差型：用「做對 vs 做錯」的對比，清楚展示你的專業價值

💡 建議主題方向
${kw} 相關內容最適合你目前的定位

🚀 下一步行動
點擊「套用到爆款選題」，讓 AI 幫你生成 8 個具體的選題方向，或點擊「去看對應課程」了解更多創作技巧。`,
        suggestedTopic: kw.slice(0, 12),
      }
    }

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

// ── Practice submissions ──────────────────────────────
const PRACTICE_KEY = 'practice_submissions'

export function getPracticeSubmissions() {
  return JSON.parse(localStorage.getItem(PRACTICE_KEY) || '[]')
}

export function savePracticeSubmission(record) {
  const submissions = getPracticeSubmissions()
  submissions.push({
    ...record,
    id: Date.now().toString(),
    submitted_at: new Date().toISOString(),
    unlocked: true,
  })
  localStorage.setItem(PRACTICE_KEY, JSON.stringify(submissions))
}
