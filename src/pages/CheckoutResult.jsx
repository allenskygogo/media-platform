import { Link, useSearchParams } from 'react-router-dom'
import BrandLogo from '../components/BrandLogo'

export default function CheckoutResult() {
  const [params] = useSearchParams()
  const orderNumber = params.get('order') || ''
  const status = params.get('status') || ''
  const paid = status === 'paid'

  return (
    <main className="sp2-page">
      <nav className="sp2-nav">
        <Link to="/" className="sp2-brand" aria-label="Top Level Traffic 首頁">
          <BrandLogo variant="light" size="md" />
        </Link>
        <div className="sp2-nav-links">
          <Link to="/login">登入</Link>
          <Link to="/">回到首頁</Link>
        </div>
      </nav>

      <section className="sp2-section" style={{ minHeight: '70vh', display: 'grid', placeItems: 'center' }}>
        <div className="checkout-preview-card success" style={{ maxWidth: 560, width: '100%', textAlign: 'center' }}>
          <div className="checkout-card-title">
            <span>{paid ? '付款完成' : '付款結果處理中'}</span>
          </div>
          <p style={{ color: 'var(--gray-600)', lineHeight: 1.8, marginTop: 12 }}>
            {paid
              ? '付款系統已回傳付款完成。系統會依背景通知自動開通課程權限，請使用購買時設定的 Email 與密碼登入。'
              : '如果你已完成付款，系統會在背景通知抵達後自動開通。若稍後仍無法登入，請保留訂單編號聯繫客服。'}
          </p>
          {orderNumber && (
            <div className="checkout-summary-line" style={{ marginTop: 18 }}>
              <span>訂單編號</span>
              <strong>{orderNumber}</strong>
            </div>
          )}
          <div className="checkout-actions" style={{ justifyContent: 'center', marginTop: 22 }}>
            <Link className="checkout-next-btn" to="/login">前往登入</Link>
            <Link className="checkout-back-btn" to="/">回到首頁</Link>
          </div>
        </div>
      </section>
    </main>
  )
}
