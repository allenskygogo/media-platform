import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  getTrialSession, saveTrialSession, getTrialProgress,
  saveTrialProgress, completeTrialInStorage,
  TRIAL_DURATION_SEC, getTrialVideoUid, getCFVideos, getAdvancedOfferStatus,
} from '../../data/mockData'
import { getPricing } from '../../data/mockData'
import { supabase, hasSupabase, allowLocalFallback } from '../../lib/supabase'
import StreamPlayer from '../../components/StreamPlayer'
import { AdvancedOfferBanner } from '../../components/CountdownBanner'

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

function toDateString(value) {
  if (!value) return null
  return String(value).split('T')[0]
}

function toLocalProgress(row) {
  if (!row) return null
  return {
    userId: row.user_id,
    currentSecond: row.current_second || 0,
    completed: row.status === 'completed' || !!row.completed_at,
    completedAt: row.completed_at,
    updatedAt: row.updated_at,
  }
}

async function loadTrialState(userId) {
  if (hasSupabase && supabase) {
    const { data, error } = await supabase
      .from('trial_sessions')
      .select('user_id, scheduled_at, status, current_second, completed_at, updated_at')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) throw error
    return {
      session: data ? { userId: data.user_id, scheduledAt: data.scheduled_at, status: data.status } : null,
      progress: toLocalProgress(data),
    }
  }

  if (allowLocalFallback) {
    return {
      session: getTrialSession(userId),
      progress: getTrialProgress(userId),
    }
  }

  throw new Error('體驗課播放資料服務尚未設定')
}

async function ensureTrialSession(userId) {
  const scheduledAt = new Date().toISOString()
  if (hasSupabase && supabase) {
    const { data, error } = await supabase
      .from('trial_sessions')
      .upsert(
        { user_id: userId, scheduled_at: scheduledAt, status: 'watching' },
        { onConflict: 'user_id' },
      )
      .select('user_id, scheduled_at, status, current_second, completed_at, updated_at')
      .single()

    if (error) throw error
    return {
      session: { userId: data.user_id, scheduledAt: data.scheduled_at, status: data.status },
      progress: toLocalProgress(data),
    }
  }

  if (allowLocalFallback) {
    const existing = getTrialSession(userId)
    if (!existing) {
      saveTrialSession(userId, scheduledAt)
    }
    return {
      session: getTrialSession(userId),
      progress: getTrialProgress(userId),
    }
  }

  throw new Error('體驗課播放資料服務尚未設定')
}

async function saveProgress(userId, currentSecond, completed = false) {
  if (hasSupabase && supabase) {
    const { error } = await supabase
      .from('trial_sessions')
      .update({
        current_second: Math.min(currentSecond, TRIAL_DURATION_SEC),
        status: completed ? 'completed' : 'watching',
        completed_at: completed ? new Date().toISOString() : null,
      })
      .eq('user_id', userId)

    if (error) throw error
    return
  }

  if (allowLocalFallback) {
    saveTrialProgress(userId, currentSecond, completed)
    return
  }

  throw new Error('體驗課播放資料服務尚未設定')
}

async function completeTrial(userId) {
  if (hasSupabase && supabase) {
    const { data, error } = await supabase.rpc('complete_trial_session')
    if (error) throw error
    const row = Array.isArray(data) ? data[0] : data
    return {
      expiresAt: toDateString(row?.expires_at),
      trialCompletedAt: row?.trial_completed_at || new Date().toISOString(),
    }
  }

  if (allowLocalFallback) {
    const expiresAt = completeTrialInStorage(userId)
    return { expiresAt, trialCompletedAt: new Date().toISOString() }
  }

  throw new Error('體驗課完成資料服務尚未設定')
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
    let cancelled = false

    const run = async () => {
    if (currentUser.tier !== 'basic') { navigate('/dashboard', { replace: true }); return }

      try {
        let { session, progress: prog } = await loadTrialState(currentUser.id)

        // Already completed?
        if (currentUser.expiresAt || prog?.completed) {
          if (!cancelled) {
            setCompleted(true)
            setReady(true)
          }
          return
        }

        if (!session) {
          const created = await ensureTrialSession(currentUser.id)
          session = created.session
          prog = created.progress
        }

    // Resume from saved progress
        const startSec = prog?.currentSecond || 0
        if (cancelled) return
        setCurrentSec(startSec)
        latestSec.current = startSec
        setReady(true)

    // Start playback tick
        intervalRef.current = setInterval(() => {
      latestSec.current += 1
      setCurrentSec(latestSec.current)

      // Auto-save every 10 seconds
      if (latestSec.current % 10 === 0) {
            saveProgress(currentUser.id, latestSec.current, false).catch(err => {
              console.error('Trial progress save failed:', err)
            })
      }

      // Completion
      if (latestSec.current >= TRIAL_DURATION_SEC) {
        clearInterval(intervalRef.current)
            completeTrial(currentUser.id)
              .then(({ expiresAt, trialCompletedAt }) => {
                updateCurrentUser({ expiresAt, trialCompletedAt })
                setCompleted(true)
              })
              .catch(err => {
                console.error('Trial completion failed:', err)
                setError('體驗課完成狀態儲存失敗，請聯絡客服。')
              })
      }
        }, 1000)
      } catch (err) {
        if (!cancelled) {
          setError(err.message || '讀取體驗課播放資料失敗')
          setReady(true)
        }
      }
    }

    run()

    return () => {
      cancelled = true
      clearInterval(intervalRef.current)
    }
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
  const advancedOffer = getAdvancedOfferStatus(currentUser)

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
        {advancedOffer.active && <AdvancedOfferBanner offer={advancedOffer} />}
        <div className="trial-complete-card">
          <div className="trial-complete-emoji">🎉</div>
          <div className="trial-complete-title">恭喜完成體驗課！</div>
          <div className="trial-complete-sub">
            你的<strong>三個月使用期限已啟用</strong>。<br />
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
                達人班優惠 $29,800，立即省 1 萬
              </p>
              <p style={{ fontSize: 13, color: 'var(--gray-500)', lineHeight: 1.6 }}>
                可分期辦理。24H 內私訊官方客服 @xgfx，優惠結束後自動消失。
              </p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/dashboard')}>
              查看優惠
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
    const handleCFComplete = async () => {
      try {
        const { expiresAt, trialCompletedAt } = await completeTrial(currentUser.id)
        updateCurrentUser({ expiresAt, trialCompletedAt })
        setCompleted(true)
      } catch (err) {
        console.error('Trial completion failed:', err)
        setError('體驗課完成狀態儲存失敗，請聯絡客服。')
      }
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
