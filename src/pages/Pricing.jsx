import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getPricing, getAdvancedOfferStatus, getManagedOfferStatus,
} from '../data/mockData'

function fmtCountdown(ms) {
  if (ms <= 0) return '00:00:00'
  const t = Math.floor(ms / 1000)
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const s = t % 60
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

function useCurrentUser() {
  try {
    const raw = localStorage.getItem('mp_current_user')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export default function Pricing() {
  const navigate   = useNavigate()
  const pricing    = getPricing()
  const currentUser = useCurrentUser()

  const advOffer = getAdvancedOfferStatus(currentUser)
  const mgtOffer = getManagedOfferStatus(currentUser)

  const [remaining, setRemaining] = useState({
    adv: advOffer.remainingMs || 0,
    mgt: mgtOffer.remainingMs || 0,
  })

  useEffect(() => {
    if (!advOffer.active && !mgtOffer.active) return
    const t = setInterval(() => {
      setRemaining({
        adv: advOffer.active ? Math.max(0, (Date.now() + advOffer.remainingMs) - Date.now() * 2 + Date.now()) : 0,
        mgt: mgtOffer.active ? Math.max(0, (Date.now() + mgtOffer.remainingMs) - Date.now() * 2 + Date.now()) : 0,
      })
    }, 1000)
    return () => clearInterval(t)
  }, []) // eslint-disable-line

  // Recompute live
  const advDeadline = advOffer.active ? Date.now() + advOffer.remainingMs : 0
  const mgtDeadline = mgtOffer.active ? Date.now() + mgtOffer.remainingMs : 0
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000)
    return () => clearInterval(t)
  }, [])
  const advRemaining = advOffer.active ? Math.max(0, advDeadline - Date.now()) : 0
  const mgtRemaining = mgtOffer.active ? Math.max(0, mgtDeadline - Date.now()) : 0

  const advPrice     = advOffer.active ? pricing.advancedDiscountPrice : pricing.advancedPrice
  const mgtDiscount  = mgtOffer.active ? mgtOffer.discountPrice : null

  const PLANS = [
    {
      key: 'basic',
      name: '試聽課',
      emoji: '🎓',
      price: `NT$${pricing.trialPrice.toLocaleString()}`,
      period: '/ 3 個月（完成試聽後起算）',
      color: 'var(--basic-text)',
      features: [
        { text: '完整 3 小時試聽課程', ok: true },
        { text: '試聽完成後解鎖初階課程（3 個月）', ok: true },
        { text: '課程討論區', ok: true },
        { text: '達人班完整課程', ok: false },
        { text: 'AI 選題腳本工具', ok: false },
        { text: '預約實體一對一輔導', ok: false },
      ],
    },
    {
      key: 'advanced',
      name: '達人班',
      emoji: '⭐',
      price: `NT$${advPrice.toLocaleString()}`,
      origPrice: advOffer.active ? `NT$${pricing.advancedPrice.toLocaleString()}` : null,
      period: '/ 年',
      color: 'var(--advanced-text)',
      featured: true,
      offer: advOffer.active && advRemaining > 0
        ? `試聽後限時優惠，剩餘 ${fmtCountdown(advRemaining)}`
        : null,
      features: [
        { text: '全部 6 門課程（含 AI 工具、商業變現）', ok: true },
        { text: '每堂課強制觀看確保學習品質', ok: true },
        { text: '課後作業提交與老師批改', ok: true },
        { text: '完課即解鎖陪跑班優惠', ok: true },
        { text: 'AI 選題腳本工具', ok: true },
        { text: '預約實體一對一輔導', ok: false },
      ],
    },
    {
      key: 'managed',
      name: '陪跑班',
      emoji: '🏆',
      price: mgtDiscount != null ? `NT$${mgtDiscount.toLocaleString()}` : `NT$${pricing.managedPrice.toLocaleString()}`,
      origPrice: mgtOffer.active ? `NT$${pricing.managedPrice.toLocaleString()}` : null,
      period: '/ 年（依合約）',
      color: 'var(--managed-text)',
      offer: mgtOffer.active && mgtRemaining > 0
        ? `完課限時優惠，剩餘 ${fmtCountdown(mgtRemaining)}`
        : null,
      features: [
        { text: '達人班所有課程', ok: true },
        { text: '個人帳號代管（IG、TikTok）', ok: true },
        { text: '每月影片拍攝與剪輯', ok: true },
        { text: '專屬顧問一對一輔導', ok: true },
        { text: '成效數據月報', ok: true },
      ],
    },
  ]

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#eef2ff,#f0f9ff)', padding:'48px 24px' }}>
      <div style={{ maxWidth:1000, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:48 }}>
          <div style={{ fontSize:28, fontWeight:800,
            background:'linear-gradient(135deg,var(--primary),#818cf8)',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
            marginBottom:8 }}>🎬 自媒體學院</div>
          <h1 style={{ fontSize:32, fontWeight:800, color:'var(--gray-900)', marginBottom:10 }}>
            選擇適合你的方案
          </h1>
          <p style={{ fontSize:16, color:'var(--gray-500)' }}>
            從試聽課開始，找到最適合你成長節奏的學習方式
          </p>
        </div>

        <div className="pricing-grid">
          {PLANS.map(plan => (
            <div key={plan.key} className={`pricing-card ${plan.featured ? 'featured' : ''}`}>
              <div>
                <div style={{ fontSize:32, marginBottom:8 }}>{plan.emoji}</div>
                <div className="pricing-name" style={{ color:plan.color }}>{plan.name}</div>
              </div>
              <div>
                {plan.origPrice && (
                  <div style={{ fontSize:14, color:'var(--gray-400)', textDecoration:'line-through', marginBottom:4 }}>
                    {plan.origPrice}
                  </div>
                )}
                <div className="pricing-price" style={{ color:plan.color }}>
                  {plan.price}<span>{plan.period}</span>
                </div>
                {plan.offer && (
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:8,
                    background:'#fef3c7', color:'#b45309', borderRadius:'var(--radius-sm)',
                    padding:'6px 12px', fontSize:13, fontWeight:700 }}>
                    ⏰ {plan.offer}
                  </div>
                )}
              </div>
              <ul className="pricing-features">
                {plan.features.map((f, i) => (
                  <li key={i} className={f.ok ? '' : 'locked'}>
                    <span>{f.ok ? '✅' : '✗'}</span>{f.text}
                  </li>
                ))}
              </ul>
              <button
                className="btn btn-lg btn-block"
                style={{ background: plan.featured ? 'var(--primary)' : 'var(--gray-800)', color:'#fff' }}
                onClick={() => navigate(currentUser ? '/dashboard' : '/register')}
              >
                {plan.key === 'managed' ? '聯絡洽談' : '立即加入'}
              </button>
            </div>
          ))}
        </div>

        <p style={{ textAlign:'center', marginTop:32, fontSize:13, color:'var(--gray-500)' }}>
          陪跑班為獨立服務，請直接聯絡我們洽談。
          &nbsp;·&nbsp;
          <button className="auth-link"
            style={{ border:'none', background:'none', cursor:'pointer', fontSize:13 }}
            onClick={() => navigate('/login')}>
            ← 返回登入
          </button>
        </p>
      </div>
    </div>
  )
}
