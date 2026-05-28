import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  getTrialSession, getTrialProgress,
  saveTrialProgress, completeTrialInStorage,
  TRIAL_DURATION_SEC, getTrialVideoUid, getCFVideos,
} from '../../data/mockData'
import { getPricing } from '../../data/mockData'
import StreamPlayer from '../../components/StreamPlayer'

// ── Lesson scenes over 3 hours ──────────────────────────────────────────────
const SCENES = [
  { at: 0,     bg: '#0f172a', text: '🎬 開場歡迎：自媒體入門完整體驗課' },
  { at: 600,   bg: '#1e3a5f', text: '📱 第一章：自媒體平台生態與選擇策略' },
  { at: 2400,  bg: '#14291f', text: '🎯 第二章：頻道定位與個人品牌建立' },
  { at: 4200,  bg: '#3d1515', text: '📝 第三章：內容企劃與腳本撰寫實戰' },
  { at: 5400,  bg: '#1e1e3d', text: '🔥 第四章：拍攝技巧與後製剪輯入門' },
  { at: 6600,  bg: '#1a1a2e', text: '📊 第五章：演算法操作與觸及率提升' },
  { at: 7800,  bg: '#2d1f00', text: '💰 第六章：多元變現模式完整解析' },
  { at: 9000,  bg: '#1a2e1a', text: '❓ 第七章：實戰案例分析與問題解析' },
  { at: 10200, bg: '#0f172a', text: '✅ 課程結尾：重點回顧與行動計劃' },
]

function fmt(sec) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

export default function TrialPlayer() {
  const { currentUser, updateCurrentUser } = useAuth()
  const navigate = useNavigate()

  // ── Access check ──────────────────────────────────────────────────────────
  const [error, setError]         = useState('')
  const [ready, setReady]         = useState(false)
  const [completed, setCompleted] = useState(false)

  // ── Playback state ────────────────────────────────────────────────────────
  const [currentSec, setCurrentSec] = useState(0)
  const intervalRef                  = useRef(null)
  const latestSec                    = useRef(0) // always up-to-date inside interval

  useEffect(() => {
    if (currentUser.tier !== 'basic') { navigate('/dashboard', { replace: true }); return }

    // Already completed?
    const prog = getTrialProgress(currentUser.id)
    if (currentUser.expiresAt || prog?.completed) {
      setCompleted(true)
      setReady(true)
      return
    }

    // Must have a booked session
    const session = getTrialSession(currentUser.id)
    if (!session) {
      setError('你尚未預約體驗時段，請先完成預約。')
      setReady(true)
      return
    }

    // Must be at or past scheduled time
    if (new Date(session.scheduledAt).getTime() > Date.now()) {
      setError('還沒到你的預約時間，請等到預約時間再進入。')
      setReady(true)
      return
    }

    // Resume from saved progress
    const startSec = prog?.currentSecond || 0
    setCurrentSec(startSec)
    latestSec.current = startSec
    setReady(true)

    // Start playback tick
    intervalRef.current = setInterval(() => {
      latestSec.current += 1
      setCurrentSec(latestSec.current)

      // Auto-save every 10 seconds
      if (latestSec.current % 10 === 0) {
        saveTrialProgress(currentUser.id, latestSec.current, false)
      }

      // Completion
      if (latestSec.current >= TRIAL_DURATION_SEC) {
        clearInterval(intervalRef.current)
        // Mark complete in storage and get new expiresAt
        const newExpiry = completeTrialInStorage(currentUser.id)
        // Update auth context so ProtectedRoute unlocks
        updateCurrentUser({ expiresAt: newExpiry })
        setCompleted(true)
      }
    }, 1000)

    return () => clearInterval(intervalRef.current)
  }, []) // run once on mount

  // ── Prevent right-click on entire page while player is active ─────────────
  useEffect(() => {
    const block = (e) => e.preventDefault()
    document.addEventListener('contextmenu', block)
    return () => document.removeEventListener('contextmenu', block)
  }, [])

  // ── Derived ───────────────────────────────────────────────────────────────
  const progress = Math.min(100, (currentSec / TRIAL_DURATION_SEC) * 100)
  const scene    = [...SCENES].reverse().find(s => currentSec >= s.at) || SCENES[0]
  const remaining = Math.max(0, TRIAL_DURATION_SEC - currentSec)

  if (!ready) return (
    <div className="page-content">
      <p style={{ color: 'var(--gray-400)', fontSize: 14 }}>載入中…</p>
    </div>
  )

  // ── Error screen ──────────────────────────────────────────────────────────
  if (error) return (
    <div className="page-content">
      <div className="card" style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center', padding: '40px 32px' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
        <p style={{ fontSize: 16, color: 'var(--gray-700)', marginBottom: 24 }}>{error}</p>
        <button className="btn btn-primary" onClick={() => navigate('/dashboard/trial')}>
          返回預約頁面
        </button>
      </div>
    </div>
  )

  // ── Completion screen ─────────────────────────────────────────────────────
  if (completed) return (
    <div className="page-content">
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div className="trial-complete-card">
          <div className="trial-complete-emoji">🎉</div>
          <div className="trial-complete-title">恭喜完成體驗課！</div>
          <div className="trial-complete-sub">
            你的<strong>三個月使用期限今天正式開始</strong>。<br />
            立即解鎖 YouTube 頻道與短影音爆紅公式兩門基礎課程，<br />
            開始你的自媒體之旅！
          </div>
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/dashboard/courses')}>
            前往課程 →
          </button>
        </div>

        {/* Upgrade card */}
        <div className="card" style={{ marginTop: 24 }}>
          <div className="card-body" style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <div style={{ fontSize: 40, flexShrink: 0 }}>⭐</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 800, fontSize: 16, color: 'var(--gray-900)', marginBottom: 4 }}>
                查看頂流達人，解鎖完整系統課程
              </p>
              <p style={{ fontSize: 13, color: 'var(--gray-500)', lineHeight: 1.6 }}>
                頂流達人包含完整自媒體獲客系統課程，有效期 1 年。
              </p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/pricing')}>
              查看方案
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  // ── Player ────────────────────────────────────────────────────────────────
  // If a real Cloudflare Stream video is assigned as the trial video, use it.
  const trialVideoUid = getTrialVideoUid()
  const trialCFVideo  = trialVideoUid ? getCFVideos().find(v => v.uid === trialVideoUid) : null

  if (trialCFVideo) {
    const pricing = getPricing()
    const handleCFComplete = () => {
      const newExpiry = completeTrialInStorage(currentUser.id)
      updateCurrentUser({ expiresAt: newExpiry, trialCompletedAt: new Date().toISOString() })
      setCompleted(true)
    }
    return (
      <div className="page-content" style={{ maxWidth: 900 }}>
        <StreamPlayer
          videoUid={trialVideoUid}
          isForced={true}
          expiresInSeconds={TRIAL_DURATION_SEC}
          onComplete={handleCFComplete}
          title="自媒體入門完整體驗課"
        />
      </div>
    )
  }

  // Simulated player (fallback when no CF video assigned)
  return (
    <div className="page-content" style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: 14 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: '#fee2e2', color: '#b91c1c',
          fontSize: 13, fontWeight: 700, padding: '6px 14px', borderRadius: 999,
        }}>
          ⏱ 剩餘 {fmt(remaining)}
          <span style={{ fontSize: 12, fontWeight: 400, color: '#ef4444' }}>
            · 無法暫停或快轉
          </span>
        </span>
      </div>

      <div className="trial-player-outer">
        {/* Video area */}
        <div
          className="trial-video-area"
          style={{ background: scene.bg }}
          onContextMenu={e => e.preventDefault()}
        >
          <div className="trial-video-text">{scene.text}</div>
        </div>

        {/* Title bar */}
        <div className="trial-title-bar">
          <h3>自媒體入門完整體驗課</h3>
          <p>完整三小時課程 · 看完即解鎖初階課程</p>
        </div>

        {/* Control bar */}
        <div className="trial-bar">
          {/* Progress — visual only, no interaction */}
          <div className="trial-progress-track">
            <div className="trial-progress-fill" style={{ width: `${progress}%` }} />
          </div>

          <div className="trial-controls-row">
            <span className="trial-lock-msg">🔒 播放中，無法暫停或快轉</span>
            <span className="trial-time">{fmt(currentSec)} / {fmt(TRIAL_DURATION_SEC)}</span>
          </div>
        </div>
      </div>

      <p style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 10, textAlign: 'right' }}>
        進度每 10 秒自動儲存，中途關閉可從斷點繼續
      </p>
    </div>
  )
}
