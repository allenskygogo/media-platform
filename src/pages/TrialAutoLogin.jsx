import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { verifyAutoLoginToken } from '../data/mockData'

export default function TrialAutoLogin() {
  const [searchParams] = useSearchParams()
  const { login }      = useAuth()
  const navigate       = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      const uid   = searchParams.get('uid')
      const token = searchParams.get('t')

      if (!uid || !token) {
        if (!cancelled) setError('無效的連結，請聯絡客服。')
        return
      }

      const user = verifyAutoLoginToken(uid, token)
      if (!user) {
        if (!cancelled) setError('連結已失效或不正確，請聯絡客服。')
        return
      }

      // Log the user in then redirect to trial booking page
      try {
        await login(user.email, user.password)
        if (!cancelled) navigate('/dashboard/trial', { replace: true })
      } catch {
        if (!cancelled) setError('自動登入失敗，請手動登入。')
      }
    }

    run()
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gray-50)' }}>
        <div style={{ textAlign: 'center', padding: '40px 32px', background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,.08)', maxWidth: 400 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
          <p style={{ fontSize: 15, color: 'var(--gray-700)', marginBottom: 24 }}>{error}</p>
          <button
            className="btn btn-primary"
            onClick={() => window.location.href = '/login'}
          >
            前往登入頁
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gray-50)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🔑</div>
        <p style={{ fontSize: 15, color: 'var(--gray-500)' }}>正在為你自動登入…</p>
      </div>
    </div>
  )
}
