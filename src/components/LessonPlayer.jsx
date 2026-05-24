import { useState, useEffect, useRef, useCallback } from 'react'
import {
  getLessonProgress, saveLessonProgress,
  parseDurationToSec, LESSON_DEMO_SPEED,
  getVideoForLesson, getCFVideos,
} from '../data/mockData'
import { getPricing } from '../data/mockData'
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

export default function LessonPlayer({ lesson, courseId, userId, onComplete, onClose }) {
  // ── If a real Cloudflare video is assigned, delegate to StreamPlayer ────
  const cfVideoUid = getVideoForLesson(lesson.id)
  const cfVideo    = cfVideoUid ? getCFVideos().find(v => v.uid === cfVideoUid) : null
  const savedProg  = getLessonProgress(userId, courseId, lesson.id)
  const isFirstWatch = !savedProg?.completed

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
        onComplete={onComplete}
        onClose={onClose}
        title={lesson.title}
      />
    )
  }
  // ── Fallback: simulated player (no CF video assigned) ──────────────────
  const totalSec = parseDurationToSec(lesson.duration)

  const [currentSec, setCurrentSec] = useState(savedProg?.currentSecond || 0)
  const [playing, setPlaying]       = useState(true)   // for free mode
  const [done, setDone]             = useState(false)

  const latestSec  = useRef(savedProg?.currentSecond || 0)
  const intervalRef = useRef(null)

  const advance = useCallback(() => {
    latestSec.current = Math.min(latestSec.current + LESSON_DEMO_SPEED, totalSec)
    setCurrentSec(latestSec.current)
    if (latestSec.current % (10 * LESSON_DEMO_SPEED) === 0) {
      saveLessonProgress(userId, courseId, lesson.id, latestSec.current, false)
    }
    if (latestSec.current >= totalSec) {
      clearInterval(intervalRef.current)
      saveLessonProgress(userId, courseId, lesson.id, totalSec, true)
      setDone(true)
      onComplete()
    }
  }, [courseId, lesson.id, onComplete, totalSec, userId])

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

  // Prevent context menu in forced mode
  useEffect(() => {
    if (!isFirstWatch) return
    const block = e => e.preventDefault()
    document.addEventListener('contextmenu', block)
    return () => document.removeEventListener('contextmenu', block)
  }, [isFirstWatch])

  const progress = totalSec > 0 ? Math.min(100, (currentSec / totalSec) * 100) : 0
  const bgColor  = BG_COLORS[lesson.id % BG_COLORS.length]

  // Free-mode seek: click on progress track
  const handleSeek = (e) => {
    if (isFirstWatch) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const newSec = Math.floor(ratio * totalSec)
    latestSec.current = newSec
    setCurrentSec(newSec)
    saveLessonProgress(userId, courseId, lesson.id, newSec, false)
  }

  return (
    <div className="lesson-player-wrap">
      {/* Top bar */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {isFirstWatch ? (
            <span style={{
              background:'#fee2e2', color:'#b91c1c', borderRadius:999,
              padding:'4px 12px', fontSize:12, fontWeight:700,
              display:'flex', alignItems:'center', gap:6,
            }}>
              🔒 首次觀看 · 無法暫停或快轉
            </span>
          ) : (
            <span style={{
              background:'var(--success-light)', color:'var(--success)', borderRadius:999,
              padding:'4px 12px', fontSize:12, fontWeight:700,
            }}>
              ✅ 重播模式 · 可自由暫停快轉
            </span>
          )}
          <span style={{ fontSize:11, color:'var(--gray-400)' }}>（示範速度 {LESSON_DEMO_SPEED}×）</span>
        </div>
        {onClose && (
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕ 關閉</button>
        )}
      </div>

      <div className="lesson-player-outer">
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
                <span className="lesson-lock-msg">🔒 播放中，無法暫停或快轉</span>
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
    </div>
  )
}
