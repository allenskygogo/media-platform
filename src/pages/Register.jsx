import { Link } from 'react-router-dom'

export default function Register() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">TOP LEVEL TRAFFIC</div>
        <p className="auth-subtitle">會員註冊資格確認</p>

        <div className="auth-alert danger" style={{ marginBottom: 18, lineHeight: 1.7 }}>
          目前僅開放已購買體驗課的學員註冊，請先購買體驗課後再完成會員註冊。
        </div>

        <div className="auth-form">
          <button type="button" className="btn btn-primary btn-lg btn-block" disabled>
            購買體驗課即將開放
          </button>
          <Link to="/login" className="btn btn-secondary btn-lg btn-block">
            已有帳號，前往登入
          </Link>
        </div>

        <p className="auth-divider" style={{ marginTop: 20 }}>
          <Link to="/" className="auth-link">回到首頁</Link>
        </p>
      </div>
    </div>
  )
}
