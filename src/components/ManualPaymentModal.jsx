import { useMemo, useState } from 'react'
import { buildManualPaymentMessage, openLineOfficial } from '../utils/manualPayment'

export default function ManualPaymentModal({ planName, amount, onClose }) {
  const [copied, setCopied] = useState(false)

  const message = useMemo(() => buildManualPaymentMessage({
    planName,
    amount,
  }), [planName, amount])

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
      return true
    } catch (_) {
      setCopied(false)
      return false
    }
  }

  const handleLineClick = async () => {
    await copyMessage()
    openLineOfficial()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal sp-checkout-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="sp-checkout-kicker">Line@ Payment</p>
            <h2 className="modal-title">Line@ 匯款購買</h2>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="關閉付款聯繫視窗">✕</button>
        </div>

        <div className="modal-body">
          <div className="sp-checkout-summary">
            <div>
              <span>課程方案</span>
              <strong>{planName}</strong>
              <p>請先複製下方文字，再前往 Line@ 貼上給客服，我們會協助確認匯款與開通帳號。</p>
            </div>
            <div className="sp-checkout-price">${amount}</div>
          </div>

          <div className="sp-checkout-note">
            <strong>請複製這段文字貼到 Line@</strong>
            <textarea
              className="form-textarea manual-payment-message"
              value={message}
              readOnly
              onFocus={e => e.currentTarget.select()}
            />
          </div>

          {copied && <div className="auth-alert success">已複製文字，可以貼到 Line@ 了。</div>}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={copyMessage}>
            {copied ? '已複製' : '複製文字'}
          </button>
          <button type="button" className="btn btn-primary" onClick={handleLineClick}>
            複製並前往 Line@
          </button>
        </div>
      </div>
    </div>
  )
}
