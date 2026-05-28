import { useState } from 'react'
import { Link } from 'react-router-dom'

// ─────────────────────────────────────────────────
//  Local mock — no API call needed
// ─────────────────────────────────────────────────
const ANGLES = ['奇葩', '人群', '懷舊', '最差', '頭牌', '荷爾蒙', '反差', '成本']

function generateTopics(ind) {
  const i = (ind || '').trim() || '你的行業'
  return [
    `【奇葩】外行人絕對不知道的${i}黑心操作`,
    `【人群】內向者做${i}最大的優勢是什麼`,
    `【懷舊】以前的人沒有${i}，他們是怎麼辦到的`,
    `【最差】評價最差的${i}服務，到底差在哪`,
    `【頭牌】世界上最貴的${i}，貴在哪裡`,
    `【荷爾蒙】做${i}的人，異性緣為什麼特別好`,
    `【反差】窮人和富人做${i}的差別`,
    `【成本】花十分之一的錢，做到${i}最好的效果`,
  ]
}

// ─────────────────────────────────────────────────
//  Bouncing SVG chevron (pure CSS animation, no emoji)
// ─────────────────────────────────────────────────
function BouncingArrow() {
  return (
    <div className="hp-bounce-arrow">
      <svg
        width="22" height="22" viewBox="0 0 24 24"
        fill="none" stroke="rgba(255,255,255,0.4)"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  )
}

// ─────────────────────────────────────────────────
//  Nav
// ─────────────────────────────────────────────────
function HomeNav() {
  return (
    <nav className="hp-nav">
      <div className="hp-nav-logo">
        <span className="hp-nav-logo-tt">TT</span>
        <span className="hp-nav-logo-text">TOP LEVEL TRAFFIC · 只有頂級，沒有套路</span>
      </div>

      <div className="hp-nav-links">
        <a href="#courses" className="hp-nav-link">課程體系</a>
        <a href="#ai-features" className="hp-nav-link">AI工具</a>
        <a href="#results" className="hp-nav-link">學員成果</a>
        <a href="#about" className="hp-nav-link">關於我們</a>
      </div>

      <div className="hp-nav-actions">
        <Link to="/login" className="hp-nav-login">登入</Link>
        <Link to="/trial-login" className="hp-btn-primary hp-btn-sm">免費試用 AI</Link>
      </div>
    </nav>
  )
}

// ─────────────────────────────────────────────────
//  Section 1 — Static Hero Banner
// ─────────────────────────────────────────────────
function HeroSection() {
  return (
    <>
      {/* ── 560px visual banner ── */}
      <section className="hp-hero-static">
        <div className="hp-hero-glow" />

        <div className="hp-badge">自媒體獲客 · 頂級流量</div>

        <h1 className="hp-hero-h1">
          <span className="hp-gradient-text">頂級流量</span>
          <br />
          <span className="hp-hero-sub-title">只有頂級，沒有套路</span>
        </h1>

        <p className="hp-hero-desc">
          台灣第一個結合 AI 工具 × 短影音實戰 × 一對一陪跑的自媒體獲客系統
          <br />
          從 0 開始，90 天打造你的個人流量護城河
        </p>

        <div className="hp-hero-btns">
          <Link to="/trial-login" className="hp-btn-primary hp-btn-lg">免費體驗 AI 工具</Link>
          <Link to="/pricing" className="hp-btn-ghost hp-btn-lg">查看課程方案</Link>
        </div>
      </section>

      {/* ── Stats bar below banner ── */}
      <div className="hp-static-stats-bar">
        <div className="hp-stat">
          <span className="hp-stat-num">1,200+</span>
          <span className="hp-stat-label">學員人數</span>
        </div>
        <div className="hp-stat-div" />
        <div className="hp-stat">
          <span className="hp-stat-num">93%</span>
          <span className="hp-stat-label">完課率</span>
        </div>
        <div className="hp-stat-div" />
        <div className="hp-stat">
          <span className="hp-stat-num">4.8 分</span>
          <span className="hp-stat-label">平均評分</span>
        </div>
        <div className="hp-stat-div" />
        <div className="hp-stat">
          <span className="hp-stat-num">12 個</span>
          <span className="hp-stat-label">AI 功能模組</span>
        </div>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────
//  Section 2 — AI Demo
// ─────────────────────────────────────────────────
function AIDemoSection() {
  const [industry, setIndustry] = useState('')
  const [topics, setTopics] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeAngle, setActiveAngle] = useState(null)

  function handleGenerate() {
    if (!industry.trim()) return
    setLoading(true)
    setTopics([])
    setActiveAngle(null)
    setTimeout(() => {
      setTopics(generateTopics(industry))
      setLoading(false)
    }, 900)
  }

  function handleAngle(angle) {
    setActiveAngle(angle)
    setLoading(true)
    setTopics([])
    setTimeout(() => {
      setTopics(generateTopics(industry || angle))
      setLoading(false)
    }, 700)
  }

  return (
    <section className="hp-ai-demo" id="ai">
      <div className="hp-section-header">
        <div className="hp-badge">AI 爆款生成 · 已生成 12,847 條選題</div>
        <h2 className="hp-section-title">一鍵生成爆款選題</h2>
        <p className="hp-section-desc">輸入你的行業，AI 即時生成 8 個高流量選題方向</p>
      </div>

      {/* Input row */}
      <div className="hp-ai-input-row">
        <input
          className="hp-ai-input"
          placeholder="輸入你的行業，例如：健身教練、室內設計、餐飲..."
          value={industry}
          onChange={e => setIndustry(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleGenerate()}
        />
        <button
          className="hp-btn-primary"
          onClick={handleGenerate}
          disabled={loading || !industry.trim()}
        >
          {loading ? '生成中…' : 'AI 生成選題'}
        </button>
      </div>

      {/* Angle tags */}
      <div className="hp-ai-angles">
        {ANGLES.map(a => (
          <button
            key={a}
            className={`hp-ai-angle-tag${activeAngle === a ? ' active' : ''}`}
            onClick={() => handleAngle(a)}
          >
            {a}
          </button>
        ))}
      </div>

      {/* Results */}
      {topics.length > 0 && (
        <div className="hp-ai-result-wrap">
          <div className="hp-ai-results">
            {topics.map((t, i) => (
              <div
                key={i}
                className={`hp-ai-result-item${i >= 3 ? ' blurred' : ''}`}
              >
                <span className="hp-ai-result-num">{String(i + 1).padStart(2, '0')}</span>
                <span className="hp-ai-result-text">{t}</span>
              </div>
            ))}
          </div>

          {/* Unlock overlay */}
          <div className="hp-ai-unlock">
            <BouncingArrow />
            <p className="hp-ai-unlock-title">解鎖全部 8 條選題 + 完整腳本生成</p>
            <p className="hp-ai-unlock-price">
              方案起售 <strong>$980</strong> · 含 AI 工具全功能
            </p>
            <Link to="/pricing" className="hp-btn-primary">立即解鎖完整功能</Link>
            <Link to="/trial-login" className="hp-ai-unlock-trial">先免費試用 &rarr;</Link>
          </div>
        </div>
      )}

      {/* Empty state */}
      {topics.length === 0 && !loading && (
        <div className="hp-ai-empty">
          <p>輸入行業關鍵字，或點擊上方標籤快速體驗</p>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="hp-ai-loading">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="hp-ai-skeleton" />
          ))}
        </div>
      )}
    </section>
  )
}

// ─────────────────────────────────────────────────
//  Section 3 — Pain Points
// ─────────────────────────────────────────────────
const PAIN_POINTS = [
  {
    icon: '📹',
    title: '拍了很多，沒有流量',
    desc: '每週認真更新，卻始終卡在 500 粉。不是你不努力，是你用錯了方法。',
  },
  {
    icon: '🤔',
    title: '不知道拍什麼，選題卡關',
    desc: '腦袋空空，不知道今天要講什麼。觀眾想看什麼？算法喜歡什麼？完全沒概念。',
  },
  {
    icon: '📋',
    title: '看別人成功，自己複製不了',
    desc: '爆款視頻看了一百遍，照著做還是沒效果。因為你複製的是表面，不是底層邏輯。',
  },
]

function PainPointsSection() {
  return (
    <section className="hp-pain">
      <div className="hp-section-header">
        <h2 className="hp-section-title">你是不是也有這些困境？</h2>
        <p className="hp-section-desc">90% 的創作者都在同一個地方卡關</p>
      </div>
      <div className="hp-pain-cards">
        {PAIN_POINTS.map((p, i) => (
          <div className="hp-card hp-pain-card" key={i}>
            <div className="hp-pain-icon">{p.icon}</div>
            <h3 className="hp-pain-title">{p.title}</h3>
            <p className="hp-pain-desc">{p.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────
//  Section 4 — Course Stages
// ─────────────────────────────────────────────────
const STAGES = [
  {
    num: '01',
    name: '實戰體驗課',
    tag: '免費體驗',
    desc: '7 天短影音實戰入門，從選題到拍攝一次學會。',
    items: ['爆款選題邏輯', '手機拍攝技巧', 'AI 工具體驗'],
  },
  {
    num: '02',
    name: '頂流達人',
    tag: 'Basic',
    desc: '系統性課程 + AI 工具使用權，建立穩定的內容生產流水線。',
    items: ['完整爆款方法論', 'AI 文案 & 選題', '月更 12 支不卡關'],
  },
  {
    num: '03',
    name: '頂流私塾',
    tag: 'Advanced',
    desc: '小班制精英訓練，AI 全功能 + 一對一教練輔導。',
    items: ['AI 全功能解鎖', '一對一 Coaching', '直播帶貨變現'],
  },
  {
    num: '04',
    name: '頂流代操',
    tag: 'Managed',
    desc: '全包式帳號託管，我們幫你拍、幫你剪、幫你漲粉。',
    items: ['專屬創作團隊', '帳號全程代管', '保底增粉承諾'],
  },
]

function CourseStagesSection() {
  return (
    <section className="hp-stages" id="courses">
      <div className="hp-section-header">
        <h2 className="hp-section-title">四個階段，找到你的位置</h2>
        <p className="hp-section-desc">從零基礎到頂流帳號，每一步都有完整的支持體系</p>
      </div>
      <div className="hp-stages-track">
        {STAGES.map((s, i) => (
          <div className="hp-card hp-stage-card" key={i}>
            <div className="hp-stage-num">{s.num}</div>
            <span className="hp-stage-tag">{s.tag}</span>
            <h3 className="hp-stage-name">{s.name}</h3>
            <p className="hp-stage-desc">{s.desc}</p>
            <ul className="hp-stage-list">
              {s.items.map((item, j) => (
                <li key={j} className="hp-stage-item">
                  <span className="hp-stage-check">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────
//  Section 5 — AI Features
// ─────────────────────────────────────────────────
const AI_FEATURES = [
  { icon: '🎯', title: '爆款選題', desc: '輸入行業，AI 生成 8 個高流量選題方向', tier: 'basic', color: '#4F9FFF' },
  { icon: '📝', title: '腳本生成', desc: '一鍵生成完整影片腳本，包含鉤子、主體、CTA', tier: 'basic', color: '#4F9FFF' },
  { icon: '📱', title: '社群文案', desc: '同步生成 IG / FB / Threads / 通用貼文', tier: 'standard', color: '#a855f7' },
  { icon: '🎙️', title: '直播話術', desc: '開場白、互動話術、引流 CTA 全套腳本', tier: 'advanced', color: '#f59e0b' },
  { icon: '🔍', title: '爆款解析', desc: '拆解爆款密碼，學習可複製的成功模式', tier: 'advanced', color: '#f59e0b' },
  { icon: '🏆', title: '帳號定位', desc: '三個月完整企劃，從定位到變現一次規劃', tier: 'advanced', color: '#f59e0b' },
]

const TIER_LABELS = { basic: '頂流達人', standard: '進階', advanced: '頂流' }

function AIFeaturesSection() {
  return (
    <section className="hp-ai-features" id="ai-features">
      <div className="hp-section-header">
        <h2 className="hp-section-title">12 個 AI 功能模組</h2>
        <p className="hp-section-desc">從選題到變現，AI 全程陪你走完創作流程</p>
      </div>
      <div className="hp-ai-feat-grid">
        {AI_FEATURES.map((f, i) => (
          <div className="hp-card hp-ai-feat-card" key={i}>
            <div className="hp-ai-feat-top">
              <span className="hp-ai-feat-icon">{f.icon}</span>
              <span className="hp-ai-feat-tier" style={{ color: f.color }}>
                {TIER_LABELS[f.tier]}
              </span>
            </div>
            <h3 className="hp-ai-feat-title">{f.title}</h3>
            <p className="hp-ai-feat-desc">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────
//  Section 6 — Student Results
// ─────────────────────────────────────────────────
const RESULTS = [
  {
    name: '王小姐',
    role: '健身教練',
    stat: '+48 萬粉',
    desc: '從不會剪片到月入六位數，AI 工具幫我省了 80% 的腳本時間。現在每週穩定更新，粉絲黏著度超高。',
    tag: '3個月粉絲 +48萬',
  },
  {
    name: '陳老闆',
    role: '室內設計師',
    stat: '+$80 萬',
    desc: '沒想到做自媒體可以直接帶動業績。三個月後每個月都有客戶說「我在抖音看到你」，成交率暴增。',
    tag: '月業績增加 $80萬',
  },
  {
    name: '林先生',
    role: '餐飲創業者',
    stat: '2.3 萬粉',
    desc: '以前覺得自媒體是年輕人的事，上完課才知道，只要找對方法，中年人也能做出爆款。',
    tag: '帳號突破 2.3萬粉',
  },
]

function ResultsSection() {
  return (
    <section className="hp-results" id="results">
      <div className="hp-section-header">
        <h2 className="hp-section-title">學員真實成果</h2>
        <p className="hp-section-desc">不是廣告，是真實發生在他們身上的改變</p>
      </div>
      <div className="hp-results-cards">
        {RESULTS.map((r, i) => (
          <div className="hp-card hp-result-card" key={i}>
            <div className="hp-result-stat">{r.stat}</div>
            <div className="hp-result-meta">
              <span className="hp-result-name">{r.name}</span>
              <span className="hp-result-role">{r.role}</span>
            </div>
            <p className="hp-result-desc">{r.desc}</p>
            <div className="hp-result-tag">{r.tag}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────
//  Section 7 — Final CTA + Footer
// ─────────────────────────────────────────────────
function FinalCTA() {
  return (
    <section className="hp-final-cta">
      <div className="hp-final-cta-glow" />
      <div className="hp-final-cta-inner">
        <h2 className="hp-final-cta-title">現在就開始打造你的頂級流量</h2>
        <p className="hp-final-cta-desc">加入 1,200+ 位創作者，用 AI 加速你的自媒體成長</p>
        <div className="hp-final-cta-btns">
          <Link to="/pricing" className="hp-btn-primary hp-btn-lg">
            立即加入 · 方案起售 $980
          </Link>
          <Link to="/trial-login" className="hp-btn-ghost hp-btn-lg">
            先免費試用 AI 工具
          </Link>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="hp-footer" id="about">
      <div className="hp-footer-left">
        <div className="hp-nav-logo">
          <span className="hp-nav-logo-tt">TT</span>
          <span className="hp-nav-logo-text-dark">TOP LEVEL TRAFFIC</span>
        </div>
        <p className="hp-footer-tagline">只有頂級，沒有套路</p>
      </div>
      <div className="hp-footer-right">
        <a href="#" className="hp-footer-link">隱私政策</a>
        <a href="#" className="hp-footer-link">使用條款</a>
        <a href="#" className="hp-footer-link">聯繫我們</a>
      </div>
    </footer>
  )
}

// ─────────────────────────────────────────────────
//  Root export — no auth dependency
// ─────────────────────────────────────────────────
export default function HomePage() {
  return (
    <div className="hp-root">
      <HomeNav />
      <HeroSection />
      <AIDemoSection />
      <PainPointsSection />
      <CourseStagesSection />
      <AIFeaturesSection />
      <ResultsSection />
      <FinalCTA />
      <Footer />
    </div>
  )
}
