import { useState, useEffect, useRef, useCallback } from 'react'
import {
  getLessonProgress,
  parseDurationToSec, LESSON_DEMO_SPEED,
  getVideoForLesson, getCFVideos,
} from '../data/mockData'
import { getPricing } from '../data/mockData'
import { saveCourseProgressRecord } from '../services/courseProgress'
import StreamPlayer from './StreamPlayer'

function fmt(sec) {
  const s = Math.max(0, Math.floor(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = s % 60
  return h > 0
    ? `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`
    : `${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`
}

// Simple color palette per lesson position
const BG_COLORS = [
  '#1e3a5f','#14291f','#3d1515','#1e1e3d',
  '#1a1a2e','#2d1f00','#1a2e1a','#0f172a',
]

function getFullscreenElement() {
  return document.fullscreenElement || document.webkitFullscreenElement || null
}

function requestElementFullscreen(el) {
  if (!el) return Promise.reject(new Error('Fullscreen target is missing'))
  if (el.requestFullscreen) return el.requestFullscreen()
  if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen()
  return Promise.reject(new Error('Fullscreen API is not supported'))
}

function exitFullscreen() {
  if (document.exitFullscreen) return document.exitFullscreen()
  if (document.webkitExitFullscreen) return document.webkitExitFullscreen()
}

export default function LessonPlayer({ lesson, courseId, userId, initialProgress, onProgressChange, onComplete, onClose }) {
  // ── If a real Cloudflare video is assigned, delegate to StreamPlayer ────
  const cfVideoUid = getVideoForLesson(lesson.id)
  const cfVideo    = cfVideoUid ? getCFVideos().find(v => v.uid === cfVideoUid) : null
  const savedProg  = initialProgress || getLessonProgress(userId, courseId, lesson.id)
  const isFirstWatch = !savedProg?.completed
  const startSecond = savedProg?.completed ? 0 : (savedProg?.currentSecond || 0)

  if (cfVideo) {
    const pricing = getPricing()
    return (
      <StreamPlayer
        videoUid={cfVideoUid}
        isForced={isFirstWatch}
        expiresInSeconds={(pricing.tokenExpiryHours || 3) * 3600}
        userId={userId}
        courseId={courseId}
        lessonId={lesson.id}
        initialProgress={savedProg}
        onProgressChange={onProgressChange}
        onComplete={onComplete}
        onClose={onClose}
        title={lesson.title}
      />
    )
  }
  // ── Fallback: simulated player (no CF video assigned) ──────────────────
  const totalSec = parseDurationToSec(lesson.duration)

  const [currentSec, setCurrentSec] = useState(startSecond)
  const [playing, setPlaying]       = useState(true)   // for free mode
  const [done, setDone]             = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isPseudoFullscreen, setIsPseudoFullscreen] = useState(false)
  const [progressError, setProgressError] = useState('')

  const latestSec  = useRef(startSecond)
  const intervalRef = useRef(null)
  const playerWrapRef = useRef(null)
  const playerOuterRef = useRef(null)

  const persistProgress = useCallback((nextSecond, completed = false) => {
    return saveCourseProgressRecord(userId, courseId, lesson.id, nextSecond, completed)
      .then(record => {
        setProgressError('')
        onProgressChange?.(record)
        return record
      })
      .catch(err => {
        console.error('Course progress save failed:', err)
        if (completed) setProgressError('進度儲存失敗，請重新整理後再試')
        throw err
      })
  }, [courseId, lesson.id, onProgressChange, userId])

  const advance = useCallback(() => {
    latestSec.current = Math.min(latestSec.current + LESSON_DEMO_SPEED, totalSec)
    setCurrentSec(latestSec.current)
    if (isFirstWatch && latestSec.current % (10 * LESSON_DEMO_SPEED) === 0) {
      persistProgress(latestSec.current, false).catch(() => {})
    }
    if (latestSec.current >= totalSec) {
      clearInterval(intervalRef.current)
      persistProgress(totalSec, true)
        .then(() => {
          setDone(true)
          if (isFirstWatch) onComplete()
        })
        .catch(() => {})
    }
  }, [isFirstWatch, onComplete, persistProgress, totalSec])

  const flushProgress = useCallback(() => {
    if (!userId || !courseId || !lesson?.id || done) return
    const second = Math.max(0, Math.floor(latestSec.current || currentSec || 0))
    if (second <= 0) return
    persistProgress(second, false).catch(() => {})
  }, [courseId, currentSec, done, lesson?.id, persistProgress, userId])

  // Start / pause / stop interval
  useEffect(() => {
    if (done) return
    if (playing) {
      intervalRef.current = setInterval(advance, 1000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [playing, done, advance])

  useEffect(() => {
    const handlePageHide = () => flushProgress()
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushProgress()
    }
    window.addEventListener('pagehide', handlePageHide)
    window.addEventListener('beforeunload', handlePageHide)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      window.removeEventListener('pagehide', handlePageHide)
      window.removeEventListener('beforeunload', handlePageHide)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      flushProgress()
    }
  }, [flushProgress])

  // Prevent context menu in forced mode
  useEffect(() => {
    if (!isFirstWatch) return
    const block = e => e.preventDefault()
    document.addEventListener('contextmenu', block)
    return () => document.removeEventListener('contextmenu', block)
  }, [isFirstWatch])

  useEffect(() => {
    const sync = () => {
      const active = getFullscreenElement() === playerOuterRef.current
      setIsFullscreen(active)
      if (active) setIsPseudoFullscreen(false)
    }
    document.addEventListener('fullscreenchange', sync)
    document.addEventListener('webkitfullscreenchange', sync)
    return () => {
      document.removeEventListener('fullscreenchange', sync)
      document.removeEventListener('webkitfullscreenchange', sync)
    }
  }, [])

  useEffect(() => {
    if (!isPseudoFullscreen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isPseudoFullscreen])

  const toggleFullscreen = () => {
    if (isPseudoFullscreen) {
      setIsPseudoFullscreen(false)
      return
    }

    if (getFullscreenElement() === playerOuterRef.current) {
      exitFullscreen()
      return
    }

    const result = requestElementFullscreen(playerOuterRef.current)
    if (result?.catch) {
      result.catch(() => setIsPseudoFullscreen(true))
    } else {
      setIsPseudoFullscreen(true)
    }
  }

  const progress = totalSec > 0 ? Math.min(100, (currentSec / totalSec) * 100) : 0
  const bgColor  = BG_COLORS[lesson.id % BG_COLORS.length]
  const fullscreenActive = isFullscreen || isPseudoFullscreen

  // Free-mode seek: click on progress track
  const handleSeek = (e) => {
    if (isFirstWatch) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const newSec = Math.floor(ratio * totalSec)
    latestSec.current = newSec
    setCurrentSec(newSec)
  }

  return (
    <div className={`lesson-player-wrap${isPseudoFullscreen ? ' is-pseudo-fullscreen' : ''}`} ref={playerWrapRef}>
      {/* Top bar */}
      <div className="lesson-player-topbar">
        <div className="lesson-player-status-row">
          {isFirstWatch ? (
            <span className="lesson-player-status lesson-player-status-locked">
              🔒 首次觀看 · 可暫停，不可快轉
            </span>
          ) : (
            <span className="lesson-player-status lesson-player-status-replay">
              ✅ 重播模式 · 可自由暫停快轉
            </span>
          )}
          <span style={{ fontSize:11, color:'var(--gray-400)' }}>（示範速度 {LESSON_DEMO_SPEED}×）</span>
        </div>
        <div className="lesson-player-actions">
          <button type="button" className="player-fullscreen-btn" onClick={toggleFullscreen}>
            {fullscreenActive ? '離開全螢幕' : '全螢幕'}
          </button>
          {onClose && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                flushProgress()
                onClose()
              }}
            >
              ✕ 關閉
            </button>
          )}
        </div>
      </div>

      <div className="lesson-player-outer" ref={playerOuterRef}>
        {/* Video area */}
        <div className="lesson-video-area" style={{ background: bgColor }}
          onContextMenu={isFirstWatch ? e => e.preventDefault() : undefined}>
          <div className="lesson-video-text">{lesson.title}</div>
        </div>

        {/* Control bar */}
        <div className="lesson-bar">
          {/* Progress track */}
          <div
            className="lesson-progress-track"
            style={{ cursor: isFirstWatch ? 'not-allowed' : 'pointer' }}
            onClick={handleSeek}
          >
            <div className="lesson-progress-fill" style={{ width:`${progress}%` }} />
          </div>

          <div className="lesson-controls-row">
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              {isFirstWatch ? (
                <>
                  <button
                    style={{ background:'none', border:'none', color:'#fff', fontSize:18, cursor:'pointer', padding:'0 4px' }}
                    onClick={() => setPlaying(p => !p)}
                  >
                    {playing ? '⏸' : '▶'}
                  </button>
                  <span className="lesson-lock-msg">🔒 不可快轉</span>
                </>
              ) : (
                <button
                  style={{ background:'none', border:'none', color:'#fff', fontSize:18, cursor:'pointer', padding:'0 4px' }}
                  onClick={() => setPlaying(p => !p)}
                >
                  {playing ? '⏸' : '▶'}
                </button>
              )}
            </div>
            <span className="lesson-time">{fmt(currentSec)} / {fmt(totalSec)}</span>
          </div>
        </div>
      </div>

      <p style={{ fontSize:12, color:'var(--gray-400)', marginTop:8, textAlign:'right' }}>
        進度每 10 秒自動儲存，重新整理後可從斷點繼續
      </p>
      {progressError && (
        <p style={{ fontSize:12, color:'var(--danger)', marginTop:8, textAlign:'right' }}>
          {progressError}
        </p>
      )}
    </div>
  )
}
