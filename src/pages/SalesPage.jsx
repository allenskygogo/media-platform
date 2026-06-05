import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import BrandLogo from '../components/BrandLogo'
import ManualPaymentModal from '../components/ManualPaymentModal'
import { initPixel, fbq } from '../utils/fbPixel'
import { callAI } from '../services/aiService'

const REGISTER_NOTICE = '目前僅開放已購買體驗課的學員註冊，請先購買體驗課後再完成會員註冊。'
const TRIAL_PRICE = 980
const TRIAL_PLAN_NAME = '自媒體獲客-定位體驗課'
const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'https://media-platform-api.allen-a76.workers.dev'

function normalizeTaiwanMobilePhone(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  let digits = raw.replace(/[^\d+]/g, '')
  if (digits.startsWith('+886')) digits = `0${digits.slice(4)}`
  else if (digits.startsWith('886')) digits = `0${digits.slice(3)}`
  digits = digits.replace(/\D/g, '')
  return /^09\d{8}$/.test(digits) ? digits : ''
}

// Replace with a public image path or URL when the final hero visual is ready.
const heroBgImage = ''
const heroPersonImages = {
  instagram: '/images/hero-instagram.png',
  tiktok: '/images/hero-tiktok.png',
  youtube: '/images/hero-youtube.png',
}

const STATS = [
  { icon: '01', value: '1,200+', label: '幫助創作者' },
  { icon: '02', value: '50,000+', label: '爆款選題生成' },
  { icon: '03', value: '2.3萬', label: '平均觀看次數' },
  { icon: '04', value: '98%', label: '學員滿意度' },
]

const PLATFORMS = [
  { label: 'Instagram', mark: 'IG' },
  { label: 'TikTok', mark: 'TT' },
  { label: 'YouTube', mark: 'YT' },
  { label: 'Threads', mark: 'TH' },
]

const TOPIC_ELEMENTS = [
  { key: '奇葩', color: 'purple' },
  { key: '人群', color: 'blue' },
  { key: '懷舊', color: 'orange' },
  { key: '最差', color: 'red' },
  { key: '頭牌', color: 'gold' },
  { key: '荷爾蒙', color: 'pink' },
  { key: '反差', color: 'cyan' },
  { key: '成本', color: 'green' },
]

const PAINS = [
  {
    title: '拍了很多，但沒有流量',
    solution: 'AI 選題引擎幫你找爆款角度',
  },
  {
    title: '不知道要拍什麼內容',
    solution: '每月 AI 幫你規劃內容方向',
  },
  {
    title: '看別人爆款，自己複製不了',
    solution: '課程教你爆款背後的原理',
  },
]

const learningStages = [
  {
    number: '01',
    label: '起點',
    title: '自媒體獲客-定位體驗課',
    bullets: ['免費體驗 AI 選題', '理解爆款底層邏輯', '建立內容方向感', '知道自己的產業可以怎麼發想內容'],
    accent: 'blue',
  },
  {
    number: '02',
    label: '進階',
    title: '頂流達人',
    bullets: ['全套課程解鎖', 'AI 選題 + 腳本生成', '老師批改作業', '系統學會自媒體獲客方法'],
    accent: 'purple',
  },
  {
    number: '03',
    label: '頂級',
    title: '頂流私塾',
    bullets: ['全功能 AI 無限使用', '一對一策略輔導', '三個月完整策劃', '協助修正帳號方向、腳本與內容主軸'],
    accent: 'gold-purple',
  },
  {
    number: '04',
    label: '代操',
    title: '頂流代操',
    bullets: ['帳號全權管理', '拍攝統籌安排', '數據每日更新', '團隊協助內容交付與帳號成長'],
    accent: 'cyan-purple',
  },
]

const FEATURES = [
  ['爆款選題生成', '自媒體獲客-定位體驗課即可使用'],
  ['腳本全文生成', '頂流達人解鎖'],
  ['拍攝形式推薦', '頂流達人解鎖'],
  ['三個月策劃提案', '頂流私塾解鎖'],
  ['行銷文案生成', '頂流私塾解鎖'],
  ['直播話術生成', '頂流私塾解鎖'],
]

const resultCases = [
  {
    id: 'beauty-01',
    name: '王小姐',
    category: '美妝',
    program: '頂流達人',
    metric: '+48萬粉絲',
    type: 'student',
    image: '',
    screenshot: '',
    icon: 'user',
    accent: 'blue',
  },
  {
    id: 'restaurant-01',
    name: '陳老闆',
    category: '餐飲',
    program: '頂流私塾',
    metric: '月增 $80萬',
    type: 'student',
    image: '',
    screenshot: '',
    icon: 'food',
    accent: 'purple',
  },
  {
    id: 'fitness-01',
    name: '林先生',
    category: '健身',
    program: '頂流代操',
    metric: '2.3萬均播',
    type: 'student',
    image: '',
    screenshot: '',
    icon: 'fitness',
    accent: 'cyan',
  },
]

function scrollToSection(id) {
  document.querySelector(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function makeTopics(industryInput) {
  const industry = industryInput.trim() || '健身'
  return [
    `外行人絕對不知道的${industry}黑心操作`,
    `內向者做${industry}，竟然比外向者更有優勢？`,
    `古代人沒有${industry === '健身' ? '健身房' : industry}，為什麼效果反而更好`,
    `做${industry}最差的 3 種方法，很多人每天都在犯`,
    `${industry}頭牌都不說的成交細節`,
    `${industry}內容如何拍出讓人想收藏的吸引力`,
    `看起來最普通的${industry}帳號，為什麼反而最會賺`,
    `做${industry}最低成本起步法，一週就能測出方向`,
  ]
}

function normalizeSalesTopics(result, industryInput) {
  const fallback = makeTopics(industryInput)
  if (!Array.isArray(result)) return fallback

  return fallback.map((item, index) => {
    const source = result[index]
    if (typeof source === 'string') {
      return source.replace(/^【.+?】/, '').trim()
    }
    if (source && typeof source === 'object') {
      return source.text || source.title || item
    }
    return item
  })
}

function SalesLoginModal({ onClose }) {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [registerNotice, setRegisterNotice] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setRegisterNotice('')
    setLoading(true)
    try {
      const user = await login(form.email.trim(), form.password)
      if (user.role === 'admin') navigate('/admin', { replace: true })
      else if (user.tier === 'managed') navigate('/managed', { replace: true })
      else navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal sp-login-modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">學員登入</h2>
          <button className="modal-close" onClick={onClose} aria-label="關閉登入視窗">✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <p style={{ color: 'var(--gray-500)', fontSize: 13, lineHeight: 1.7, margin: 0 }}>
              已購買體驗課或正式課程的學員，請使用購買時建立的 Email 登入。
            </p>

            {error && <div className="auth-alert error">{error}</div>}
            {registerNotice && <div className="auth-alert danger">{registerNotice}</div>}

            <div className="auth-form">
              <div className="form-group">
                <label className="form-label">電子郵件</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="輸入電子郵件"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">密碼</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="輸入密碼"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading}>
                {loading ? '登入中…' : '登入'}
              </button>
            </div>

            <p className="auth-divider">
              還沒有帳號？
              <button
                type="button"
                className="auth-link auth-link-button"
                onClick={() => setRegisterNotice(REGISTER_NOTICE)}
              >
                立即註冊
              </button>
            </p>

          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>回到首頁</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function SalesCheckoutModal({ onClose }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const setField = (key) => (e) => {
    setMessage('')
    setError('')
    setForm(prev => ({ ...prev, [key]: e.target.value }))
  }

  const submitPaymentCheckout = (payment) => {
    if (!payment?.configured || !payment?.action || !payment?.params) {
      throw new Error(payment?.message || '藍新付款尚未設定完成，請稍後再試。')
    }

    const formEl = document.createElement('form')
    formEl.method = payment.method || 'POST'
    formEl.action = payment.action
    formEl.style.display = 'none'

    Object.entries(payment.params).forEach(([key, value]) => {
      const input = document.createElement('input')
      input.type = 'hidden'
      input.name = key
      input.value = String(value ?? '')
      formEl.appendChild(input)
    })

    document.body.appendChild(formEl)
    formEl.submit()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (loading) return
    if (form.password.trim().length < 6) {
      setError('登入密碼至少需要 6 碼。')
      return
    }
    const normalizedPhone = normalizeTaiwanMobilePhone(form.phone)
    if (!normalizedPhone) {
      setError('請輸入有效的台灣手機號碼（例：0912-345-678）。')
      return
    }

    setLoading(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch(`${WORKER_URL.replace(/\/$/, '')}/api/checkout/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: normalizedPhone,
          password: form.password,
          planId: 'trial',
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || data.success === false) {
        throw new Error(data.error || '建立訂單失敗，請稍後再試。')
      }
      setMessage(`訂單已建立：${data.order.orderNumber}。正在前往藍新付款頁...`)
      submitPaymentCheckout(data.payment || data.newebpay || data.ecpay)
    } catch (err) {
      setError(err.message || '建立訂單失敗，請稍後再試。')
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal sp-checkout-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="sp-checkout-kicker">Checkout</p>
            <h2 className="modal-title">購買 自媒體獲客-定位體驗課</h2>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="關閉結帳視窗">✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="sp-checkout-summary">
              <div>
                <span>課程方案</span>
                <strong>自媒體獲客-定位體驗課</strong>
                <p>解鎖完整 8 個選題、腳本預覽與體驗課教學。</p>
              </div>
              <div className="sp-checkout-price">${TRIAL_PRICE}</div>
            </div>

            <div className="sp-checkout-grid">
              <div className="form-group">
                <label className="form-label">姓名</label>
                <input className="form-input" value={form.name} onChange={setField('name')} placeholder="請輸入姓名" required />
              </div>
              <div className="form-group">
                <label className="form-label">聯絡 Email</label>
                <input type="email" className="form-input" value={form.email} onChange={setField('email')} placeholder="購買後用於建立學員帳號" required />
              </div>
              <div className="form-group sp-checkout-full">
                <label className="form-label">手機號碼</label>
                <input className="form-input" value={form.phone} onChange={setField('phone')} placeholder="方便課程通知與客服聯繫" required />
              </div>
              <div className="form-group sp-checkout-full">
                <label className="form-label">設定登入密碼</label>
                <input type="password" className="form-input" value={form.password} onChange={setField('password')} placeholder="至少 6 碼，付款確認後用於登入" required />
              </div>
            </div>

            <div className="sp-checkout-note">
              <strong>訂單與開通流程</strong>
              <p>送出後會建立正式訂單與學員帳號，並前往藍新安全付款頁。付款成功後系統會自動開通體驗課會員權限。</p>
            </div>

            {error && <div className="auth-alert error">{error}</div>}
            {message && <div className="auth-alert success">{message}</div>}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>取消</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? '前往藍新付款中...' : '前往藍新付款'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function SectionHeader({ eyebrow, title, subtitle }) {
  return (
    <div className="sp2-section-head">
      <p className="sp2-eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {subtitle && <p className="sp2-section-subtitle">{subtitle}</p>}
    </div>
  )
}

function ResultCaseIcon({ type }) {
  const path = {
    food: 'M8 3v8M12 3v8M8 7h4M16 3v18M16 3c2 2 3 4 3 7 0 2-1 4-3 5',
    fitness: 'M4 12h3m10 0h3M7 9v6m10-6v6M9 12h6M5 9v6m14-6v6',
    user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0',
  }[type] || 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0'

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={path} />
    </svg>
  )
}

function ResultCaseCard({ item }) {
  const mediaSrc = item.screenshot || item.image
  const title = item.title || item.name
  const detail = [item.category, item.program].filter(Boolean).join('｜')

  return (
    <article className={`sp2-result-card accent-${item.accent || 'blue'} type-${item.type || 'student'}`}>
      <div className="sp2-result-glow" />
      <div className="sp2-result-card-head">
        <span className="sp2-result-icon">
          <ResultCaseIcon type={item.icon} />
        </span>
        <div>
          <h3>{title}</h3>
          {detail && <p>{detail}</p>}
        </div>
      </div>

      {mediaSrc ? (
        <div className="sp2-result-media">
          <img
            src={mediaSrc}
            alt={`${title} 成果截圖`}
            onError={e => { e.currentTarget.hidden = true }}
          />
        </div>
      ) : (
        <div className="sp2-result-visual" aria-hidden="true">
          <span />
          <span />
          <span />
          <svg viewBox="0 0 220 82">
            <path d="M6 62 C36 56 42 28 70 34 S110 72 142 38 178 48 214 14" />
          </svg>
        </div>
      )}

      <div className="sp2-result-divider" />
      <div className="sp2-result-card-foot">
        <span className="sp2-result-pill">成果</span>
        <strong>{item.metric}</strong>
      </div>
    </article>
  )
}

export default function SalesPage() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const scrollRef = useRef(false)
  const [showLogin, setShowLogin] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [showManualPayment, setShowManualPayment] = useState(false)
  const [industry, setIndustry] = useState('健身')
  const [topics, setTopics] = useState(() => makeTopics('健身'))
  const [generatingTopics, setGeneratingTopics] = useState(false)

  const memberHome = currentUser?.role === 'admin'
    ? '/admin'
    : currentUser?.tier === 'managed'
      ? '/managed'
      : '/dashboard'

  useEffect(() => {
    initPixel()
    const onScroll = () => {
      if (scrollRef.current) return
      const maxScroll = document.body.scrollHeight - window.innerHeight
      const pct = maxScroll > 0 ? window.scrollY / maxScroll : 0
      if (pct >= 0.5) {
        fbq.viewContent()
        scrollRef.current = true
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleLogin = () => {
    if (currentUser) navigate(memberHome)
    else setShowLogin(true)
  }

  const handleGenerate = async () => {
    if (generatingTopics) return
    setGeneratingTopics(true)
    try {
      const result = await callAI('topics', industry, 'free', null)
      setTopics(normalizeSalesTopics(result, industry))
    } catch (_) {
      setTopics(makeTopics(industry))
    } finally {
      setGeneratingTopics(false)
    }
  }

  const handlePurchaseClick = () => {
    fbq.initiateCheckout()
    setShowManualPayment(true)
  }

  return (
    <div className="sp2-wrap">
      <header className="sp2-nav">
        <button className="sp2-brand" onClick={() => scrollToSection('#top')} aria-label="回到首頁頂部">
          <BrandLogo size={32} />
          <span>
            <strong>TOP LEVEL TRAFFIC</strong>
            <small>只有頂級，沒有套路</small>
          </span>
        </button>

        <nav className="sp2-nav-links" aria-label="首頁導覽">
          <button onClick={() => scrollToSection('#courses')}>課程體系</button>
          <button onClick={() => scrollToSection('#ai-tools')}>AI 工具</button>
          <button onClick={() => scrollToSection('#results')}>學員成果</button>
          <button onClick={() => scrollToSection('#about')}>關於我們</button>
        </nav>

        <div className="sp2-nav-actions">
          <button className="sp2-btn sp2-btn-ghost" onClick={handleLogin}>
            {currentUser ? (currentUser.role === 'admin' ? '回控制台' : '會員中心') : '登入'}
          </button>
          <button className="sp2-btn sp2-btn-primary" onClick={() => scrollToSection('#ai-tools')}>
            免費試用 AI
          </button>
        </div>
      </header>

      <main id="top">
        <section className="sp2-hero">
          <div
            className="sp2-hero-bg-image"
            style={{ backgroundImage: heroBgImage ? `url(${heroBgImage})` : 'none' }}
            aria-hidden="true"
          />
          <div className="sp2-hero-shade" aria-hidden="true" />
          <div className="sp2-hero-grid" aria-hidden="true" />
          <div className="sp2-glow" />
          <div className="sp2-container sp2-hero-inner">
            <div className="sp2-hero-layout">
              <div className="sp2-hero-copy">
                <p className="sp2-kicker">自媒體獲客 · 頂級流量</p>
                <h1>
                  <span>頂級流量</span>
                  <strong>只有頂級，沒有套路</strong>
                </h1>
                <p className="sp2-hero-sub">
                  用 AI 找到你的爆款角度，用課程學會底層邏輯。
                  不只是工具，是真正幫你從自媒體變現的完整體系。
                </p>
                <div className="sp2-hero-actions">
                  <button className="sp2-btn sp2-btn-primary sp2-btn-lg" onClick={() => scrollToSection('#ai-tools')}>
                    ⚡ 免費體驗 AI 選題
                  </button>
                  <button className="sp2-btn sp2-btn-outline sp2-btn-lg" onClick={() => scrollToSection('#courses')}>
                    了解完整課程 →
                  </button>
                </div>

                <div className="sp2-platform-bar" aria-label="支援平台">
                  {PLATFORMS.map(platform => (
                    <div key={platform.label} className="sp2-platform-item">
                      <span>{platform.mark}</span>
                      <strong>{platform.label}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <aside className="sp2-hero-visual" aria-label="自媒體平台數據展示">
                <div className="sp2-orbit orbit-one" />
                <div className="sp2-orbit orbit-two" />

                <div className="sp2-social-card growth-card">
                  <div className="sp2-card-top">
                    <h3>全平台成長總覽</h3>
                    <span>近 30 天</span>
                  </div>
                  <div className="sp2-growth-grid">
                    {[
                      ['總觀看次數', '2.3M', '↗ 68.4%'],
                      ['總互動數', '127K', '↗ 74.2%'],
                      ['粉絲淨增', '+21.7K', '↗ 83.1%'],
                      ['內容數量', '48', '↗ 26.7%'],
                    ].map(([label, value, trend]) => (
                      <div key={label}>
                        <span>{label}</span>
                        <strong>{value}</strong>
                        <small>{trend}</small>
                      </div>
                    ))}
                  </div>
                  <svg className="sp2-line-chart" viewBox="0 0 320 120" aria-hidden="true">
                    <defs>
                      <linearGradient id="sp2ChartGradient" x1="0" x2="1" y1="0" y2="0">
                        <stop stopColor="#5060ff" />
                        <stop offset="1" stopColor="#a040e0" />
                      </linearGradient>
                      <linearGradient id="sp2ChartFill" x1="0" x2="0" y1="0" y2="1">
                        <stop stopColor="#8040e0" stopOpacity="0.42" />
                        <stop offset="1" stopColor="#8040e0" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path className="chart-fill" d="M12 96 C36 78 48 66 74 78 S112 96 128 55 S168 62 188 42 S220 70 242 38 S278 28 308 22 L308 112 L12 112 Z" />
                    <path className="chart-line" d="M12 96 C36 78 48 66 74 78 S112 96 128 55 S168 62 188 42 S220 70 242 38 S278 28 308 22" />
                  </svg>
                </div>

                <div className="sp2-social-card instagram-card platform-card">
                  <div className="sp2-card-top compact">
                    <h3>Instagram</h3>
                    <span>◎</span>
                  </div>
                  <div className="sp2-person-frame instagram-person">
                    {heroPersonImages.instagram && (
                      <img
                        src={heroPersonImages.instagram}
                        alt="Instagram 人物照片"
                        onError={e => { e.currentTarget.hidden = true }}
                      />
                    )}
                  </div>
                  <div className="sp2-social-metrics">
                    <span>♥ 8,742</span>
                    <span>☽ 236</span>
                  </div>
                </div>

                <div className="sp2-social-card tiktok-card platform-card">
                  <div className="sp2-card-top compact">
                    <h3>TikTok</h3>
                    <span>♪</span>
                  </div>
                  <div className="sp2-person-frame tiktok-person">
                    {heroPersonImages.tiktok && (
                      <img
                        src={heroPersonImages.tiktok}
                        alt="TikTok 人物照片"
                        onError={e => { e.currentTarget.hidden = true }}
                      />
                    )}
                  </div>
                  <div className="sp2-side-metrics">
                    <span>♥ 32.1K</span>
                    <span>● 512</span>
                    <span>↗ 1,268</span>
                  </div>
                </div>

                <div className="sp2-social-card ai-engine-card">
                  <div className="sp2-card-top">
                    <h3>AI 爆款選題引擎</h3>
                  </div>
                  {[
                    ['3 個方法提升曝光率', '98 分'],
                    ['AI 時代的人設打造', '95 分'],
                    ['自媒體變現的底層邏輯', '93 分'],
                  ].map(([topic, score]) => (
                    <div key={topic} className="sp2-ai-row">
                      <span>{topic}</span>
                      <strong>{score}</strong>
                    </div>
                  ))}
                  <div className="sp2-ai-status" aria-label="腳本生成能力預覽">腳本生成能力預覽</div>
                </div>

                <div className="sp2-social-card threads-card">
                  <div className="sp2-card-top compact">
                    <h3>Threads</h3>
                    <span>2h</span>
                  </div>
                  <p>持續創作的第 120 天，專注內容，時間會給你答案。</p>
                  <div className="sp2-social-metrics">
                    <span>♥ 1.2K</span>
                    <span>☽ 86</span>
                    <span>↗ 200</span>
                  </div>
                </div>

                <div className="sp2-social-card youtube-card">
                  <div className="sp2-card-top compact">
                    <h3>YouTube</h3>
                    <span>▶</span>
                  </div>
                  <div className="sp2-thumb youtube">
                    {heroPersonImages.youtube && (
                      <img
                        src={heroPersonImages.youtube}
                        alt="YouTube 影片縮圖"
                        onError={e => { e.currentTarget.hidden = true }}
                      />
                    )}
                  </div>
                  <h4>如何用 AI 提升內容創作效率</h4>
                  <p>126K views · 1 day ago</p>
                </div>

                <div className="sp2-social-card audience-card">
                  <h3>觀眾畫像洞察</h3>
                  <div className="sp2-donut">
                    <strong>18-34 歲</strong>
                    <span>68%</span>
                  </div>
                  <p>核心受眾集中，內容方向明確</p>
                </div>

                <div className="sp2-social-card top-content-card">
                  <h3>內容表現 Top 3</h3>
                  {[
                    '3 個方法提升曝光率',
                    'AI 工具提升創作效率',
                    '個人品牌定位策略',
                  ].map((item, index) => (
                    <div key={item} className="sp2-top-row">
                      <span>{index + 1}</span>
                      <p>{item}</p>
                    </div>
                  ))}
                </div>
              </aside>
            </div>

            <div className="sp2-stats">
              {STATS.map((item) => (
                <div key={item.label} className="sp2-stat">
                  <em>{item.icon}</em>
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="ai-tools" className="sp2-section sp2-ai">
          <div className="sp2-container">
            <SectionHeader
              eyebrow="免費體驗"
              title="今天拍完，明天要拍什麼？"
              subtitle={(
                <>
                  <span>不是普通 AI，是爆款大數據選題引擎。</span>
                  <span>輸入行業，8 大元素同步運算，不再缺選題。</span>
                </>
              )}
            />

            <div className="sp2-ai-badge">專為自媒體爆款設計，有別於 ChatGPT</div>

            <div className="sp2-try-divider">
              <span />
              <strong>馬上試試 AI 出選題</strong>
              <span />
            </div>

            <svg className="sp2-v-arrow" viewBox="0 0 72 42" aria-hidden="true">
              <path d="M12 8l24 24L60 8" />
              <path d="M18 2l18 18L54 2" />
            </svg>

            <div className="sp2-ai-panel">
              <div className="sp2-ai-input-row">
                <input
                  value={industry}
                  onChange={e => setIndustry(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                  placeholder="例：美食、健身、親子、美妝、餐飲..."
                />
                <button className="sp2-btn sp2-btn-primary" onClick={handleGenerate} disabled={generatingTopics}>
                  {generatingTopics ? '生成中...' : '立即生成'}
                </button>
              </div>

              <div className="sp2-tags">
                {TOPIC_ELEMENTS.map(tag => (
                  <span key={tag.key} className={`sp2-tag ${tag.color}`}>{tag.key}</span>
                ))}
              </div>

              <div className="sp2-topic-list">
                {TOPIC_ELEMENTS.map((tag, index) => (
                  <div key={tag.key} className={`sp2-topic ${index >= 3 ? 'locked' : ''}`}>
                    <span className={`sp2-topic-key ${tag.color}`}>【{tag.key}】</span>
                    <p>{topics[index]}</p>
                  </div>
                ))}
              </div>

              <div className="sp2-unlock-card">
                <h3>還有 5 個爆款選題等你解鎖</h3>
                <p>購買 自媒體獲客-定位體驗課，解鎖完整 8 個選題 + 腳本預覽 + 課程教學</p>
                <button className="sp2-btn sp2-btn-primary" onClick={handlePurchaseClick}>
                  Line@ 匯款購買 自媒體獲客-定位體驗課 ${TRIAL_PRICE}
                </button>
                <small>每天免費試用 3 次，明天可以再來</small>
              </div>
            </div>
          </div>
        </section>

        <section className="sp2-section">
          <div className="sp2-container">
            <SectionHeader
              eyebrow="你是否也有這些問題"
              title="做自媒體，最怕這三件事"
              subtitle="90% 的創作者都卡在這裡，你不是一個人"
            />
            <div className="sp2-card-grid three">
              {PAINS.map((item) => (
                <article key={item.title} className="sp2-card sp2-pain-card">
                  <h3>{item.title}</h3>
                  <div className="sp2-card-arrow">→</div>
                  <p>{item.solution}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="courses" className="sp2-section sp2-courses">
          <div className="sp2-container">
            <SectionHeader
              eyebrow="完整學習路徑"
              title="四個階段，從零到頂流"
              subtitle="每個階段都有清晰的目標和成果，不走彎路"
            />
            <div className="sp2-steps">
              {learningStages.map((step) => (
                <article key={step.number} className={`sp2-step accent-${step.accent}`}>
                  <div className="sp2-step-num">{step.number}</div>
                  <p>{step.label}</p>
                  <h3>{step.title}</h3>
                  <ul>
                    {step.bullets.map(point => <li key={point}>{point}</li>)}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="sp2-section">
          <div className="sp2-container">
            <SectionHeader
              eyebrow="AI 工具"
              title="6 大 AI 功能，全方位輔助創作"
              subtitle="不只生成內容，更幫你理解爆款背後的邏輯"
            />
            <div className="sp2-card-grid features">
              {FEATURES.map(([title, access], index) => (
                <article key={title} className="sp2-card sp2-feature-card">
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <h3>{title}</h3>
                  <p>{access}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="results" className="sp2-section sp2-results">
          <div className="sp2-container">
            <SectionHeader
              eyebrow="真實案例"
              title={
                <span className="sp2-results-title">
                  <span className="keyword-course">課程</span>
                  <span className="plus-symbol">+</span>
                  <span className="keyword-ai">AI</span>
                  <span className="results-title-rest">的真實成果</span>
                </span>
              }
              subtitle="不是廣告，是真實的數據"
            />
            <div className="sp2-results-grid">
              {resultCases.map((item) => (
                <ResultCaseCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        </section>

        <section className="sp2-section sp2-final">
          <div className="sp2-container sp2-final-inner">
            <p className="sp2-eyebrow">立即開始</p>
            <h2>準備好打造你的頂級流量了嗎？</h2>
            <p>從 自媒體獲客-定位體驗課開始，感受 AI + 課程雙引擎的威力</p>
            <div className="sp2-price">自媒體獲客-定位體驗課 ${TRIAL_PRICE} 起，完課後可升級享早鳥優惠</div>
            <div className="sp2-final-actions">
              <button className="sp2-btn sp2-btn-primary sp2-btn-lg" onClick={handlePurchaseClick}>
                Line@ 匯款購買 自媒體獲客-定位體驗課 ${TRIAL_PRICE}
              </button>
              <button className="sp2-btn sp2-btn-outline sp2-btn-lg" onClick={() => scrollToSection('#ai-tools')}>
                先免費試用 AI →
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer id="about" className="sp2-footer">
        <div className="sp2-container sp2-footer-inner">
          <div>
            <strong>TOP LEVEL TRAFFIC｜頂級流量</strong>
            <p>只有頂級，沒有套路</p>
          </div>
          <nav>
            <a href="#privacy">隱私政策</a>
            <a href="#terms">使用條款</a>
            <a href="mailto:raysdl.studio@gmail.com">聯繫我們</a>
          </nav>
          <p className="sp2-footer-contact">
            聯絡 Email：raysdl.studio@gmail.com　電話：07-2367660
          </p>
        </div>
      </footer>

      {showLogin && <SalesLoginModal onClose={() => setShowLogin(false)} />}
      {showCheckout && <SalesCheckoutModal onClose={() => setShowCheckout(false)} />}
      {showManualPayment && (
        <ManualPaymentModal
          planName={TRIAL_PLAN_NAME}
          amount={TRIAL_PRICE}
          onClose={() => setShowManualPayment(false)}
        />
      )}
    </div>
  )
}
