import { loginDestination } from '../../shared/memberAccess'
import { useState } from 'react'
import { useNavigate, useSearchParams, Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login, currentUser, loading: authLoading } = useAuth()
  const [searchParams] = useSearchParams()
  const next = searchParams.get('next')
  const aiIntent = next === '/dashboard/ai-tools'
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
      navigate(loginDestination(user, next), { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!authLoading && currentUser) return <Navigate to={loginDestination(currentUser, next)} replace />

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">TOP LEVEL TRAFFIC</div>
        <p className="auth-subtitle">{aiIntent ? '登入後，直接使用 AI 工具' : next === '/dashboard/courses' ? '登入後，前往我的課程' : '會員登入｜AI 與課程共用同一個帳號'}</p>
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
          還沒有帳號？<Link to="/register?intent=ai" className="auth-link">申請 AI 使用</Link>
          &nbsp;·&nbsp;<Link to="/courses" className="auth-link">查看線上課程</Link>
        </p>

      </div>
    </div>
  )
}
