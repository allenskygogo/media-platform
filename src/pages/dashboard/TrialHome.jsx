import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getSessionBookings, getSessions, getWatchProgress, getAdvancedOfferStatus, getSystemSettings } from '../../data/mockData'
import { IconClock, IconArrow, IconCheck, IconPlay, IconBook, IconAI, IconChart } from '../../components/Icons'
import { AdvancedOfferBanner } from '../../components/CountdownBanner'

function fmtMs(ms) {
  if (ms <= 0) return '00:00:00'
  const h=Math.floor(ms/3600000), m=Math.floor((ms%3600000)/60000), s=Math.floor((ms%60000)/1000)
  return [h,m,s].map(n=>String(n).padStart(2,'0')).join(':')
}
function fmtDate(iso) { if (!iso) return ''; return new Date(iso).toLocaleDateString('zh-TW',{year:'numeric',month:'long',day:'numeric'}) }
function fmtSessionTime(iso) { if (!iso) return ''; return new Date(iso).toLocaleDateString('zh-TW',{month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'}) }
function diffToSession(scheduledAt) {
  const diff = new Date(scheduledAt).getTime() - Date.now()
  if (diff <= 0) return '已開始'
  const days=Math.floor(diff/86400000), hours=Math.floor((diff%86400000)/3600000)
  if (days > 0) return `距離體驗課 ${days} 天 ${hours} 小時`
  return `距離體驗課 ${hours} 小時 ${Math.floor((diff%3600000)/60000)} 分`
}

const HIGHLIGHTS = [
  { Icon: IconPlay,  title:'影音創作核心技術', desc:'從腳本規劃、拍攝技巧到剪輯後製，完整學習自媒體影音製作流程' },
  { Icon: IconChart, title:'社群成長策略',     desc:'掌握 IG、TikTok 演算法，學習吸睛內容策略與穩定漲粉方法' },
  { Icon: IconAI,    title:'AI 工具實戰應用',  desc:'活用 AI 智能助理加速創作效率，讓你的內容產出翻倍' },
]

export default function TrialHome() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const { bgImages } = getSystemSettings()
    if (bgImages?.trial) {
      document.body.style.backgroundImage = `url(${bgImages.trial})`
      document.body.style.backgroundSize  = 'cover'
      document.body.style.backgroundPosition = 'center'
    }
    return () => {
      document.body.style.backgroundImage = ''
      document.body.style.backgroundSize  = ''
      document.body.style.backgroundPosition = ''
    }
  }, [])

  const bookings  = getSessionBookings()
  const myBooking = bookings.find(b => b.userId === currentUser.id)
  const sessions  = getSessions()
  const mySession = myBooking ? sessions.find(s=>String(s.id)===String(myBooking.sessionId)) : null
  const watchProg = mySession ? getWatchProgress(currentUser.id, mySession.id) : null
  const watchPct  = watchProg ? (watchProg.completed ? 100 : Math.min(100,Math.round((watchProg.currentSecond/(mySession?.durationSec||1))*100))) : 0

  const [offerRemaining, setOfferRemaining] = useState(() => { const o=getAdvancedOfferStatus(currentUser); return o.active?o.remainingMs:0 })
  const [offerInfo] = useState(() => getAdvancedOfferStatus(currentUser))

  useEffect(() => {
    if (!offerInfo.active) return
    const id = setInterval(() => { const o=getAdvancedOfferStatus(currentUser); setOfferRemaining(o.active?o.remainingMs:0) }, 1000)
    return () => clearInterval(id)
  }, [offerInfo.active, currentUser])

  const isCompleted = !!currentUser.trialCompletedAt
  const isBooked    = !!myBooking && !isCompleted

  let sessionLabel = '尚未預約', sessionSub = '選擇時段，開始你的體驗課'
  if (isCompleted) { sessionLabel = '體驗已完成'; sessionSub = `完成日期：${fmtDate(currentUser.trialCompletedAt)}` }
  else if (isBooked && mySession) { sessionLabel = fmtSessionTime(mySession.scheduledAt); sessionSub = diffToSession(mySession.scheduledAt) }

  return (
    <div className="th2-page bg-trial">

      {/* Hero */}
      <div className="th2-hero">
        <div className="th2-hero-left">
          <span className="th2-badge">體驗課會員</span>
          <h1 className="th2-name">你好，{currentUser.name}！</h1>

          <div className="th2-session-row">
            {isCompleted ? <IconCheck size={14} stroke="rgba(0,200,120,0.8)" strokeWidth={2}/> : <IconClock size={14} stroke="rgba(100,180,255,0.7)" strokeWidth={1.5}/>}
            <span className="th2-session-text">{sessionLabel}</span>
            {isCompleted && <span className="th2-session-ok">已完成</span>}
          </div>
          <p className="th2-session-sub">{sessionSub}</p>

          <div className="th2-progress-wrap">
            <div className="th2-progress-header">
              <span>體驗課觀看進度</span><span>{watchPct}%</span>
            </div>
            <div className="th2-progress-bar">
              <div className="th2-progress-fill" style={{ width:`${watchPct}%` }}/>
            </div>
          </div>

          <div className="th2-ctas">
            {!isCompleted && !isBooked && (
              <button className="btn btn-primary" onClick={() => navigate('/dashboard/trial')}>
                立即預約時段 <IconArrow size={12}/>
              </button>
            )}
            <button className="th2-outline-btn" onClick={() => navigate('/dashboard/profile')}>
              查看頂流達人 <IconArrow size={12}/>
            </button>
          </div>
        </div>

      </div>

      {offerInfo.active && offerRemaining > 0 && (
        <AdvancedOfferBanner offer={{ ...offerInfo, remainingMs: offerRemaining }} />
      )}

      {/* 3 stat cards */}
      <div className="th2-stats">
        <div className="th2-stat-card">
          <div className="th2-stat-icon"><IconClock size={16} strokeWidth={1.5}/></div>
          <p className="th2-stat-title">體驗課狀態</p>
          <p className="th2-stat-val">{isCompleted?'已完成':isBooked?'已預約':'尚未預約'}</p>
          <p className="th2-stat-sub">{sessionSub}</p>
          {!isCompleted && !isBooked && (
            <button className="th2-stat-btn primary" onClick={() => navigate('/dashboard/trial')}>立即預約 <IconArrow size={11}/></button>
          )}
        </div>
        <div className="th2-stat-card">
          <div className="th2-stat-icon"><IconArrow size={16} strokeWidth={1.5}/></div>
          <p className="th2-stat-title">距離優惠到期</p>
          {offerInfo.active && offerRemaining > 0 ? (
            <>
              <p className="th2-countdown">{fmtMs(offerRemaining)}</p>
              <p className="th2-stat-sub">達人班 $29,800，立即省 1 萬，可分期辦理</p>
              <button className="th2-stat-btn primary" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                私訊 @xgfx <IconArrow size={11}/>
              </button>
            </>
          ) : (
            <>
              <p className="th2-stat-val">完成體驗解鎖</p>
              <p className="th2-stat-sub">完成體驗課後享升級優惠</p>
            </>
          )}
        </div>
        <div className="th2-stat-card">
          <div className="th2-stat-icon"><IconBook size={16} strokeWidth={1.5}/></div>
          <p className="th2-stat-title">頂流達人方案</p>
          <p className="th2-stat-val">$29,800</p>
          <p className="th2-stat-sub">體驗完課 24H 內優惠，立即省 1 萬</p>
          <button className="th2-stat-btn" disabled>即將開放</button>
        </div>
      </div>

      {/* Highlights */}
      <div className="th2-highlights-header">
        <IconBook size={14} stroke="rgba(100,180,255,0.7)" strokeWidth={1.5}/>
        <span className="th2-highlights-title">課程亮點預覽</span>
      </div>
      <div className="th2-highlights">
        {HIGHLIGHTS.map(({ Icon, title, desc }) => (
          <div key={title} className="th2-highlight">
            <div className="th2-highlight-icon"><Icon size={18} strokeWidth={1.5}/></div>
            <div>
              <p className="th2-highlight-title">{title}</p>
              <p className="th2-highlight-desc">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
