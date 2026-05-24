import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  getSessions, getSessionState, initLiveSessions,
  isUserBooked, bookSession, createPrivateSession,
} from '../../data/mockData'
import Calendar from '../../components/Calendar'

const HOURS = Array.from({ length: 15 }, (_, i) => i + 8) // 08:00 – 22:00

function StateLabel({ state }) {
  if (state === 'live')     return <span className="live-badge"><span className="live-dot" />LIVE</span>
  if (state === 'upcoming') return <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>即將開始</span>
  return <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>已結束</span>
}

export default function LiveClasses() {
  const { currentUser } = useAuth()
  const navigate        = useNavigate()

  const [sessions, setSessions] = useState([])
  const [, tick]                = useState(0)       // force re-render every second

  // Private booking flow
  const [showPrivate, setShowPrivate] = useState(false)
  const [step, setStep]               = useState(1) // 1=date 2=time 3=confirm
  const [pvDate, setPvDate]           = useState('')
  const [pvHour, setPvHour]           = useState(null)
  const [pvDone, setPvDone]           = useState(false)

  // Load sessions & tick every second
  useEffect(() => {
    initLiveSessions()
    setSessions(getSessions().filter(s => s.published && !s.isPrivate))
    const t = setInterval(() => tick(n => n + 1), 1000)
    return () => clearInterval(t)
  }, [])

  const refresh = () =>
    setSessions(getSessions().filter(s => s.published && !s.isPrivate))

  const handleBook = (sessionId) => {
    bookSession(currentUser.id, sessionId)
    refresh()
  }

  const handleJoin = (sessionId) => navigate(`/dashboard/live/${sessionId}`)

  const handleCreatePrivate = () => {
    if (!pvDate || pvHour === null) return
    const scheduledAt = new Date(
      `${pvDate}T${String(pvHour).padStart(2, '0')}:00:00`
    ).toISOString()
    const id = createPrivateSession(currentUser.id, scheduledAt)
    setPvDone(true)
    setTimeout(() => navigate(`/dashboard/live/${id}`), 1500)
  }

  const resetPrivate = () => {
    setStep(1); setPvDate(''); setPvHour(null); setPvDone(false)
  }

  // Min date = 1 hour from now
  const minDate = new Date(Date.now() + 3600 * 1000).toISOString().split('T')[0]

  return (
    <div className="page-content">
      <div className="page-heading">
        <h1>📺 模擬直播課</h1>
        <p>同步直播體驗，即時互動聊天室，專屬初階試聽學員</p>
      </div>

      {/* ── Fixed sessions ── */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--gray-800)', marginBottom: 16 }}>
          固定場次
        </h2>

        {sessions.length === 0 && (
          <p style={{ color: 'var(--gray-400)', fontSize: 14 }}>目前沒有排定的場次</p>
        )}

        <div className="session-list">
          {sessions.map(session => {
            const state    = getSessionState(session)
            const booked   = isUserBooked(currentUser.id, session.id)
            const iconBg   = state === 'live'
              ? '#fee2e2' : state === 'upcoming'
              ? 'var(--primary-light)' : 'var(--gray-100)'
            const icon     = state === 'live' ? '📡' : state === 'upcoming' ? '📅' : '✅'

            return (
              <div key={session.id} className={`session-card ${state === 'live' ? 'is-live' : ''}`}>
                <div className="session-state-icon" style={{ background: iconBg }}>
                  {icon}
                </div>

                <div className="session-info">
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                    <StateLabel state={state} />
                    <span className="session-title" style={{ margin: 0 }}>{session.title}</span>
                  </div>
                  <div className="session-meta">
                    <span>🔄 {session.recurrenceDisplay}</span>
                    <span>⏱ {Math.floor(session.durationSec / 60)} 分鐘</span>
                    {booked && state !== 'ended' && (
                      <span style={{ color: 'var(--success)', fontWeight: 600 }}>✓ 已預約</span>
                    )}
                  </div>
                </div>

                <div className="session-actions">
                  {/* LIVE — booked */}
                  {state === 'live' && booked && (
                    <button className="btn btn-sm" style={{ background: '#ef4444', color: '#fff', borderColor: '#ef4444' }}
                      onClick={() => handleJoin(session.id)}>
                      立即加入 →
                    </button>
                  )}
                  {/* LIVE — not booked */}
                  {state === 'live' && !booked && (
                    <span style={{ fontSize: 13, color: 'var(--gray-400)' }}>未預約</span>
                  )}
                  {/* Upcoming — not booked */}
                  {state === 'upcoming' && !booked && (
                    <button className="btn btn-primary btn-sm" onClick={() => handleBook(session.id)}>
                      預約報名
                    </button>
                  )}
                  {/* Upcoming — booked */}
                  {state === 'upcoming' && booked && (
                    <span style={{ fontSize: 13, color: 'var(--success)', fontWeight: 600 }}>✓ 已報名</span>
                  )}
                  {/* Ended — completed → replay */}
                  {state === 'ended' && booked && (
                    <button className="btn btn-secondary btn-sm" onClick={() => handleJoin(session.id)}>
                      觀看回放
                    </button>
                  )}
                  {state === 'ended' && !booked && (
                    <span style={{ fontSize: 13, color: 'var(--gray-400)' }}>已結束</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Private sessions ── */}
      <section style={{ borderTop: '1px solid var(--gray-200)', paddingTop: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--gray-800)' }}>
              自選時段（私人場次）
            </h2>
            <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 4 }}>
              選擇你方便的日期與時間，系統為你建立專屬直播場次
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => { setShowPrivate(p => !p); resetPrivate() }}>
            {showPrivate ? '收起 ↑' : '預約私人場次'}
          </button>
        </div>

        {showPrivate && !pvDone && (
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                {step === 1 ? '選擇日期' : step === 2 ? '選擇開始時間' : '確認場次'}
              </h2>
              <div className="step-dots">
                {[1, 2, 3].map(s => (
                  <div key={s} className={`step-dot ${step >= s ? 'done' : ''}`} />
                ))}
              </div>
            </div>

            <div className="card-body">
              {/* Step 1 — Date */}
              {step === 1 && (
                <Calendar
                  selected={pvDate}
                  onChange={d => { setPvDate(d); setStep(2) }}
                  minDate={minDate}
                />
              )}

              {/* Step 2 — Hour */}
              {step === 2 && (
                <div>
                  <p style={{ fontSize: 14, color: 'var(--gray-600)', marginBottom: 14 }}>
                    {pvDate} — 選擇開始時間
                  </p>
                  <div className="time-grid">
                    {HOURS.map(h => (
                      <button
                        key={h}
                        className={`time-grid-btn ${pvHour === h ? 'sel' : ''}`}
                        onClick={() => { setPvHour(h); setStep(3) }}
                      >
                        {String(h).padStart(2, '0')}:00
                      </button>
                    ))}
                  </div>
                  <button className="btn btn-ghost btn-sm" style={{ marginTop: 14 }}
                    onClick={() => setStep(1)}>
                    ← 返回選日期
                  </button>
                </div>
              )}

              {/* Step 3 — Confirm */}
              {step === 3 && (
                <div style={{ textAlign: 'center', padding: '28px 0' }}>
                  <div style={{ fontSize: 52, marginBottom: 14 }}>📅</div>
                  <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--gray-900)', marginBottom: 6 }}>
                    {pvDate}
                  </p>
                  <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary)', marginBottom: 8 }}>
                    {String(pvHour).padStart(2, '0')}:00 開始
                  </p>
                  <p style={{ fontSize: 14, color: 'var(--gray-500)', marginBottom: 28 }}>
                    私人直播課 · 45 分鐘 · 僅你可見
                  </p>
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                    <button className="btn btn-secondary" onClick={() => setStep(2)}>返回修改</button>
                    <button className="btn btn-primary" onClick={handleCreatePrivate}>確認預約</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {pvDone && (
          <div className="card">
            <div className="card-body" style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 52, marginBottom: 14 }}>✅</div>
              <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--gray-900)' }}>私人場次已建立！</p>
              <p style={{ fontSize: 14, color: 'var(--gray-500)', marginTop: 8 }}>即將跳轉至播放頁面…</p>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
