import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  getTrialSession, saveTrialSession,
  getTrialProgress, TRIAL_DURATION_SEC,
} from '../../data/mockData'
import { supabase, hasSupabase, allowLocalFallback } from '../../lib/supabase'
import Calendar from '../../components/Calendar'

const HOURS = Array.from({ length: 15 }, (_, i) => i + 8) // 08:00–22:00

function fmt(sec) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

function useCountdown(targetIso) {
  const [str, setStr] = useState('')
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const tick = () => {
      const diff = new Date(targetIso).getTime() - Date.now()
      if (diff <= 0) { setStr(''); setReady(true); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setStr(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`)
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [targetIso])
  return { str, ready }
}

function toTrialSession(row) {
  if (!row) return null
  return {
    userId: row.user_id,
    scheduledAt: row.scheduled_at,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function loadTrialSession(userId) {
  if (hasSupabase && supabase) {
    const { data, error } = await supabase
      .from('trial_sessions')
      .select('user_id, scheduled_at, status, created_at, updated_at')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) throw error
    return toTrialSession(data)
  }

  if (allowLocalFallback) return getTrialSession(userId)
  throw new Error('體驗課預約資料服務尚未設定')
}

async function bookTrialSession(userId, scheduledAt) {
  if (hasSupabase && supabase) {
    const { data, error } = await supabase
      .from('trial_sessions')
      .upsert(
        { user_id: userId, scheduled_at: scheduledAt, status: 'booked' },
        { onConflict: 'user_id' },
      )
      .select('user_id, scheduled_at, status, created_at, updated_at')
      .single()

    if (error) throw error
    return toTrialSession(data)
  }

  if (allowLocalFallback) {
    saveTrialSession(userId, scheduledAt)
    return getTrialSession(userId)
  }

  throw new Error('體驗課預約資料服務尚未設定')
}

// ── Booking form (3 steps) ──────────────────────────────────────────────────
function BookingForm({ userId, onBooked, onError }) {
  const [step, setStep]           = useState(1)
  const [date, setDate]           = useState('')
  const [hour, setHour]           = useState(null)
  const [confirmed, setConfirmed] = useState(false)
  const [saving, setSaving]       = useState(false)

  const minDate = new Date(Date.now() + 3600 * 1000).toISOString().split('T')[0]
  const endHour = hour !== null ? hour + 3 : null

  const handleBook = async () => {
    const scheduledAt = new Date(`${date}T${String(hour).padStart(2,'0')}:00:00`).toISOString()
    setSaving(true)
    try {
      const nextSession = await bookTrialSession(userId, scheduledAt)
      onBooked(nextSession)
    } catch (err) {
      onError(err.message || '預約失敗，請稍後再試')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card trial-booking-card">
      <div className="card-header">
        <h2 className="card-title">
          {step === 1 ? '選擇日期' : step === 2 ? '選擇開始時間' : '確認預約'}
        </h2>
        <div className="step-dots">
          {[1,2,3].map(s => <div key={s} className={`step-dot ${step >= s ? 'done' : ''}`} />)}
        </div>
      </div>
      <div className="card-body">
        {/* Step 1 — Date */}
        {(step === 1 || step === 2) && (
          <div className="trial-date-panel">
            <Calendar
              selected={date}
              onChange={d => { setDate(d); setHour(null); setStep(2) }}
              minDate={minDate}
            />
          </div>
        )}

        {/* Step 2 — Hour */}
        {(step === 1 || step === 2) && (
          <div className="trial-time-panel">
            {!date ? (
              <div className="trial-empty-time">請先選擇日期，系統會顯示可預約時段</div>
            ) : (
              <>
                <p className="trial-time-title">{date} — 選擇開始時間</p>
                <div className="time-grid">
                  {HOURS.map(h => (
                    <button
                      key={h}
                      className={`time-grid-btn ${hour === h ? 'sel' : ''}`}
                      onClick={() => { setHour(h); setStep(3) }}
                    >
                      {String(h).padStart(2,'0')}:00
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {step === 2 && date && (
          <div className="trial-action-row">
            <button className="btn btn-ghost btn-sm" onClick={() => setStep(1)}>
              ← 重新選擇日期
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="trial-time-panel">
            <div className="trial-date-panel compact">
              <Calendar
                selected={date}
                onChange={d => { setDate(d); setHour(null); setConfirmed(false); setStep(2) }}
                minDate={minDate}
              />
            </div>
          </div>
        )}

        {/* Step 3 — Confirm + Warning */}
        {step === 3 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--gray-900)' }}>{date}</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary)', margin: '6px 0' }}>
                {String(hour).padStart(2,'0')}:00 開始
              </p>
              <div className="trial-end-time">
                ⏰ 預計 {String(endHour).padStart(2,'0')}:00 結束（約 3 小時）
              </div>
            </div>

            <div className="trial-warning">
              <strong>⚠️ 請仔細閱讀後再確認</strong>
              課程開始後<b>無法暫停或快轉</b>，中途斷線可從斷點繼續，
              但<b>無法跳過任何片段</b>。確認開始後你的
              <b>三個月使用期限當天起算</b>，請確保你有完整的三小時。

              <label className="trial-check-row">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={e => setConfirmed(e.target.checked)}
                />
                <span className="trial-check-label">我了解以上規則，並確認要在此時段開始</span>
              </label>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button className="btn btn-secondary" onClick={() => setStep(2)}>返回修改</button>
              <button
                className="btn btn-primary"
                disabled={!confirmed || saving}
                onClick={handleBook}
              >
                {saving ? '預約中…' : '確認預約體驗課'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Countdown card ──────────────────────────────────────────────────────────
function CountdownCard({ session, onStart }) {
  const { str, ready } = useCountdown(session.scheduledAt)
  const dt = new Date(session.scheduledAt)
  const dateStr = dt.toLocaleDateString('zh-TW', { month:'long', day:'numeric' })
  const timeStr = dt.toLocaleTimeString('zh-TW', { hour:'2-digit', minute:'2-digit' })

  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <div className="card-body" style={{ padding: '40px 32px' }}>
        {ready ? (
          <>
            <div style={{ fontSize: 52, marginBottom: 16 }}>🎬</div>
            <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--gray-900)', marginBottom: 8 }}>
              體驗課現在可以開始了！
            </p>
            <p style={{ fontSize: 14, color: 'var(--gray-500)', marginBottom: 28 }}>
              確認你已準備好完整的三小時，點擊下方按鈕開始課程
            </p>
            <button className="btn btn-primary btn-lg" onClick={onStart}>
              ▶ 開始體驗課
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⏰</div>
            <p style={{ fontSize: 15, color: 'var(--gray-600)', marginBottom: 6 }}>
              預約時間：{dateStr} {timeStr}
            </p>
            <div className="countdown-clock" style={{ margin: '16px 0' }}>{str}</div>
            <p style={{ fontSize: 14, color: 'var(--gray-500)' }}>課程即將開始，請準時上線</p>
          </>
        )}
      </div>
    </div>
  )
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function Trial() {
  const { currentUser } = useAuth()
  const navigate        = useNavigate()

  const [session, setSession]   = useState(null)
  const [progress, setProgress] = useState(null)
  const [loaded, setLoaded]     = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => {
    let cancelled = false

    const run = async () => {
    // Only for basic tier
    if (currentUser.tier !== 'basic') { navigate('/dashboard', { replace: true }); return }
      try {
        setError('')
        const nextSession = await loadTrialSession(currentUser.id)
        if (cancelled) return
        setSession(nextSession)
        setProgress(getTrialProgress(currentUser.id))
      } catch (err) {
        if (!cancelled) setError(err.message || '讀取體驗課預約資料失敗')
      } finally {
        if (!cancelled) setLoaded(true)
      }
    }

    run()
    return () => { cancelled = true }
  }, [currentUser])

  if (!loaded) return null

  // Already completed (shouldn't normally land here since ProtectedRoute allows through)
  if (currentUser.expiresAt || progress?.completed) {
    return (
      <div className="page-content">
        <div className="trial-complete-card" style={{ maxWidth: 560, margin: '0 auto' }}>
          <div className="trial-complete-emoji">🎉</div>
          <div className="trial-complete-title">體驗課已完成！</div>
          <div className="trial-complete-sub">
            你的三個月使用期限已啟用，可以開始學習所有初階課程。
          </div>
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/dashboard/courses')}>
            前往課程 →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page-content trial-booking-page">
      <div className="page-heading trial-booking-hero">
        <h1>預約你的體驗課輔導時段</h1>
        <p>請選擇你方便的日期與時間，我們會依照預約時段安排第一次課程輔導。</p>
      </div>

      {error && (
        <div className="auth-alert error" style={{ marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* Info strip */}
      <div className="trial-info-grid">
        {[
          { icon: '⏱', title: '課程時長', val: '3 小時' },
          { icon: '📅', title: '使用期限', val: '完成當天起 90 天' },
          { icon: '◎', title: '預約狀態', val: session ? '已預約' : '尚未預約' },
        ].map(({ icon, title, val }) => (
          <div key={title} className="card trial-info-card">
            <div className="card-body">
              <div className="trial-info-icon">{icon}</div>
              <div>
                <p className="trial-info-title">{title}</p>
                <p className="trial-info-value">{val}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="trial-booking-grid">
        {!session && (
          <>
            <BookingForm
              userId={currentUser.id}
              onBooked={(nextSession) => {
                setError('')
                setSession(nextSession)
                setProgress(getTrialProgress(currentUser.id))
              }}
              onError={setError}
            />
            <aside className="card trial-note-card">
              <div className="card-body">
                <h2>預約前請注意</h2>
                <ul className="trial-note-list">
                  <li>體驗課輔導時間約 1～4 小時</li>
                  <li>請選擇你可以完整參與的時段</li>
                  <li>預約完成後，系統會保留你的課程觀看期限</li>
                  <li>若需要改期，請提前聯繫客服</li>
                </ul>
              </div>
            </aside>
          </>
        )}
        {session && (
          <CountdownCard
            session={session}
            onStart={() => navigate('/dashboard/trial-player')}
          />
        )}
      </div>
    </div>
  )
}
