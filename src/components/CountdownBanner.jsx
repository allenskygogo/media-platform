import { useState, useEffect } from 'react'
import ManualPaymentModal from './ManualPaymentModal'

const ADVANCED_OFFER_PRICE = 29800
const ADVANCED_OFFER_PLAN = '頂流達人班 24H 限時優惠'
const ADVANCED_OFFER_MESSAGE = [
  '你好，我剛看完體驗課，想了解「頂流達人班 24H 限時優惠」。',
  '優惠價：NT$29,800',
  '優惠內容：立即省 1 萬，可分期辦理',
  '我想私訊官方客服 @xgfx，請協助我了解付款與開通方式。',
].join('\n')

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
  const [showLineModal, setShowLineModal] = useState(false)
  const deadline  = Date.now() + offer.remainingMs
  const remaining = useCountdown(deadline)
  if (remaining <= 0) return null

  return (
    <>
      <div className="offer-banner offer-banner-advanced offer-banner-hot">
        <div className="offer-banner-inner">
          <div className="offer-banner-emoji">🔥</div>
          <div className="offer-banner-text">
            <strong>達人班優惠 $29,800｜立即省 1 萬</strong>
            <span>可分期辦理。24H 內私訊官方客服 @xgfx，優惠倒數結束後自動消失。</span>
          </div>
          <div className="offer-banner-countdown">
            <span className="offer-countdown-label">優惠剩餘</span>
            <span className="offer-countdown-clock">{fmtCountdown(remaining)}</span>
          </div>
          <button className="btn btn-sm offer-banner-btn" onClick={() => setShowLineModal(true)}>
            私訊官方客服 @xgfx
          </button>
        </div>
      </div>
      {showLineModal && (
        <ManualPaymentModal
          planName={ADVANCED_OFFER_PLAN}
          amount={ADVANCED_OFFER_PRICE}
          title="私訊官方客服 @xgfx"
          kicker="24H Upgrade Offer"
          description="請先複製優惠詢問文字，再前往 Line@ 貼給客服，我們會協助說明分期與開通方式。"
          messageLabel="請複製這段文字貼到 Line@"
          customMessage={ADVANCED_OFFER_MESSAGE}
          primaryLabel="複製並前往 Line@"
          onClose={() => setShowLineModal(false)}
        />
      )}
    </>
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
