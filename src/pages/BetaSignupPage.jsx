import { useEffect, useState } from 'react'

const LINE_URL = 'https://line.me/R/ti/p/@tt_01'
const COPY_TEXT = '你好，我想報名「強人設三天影片創作營 NT$99」，並領取+80頁自媒體攻略包。'
const ANALYTICS_KEY = 'resource_pack_analytics'
const LEADS_KEY = 'resource_pack_leads'

const demoTopics = [
  ['親子 x 保養手法', '帶小孩太累？這招讓妳睡前5分鐘救回臉！'],
  ['親子 x 成分分析', '這成分號稱溫和，卻讓我兒子過敏一整晚？'],
  ['健身 x 上班族', '每天只練5分鐘，為什麼比你硬撐一小時更有效？'],
]

const formulas = [
  ['商業定位', '你賣的是什麼、誰需要、為什麼現在要相信你。'],
  ['內容定位', '把受眾痛點變成看得懂、想收藏、願意分享的題目。'],
  ['製作定位', '用你現有的設備、人力與時間，做出可穩定產出的流程。'],
  ['變現定位', '讓流量不是只有按讚，而是能導到私訊、名單和成交。'],
  ['玩法定位', '找到你適合長期玩的內容節奏，不再每天硬想。'],
]

const scripts = [
  ['開篇', '3秒內讓觀眾知道，這支影片跟他有關。'],
  ['事件', '用真實場景或衝突，讓內容有畫面。'],
  ['成效', '把改變、成果、前後對比說清楚。'],
  ['互動', '讓觀眾知道下一步該留言、私訊或收藏。'],
]

const results = [
  ['短影音新手', '從不知道拍什麼，到有一套能反覆產出的題庫。'],
  ['服務業老闆', '把專業服務變成客戶看得懂的短影音內容。'],
  ['個人品牌', '重新整理定位，讓帳號不再什麼都想講。'],
]

const campDays = [
  ['DAY ONE・定位', '自媒體趨勢到強人設的內容支點', '自媒體趨勢／個人定位／受眾輪廓／人設特質／內容支點'],
  ['DAY TWO・內容', '獲客抓手到人設化內容的四大類型', '漲粉型／流量型／人設型／故事型／選題思維／內容結構'],
  ['DAY THREE・創作', '從0到1打造爆款影片全流程', '導演式腳本／AI輔助創作／畫面設計／拍攝表達／剪輯與封面優化'],
]

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback))
  } catch {
    return fallback
  }
}

function detectTrafficSource() {
  const params = new URLSearchParams(window.location.search)
  const utmSource = params.get('utm_source')?.toLowerCase()
  if (utmSource) {
    if (utmSource.includes('facebook') || utmSource.includes('meta') || utmSource.includes('fb')) return 'meta'
    if (utmSource.includes('google')) return 'google'
    if (utmSource.includes('instagram') || utmSource.includes('ig')) return 'instagram'
    if (utmSource.includes('line')) return 'line'
    return utmSource
  }
  if (params.get('fbclid')) return 'meta'
  if (params.get('gclid')) return 'google'
  const referrer = document.referrer.toLowerCase()
  if (referrer.includes('instagram.com')) return 'instagram'
  if (referrer.includes('facebook.com')) return 'meta'
  if (referrer.includes('google.')) return 'google'
  if (referrer.includes('line.me') || referrer.includes('lin.ee')) return 'line'
  return referrer ? 'referral' : 'direct'
}

function trackResourcePackEvent(type) {
  const createdAt = new Date().toISOString()
  const source = detectTrafficSource()
  const event = {
    id: `${type}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    source,
    path: window.location.pathname,
    createdAt,
  }
  const events = readJson(ANALYTICS_KEY, [])
  localStorage.setItem(ANALYTICS_KEY, JSON.stringify([event, ...events].slice(0, 800)))

  if (type === 'line_click') {
    const leads = readJson(LEADS_KEY, [])
    const lead = {
      id: `lead-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      source,
      status: '已點 LINE',
      note: '已點擊加入 LINE，待 LINE 後續追蹤。',
      createdAt,
    }
    localStorage.setItem(LEADS_KEY, JSON.stringify([lead, ...leads].slice(0, 300)))
  }
}

function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text)
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
  return Promise.resolve()
}

function LineModal({ onClose, onLineClick }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await copyToClipboard(COPY_TEXT)
    setCopied(true)
  }

  return (
    <div className="beta-modal-backdrop" role="dialog" aria-modal="true" aria-label="報名三天創作營">
      <div className="beta-modal">
        <button className="beta-modal-close" type="button" onClick={onClose} aria-label="關閉">x</button>
        <p className="beta-kicker">加入官方 LINE</p>
        <h2>先複製這段訊息，再加入官方帳號</h2>
        <div className="beta-copy-box">{COPY_TEXT}</div>
        <div className="beta-modal-actions">
          <button className="beta-secondary-btn" type="button" onClick={handleCopy}>
            {copied ? '已複製' : '複製文字'}
          </button>
          <a className="beta-primary-btn" href={LINE_URL} target="_blank" rel="noreferrer" onClick={onLineClick}>
            加入 LINE @tt_01
          </a>
        </div>
      </div>
    </div>
  )
}

function Logo() {
  return (
    <a className="beta-logo" href="/" aria-label="回到首頁">
      <span className="beta-logo-mark">TT</span>
      <span>
        <strong>TOP LEVEL</strong>
        <small>TRAFFIC</small>
      </span>
    </a>
  )
}

export default function BetaSignupPage() {
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    trackResourcePackEvent('page_view')
  }, [])

  const openLineModal = () => setModalOpen(true)

  return (
    <main className="beta-pack-page">
      <style>{`
        .beta-pack-page {
          --navy: #071426;
          --navy2: #0b1d35;
          --cyan: #00d9ff;
          --cyan2: #4ea7ff;
          --gold: #ffc94a;
          --line: #06c755;
          min-height: 100vh;
          background: #071426;
          color: #fff;
          font-family: -apple-system, BlinkMacSystemFont, "PingFang TC", "Microsoft JhengHei", "Noto Sans TC", sans-serif;
          overflow-x: hidden;
        }
        .beta-pack-page * { box-sizing: border-box; }
        .beta-wrap {
          width: min(100%, 560px);
          margin: 0 auto;
          padding: 0 18px;
        }
        .beta-navbar {
          position: sticky;
          top: 0;
          z-index: 30;
          background: rgba(7, 20, 38, .92);
          border-bottom: 1px solid rgba(255,255,255,.08);
          backdrop-filter: blur(18px);
        }
        .beta-navbar-inner {
          width: min(100%, 560px);
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 12px 18px;
        }
        .beta-logo {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: #fff;
          text-decoration: none;
        }
        .beta-logo-mark {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: linear-gradient(135deg, #38bdf8, #8b4dff);
          font-size: 15px;
          font-weight: 1000;
          letter-spacing: 0;
        }
        .beta-logo strong,
        .beta-logo small {
          display: block;
          line-height: 1.05;
          letter-spacing: .12em;
        }
        .beta-logo strong { font-size: 12px; }
        .beta-logo small { margin-top: 4px; font-size: 14px; font-weight: 900; }
        .beta-nav-cta,
        .beta-primary-btn,
        .beta-secondary-btn,
        .beta-sticky-btn {
          border: 0;
          cursor: pointer;
          text-decoration: none;
          font-family: inherit;
          letter-spacing: 0;
        }
        .beta-nav-cta {
          flex: 0 0 auto;
          border-radius: 999px;
          padding: 10px 14px;
          color: #071426;
          background: var(--gold);
          font-size: 14px;
          font-weight: 900;
        }
        .beta-hero {
          background:
            radial-gradient(circle at 78% 18%, rgba(0,217,255,.24), transparent 34%),
            radial-gradient(circle at 12% 12%, rgba(80,96,255,.24), transparent 34%),
            linear-gradient(180deg, #071426 0%, #0b1d35 100%);
          padding: 42px 0 34px;
        }
        .beta-hero-badge {
          display: inline-flex;
          align-items: center;
          margin-bottom: 18px;
          border: 1px solid rgba(0,217,255,.28);
          border-radius: 999px;
          padding: 7px 12px;
          color: #a7ebff;
          background: rgba(0,217,255,.08);
          font-size: 12px;
          font-weight: 900;
        }
        .beta-hero h1 {
          margin: 0;
          color: #fff;
          font-size: clamp(30px, 8.8vw, 48px);
          line-height: 1.28;
          font-weight: 1000;
          letter-spacing: 0;
        }
        .beta-hero h1 em,
        .beta-section-title em,
        .beta-camp-title em,
        .beta-final h2 em {
          color: transparent;
          font-style: normal;
          background: linear-gradient(90deg, var(--cyan), var(--cyan2));
          -webkit-background-clip: text;
          background-clip: text;
        }
        .beta-sub {
          margin: 16px 0 22px;
          color: rgba(214,226,245,.76);
          font-size: 15.5px;
          line-height: 1.82;
        }
        .beta-primary-btn {
          display: inline-flex;
          width: 100%;
          min-height: 64px;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          border-radius: 18px;
          color: #071426;
          background: linear-gradient(135deg, #06c755, #04a745);
          box-shadow: 0 18px 38px rgba(6,199,85,.28);
          font-weight: 1000;
        }
        .beta-primary-btn .beta-cta-l1 {
          font-size: 17px;
          line-height: 1.3;
        }
        .beta-primary-btn .beta-cta-l2 {
          margin-top: 2px;
          font-size: 12.5px;
          line-height: 1.3;
          opacity: .88;
        }
        .beta-cta-sub {
          margin-top: 10px;
          color: rgba(214,226,245,.58);
          text-align: center;
          font-size: 12.5px;
          line-height: 1.65;
        }
        .beta-section,
        .beta-section-alt,
        .beta-camp-section,
        .beta-final {
          padding: 40px 0;
        }
        .beta-section-alt {
          background: rgba(255,255,255,.025);
        }
        .beta-section-title {
          margin: 0 0 8px;
          color: #fff;
          text-align: center;
          font-size: 26px;
          font-weight: 1000;
          line-height: 1.42;
          letter-spacing: 0;
        }
        .beta-section-desc {
          margin: 0 auto 22px;
          max-width: 440px;
          color: rgba(214,226,245,.62);
          text-align: center;
          font-size: 14.5px;
          line-height: 1.75;
        }
        .beta-demo-grid,
        .beta-formula-grid,
        .beta-script-grid,
        .beta-result-grid,
        .beta-get-list,
        .beta-camp-days {
          display: grid;
          gap: 12px;
        }
        .beta-demo-card,
        .beta-formula-card,
        .beta-script-card,
        .beta-result-card,
        .beta-get-item,
        .beta-camp-day,
        .beta-suit-item {
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 16px;
          background: linear-gradient(135deg, rgba(255,255,255,.07), rgba(255,255,255,.025));
          box-shadow: 0 18px 44px rgba(0,0,0,.14);
        }
        .beta-demo-card {
          padding: 18px;
        }
        .beta-demo-label,
        .beta-card-kicker {
          color: #86e8ff;
          font-size: 12px;
          font-weight: 900;
        }
        .beta-demo-quote {
          margin-top: 8px;
          color: #fff;
          font-size: 18px;
          font-weight: 900;
          line-height: 1.55;
        }
        .beta-demo-tag {
          display: inline-flex;
          margin-top: 12px;
          border-radius: 999px;
          padding: 5px 10px;
          color: #ffdd78;
          background: rgba(255,201,74,.12);
          font-size: 12px;
          font-weight: 900;
        }
        .beta-portfolio-hero {
          margin-top: 14px;
          overflow: hidden;
          min-height: 220px;
          border: 1px solid rgba(0,217,255,.18);
          border-radius: 18px;
          background:
            linear-gradient(0deg, rgba(7,20,38,.86), rgba(7,20,38,.1)),
            radial-gradient(circle at 50% 25%, rgba(0,217,255,.34), transparent 30%),
            linear-gradient(135deg, rgba(13,71,161,.72), rgba(5,10,24,.9));
        }
        .beta-portfolio-inner {
          min-height: 220px;
          display: grid;
          align-content: end;
          padding: 22px;
        }
        .beta-portfolio-inner strong {
          display: block;
          font-size: 28px;
          line-height: 1.25;
          font-weight: 1000;
        }
        .beta-portfolio-inner span {
          margin-top: 8px;
          color: rgba(214,226,245,.68);
          font-size: 13px;
        }
        .beta-formula-grid {
          grid-template-columns: 1fr;
        }
        .beta-formula-card,
        .beta-script-card,
        .beta-result-card {
          padding: 18px;
        }
        .beta-formula-card h3,
        .beta-script-card h3,
        .beta-result-card h3 {
          margin: 6px 0 8px;
          color: #fff;
          font-size: 18px;
          line-height: 1.45;
        }
        .beta-formula-card p,
        .beta-script-card p,
        .beta-result-card p {
          margin: 0;
          color: rgba(214,226,245,.62);
          font-size: 14px;
          line-height: 1.72;
        }
        .beta-suit-list {
          display: grid;
          gap: 10px;
        }
        .beta-suit-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 14px;
        }
        .beta-check {
          width: 24px;
          height: 24px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          border-radius: 999px;
          color: #071426;
          background: var(--gold);
          font-weight: 1000;
        }
        .beta-suit-item span {
          color: rgba(255,255,255,.86);
          font-size: 15px;
          font-weight: 800;
          line-height: 1.65;
        }
        .beta-get-item {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          padding: 14px;
        }
        .beta-get-num {
          width: 30px;
          height: 30px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          border-radius: 10px;
          color: #071426;
          background: var(--cyan);
          font-size: 14px;
          font-weight: 1000;
        }
        .beta-get-text {
          color: rgba(255,255,255,.86);
          font-size: 15px;
          font-weight: 800;
          line-height: 1.65;
        }
        .beta-camp-section {
          background:
            radial-gradient(circle at 80% 0%, rgba(255,201,74,.18), transparent 36%),
            linear-gradient(180deg, #0b1d35, #071426);
        }
        .beta-camp-badge {
          width: fit-content;
          margin: 0 auto 12px;
          border-radius: 999px;
          padding: 7px 12px;
          color: #071426;
          background: var(--gold);
          font-size: 12px;
          font-weight: 1000;
        }
        .beta-camp-title {
          margin: 0;
          text-align: center;
          font-size: 30px;
          line-height: 1.38;
          font-weight: 1000;
          letter-spacing: 0;
        }
        .beta-camp-sub {
          margin: 10px auto 22px;
          max-width: 450px;
          color: rgba(214,226,245,.68);
          text-align: center;
          font-size: 14.5px;
          line-height: 1.78;
        }
        .beta-price-row {
          display: flex;
          align-items: baseline;
          justify-content: center;
          gap: 10px;
          margin-bottom: 18px;
          flex-wrap: wrap;
        }
        .beta-old-price {
          color: rgba(214,226,245,.48);
          text-decoration: line-through;
          font-size: 15px;
        }
        .beta-new-price {
          color: var(--gold);
          font-size: 42px;
          font-weight: 1000;
        }
        .beta-unit {
          color: rgba(214,226,245,.62);
          font-size: 13px;
          font-weight: 900;
        }
        .beta-camp-day {
          padding: 16px;
        }
        .beta-camp-day-top {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }
        .beta-camp-num {
          color: var(--gold);
          font-weight: 1000;
        }
        .beta-camp-tag {
          color: #86e8ff;
          font-size: 12px;
          font-weight: 900;
        }
        .beta-camp-day-title {
          color: #fff;
          font-size: 17px;
          font-weight: 900;
          line-height: 1.45;
        }
        .beta-camp-day-items {
          margin-top: 8px;
          color: rgba(214,226,245,.58);
          font-size: 12.5px;
          line-height: 1.7;
        }
        .beta-camp-time {
          margin: 18px 0;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 16px;
          padding: 14px;
          color: rgba(255,255,255,.84);
          background: rgba(255,255,255,.045);
          text-align: center;
          font-size: 14px;
          line-height: 1.75;
          font-weight: 800;
        }
        .beta-final {
          padding-bottom: 108px;
          text-align: center;
          background:
            radial-gradient(circle at 50% 0%, rgba(0,217,255,.16), transparent 38%),
            #071426;
        }
        .beta-final h2 {
          margin: 0 0 10px;
          font-size: 28px;
          line-height: 1.42;
          font-weight: 1000;
        }
        .beta-final p {
          margin: 0 0 20px;
          color: rgba(214,226,245,.68);
          font-size: 14.5px;
          line-height: 1.75;
        }
        .beta-footer {
          padding: 24px 18px 104px;
          color: rgba(214,226,245,.5);
          text-align: center;
          font-size: 12px;
          background: #071426;
        }
        .beta-sticky-bar {
          position: fixed;
          left: 50%;
          bottom: 14px;
          z-index: 40;
          width: min(524px, calc(100vw - 24px));
          transform: translateX(-50%);
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 10px;
          align-items: center;
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 18px;
          padding: 10px;
          background: rgba(7,20,38,.9);
          box-shadow: 0 18px 50px rgba(0,0,0,.36);
          backdrop-filter: blur(18px);
        }
        .beta-sticky-title {
          color: #fff;
          font-size: 13px;
          font-weight: 1000;
        }
        .beta-sticky-sub {
          color: rgba(214,226,245,.58);
          font-size: 11px;
          font-weight: 800;
        }
        .beta-sticky-btn {
          min-width: 92px;
          min-height: 44px;
          border-radius: 14px;
          color: #071426;
          background: var(--line);
          font-size: 14px;
          font-weight: 1000;
        }
        .beta-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: grid;
          place-items: center;
          padding: 18px;
          background: rgba(0,0,0,.72);
        }
        .beta-modal {
          position: relative;
          width: min(520px, 100%);
          padding: 28px;
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 22px;
          background: #101827;
          box-shadow: 0 24px 80px rgba(0,0,0,.55);
        }
        .beta-modal h2 {
          margin: 0 0 18px;
          color: #fff;
          font-size: 24px;
          line-height: 1.35;
        }
        .beta-kicker {
          margin: 0 0 10px;
          color: #86e8ff;
          font-size: 13px;
          font-weight: 1000;
          letter-spacing: .08em;
        }
        .beta-modal-close {
          position: absolute;
          top: 14px;
          right: 14px;
          width: 38px;
          height: 38px;
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 12px;
          color: #fff;
          background: rgba(255,255,255,.06);
          font-size: 18px;
          cursor: pointer;
        }
        .beta-copy-box {
          margin-bottom: 18px;
          padding: 16px;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 14px;
          color: rgba(255,255,255,.84);
          background: rgba(255,255,255,.05);
          line-height: 1.8;
        }
        .beta-modal-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .beta-secondary-btn {
          display: inline-flex;
          min-height: 52px;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255,255,255,.14);
          border-radius: 14px;
          color: #fff;
          background: rgba(255,255,255,.06);
          font-size: 16px;
          font-weight: 900;
        }
        .beta-modal .beta-primary-btn {
          min-height: 52px;
          color: #071426;
          font-size: 16px;
        }
        @media (min-width: 760px) {
          .beta-wrap,
          .beta-navbar-inner {
            width: min(100%, 1040px);
          }
          .beta-wrap {
            padding-inline: 32px;
          }
          .beta-hero {
            padding: 76px 0 62px;
          }
          .beta-hero .beta-wrap {
            display: grid;
            grid-template-columns: minmax(0, 1fr) 380px;
            gap: 48px;
            align-items: center;
          }
          .beta-visual-panel {
            display: block;
          }
          .beta-formula-grid,
          .beta-script-grid,
          .beta-result-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
          .beta-formula-grid {
            grid-template-columns: repeat(5, minmax(0, 1fr));
          }
        }
        @media (max-width: 759px) {
          .beta-visual-panel {
            display: none;
          }
          .beta-navbar-inner {
            padding-inline: 14px;
          }
          .beta-nav-cta {
            padding-inline: 12px;
            font-size: 13px;
          }
          .beta-modal {
            padding: 24px 18px;
          }
          .beta-modal-actions {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <nav className="beta-navbar">
        <div className="beta-navbar-inner">
          <Logo />
          <button className="beta-nav-cta" type="button" onClick={openLineModal}>NT$99 報名</button>
        </div>
      </nav>

      <section className="beta-hero">
        <div className="beta-wrap">
          <div>
            <div className="beta-hero-badge">強人設三天影片創作營・NT$99 加碼送 +80 頁自媒體攻略包</div>
            <h1>不會拍、不會剪、沒有粉絲？<br />你缺的不是天份，是<em>技能</em></h1>
            <p className="beta-sub">
              就像學日文、學英文、學游泳，短影音也是一套練得會的技能。從選題、拍攝、剪輯到變現，五大定位公式加真實學員案例，讓你的帳號從 0 開始也能被看見。
            </p>
            <button className="beta-primary-btn" type="button" onClick={openLineModal}>
              <span className="beta-cta-l1">NT$99 報名三天創作營</span>
              <span className="beta-cta-l2">+80 頁自媒體攻略包</span>
            </button>
            <div className="beta-cta-sub">加 LINE 好友完成報名，同步奉送 +80 頁自媒體攻略包</div>
          </div>
          <div className="beta-visual-panel">
            <div className="beta-portfolio-hero">
              <div className="beta-portfolio-inner">
                <strong>先定位<br />再放大流量</strong>
                <span>選題、腳本、拍攝、剪輯、變現，一套練得會的短影音系統。</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="beta-section">
        <div className="beta-wrap">
          <h2 className="beta-section-title">我教的不是招式，是<em>練得會的技能</em></h2>
          <p className="beta-section-desc">照著方法練，誰都學得會。換行業、換受眾，一樣套得出爆款選題。</p>
          <div className="beta-demo-grid">
            {demoTopics.map(([label, quote]) => (
              <article className="beta-demo-card" key={quote}>
                <div className="beta-demo-label">{label}</div>
                <div className="beta-demo-quote">「{quote}」</div>
                <span className="beta-demo-tag">AI 選題公版</span>
              </article>
            ))}
          </div>
          <div className="beta-portfolio-hero">
            <div className="beta-portfolio-inner">
              <strong>實體課程<br />超過 300 場</strong>
              <span>不是只講概念，而是帶你把內容真的做出來。</span>
            </div>
          </div>
        </div>
      </section>

      <section className="beta-section-alt">
        <div className="beta-wrap">
          <h2 className="beta-section-title">不是零碎技巧，是一套<em>定位系統</em></h2>
          <p className="beta-section-desc">很多人卡住不是不努力，而是一開始就沒有把帳號、受眾、內容和變現串起來。</p>
          <div className="beta-formula-grid">
            {formulas.map(([title, desc], index) => (
              <article className="beta-formula-card" key={title}>
                <div className="beta-card-kicker">0{index + 1}</div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="beta-section">
        <div className="beta-wrap">
          <h2 className="beta-section-title">腳本，決定影片的<em>質感</em></h2>
          <p className="beta-section-desc">資料包會把金字塔腳本結構拆開，讓你知道每一段該說什麼。</p>
          <div className="beta-script-grid">
            {scripts.map(([title, desc], index) => (
              <article className="beta-script-card" key={title}>
                <div className="beta-card-kicker">STEP {index + 1}</div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="beta-section-alt">
        <div className="beta-wrap">
          <h2 className="beta-section-title">這套系統<em>適合這些人</em></h2>
          <div className="beta-suit-list">
            {[
              '幫老闆拍片，拍不出成效',
              '不知道如何一天產 30 條影片',
              '拍了很多支，流量卻一直起不來',
              '中小企業主、個人品牌，想用短影音導客',
              '想把流量真正變成訂單和收入，不只是按讚數',
            ].map(item => (
              <div className="beta-suit-item" key={item}>
                <div className="beta-check">✓</div>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="beta-section">
        <div className="beta-wrap">
          <h2 className="beta-section-title">報名三天創作營，<em>加碼送你 +80 頁自媒體攻略包</em></h2>
          <div className="beta-get-list">
            {[
              '五大定位公式：商業／內容／製作／變現／玩法',
              '帳號搭建個人簡介表：4 句話公式，附範例',
              '爆款選題公版：AI 問法與 10 個選題公版',
              '金字塔腳本結構：開篇、事件、成效、互動',
              '剪輯與拍攝實戰 SOP',
            ].map((item, index) => (
              <div className="beta-get-item" key={item}>
                <div className="beta-get-num">{index + 1}</div>
                <div className="beta-get-text">{item}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="beta-camp-section">
        <div className="beta-wrap">
          <div className="beta-camp-badge">報名即送 +80 頁自媒體攻略包</div>
          <h2 className="beta-camp-title">強人設<em>三天影片創作營</em></h2>
          <p className="beta-camp-sub">從內容定位到爆款影片，打造能傳播的強人設內容力。三個晚上，線上 Zoom 直接跟著做。</p>
          <div className="beta-price-row">
            <span className="beta-old-price">原價 NT$1,980</span>
            <span className="beta-new-price">NT$99</span>
            <span className="beta-unit">/ 三天完整課程</span>
          </div>
          <div className="beta-camp-days">
            {campDays.map(([tag, title, items], index) => (
              <article className="beta-camp-day" key={tag}>
                <div className="beta-camp-day-top">
                  <span className="beta-camp-num">0{index + 1}</span>
                  <span className="beta-camp-tag">{tag}</span>
                </div>
                <div className="beta-camp-day-title">{title}</div>
                <div className="beta-camp-day-items">{items}</div>
              </article>
            ))}
          </div>
          <div className="beta-camp-time">
            適合想開始做短影音、想整理定位、想用內容獲客的人。<br />
            加入官方 LINE 後，由專屬顧問安排合適上課時間。
          </div>
          <button className="beta-primary-btn" type="button" onClick={openLineModal}>
            <span className="beta-cta-l1">NT$99 報名三天創作營</span>
            <span className="beta-cta-l2">+80 頁自媒體攻略包</span>
          </button>
        </div>
      </section>

      <section className="beta-section-alt">
        <div className="beta-wrap">
          <h2 className="beta-section-title">真實案例不是炫耀，是告訴你<em>這套能落地</em></h2>
          <div className="beta-result-grid">
            {results.map(([title, desc]) => (
              <article className="beta-result-card" key={title}>
                <div className="beta-card-kicker">學員案例</div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="beta-final">
        <div className="beta-wrap">
          <h2>NT$99 報名，<em>從定位開始</em></h2>
          <p>加 LINE 好友完成報名，同步取得完整 +80 頁自媒體攻略包。</p>
          <button className="beta-primary-btn" type="button" onClick={openLineModal}>
            <span className="beta-cta-l1">立即報名三天創作營</span>
            <span className="beta-cta-l2">加 LINE @tt_01 領取資料包</span>
          </button>
          <div className="beta-cta-sub">由專屬顧問安排合適上課時間</div>
        </div>
      </section>

      <footer className="beta-footer">© 頂級流量 版權所有</footer>

      <div className="beta-sticky-bar">
        <div>
          <div className="beta-sticky-title">強人設三天創作營 NT$99</div>
          <div className="beta-sticky-sub">報名即送 +80 頁自媒體攻略包</div>
        </div>
        <button className="beta-sticky-btn" type="button" onClick={openLineModal}>立即報名</button>
      </div>

      {modalOpen && <LineModal onClose={() => setModalOpen(false)} onLineClick={() => trackResourcePackEvent('line_click')} />}
    </main>
  )
}
