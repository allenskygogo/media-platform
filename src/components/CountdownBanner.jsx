import { useState, useEffect } from 'react'

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

/** Banner for the 24h creator plan upgrade prompt after trial completion. */
export function AdvancedOfferBanner({ offer }) {
  const deadline  = Date.now() + offer.remainingMs
  const remaining = useCountdown(deadline)
  if (remaining <= 0) return null

  return (
    <div className="offer-banner offer-banner-advanced">
      <div className="offer-banner-inner">
        <div className="offer-banner-text">
          <strong>恭喜完成體驗課！可評估升級頂流達人</strong>
          <span>從 AI 選題體驗，進入完整自媒體獲客系統課。</span>
        </div>
        <div className="offer-banner-countdown">
          <span className="offer-countdown-label">優惠剩餘</span>
          <span className="offer-countdown-clock">{fmtCountdown(remaining)}</span>
        </div>
        <button className="btn btn-sm offer-banner-btn" disabled>
          即將開放
        </button>
      </div>
    </div>
  )
}

/** Banner for the 24h managed-service prompt after all courses completed. */
export function CompletionOfferBanner({ offer }) {
  const deadline  = Date.now() + offer.remainingMs
  const remaining = useCountdown(deadline)
  if (remaining <= 0) return null

  return (
    <div className="offer-banner offer-banner-completion">
      <div className="offer-banner-inner">
        <div className="offer-banner-text">
          <strong>恭喜完課！可評估頂流私塾或頂流代操</strong>
          <span>若需要一對一陪跑或團隊代操，可以查看下一階段服務。</span>
        </div>
        <div className="offer-banner-countdown">
          <span className="offer-countdown-label">優惠剩餘</span>
          <span className="offer-countdown-clock">{fmtCountdown(remaining)}</span>
        </div>
        <button className="btn btn-sm offer-banner-btn" disabled>
          即將開放
        </button>
      </div>
    </div>
  )
}
