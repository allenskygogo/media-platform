import { useMemo, useState } from 'react'
import { buildManualPaymentMessage, openLineOfficial } from '../utils/manualPayment'

export default function ManualPaymentModal({
  planName,
  amount,
  onClose,
  title = 'Line@ 匯款購買',
  kicker = 'Line@ Payment',
  description = '請先複製下方文字，再前往 Line@ 貼上給客服，我們會協助確認匯款與開通帳號。',
  messageLabel = '請複製這段文字貼到 Line@',
  customMessage = '',
  primaryLabel = '複製並前往 Line@',
}) {
  const [copied, setCopied] = useState(false)

  const message = useMemo(() => (
    customMessage || buildManualPaymentMessage({ planName, amount })
  ), [amount, customMessage, planName])

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
            <p className="sp-checkout-kicker">{kicker}</p>
            <h2 className="modal-title">{title}</h2>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="關閉付款聯繫視窗">✕</button>
        </div>

        <div className="modal-body">
          <div className="sp-checkout-summary">
            <div>
              <span>課程方案</span>
              <strong>{planName}</strong>
              <p>{description}</p>
            </div>
            <div className="sp-checkout-price">${amount}</div>
          </div>

          <div className="sp-checkout-note">
            <strong>{messageLabel}</strong>
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
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
