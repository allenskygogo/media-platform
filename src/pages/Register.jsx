import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password.length < 6) { setError('密碼至少需要 6 個字元'); return }
    if (form.password !== form.confirm) { setError('兩次輸入的密碼不一致'); return }
    setLoading(true)
    try {
      register(form.name.trim(), form.email.trim(), form.password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const update = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">🎬 自媒體學院</div>
        <p className="auth-subtitle">建立帳號，開始你的學習旅程</p>

        {error && <div className="auth-alert error" style={{ marginBottom: 16 }}>{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">姓名</label>
            <input type="text" className="form-input" placeholder="你的姓名" value={form.name} onChange={update('name')} required autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">電子郵件</label>
            <input type="email" className="form-input" placeholder="輸入電子郵件" value={form.email} onChange={update('email')} required />
          </div>
          <div className="form-group">
            <label className="form-label">密碼</label>
            <input type="password" className="form-input" placeholder="至少 6 個字元" value={form.password} onChange={update('password')} required />
          </div>
          <div className="form-group">
            <label className="form-label">確認密碼</label>
            <input type="password" className="form-input" placeholder="再次輸入密碼" value={form.confirm} onChange={update('confirm')} required />
          </div>

          <div style={{ background: 'var(--basic-light)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', fontSize: 13, color: 'var(--basic-text)' }}>
            🎓 新帳號預設為「初階會員」，可聯絡管理員升級至進階會員
          </div>

          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading}>
            {loading ? '建立中…' : '建立帳號'}
          </button>
        </form>

        <p className="auth-divider" style={{ marginTop: 20 }}>
          已有帳號？<Link to="/login" className="auth-link">立即登入</Link>
        </p>
      </div>
    </div>
  )
}
