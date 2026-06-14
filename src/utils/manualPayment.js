export const LINE_OFFICIAL_URL = import.meta.env.VITE_LINE_OFFICIAL_URL || 'https://lin.ee/VALNYlg'

export function buildManualPaymentMessage({ planName, amount, orderNumber, name, email, phone }) {
  const rawAmount = String(amount || '').trim()
  const amountText = rawAmount
    ? (/^NT\$/i.test(rawAmount) ? rawAmount : `NT$${rawAmount}`)
    : ''

  return [
    `你好，我想購買「${planName}」`,
    amountText ? `金額：${amountText}` : '',
    orderNumber ? `訂單編號：${orderNumber}` : '',
    name ? `真實姓名：${name}` : '真實姓名：',
    email ? `Email：${email}` : 'Email：',
    phone ? `聯絡電話：${phone}` : '聯絡電話：',
    '我會完成匯款，請協助確認並開通課程帳號。',
  ].filter(Boolean).join('\n')
}

export function openLineOfficial() {
  if (!LINE_OFFICIAL_URL) return false
  window.open(LINE_OFFICIAL_URL, '_blank', 'noopener,noreferrer')
  return true
}
