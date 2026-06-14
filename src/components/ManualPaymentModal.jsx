import { useMemo, useState } from 'react'
import { buildManualPaymentMessage, openLineOfficial } from '../utils/manualPayment'

export default function ManualPaymentModal({
  planName,
  amount,
  amountLabel = '',
  email = '',
  defaultName = '',
  defaultPhone = '',
  requireContact = false,
  onClose,
  title = 'Line@ 匯款購買',
  kicker = 'Line@ Payment',
  description = '請先複製下方文字，再前往 Line@ 貼上給客服，我們會協助確認匯款與開通帳號。',
  messageLabel = '請複製這段文字貼到 Line@',
  customMessage = '',
  primaryLabel = '複製並前往 Line@',
  onBeforeCopy,
}) {
  const [copied, setCopied] = useState(false)
  const [name, setName] = useState(defaultName)
  const [phone, setPhone] = useState(defaultPhone)
  const [fieldError, setFieldError] = useState('')
  const cleanPhone = String(phone || '').trim()
  const cleanName = String(name || '').trim()
  const contactReady = !requireContact || (cleanName.length >= 2 && cleanPhone.length >= 8)

  const message = useMemo(() => (
    customMessage || buildManualPaymentMessage({ planName, amount, name: cleanName, email, phone: cleanPhone })
  ), [amount, cleanName, cleanPhone, customMessage, email, planName])

  const validateContact = () => {
    if (!requireContact) return true
    if (cleanName.length < 2) {
      setFieldError('請填寫真實姓名，至少 2 個字。')
      return false
    }
    if (cleanPhone.length < 8) {
      setFieldError('請填寫可聯繫的電話。')
      return false
    }
    setFieldError('')
    return true
  }

  const copyMessage = async () => {
    if (!validateContact()) return false
    try {
      if (onBeforeCopy) await onBeforeCopy({ name: cleanName, phone: cleanPhone, message })
      await navigator.clipboard.writeText(message)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
      return true
    } catch (error) {
      if (onBeforeCopy) setFieldError(error.message || '合約簽署紀錄建立失敗，請稍後再試。')
      setCopied(false)
      return false
    }
  }

  const handleLineClick = async () => {
    const copiedOk = await copyMessage()
    if (!copiedOk) return
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
            <div className="sp-checkout-price">{amountLabel || (amount ? `NT$${amount}` : '')}</div>
          </div>

          {requireContact && (
            <div className="manual-payment-fields">
              <div className="form-group">
                <label className="form-label">真實姓名 <span>*</span></label>
                <input
                  className="form-input"
                  value={name}
                  onChange={event => {
                    setName(event.target.value)
                    setFieldError('')
                    setCopied(false)
                  }}
                  placeholder="請填寫真實姓名"
                  autoComplete="name"
                />
              </div>
              <div className="form-group">
                <label className="form-label">聯絡電話 <span>*</span></label>
                <input
                  className="form-input"
                  value={phone}
                  onChange={event => {
                    setPhone(event.target.value)
                    setFieldError('')
                    setCopied(false)
                  }}
                  placeholder="例：0912-345-678"
                  inputMode="tel"
                  autoComplete="tel"
                />
              </div>
            </div>
          )}

          <div className="sp-checkout-note">
            <strong>{messageLabel}</strong>
            <textarea
              className="form-textarea manual-payment-message"
              value={message}
              readOnly
              onFocus={e => e.currentTarget.select()}
            />
          </div>

          {fieldError && <div className="auth-alert error">{fieldError}</div>}
          {copied && <div className="auth-alert success">已複製文字，可以貼到 Line@ 了。</div>}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={copyMessage} disabled={!contactReady}>
            {copied ? '已複製' : '複製文字'}
          </button>
          <button type="button" className="btn btn-primary" onClick={handleLineClick} disabled={!contactReady}>
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
