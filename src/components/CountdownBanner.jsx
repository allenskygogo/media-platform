import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

function fmtCountdown(ms) {
  if (ms <= 0) return '00:00:00'
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

function useCountdown(targetMs) {
  const [remaining, setRemaining] = useState(() => Math.max(0, targetMs - Date.now()))
  useEffect(() => {
    const t = setInterval(() => {
      const r = Math.max(0, targetMs - Date.now())
      setRemaining(r)
      if (r <= 0) clearInterval(t)
    }, 1000)
    return () => clearInterval(t)
  }, [targetMs])
  return remaining
}

/** Banner for the 24h advanced plan discount after trial completion. */
export function AdvancedOfferBanner({ offer }) {
  const navigate  = useNavigate()
  const deadline  = Date.now() + offer.remainingMs
  const remaining = useCountdown(deadline)
  if (remaining <= 0) return null

  return (
    <div className="offer-banner offer-banner-advanced">
      <div className="offer-banner-inner">
        <span className="offer-banner-emoji">⭐</span>
        <div className="offer-banner-text">
          <strong>恭喜完成試聽課！達人班限時優惠</strong>
          <span>原價 NT${offer.normalPrice.toLocaleString()}，優惠價 NT${offer.discountPrice.toLocaleString()}</span>
        </div>
        <div className="offer-banner-countdown">
          <span className="offer-countdown-label">優惠剩餘</span>
          <span className="offer-countdown-clock">{fmtCountdown(remaining)}</span>
        </div>
        <button className="btn btn-sm offer-banner-btn"
          onClick={() => navigate('/pricing')}>
          立即升級 →
        </button>
      </div>
    </div>
  )
}

/** Banner for the 24h managed plan discount after all courses completed. */
export function CompletionOfferBanner({ offer }) {
  const navigate  = useNavigate()
  const deadline  = Date.now() + offer.remainingMs
  const remaining = useCountdown(deadline)
  if (remaining <= 0) return null

  return (
    <div className="offer-banner offer-banner-completion">
      <div className="offer-banner-inner">
        <span className="offer-banner-emoji">🎉</span>
        <div className="offer-banner-text">
          <strong>恭喜完課！陪跑班限時優惠 24 小時</strong>
          <span>
            原價 NT${offer.normalPrice.toLocaleString()}，
            折抵達人班學費 NT${offer.deduction.toLocaleString()}，
            應付 NT${offer.discountPrice.toLocaleString()}
          </span>
        </div>
        <div className="offer-banner-countdown">
          <span className="offer-countdown-label">優惠剩餘</span>
          <span className="offer-countdown-clock">{fmtCountdown(remaining)}</span>
        </div>
        <button className="btn btn-sm offer-banner-btn"
          onClick={() => navigate('/pricing')}>
          查看方案 →
        </button>
      </div>
    </div>
  )
}
