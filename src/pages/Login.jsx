import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

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
      const user = await login(form.email.trim(), form.password)
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

      </div>
    </div>
  )
}
