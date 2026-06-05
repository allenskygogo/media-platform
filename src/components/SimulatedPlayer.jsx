import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { getSessionState, getElapsedSec, getWatchProgress, saveWatchProgress } from '../data/mockData'

// ── Lesson scenes (shown as on-screen text at each timestamp) ───────────────
const SCENES = [
  { at: 0,    bg: '#0f172a', text: '🎬 開場：歡迎來到今天的直播課！' },
  { at: 300,  bg: '#1e3a5f', text: '📱 自媒體平台生態完整解析' },
  { at: 600,  bg: '#14291f', text: '🎯 頻道定位與目標受眾策略' },
  { at: 900,  bg: '#3d1515', text: '📝 內容企劃與腳本撰寫實戰' },
  { at: 1200, bg: '#1e1e3d', text: '🔥 演算法運作原理深度解析' },
  { at: 1500, bg: '#1a1a2e', text: '📊 數據分析與成長優化策略' },
  { at: 1800, bg: '#2d1f00', text: '💰 多元變現模式完整解析' },
  { at: 2100, bg: '#1e293b', text: '❓ 學員 Q&A 直播互動時間' },
  { at: 2400, bg: '#0f172a', text: '✅ 重點回顧與課後行動計劃' },
]

// ── Simulated chat content ──────────────────────────────────────────────────
const NAMES = ['小明', '雅婷', '建宏', '思齊', '美玲', '佳慧', '宗翰', '怡君', '士豪', '麗芳', '冠宇', '欣儀']
const MSG_POOL = [
  '太有用了！筆記下來了 📝',
  '請問這個方法適用剛起步的頻道嗎？',
  '感謝老師分享！',
  '這節講得超清楚的 👍',
  '這個觀念真的很重要！',
  '哇原來是這樣運作的',
  '能不能多說一點演算法的部分？',
  '學到了很多，謝謝！',
  '有沒有推薦的工具？',
  '請問要怎麼提高互動率？',
  '這個策略我明天就要用！',
  '老師的案例分析很實用！',
  '收藏了，等等再看一遍',
  '我的頻道就是這個問題！！',
  '請問業配合作怎麼談？',
  '這跟我之前學的完全不同，大開眼界',
]

function rndMsg() {
  return {
    id: Date.now() + Math.random(),
    name: NAMES[Math.floor(Math.random() * NAMES.length)],
    text: MSG_POOL[Math.floor(Math.random() * MSG_POOL.length)],
    ts: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
    isMe: false,
  }
}

function fmt(s) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

// ── Component ───────────────────────────────────────────────────────────────
export default function SimulatedPlayer({ session }) {
  const { currentUser } = useAuth()

  // ── Core state ──
  const [sessionState, setSessionState] = useState(() => getSessionState(session))
  const [liveSec, setLiveSec]           = useState(() => getElapsedSec(session))
  const [completed, setCompleted]       = useState(
    () => getWatchProgress(currentUser.id, session.id)?.completed || false
  )

  // ── Replay state ──
  const [isReplay, setIsReplay]         = useState(false)
  const [replaySec, setReplaySec]       = useState(0)
  const [replayPaused, setReplayPaused] = useState(false)

  // ── UI ──
  const [viewers, setViewers]       = useState(Math.floor(Math.random() * 60) + 25)
  const [chats, setChats]           = useState([rndMsg(), rndMsg(), rndMsg()])
  const [chatInput, setChatInput]   = useState('')
  const [countdownStr, setCountdown]= useState('')
  const chatEndRef                  = useRef(null)

  // ── Countdown tick (upcoming → live transition) ─────────────────────────
  useEffect(() => {
    if (sessionState !== 'upcoming') return
    const tick = () => {
      const diff = Math.max(0, new Date(session.scheduledAt).getTime() - Date.now())
      if (diff < 1000) { setSessionState('live'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setCountdown(
        h > 0
          ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
          : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      )
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [sessionState, session])

  // ── Live tick (sync to wall clock) ────────────────────────────────────────
  useEffect(() => {
    if (sessionState !== 'live' || isReplay) return
    const tick = () => {
      const elapsed = getElapsedSec(session)
      setLiveSec(elapsed)
      if (elapsed >= session.durationSec) {
        setCompleted(true)
        setSessionState('ended')
        saveWatchProgress(currentUser.id, session.id, session.durationSec, true)
      } else if (elapsed % 10 === 0) {
        saveWatchProgress(currentUser.id, session.id, elapsed, false)
      }
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [sessionState, isReplay, session, currentUser.id])

  // ── Viewer count fluctuation ──────────────────────────────────────────────
  useEffect(() => {
    if (sessionState !== 'live') return
    const t = setInterval(
      () => setViewers(v => Math.max(15, v + Math.floor(Math.random() * 9) - 4)),
      4000
    )
    return () => clearInterval(t)
  }, [sessionState])

  // ── Auto-chat (recursive timeout so interval varies) ─────────────────────
  useEffect(() => {
    if (sessionState !== 'live' || isReplay) return
    let tid
    const schedule = () => {
      tid = setTimeout(() => {
        setChats(prev => [...prev.slice(-49), rndMsg()])
        schedule()
      }, Math.random() * 5000 + 2500)
    }
    schedule()
    return () => clearTimeout(tid)
  }, [sessionState, isReplay])

  // ── Auto-scroll chat ──────────────────────────────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chats])

  // ── Replay tick ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isReplay || replayPaused) return
    const t = setInterval(() => {
      setReplaySec(s => {
        if (s >= session.durationSec) { setReplayPaused(true); return session.durationSec }
        return s + 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [isReplay, replayPaused, session.durationSec])

  // ── Derived values ────────────────────────────────────────────────────────
  const displaySec = isReplay ? replaySec : liveSec
  const progress   = Math.min(100, (displaySec / session.durationSec) * 100)
  const scene      = [...SCENES].reverse().find(s => displaySec >= s.at) || SCENES[0]
  const isLive     = sessionState === 'live' && !isReplay
  const remaining  = Math.max(0, session.durationSec - displaySec)

  // ── Handlers ─────────────────────────────────────────────────────────────
  const startReplay = () => { setIsReplay(true); setReplaySec(0); setReplayPaused(false) }
  const exitReplay  = () => setIsReplay(false)

  const sendChat = (e) => {
    e.preventDefault()
    if (!chatInput.trim()) return
    setChats(prev => [
      ...prev.slice(-49),
      {
        id: Date.now(), name: currentUser.name, text: chatInput.trim(),
        ts: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
        isMe: true,
      },
    ])
    setChatInput('')
  }

  const showChat = isLive || isReplay

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="player-page">
      {/* ── Left: player stack ── */}
      <div>
        {/* Countdown card (shown ABOVE player when upcoming) */}
        {sessionState === 'upcoming' && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-body countdown-wrap">
              <div style={{ fontSize: 40, marginBottom: 12 }}>⏰</div>
              <div className="countdown-clock">{countdownStr}</div>
              <div className="countdown-label">直播即將開始，請稍候…</div>
            </div>
          </div>
        )}

        {/* Player wrapper */}
        <div className="player-wrap">
          {/* Video area */}
          <div className="video-sim" style={{ background: scene.bg }}>
            {/* Overlays */}
            <div className="video-overlays">
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {isLive && (
                  <span className="live-badge">
                    <span className="live-dot" />LIVE
                  </span>
                )}
                {isReplay && (
                  <span style={{
                    background: 'rgba(0,0,0,0.6)', color: '#94a3b8',
                    fontSize: 11, fontWeight: 700, padding: '2px 8px',
                    borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.08em',
                  }}>
                    重播
                  </span>
                )}
              </div>
              {isLive && (
                <div className="viewer-pill">
                  <span>👁</span>
                  <span>{viewers}</span>
                </div>
              )}
            </div>

            {/* Scene text */}
            <div className="video-scene-text">{scene.text}</div>

            {/* Remaining time strip (live only) */}
            {isLive && (
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                background: 'rgba(0,0,0,0.5)', color: 'rgba(255,255,255,0.8)',
                fontSize: 12, padding: '6px 14px', textAlign: 'right',
              }}>
                剩餘 {fmt(remaining)}
              </div>
            )}

            {/* Completion overlay */}
            {completed && !isReplay && (
              <div className="completion-overlay">
                <div style={{ fontSize: 52 }}>🎉</div>
                <div className="completion-title">恭喜完成直播課！</div>
                <div className="completion-sub">
                  你已成功完成本次直播課程<br />
                  準備好迎接下一個階段了嗎？
                </div>
                <div className="completion-btns">
                  <button className="btn btn-primary" onClick={startReplay}>▶ 重新回放</button>
                  <button
                    className="btn btn-outline"
                    style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.08)' }}
                    disabled
                  >
                    即將開放
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Title bar */}
          <div className="player-title-bar">
            <h3>{session.title}</h3>
            <p>{session.recurrenceDisplay} · 共 {Math.floor(session.durationSec / 60)} 分鐘</p>
          </div>

          {/* Control bar */}
          <div className="player-bar">
            {/* Progress track */}
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
              {/* Seek input — enabled only in replay */}
              <input
                type="range"
                className="progress-seek"
                min={0}
                max={session.durationSec}
                value={displaySec}
                disabled={!isReplay}
                onChange={e => isReplay && setReplaySec(Number(e.target.value))}
              />
            </div>

            {/* Controls row */}
            <div className="player-controls-row">
              {isReplay ? (
                <>
                  <button
                    className="player-ctrl-btn"
                    onClick={() => setReplayPaused(p => !p)}
                    title={replayPaused ? '播放' : '暫停'}
                  >
                    {replayPaused ? '▶' : '⏸'}
                  </button>
                  <button
                    className="player-ctrl-btn"
                    style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}
                    onClick={exitReplay}
                  >
                    ✕ 退出重播
                  </button>
                </>
              ) : isLive ? (
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                  直播進行中，無法暫停或快轉
                </span>
              ) : null}

              <span className="player-spacer" />
              <span className="player-time">
                {fmt(displaySec)} / {fmt(session.durationSec)}
              </span>
            </div>
          </div>
        </div>

        {/* Post-ended actions (completed, not in replay) */}
        {completed && !isReplay && sessionState === 'ended' && (
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button className="btn btn-primary" onClick={startReplay}>▶ 回放課程</button>
            <button className="btn btn-secondary" disabled>
              即將開放
            </button>
          </div>
        )}

        {/* Ended but not completed (shouldn't normally happen — access guard) */}
        {sessionState === 'ended' && !completed && !isReplay && (
          <div className="card" style={{ marginTop: 14, textAlign: 'center', padding: 28 }}>
            <p style={{ color: 'var(--gray-500)' }}>
              本場次已結束，回放僅供完課學員使用
            </p>
          </div>
        )}
      </div>

      {/* ── Right: chat panel ── */}
      {showChat && (
        <div className="chat-panel">
          <div className="chat-header">
            💬 直播聊天室
            {isReplay && (
              <span style={{ fontSize: 12, color: 'var(--gray-400)', fontWeight: 400 }}>
                （回放中）
              </span>
            )}
          </div>

          <div className="chat-messages">
            {chats.map(msg => (
              <div key={msg.id} className={`chat-msg ${msg.isMe ? 'chat-msg-mine' : ''}`}>
                <span className="chat-msg-name">{msg.name}</span>
                {msg.text}
                <span className="chat-msg-time">{msg.ts}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {isLive && (
            <form className="chat-input-row" onSubmit={sendChat}>
              <input
                className="chat-input"
                placeholder="輸入訊息，按 Enter 送出…"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
              />
              <button type="submit" className="btn btn-primary btn-sm">送出</button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
