import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const DEMO_ACCOUNTS = [
  { label: '管理員',        email: 'admin@media.com',    password: 'admin123', color: 'var(--admin)' },
  { label: '體驗未完成',    email: 'trial@media.com',    password: 'user123',  color: 'var(--danger)' },
  { label: '初階（已體驗）', email: 'basic@media.com',    password: 'user123',  color: 'var(--basic)' },
  { label: '頂流達人',      email: 'standard@media.com', password: 'user123',  color: 'var(--standard)' },
  { label: '頂流私塾',      email: 'advanced@media.com', password: 'user123',  color: 'var(--advanced)' },
  { label: '頂流代操',      email: 'managed1@media.com', password: 'user123',  color: 'var(--managed)' },
]

export default function Login() {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const [form, setForm]     = useState({ email: '', password: '' })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = login(form.email.trim(), form.password)
      if (user.role === 'admin') navigate('/admin', { replace: true })
      else if (user.tier === 'managed') navigate('/managed', { replace: true })
      else navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">TOP LEVEL TRAFFIC</div>
        <p className="auth-subtitle">歡迎回來！請登入繼續學習</p>
        <p className="auth-divider" style={{ marginBottom: 18 }}>
          <Link to="/" className="auth-link">回到首頁</Link>
        </p>

        {error && <div className="auth-alert error" style={{ marginBottom: 16 }}>{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">電子郵件</label>
            <input type="email" className="form-input" placeholder="輸入電子郵件"
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">密碼</label>
            <input type="password" className="form-input" placeholder="輸入密碼"
              value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
          </div>
          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading}>
            {loading ? '登入中…' : '登入'}
          </button>
        </form>

        <p className="auth-divider" style={{ marginTop: 20 }}>
          還沒有帳號？<Link to="/register" className="auth-link">立即註冊</Link>
          &nbsp;·&nbsp;<Link to="/pricing" className="auth-link">查看方案</Link>
        </p>

        <div style={{ marginTop: 24, padding: 16, background: 'var(--gray-50)', borderRadius: 'var(--radius)', fontSize: 13 }}>
          <p style={{ fontWeight: 700, color: 'var(--gray-600)', marginBottom: 8 }}>測試帳號</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {DEMO_ACCOUNTS.map(({ label, email, password, color }) => (
              <button key={email} type="button" className="btn btn-outline btn-sm"
                onClick={() => setForm({ email, password })}
                style={{ justifyContent: 'flex-start', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                {label}：{email}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
