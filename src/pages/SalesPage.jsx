import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getSalesBlocks, getPricing, saveTrialSession } from '../data/mockData'
import { initPixel, fbq } from '../utils/fbPixel'
import { callAIFree, getFreeUsageStatus } from '../services/aiService'

// ── Calendar helpers ──────────────────────────────────────────────────────────
const DAYS = ['日','一','二','三','四','五','六']
const MONTHS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']
const TIME_SLOTS = [9,10,11,12,13,14,15,16,17,18,19,20,21,22]
function fmtHour(h) {
  if (h < 12) return `上午 ${h}:00`
  if (h === 12) return `中午 12:00`
  return `下午 ${h-12}:00`
}
function fmtHourFull(h) {
  const label = h < 12 ? `上午${h}:00` : h === 12 ? `中午12:00` : `下午${h-12}:00`
  return label
}
function sameDay(a, b) {
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate()
}
function calDays(year, month) {
  const first = new Date(year, month, 1).getDay()
  const total = new Date(year, month+1, 0).getDate()
  return { first, total }
}

// ── Block renderers ───────────────────────────────────────────────────────────
function HeroBlock({ block, pricing }) {
  return (
    <section className="sp-hero">
      {/* Background texture */}
      <div className="sp-hero-dotgrid" />

      {/* Animated flow lights — right side */}
      <div className="sp-hero-right">
        <div className="sp-flow-line sp-flow-line-1" />
        <div className="sp-flow-line sp-flow-line-2" />
        <div className="sp-flow-line sp-flow-line-3" />
        <div className="sp-flow-orb" />
      </div>

      <div className="sp-hero-inner">
        <div className="sp-hero-left">
          {/* Eyebrow */}
          <p className="sp-hero-eyebrow">
            沒有套路，只做 <span className="grad-text">頂級</span>
          </p>

          {/* Main title */}
          <h1 className="sp-hero-title">
            <span className="grad-text">頂級</span>流量
          </h1>

          {/* English tagline */}
          <p className="sp-hero-en">NO CHEAP TRICKS. TOP LEVEL ONLY.</p>

          {/* CTA buttons */}
          <div className="sp-hero-cta-group">
            <a href="#schedule" className="sp-cta-primary" onClick={fbq.initiateCheckout}>
              立即預約試聽 →
            </a>
            <a href="#pricing" className="sp-cta-outline">查看方案</a>
          </div>

          {/* Glass stat pills */}
          <div className="sp-hero-stats">
            <div className="sp-hero-stat-item">
              <span className="sp-hero-stat-icon">🌐</span>
              <div>
                <div className="sp-hero-stat-cn">精準觸達</div>
                <div className="sp-hero-stat-en">PRECISE REACH</div>
              </div>
            </div>
            <div className="sp-hero-stat-item">
              <span className="sp-hero-stat-icon">🎯</span>
              <div>
                <div className="sp-hero-stat-cn">高效轉換</div>
                <div className="sp-hero-stat-en">HIGH CONVERSION</div>
              </div>
            </div>
            <div className="sp-hero-stat-item">
              <span className="sp-hero-stat-icon">⚡</span>
              <div>
                <div className="sp-hero-stat-cn">頂級效果</div>
                <div className="sp-hero-stat-en">TOP RESULTS</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Corner labels */}
      <div className="sp-hero-since">SINCE 2020</div>
      <div className="sp-hero-toponly">TOP LEVEL ONLY.</div>
    </section>
  )
}

function PainPointsBlock({ block }) {
  return (
    <section className="sp-section sp-pain">
      <div className="sp-container">
        <h2 className="sp-section-title">{block.title}</h2>
        <div className="sp-pain-grid">
          {(block.points || []).map((p, i) => (
            <div key={i} className="sp-pain-card">
              <div className="sp-pain-icon">😔</div>
              <p>{p}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function TrialIntroBlock({ block, pricing }) {
  return (
    <section className="sp-section sp-trial-intro">
      <div className="sp-container sp-two-col">
        {block.imageUrl && (
          <div className="sp-col-img">
            <img src={block.imageUrl} alt="試聽課" />
          </div>
        )}
        <div className="sp-col-text">
          <h2 className="sp-section-title">{block.title}</h2>
          <p className="sp-section-sub">{block.content}</p>
          <div className="sp-trial-facts">
            <div className="sp-trial-fact">⏱ 課程時長 <strong>3 小時</strong></div>
            <div className="sp-trial-fact">📅 自選時段，看完才開始計時</div>
            <div className="sp-trial-fact">💰 只要 <strong>${pricing.trialPrice}</strong></div>
            <div className="sp-trial-fact">🚀 看完 24hr 升級達人班 <strong>${pricing.advancedDiscountPrice}</strong>（原 ${pricing.advancedPrice}）</div>
          </div>
          <a href="#schedule" className="btn btn-primary" onClick={fbq.initiateCheckout}>立即預約試聽 →</a>
        </div>
      </div>
    </section>
  )
}

function PlanComparisonBlock({ block, pricing }) {
  const plans = [
    { name: '試聽課', price: pricing.trialPrice, features: ['3 小時完整課程','自選觀看時段','看完解鎖初階課程','24hr 升級優惠'], highlight: false, tier: 'basic' },
    { name: '達人班', price: pricing.advancedPrice, sub: `優惠 $${pricing.advancedDiscountPrice}`, features: ['全部初階課程','進階課程全開','一對一 Q&A','有效期 1 年'], highlight: true, tier: 'advanced' },
    { name: '頂流私塾', price: pricing.managedPrice, features: ['專屬一對一陪跑','AI 工具全開','頂級流量方法論直接傳授','無套路、只有結果'], highlight: false, tier: 'managed' },
  ]
  return (
    <section className="sp-section sp-pricing">
      <div className="sp-container">
        <h2 className="sp-section-title">{block.title || '方案比較'}</h2>
        <div className="sp-pricing-grid">
          {plans.map(p => {
            const isPremium = p.tier === 'managed'
            const cls = `sp-plan-card ${p.highlight ? 'sp-plan-highlight' : ''} ${isPremium ? 'sp-plan-premium' : ''}`
            return (
              <div key={p.name} className={cls}>
                {p.highlight && <div className="sp-plan-badge">最熱門</div>}
                {isPremium && <div className="sp-plan-premium-tag">PREMIUM</div>}
                <div className="sp-plan-name">{p.name}</div>
                <div className="sp-plan-price">
                  ${p.price.toLocaleString()}
                  {p.sub && <span className="sp-plan-sub"> / 試聽後 {p.sub}</span>}
                </div>
                <ul className="sp-plan-features">
                  {p.features.map((f,i) => <li key={i}>{f}</li>)}
                </ul>
                <a href="#schedule" className={`btn ${p.highlight || isPremium ? 'btn-primary' : 'btn-secondary'} w-full`}>立即開始</a>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function ScheduleBlock({ pricing }) {
  const navigate  = useNavigate()
  const { register } = useAuth()
  const today     = new Date()
  const [viewYear,  setViewYear]  = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selDate,   setSelDate]   = useState(null)
  const [selHour,   setSelHour]   = useState(null)
  const [showBuy,   setShowBuy]   = useState(false)
  const [form,      setForm]      = useState({ name:'', email:'', password:'' })
  const [phase,     setPhase]     = useState('form') // form | success
  const [errMsg,    setErrMsg]    = useState('')

  const { first, total } = calDays(viewYear, viewMonth)
  const prevMonth = () => { if (viewMonth === 0) { setViewYear(y=>y-1); setViewMonth(11) } else setViewMonth(m=>m-1) }
  const nextMonth = () => { if (viewMonth === 11) { setViewYear(y=>y+1); setViewMonth(0) } else setViewMonth(m=>m+1) }

  const isPast = (d) => {
    const dt = new Date(viewYear, viewMonth, d)
    dt.setHours(23,59,59)
    return dt < today
  }
  const isSelected = (d) => selDate && sameDay(new Date(viewYear, viewMonth, d), selDate)

  const handleSelectDate = (d) => {
    if (isPast(d)) return
    setSelDate(new Date(viewYear, viewMonth, d))
    setSelHour(null)
  }

  const handleSelectHour = (h) => {
    setSelHour(h)
    fbq.addToCart()
  }

  const handleBuyClick = () => {
    fbq.initiateCheckout()
    setShowBuy(true)
    setPhase('form')
    setErrMsg('')
  }

  const handlePurchase = () => {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setErrMsg('請填寫所有欄位'); return
    }
    try {
      const scheduledAt = new Date(selDate)
      scheduledAt.setHours(selHour, 0, 0, 0)
      // Create user + book trial session
      const newUser = register(form.name.trim(), form.email.trim(), form.password.trim(), 'basic')
      saveTrialSession(newUser.id, scheduledAt.toISOString())
      fbq.purchase(pricing.trialPrice, '試聽課')
      setPhase('success')
    } catch(e) {
      setErrMsg(e.message || '建立失敗，請重試')
    }
  }

  const fmtDate = (d) => d ? `${d.getMonth()+1}/${d.getDate()}（${DAYS[d.getDay()]}）` : ''
  const endHour = selHour != null ? selHour + 3 : null

  return (
    <section id="schedule" className="sp-section sp-schedule">
      <div className="sp-container">
        <h2 className="sp-section-title">選擇你的試聽時段</h2>
        <p className="sp-section-sub" style={{ textAlign:'center', marginBottom:32 }}>確認購買後即鎖定此時段，課程開始後無法暫停或快轉</p>

        <div className="sp-schedule-layout">
          {/* Calendar */}
          <div className="sp-calendar">
            <div className="sp-cal-header">
              <button className="sp-cal-nav" onClick={prevMonth}>‹</button>
              <span>{viewYear} 年 {MONTHS[viewMonth]}</span>
              <button className="sp-cal-nav" onClick={nextMonth}>›</button>
            </div>
            <div className="sp-cal-days-header">
              {DAYS.map(d => <div key={d} className="sp-cal-day-label">{d}</div>)}
            </div>
            <div className="sp-cal-grid">
              {Array.from({ length: first }).map((_,i) => <div key={`e${i}`} />)}
              {Array.from({ length: total }).map((_,i) => {
                const d = i+1
                const past = isPast(d)
                const sel  = isSelected(d)
                return (
                  <button key={d}
                    className={`sp-cal-day ${past ? 'past' : ''} ${sel ? 'selected' : ''}`}
                    onClick={() => handleSelectDate(d)}
                    disabled={past}
                  >{d}</button>
                )
              })}
            </div>
          </div>

          {/* Time slots */}
          <div className="sp-timeslots">
            {!selDate ? (
              <p className="sp-slot-prompt">← 先選擇日期</p>
            ) : (
              <>
                <p className="sp-slot-date">{fmtDate(selDate)} 可用時段</p>
                <div className="sp-slot-grid">
                  {TIME_SLOTS.map(h => (
                    <button key={h}
                      className={`sp-slot-btn ${selHour===h ? 'selected' : ''}`}
                      onClick={() => handleSelectHour(h)}
                    >
                      {fmtHour(h)}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Summary + CTA */}
        {selDate && selHour != null && (
          <div className="sp-schedule-summary">
            <div className="sp-summary-box">
              <div className="sp-summary-row">📅 <strong>{fmtDate(selDate)}</strong></div>
              <div className="sp-summary-row">🕐 開始：<strong>{fmtHourFull(selHour)}</strong></div>
              <div className="sp-summary-row">🕐 結束：<strong>{fmtHourFull(endHour)}</strong>（約 3 小時）</div>
              <div className="sp-summary-row">💰 費用：<strong>${pricing.trialPrice}</strong></div>
            </div>
            <p className="sp-red-notice">⚠️ 確認購買後即鎖定此時段，課程開始後無法暫停或快轉</p>
            <button className="btn btn-primary btn-lg sp-desktop-buy-btn" onClick={handleBuyClick}>
              確認預約並付款 ${pricing.trialPrice}
            </button>
          </div>
        )}

        {/* Sticky bottom CTA — only visible on mobile when slot selected */}
        {selDate && selHour != null && (
          <div className="sp-sticky-cta-bar">
            <div className="sp-sticky-cta-info">
              <strong>{fmtDate(selDate)} {fmtHourFull(selHour)}</strong>
              <span>試聽課 ${pricing.trialPrice}</span>
            </div>
            <button className="btn btn-primary" onClick={handleBuyClick}
              style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
              立即預約 →
            </button>
          </div>
        )}
      </div>

      {/* Purchase modal */}
      {showBuy && (
        <div className="modal-overlay" onClick={() => setShowBuy(false)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            {phase === 'form' ? (
              <>
                <div className="modal-header">
                  <h2 className="modal-title">建立帳號並完成預約</h2>
                  <button className="modal-close" onClick={() => setShowBuy(false)}>✕</button>
                </div>
                <div className="modal-body">
                  <div style={{ background:'var(--gray-50)', borderRadius:'var(--radius)', padding:'12px 16px', marginBottom:16, fontSize:13, color:'var(--gray-600)' }}>
                    📅 {fmtDate(selDate)} {fmtHourFull(selHour)} 試聽課 · <strong>${pricing.trialPrice}</strong>
                  </div>
                  {errMsg && <div className="auth-alert danger" style={{ marginBottom:12 }}>{errMsg}</div>}
                  <div className="form-group">
                    <label className="form-label">姓名</label>
                    <input className="form-input" placeholder="你的名字" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input className="form-input" type="email" placeholder="your@email.com" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">設定密碼</label>
                    <input className="form-input" type="password" placeholder="至少 6 位" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} />
                  </div>
                  <p style={{ fontSize:12, color:'var(--gray-400)', marginTop:8 }}>
                    付款方式：LINE Pay / 信用卡（示範版：直接點確認即完成）
                  </p>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setShowBuy(false)}>取消</button>
                  <button className="btn btn-primary" onClick={handlePurchase}>確認預約並付款 ${pricing.trialPrice}</button>
                </div>
              </>
            ) : (
              <>
                <div className="modal-body" style={{ textAlign:'center', padding:'48px 32px' }}>
                  <div style={{ fontSize:48, marginBottom:16 }}>🎉</div>
                  <h2 style={{ fontWeight:800, marginBottom:8 }}>預約成功！</h2>
                  <p style={{ color:'var(--gray-600)', marginBottom:24 }}>
                    確認信已發送至 <strong>{form.email}</strong><br />
                    請在 {fmtDate(selDate)} {fmtHourFull(selHour)} 進入試聽課。
                  </p>
                  <button className="btn btn-primary btn-lg" onClick={() => navigate('/login')}>
                    前往登入 →
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

function FaqBlock({ block }) {
  const [open, setOpen] = useState(null)
  return (
    <section className="sp-section sp-faq">
      <div className="sp-container" style={{ maxWidth: 720 }}>
        <h2 className="sp-section-title">{block.title}</h2>
        <div className="sp-faq-list">
          {(block.faqs || []).map((item, i) => (
            <div key={i} className={`sp-faq-item ${open===i ? 'open' : ''}`}>
              <button className="sp-faq-q" onClick={() => setOpen(open===i ? null : i)}>
                <span>{item.q}</span>
                <span className="sp-faq-arrow">{open===i ? '▲' : '▼'}</span>
              </button>
              {open===i && <div className="sp-faq-a">{item.a}</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function TextBlock({ block }) {
  return (
    <section className="sp-section">
      <div className="sp-container" style={{ maxWidth: 760, textAlign:'center' }}>
        {block.title && <h2 className="sp-section-title">{block.title}</h2>}
        {block.content && <p className="sp-section-sub">{block.content}</p>}
      </div>
    </section>
  )
}

// ── AI Free Trial Block ───────────────────────────────
function AITrialBlock({ pricing }) {
  const [industry,  setIndustry]  = useState('')
  const [loading,   setLoading]   = useState(false)
  const [result,    setResult]    = useState(null)
  const [error,     setError]     = useState('')
  const [status,    setStatus]    = useState(getFreeUsageStatus)

  const handleGenerate = async () => {
    if (!industry.trim() || loading) return
    const fresh = getFreeUsageStatus()
    setStatus(fresh)
    if (fresh.remaining <= 0) {
      setError('today_limit')
      return
    }
    setLoading(true)
    setResult(null)
    setError('')
    try {
      const data = await callAIFree('topics', industry.trim())
      setResult(data)
      setStatus(getFreeUsageStatus())
    } catch (e) {
      if (e.message === 'LIMIT_EXCEEDED') setError('today_limit')
      else setError('failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="sp-section sp-ai-trial" id="ai-trial">
      <div className="sp-container">
        <div className="sp-ai-inner">
          <div className="sp-ai-header">
            <h2 className="sp-ai-title">免費試用 AI 選題生成</h2>
            <p className="sp-ai-sub">輸入你的行業，馬上看看 AI 能幫你做什麼</p>
            <div className="sp-ai-limit-badge">每日 {status.limit} 次免費 · 今日剩餘 {Math.max(0, status.remaining)} 次</div>
          </div>

          <div className="sp-ai-input-row">
            <input
              className="sp-ai-input"
              placeholder="輸入你的行業或產品，例如：美食、親子、健身..."
              value={industry}
              onChange={e => setIndustry(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleGenerate()}
              disabled={loading}
            />
            <button
              className="sp-ai-btn"
              onClick={handleGenerate}
              disabled={loading || !industry.trim()}
            >
              {loading
                ? <span className="sp-ai-typing"><span/><span/><span/></span>
                : '免費生成選題'}
            </button>
          </div>

          {error === 'today_limit' && (
            <div className="sp-ai-error">
              今日免費次數已用完，明天再來，或購買試聽課立即解鎖
              <a href="#schedule" className="sp-ai-error-link">購買試聽課 ${pricing.trialPrice} →</a>
            </div>
          )}
          {error === 'failed' && (
            <div className="sp-ai-error">生成失敗，請稍後再試</div>
          )}

          {result && (
            <div className="sp-ai-result">
              <p className="sp-ai-result-label">✨ AI 為「{industry}」生成的爆款選題：</p>
              {/* First 3: fully visible */}
              {result.slice(0, 3).map((item, i) => (
                <div key={i} className="sp-ai-topic-item">
                  <span className="sp-ai-topic-num">T{i + 1}</span>
                  <span>{item}</span>
                </div>
              ))}
              {/* Last 5: blurred + unlock CTA */}
              <div className="sp-ai-blur-wrap">
                {result.slice(3).map((item, i) => (
                  <div key={i} className="sp-ai-topic-item sp-ai-topic-blurred" aria-hidden="true">
                    <span className="sp-ai-topic-num">T{i + 4}</span>
                    <span>{item}</span>
                  </div>
                ))}
                <div className="sp-ai-blur-overlay">
                  <p className="sp-ai-blur-text">還有 5 個爆款選題等你解鎖 🔒</p>
                  <a href="#schedule" className="btn btn-primary">
                    購買試聽課 ${pricing.trialPrice} 立即解鎖
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function renderBlock(block, pricing) {
  if (!block.visible) return null
  switch (block.type) {
    case 'hero':          return <HeroBlock key={block.id} block={block} pricing={pricing} />
    case 'pain-points':   return <PainPointsBlock key={block.id} block={block} />
    case 'trial-intro':   return <TrialIntroBlock key={block.id} block={block} pricing={pricing} />
    case 'plan-comparison': return <PlanComparisonBlock key={block.id} block={block} pricing={pricing} />
    case 'schedule':      return <ScheduleBlock key={block.id} pricing={pricing} />
    case 'faq':           return <FaqBlock key={block.id} block={block} />
    default:              return <TextBlock key={block.id} block={block} />
  }
}

// ── Main SalesPage ────────────────────────────────────────────────────────────
export default function SalesPage() {
  const { currentUser } = useAuth()
  const navigate        = useNavigate()
  const blocks          = getSalesBlocks()
  const pricing         = getPricing()
  const scrollRef       = useRef(false)

  // Logged-in users go to dashboard
  useEffect(() => {
    if (currentUser) {
      navigate(currentUser.role === 'admin' ? '/admin' : '/dashboard', { replace: true })
    }
  }, [currentUser, navigate])

  // Init FB Pixel + scroll tracking
  useEffect(() => {
    initPixel()
    const onScroll = () => {
      if (scrollRef.current) return
      const pct = window.scrollY / (document.body.scrollHeight - window.innerHeight)
      if (pct >= 0.5) { fbq.viewContent(); scrollRef.current = true }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (currentUser) return null

  return (
    <div className="sp-wrap">
      {/* Nav */}
      <header className="sp-nav">
        <span className="sp-nav-brand">
          <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#fff' }}>
            TOP LEVEL <span style={{ background: 'linear-gradient(135deg,#4F9FFF,#A855F7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>TRAFFIC</span>
          </span>
        </span>
        <div className="sp-nav-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/login')}>登入</button>
          <a href="#schedule" className="btn btn-primary btn-sm">立即預約</a>
        </div>
      </header>

      {/* Blocks — inject AI trial block after plan-comparison */}
      {blocks.map(b => {
        const rendered = renderBlock(b, pricing)
        if (b.type === 'plan-comparison') {
          return [rendered, <AITrialBlock key="ai-trial" pricing={pricing} />]
        }
        return rendered
      })}

      {/* Footer */}
      <footer className="sp-footer">
        <p>© 2026 頂級流量 · 專屬學員系統</p>
        <p style={{ fontSize:12, marginTop:4 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/login')}>學員登入</button>
        </p>
      </footer>
    </div>
  )
}
