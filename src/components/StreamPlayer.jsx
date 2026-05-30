/**
 * StreamPlayer — Cloudflare Stream iframe player.
 *
 * Forced mode (first watch):
 *   • Fetches a signed token from the Worker (token TTL = expiresInSeconds)
 *   • Blocks keyboard shortcuts (Space, ←→ seek, F fullscreen)
 *   • Blocks right-click / context menu
 *   • Auto-resumes when paused
 *   • Resets seeking attempts via the Stream JS SDK
 *   • Marks lesson complete on `ended`
 *
 * Free mode (replay):
 *   • Full player controls, seek and pause allowed
 */

import { useState, useEffect, useRef } from 'react'
import { getSignedToken, buildSignedEmbedUrl } from '../services/streamApi'
import { getCFVideos, getLessonProgress } from '../data/mockData'
import { saveCourseProgressRecord } from '../services/courseProgress'

const STREAM_SDK_URL = 'https://embed.cloudflarestream.com/embed/sdk.latest.js'

// Load the CF Stream JS SDK once per page
let sdkLoaded = false
let sdkCallbacks = []
function loadStreamSdk(cb) {
  if (sdkLoaded) { cb(); return }
  sdkCallbacks.push(cb)
  if (document.querySelector(`script[src="${STREAM_SDK_URL}"]`)) return
  const s = document.createElement('script')
  s.src = STREAM_SDK_URL
  s.onload = () => {
    sdkLoaded = true
    sdkCallbacks.forEach(fn => fn())
    sdkCallbacks = []
  }
  document.head.appendChild(s)
}

// ── Status pill ───────────────────────────────────────────────────────────
function StatusPill({ forced }) {
  if (forced) return (
    <span style={{
      background: '#fee2e2', color: '#b91c1c', borderRadius: 999,
      padding: '4px 14px', fontSize: 12, fontWeight: 700,
      display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
    }}>
      🔒 首次觀看 · 無法暫停或快轉
    </span>
  )
  return (
    <span style={{
      background: 'var(--success-light)', color: 'var(--success)', borderRadius: 999,
      padding: '4px 14px', fontSize: 12, fontWeight: 700, flexShrink: 0,
    }}>
      ✅ 重播模式 · 可自由暫停快轉
    </span>
  )
}

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

export default function StreamPlayer({
  videoUid,          // Cloudflare Stream video UID
  isForced = false,  // true = first-watch (no seek, no pause)
  expiresInSeconds = 10800, // signed token TTL
  // progress tracking (optional — pass when used inside LessonPlayer)
  userId,
  courseId,
  lessonId,
  initialProgress,
  onProgressChange,
  onComplete,
  onClose,
  // display
  title = '',
}) {
  const iframeRef  = useRef(null)
  const wrapRef    = useRef(null)
  const outerRef   = useRef(null)
  const playerRef  = useRef(null)  // CF Stream player object
  const maxRef     = useRef(0)     // max time reached (for seek-block)
  const doneRef    = useRef(false) // video ended
  const lastSavedSecondRef = useRef(0)

  const [status, setStatus] = useState('loading') // 'loading' | 'ready' | 'error'
  const [errMsg, setErrMsg] = useState('')
  const [signedUrl, setSignedUrl] = useState(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isPseudoFullscreen, setIsPseudoFullscreen] = useState(false)
  const [progressError, setProgressError] = useState('')

  const video = getCFVideos().find(v => v.uid === videoUid)
  const savedProgress = userId && courseId && lessonId
    ? (initialProgress || getLessonProgress(userId, courseId, lessonId))
    : null
  const savedSec = userId && courseId && lessonId
    ? (savedProgress?.completed ? 0 : (savedProgress?.currentSecond || 0))
    : 0

  // ── Fetch signed token and build iframe URL ─────────────────────────────
  useEffect(() => {
    if (!video) {
      setErrMsg('找不到影片資訊，請重新整理')
      setStatus('error')
      return
    }
    setStatus('loading')
    getSignedToken(videoUid, expiresInSeconds)
      .then(token => {
        const url = buildSignedEmbedUrl(video.customerSubdomain, token)
        // Append player params
        const params = new URLSearchParams({
          autoplay: 'true',
          preload: 'true',
          // Start from saved position if resuming
          ...(savedSec > 0 ? { startTime: String(savedSec) } : {}),
        })
        setSignedUrl(`${url}?${params}`)
        setStatus('ready')
      })
      .catch(e => {
        setErrMsg(`無法取得播放權限：${e.message}`)
        setStatus('error')
      })
  }, [videoUid]) // eslint-disable-line

  // ── Load Stream SDK + set up player controls ───────────────────────────
  useEffect(() => {
    if (status !== 'ready' || !iframeRef.current) return

    loadStreamSdk(() => {
      if (!iframeRef.current || !window.Stream) return
      const player = window.Stream(iframeRef.current)
      playerRef.current = player

      const persistProgress = (nextSecond, completed = false) => {
        return saveCourseProgressRecord(userId, courseId, lessonId, nextSecond, completed)
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
      }

      // Progress tracking & auto-save
      player.addEventListener('timeupdate', () => {
        const ct = player.currentTime || 0
        const second = Math.floor(ct)
        if (ct > maxRef.current) maxRef.current = ct
        // Auto-save every 10 real seconds
        if (isForced && second > 0 && second >= lastSavedSecondRef.current + 10 && userId && courseId && lessonId) {
          lastSavedSecondRef.current = second
          persistProgress(second, false).catch(() => {})
        }
      })

      // Completion
      player.addEventListener('ended', () => {
        if (doneRef.current) return
        doneRef.current = true
        if (userId && courseId && lessonId) {
          persistProgress(player.duration || 99999, true)
            .then(() => {
              if (isForced) onComplete?.()
            })
            .catch(() => {})
          return
        }
        if (isForced) onComplete?.()
      })

      // Forced-mode controls
      if (isForced) {
        // Block seeking forward
        player.addEventListener('seeked', () => {
          if (player.currentTime > maxRef.current + 2) {
            player.currentTime = maxRef.current
          }
        })
        // Auto-resume on pause
        player.addEventListener('pause', () => {
          if (!doneRef.current) {
            setTimeout(() => player.play().catch(() => {}), 80)
          }
        })
      }
    })

    return () => {
      playerRef.current = null
    }
  }, [status]) // eslint-disable-line

  // ── Keyboard shortcut blocking ─────────────────────────────────────────
  useEffect(() => {
    // In forced mode: block everything. In free mode: block download shortcut only.
    const FORCED_BLOCK  = [' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'f', 'F', 'm', 'M']
    const ALWAYS_BLOCK  = ['s', 'S']  // save-as shortcut

    const handleKey = e => {
      const isModified = e.ctrlKey || e.metaKey || e.altKey
      if (isModified) return // allow Ctrl+R reload etc.
      if (isForced && FORCED_BLOCK.includes(e.key)) {
        e.preventDefault(); e.stopPropagation()
      }
      if (ALWAYS_BLOCK.includes(e.key)) {
        e.preventDefault(); e.stopPropagation()
      }
    }
    document.addEventListener('keydown', handleKey, true)
    return () => document.removeEventListener('keydown', handleKey, true)
  }, [isForced])

  // ── Context menu (right-click) blocking ────────────────────────────────
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const block = e => e.preventDefault()
    el.addEventListener('contextmenu', block)
    return () => el.removeEventListener('contextmenu', block)
  }, [status])

  // ── Fullscreen state ────────────────────────────────────────────────────
  useEffect(() => {
    const sync = () => {
      const active = getFullscreenElement() === outerRef.current
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

    if (getFullscreenElement() === outerRef.current) {
      exitFullscreen()
      return
    }

    const result = requestElementFullscreen(outerRef.current)
    if (result?.catch) {
      result.catch(() => setIsPseudoFullscreen(true))
    } else {
      setIsPseudoFullscreen(true)
    }
  }

  const fullscreenActive = isFullscreen || isPseudoFullscreen

  // ── Render ─────────────────────────────────────────────────────────────
  if (status === 'error') return (
    <div className="stream-error">
      <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
      <p style={{ color: 'var(--gray-700)', marginBottom: 16 }}>{errMsg}</p>
      {onClose && <button className="btn btn-secondary" onClick={onClose}>關閉</button>}
    </div>
  )

  return (
    <div className={`lesson-player-wrap${isPseudoFullscreen ? ' is-pseudo-fullscreen' : ''}`} ref={wrapRef}>
      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <StatusPill forced={isForced} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {status === 'loading' && (
            <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>取得播放權限中…</span>
          )}
          <button
            type="button"
            className="player-fullscreen-btn"
            onClick={toggleFullscreen}
            disabled={status !== 'ready'}
          >
            {fullscreenActive ? '離開全螢幕' : '全螢幕'}
          </button>
          {onClose && (
            <button className="btn btn-ghost btn-sm" onClick={onClose}>✕ 關閉</button>
          )}
        </div>
      </div>

      {/* Player wrapper — overlays prevent interaction in forced mode */}
      <div className="stream-player-outer" ref={outerRef} style={{ position: 'relative' }}>
        {status === 'loading' && (
          <div className="stream-loading-overlay">
            <div style={{ fontSize: 32, marginBottom: 12 }}>🎬</div>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>正在取得安全播放連結…</p>
          </div>
        )}

        {status === 'ready' && signedUrl && (
          <iframe
            ref={iframeRef}
            src={signedUrl}
            title={title || videoUid}
            className="stream-iframe"
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        )}

        {/* Forced-mode overlay: covers the player controls bar to block interaction */}
        {isForced && status === 'ready' && (
          <div className="stream-forced-overlay" title="首次觀看不可暫停或快轉" />
        )}
      </div>

      <p style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 8, textAlign: 'right' }}>
        影片播放由 Cloudflare Stream 安全託管 · 進度每 10 秒自動儲存
      </p>
      {progressError && (
        <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 8, textAlign: 'right' }}>
          {progressError}
        </p>
      )}
    </div>
  )
}
