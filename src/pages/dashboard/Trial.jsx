import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  getTrialSession, saveTrialSession,
  getTrialProgress, TRIAL_DURATION_SEC,
} from '../../data/mockData'
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

// ── Booking form (3 steps) ──────────────────────────────────────────────────
function BookingForm({ userId, onBooked }) {
  const [step, setStep]           = useState(1)
  const [date, setDate]           = useState('')
  const [hour, setHour]           = useState(null)
  const [confirmed, setConfirmed] = useState(false)

  const minDate = new Date(Date.now() + 3600 * 1000).toISOString().split('T')[0]
  const endHour = hour !== null ? hour + 3 : null

  const handleBook = () => {
    const scheduledAt = new Date(`${date}T${String(hour).padStart(2,'0')}:00:00`).toISOString()
    saveTrialSession(userId, scheduledAt)
    onBooked()
  }

  return (
    <div className="card">
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
        {step === 1 && (
          <Calendar
            selected={date}
            onChange={d => { setDate(d); setStep(2) }}
            minDate={minDate}
          />
        )}

        {/* Step 2 — Hour */}
        {step === 2 && (
          <div>
            <p style={{ fontSize: 14, color: 'var(--gray-600)', marginBottom: 14 }}>
              {date} — 選擇開始時間
            </p>
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
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 14 }} onClick={() => setStep(1)}>
              ← 返回選日期
            </button>
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
                disabled={!confirmed}
                onClick={handleBook}
              >
                確認預約
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
              試聽課現在可以開始了！
            </p>
            <p style={{ fontSize: 14, color: 'var(--gray-500)', marginBottom: 28 }}>
              確認你已準備好完整的三小時，點擊下方按鈕開始課程
            </p>
            <button className="btn btn-primary btn-lg" onClick={onStart}>
              ▶ 開始試聽課
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

  const load = () => {
    setSession(getTrialSession(currentUser.id))
    setProgress(getTrialProgress(currentUser.id))
  }

  useEffect(() => {
    // Only for basic tier
    if (currentUser.tier !== 'basic') { navigate('/dashboard', { replace: true }); return }
    load()
    setLoaded(true)
  }, [currentUser])

  if (!loaded) return null

  // Already completed (shouldn't normally land here since ProtectedRoute allows through)
  if (currentUser.expiresAt || progress?.completed) {
    return (
      <div className="page-content">
        <div className="trial-complete-card" style={{ maxWidth: 560, margin: '0 auto' }}>
          <div className="trial-complete-emoji">🎉</div>
          <div className="trial-complete-title">試聽課已完成！</div>
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
    <div className="page-content">
      <div className="page-heading">
        <h1>📺 預約你的試聽時段</h1>
        <p>這堂課約 3 小時，請選擇你有完整時間的時段</p>
      </div>

      {/* Info strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 32, maxWidth: 400 }}>
        {[
          { icon: '⏱', title: '課程時長', val: '3 小時（180 分鐘）' },
          { icon: '📅', title: '期限起算', val: '完成當天起 90 天' },
        ].map(({ icon, title, val }) => (
          <div key={title} className="card">
            <div className="card-body" style={{ textAlign: 'center', padding: '20px 16px' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
              <p style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 4 }}>{title}</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--gray-900)' }}>{val}</p>
            </div>
          </div>
        ))}
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        {!session && (
          <BookingForm userId={currentUser.id} onBooked={load} />
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
