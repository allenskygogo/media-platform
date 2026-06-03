export const LINE_OFFICIAL_URL = import.meta.env.VITE_LINE_OFFICIAL_URL || 'https://lin.ee/VALNYlg'

export function buildManualPaymentMessage({ planName, amount, orderNumber, name, email, phone }) {
  return [
    `你好，我想購買「${planName}」`,
    `金額：NT$${amount}`,
    orderNumber ? `訂單編號：${orderNumber}` : '',
    name ? `姓名：${name}` : '姓名：',
    email ? `Email：${email}` : 'Email：',
    phone ? `手機：${phone}` : '手機：',
    '我會完成匯款，請協助確認並開通課程帳號。',
  ].filter(Boolean).join('\n')
}

export function openLineOfficial() {
  if (!LINE_OFFICIAL_URL) return false
  window.open(LINE_OFFICIAL_URL, '_blank', 'noopener,noreferrer')
  return true
}
