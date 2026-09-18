import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { memberHome, needsAIReview } from '../../shared/memberAccess'
import { PublicEntryHeader } from './EntryPages'
import { supabase } from '../lib/supabase'
import { LINE_OFFICIAL_URL } from '../utils/manualPayment'
const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'https://media-platform-api.allen-a76.workers.dev'

export default function AIAccessStatus() {
  const { currentUser, loading, refreshCurrentUser, logout } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const refresh = async () => {
    setBusy(true)
    setError('')
    try { await refreshCurrentUser() } catch (error) { setError(error.message) }
    finally { setBusy(false) }
  }
  useEffect(() => {
    if (!currentUser) return
    const timer = setInterval(() => { refreshCurrentUser().catch(error => setError(error.message)) }, 30000)
    return () => clearInterval(timer)
  }, [currentUser?.id])
  const renew = async () => {
    setBusy(true); setError('')
    try {
      const { data } = await supabase.auth.getSession()
      const response = await fetch(`${WORKER_URL}/api/auth/renew-ai`, { method: 'POST', headers: { Authorization: `Bearer ${data.session?.access_token}` } })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || '申請失敗')
      await refreshCurrentUser()
    } catch (error) { setError(error.message) }
    finally { setBusy(false) }
  }
  if (loading) return <div className="auth-page">載入中…</div>
  if (!currentUser) return <Navigate to="/login?next=%2Fai-access" replace />
  if (!needsAIReview(currentUser)) return <Navigate to={memberHome(currentUser)} replace />
  const state = currentUser.accessStatus === 'pending' || currentUser.accessStatus === 'rejected' ? currentUser.accessStatus : 'expired'
  const labels = { pending: ['申請已送出，等待審核', '核准後即可使用 AI 7 天，等待審核的時間不會計入。此頁每 30 秒更新審核狀態。'], rejected: ['申請未通過', '如需了解申請狀況，請聯絡課程顧問。'], expired: ['AI 使用權限已到期', '目前無法繼續使用 AI；再次申請並經審核核准後，可開通新的 7 天。'] }
  return <div className="entry-page"><PublicEntryHeader /><main className="entry-main entry-registration">
    <section className="entry-intro"><p className="entry-eyebrow">AI 申請狀態</p><h1>{labels[state][0]}</h1><p>{labels[state][1]}</p></section>
    <section className="entry-card"><p>{currentUser.name} · {currentUser.email}</p>
      {currentUser.expiresAt && <p>上次使用期限：{new Date(currentUser.expiresAt).toLocaleString('zh-TW')}</p>}
      {error && <div className="auth-alert error" role="alert">{error}</div>}
      <div className="entry-actions">
        {state === 'expired' && currentUser.aiApplication && <button className="sp2-btn sp2-btn-primary" disabled={busy} onClick={renew}>申請再開通 7 天</button>}
        <button className="sp2-btn sp2-btn-outline" disabled={busy} onClick={refresh}>{busy ? '更新中…' : '更新審核狀態'}</button>
        {state !== 'pending' && <a className="sp2-btn sp2-btn-outline" href={LINE_OFFICIAL_URL} target="_blank" rel="noopener noreferrer">聯絡課程顧問</a>}
        <button className="sp2-btn sp2-btn-outline" onClick={logout}>登出</button>
      </div>
    </section><p className="entry-note">想了解課程？<Link to="/courses">查看線上課程</Link></p>
  </main></div>
}
