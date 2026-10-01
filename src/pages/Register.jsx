import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { memberHome } from '../../shared/memberAccess'
import { PublicEntryHeader } from './EntryPages'

export default function Register() {
  const { currentUser, register } = useAuth()
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '', industry: '', purpose: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const change = key => event => setForm(value => ({ ...value, [key]: event.target.value }))
  const submit = async event => {
    event.preventDefault()
    if (busy) return
    setError('')
    if (form.password !== form.confirmPassword) { setError('兩次密碼不一致，請重新確認。'); return }
    setBusy(true)
    try {
      const { confirmPassword, ...values } = form
      await register(values)
      setForm(value => ({ ...value, password: '', confirmPassword: '' }))
      setSubmitted(true)
    } catch (error) { setError(error.message) }
    finally { setBusy(false) }
  }
  if (currentUser) return <Navigate to={memberHome(currentUser)} replace />
  return <div className="entry-page">
    <PublicEntryHeader />
    <main className="entry-main entry-registration">
      <section className="entry-intro">
        <p className="entry-eyebrow">AI 會員</p>
        <h1>{submitted ? '帳號建立完成' : '建立 AI 帳號'}</h1>
        <p>填寫資料即可建立帳號，不需人工審核。第一次登入後自動開始 7 天免費試用，到期停止使用，不會自動扣款。</p>
      </section>
      {submitted ? <section className="entry-card" role="status">
        <h2>你的帳號已建立</h2>
        <p>帳號：{form.email.trim()}</p>
        <p>使用剛才設定的 Email 與密碼登入，即可直接進入 AI 工具並開始 7 天試用。</p>
        <div className="entry-actions"><Link className="sp2-btn sp2-btn-primary" to="/login?next=%2Fdashboard%2Fai-tools">登入並開始 7 天試用</Link></div>
      </section> : <form className="entry-card entry-register-form" onSubmit={submit}>
        <h2>填寫註冊資料</h2>
        <p className="entry-note">已有課程或 AI 帳號？請沿用原帳號登入。</p>
        {error && <div className="auth-alert error" role="alert">{error}</div>}
        <label htmlFor="signup-name">姓名／品牌稱呼</label>
        <input id="signup-name" value={form.name} onChange={change('name')} required maxLength={80} autoComplete="name" />
        <label htmlFor="signup-email">Email（登入帳號）</label>
        <input id="signup-email" type="email" value={form.email} onChange={change('email')} required maxLength={254} autoComplete="email" />
        <label htmlFor="signup-phone">手機號碼</label>
        <input id="signup-phone" type="tel" value={form.phone} onChange={change('phone')} required maxLength={20} autoComplete="tel" placeholder="例如：0912-345-678" />
        <label htmlFor="signup-password">密碼（至少 8 碼）</label>
        <input id="signup-password" type="password" value={form.password} onChange={change('password')} required minLength={8} maxLength={128} autoComplete="new-password" />
        <label htmlFor="signup-confirm">再次輸入密碼</label>
        <input id="signup-confirm" type="password" value={form.confirmPassword} onChange={change('confirmPassword')} required minLength={8} maxLength={128} autoComplete="new-password" />
        <label htmlFor="signup-industry">行業</label>
        <input id="signup-industry" value={form.industry} onChange={change('industry')} required maxLength={100} placeholder="例如：健身教練、美業、餐飲" />
        <label htmlFor="signup-purpose">想如何使用 AI？</label>
        <textarea id="signup-purpose" value={form.purpose} onChange={change('purpose')} required maxLength={1000} rows={3} placeholder="例如：規劃短影音、撰寫腳本或社群貼文" />
        <div className="entry-actions">
          <button className="sp2-btn sp2-btn-primary" disabled={busy}>{busy ? '送出中…' : '建立帳號'}</button>
          <Link className="sp2-btn sp2-btn-outline" to="/login?next=%2Fdashboard%2Fai-tools">已有帳號，登入</Link>
        </div>
      </form>}
      <aside className="entry-crosslink"><div><h2>想購買課程？</h2><p>原課程附贈的 AI 使用權益依原方案提供。</p></div><Link to="/courses">查看線上課程 →</Link></aside>
    </main>
  </div>
}
