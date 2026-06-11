import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getTrialProgress, TRIAL_DURATION_SEC, getAdvancedOfferStatus, getSystemSettings } from '../../data/mockData'
import { IconClock, IconArrow, IconCheck, IconPlay, IconBook, IconAI, IconChart } from '../../components/Icons'
import { AdvancedOfferBanner } from '../../components/CountdownBanner'
import ManualPaymentModal from '../../components/ManualPaymentModal'

const ADVANCED_OFFER_PRICE = 29800
const ADVANCED_OFFER_PLAN = '頂流達人班 24H 限時優惠'
const ADVANCED_OFFER_MESSAGE = [
  '你好，我想了解「頂流達人班」升級方案。',
  '優惠價：NT$29,800',
  '優惠內容：體驗完課 24H 內優惠，立即省 1 萬，可分期辦理',
  '我想聯繫官方帳號 @xgfx，請協助我了解付款與開通方式。',
].join('\n')

function fmtMs(ms) {
  if (ms <= 0) return '00:00:00'
  const h=Math.floor(ms/3600000), m=Math.floor((ms%3600000)/60000), s=Math.floor((ms%60000)/1000)
  return [h,m,s].map(n=>String(n).padStart(2,'0')).join(':')
}
function fmtDate(iso) { if (!iso) return ''; return new Date(iso).toLocaleDateString('zh-TW',{year:'numeric',month:'long',day:'numeric'}) }

const HIGHLIGHTS = [
  { Icon: IconPlay,  title:'影音創作核心技術', desc:'從腳本規劃、拍攝技巧到剪輯後製，完整學習自媒體影音製作流程' },
  { Icon: IconChart, title:'社群成長策略',     desc:'掌握 IG、TikTok 演算法，學習吸睛內容策略與穩定漲粉方法' },
  { Icon: IconAI,    title:'AI 工具實戰應用',  desc:'活用 AI 智能助理加速創作效率，讓你的內容產出翻倍' },
]

export default function TrialHome() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

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

  const watchProg = getTrialProgress(currentUser.id)
  const watchPct  = watchProg ? (watchProg.completed ? 100 : Math.min(100,Math.round((watchProg.currentSecond/TRIAL_DURATION_SEC)*100))) : 0

  const [offerRemaining, setOfferRemaining] = useState(() => { const o=getAdvancedOfferStatus(currentUser); return o.active?o.remainingMs:0 })
  const [offerInfo] = useState(() => getAdvancedOfferStatus(currentUser))

  useEffect(() => {
    if (!offerInfo.active) return
    const id = setInterval(() => { const o=getAdvancedOfferStatus(currentUser); setOfferRemaining(o.active?o.remainingMs:0) }, 1000)
    return () => clearInterval(id)
  }, [offerInfo.active, currentUser])

  const isCompleted = !!currentUser.trialCompletedAt

  let sessionLabel = '可開始上課', sessionSub = currentUser.expiresAt ? `效期至：${fmtDate(currentUser.expiresAt)}` : '效期從第一次登入開始計算'
  if (isCompleted) { sessionLabel = '體驗已完成'; sessionSub = `完成日期：${fmtDate(currentUser.trialCompletedAt)}` }

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
            {!isCompleted && (
              <button className="btn btn-primary" onClick={() => navigate('/dashboard/trial-player')}>
                開始體驗課 <IconArrow size={12}/>
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
          <p className="th2-stat-val">{isCompleted?'已完成':'可開始'}</p>
          <p className="th2-stat-sub">{sessionSub}</p>
          {!isCompleted && (
            <button className="th2-stat-btn primary" onClick={() => navigate('/dashboard/trial-player')}>開始上課 <IconArrow size={11}/></button>
          )}
        </div>
        <div className="th2-stat-card">
          <div className="th2-stat-icon"><IconArrow size={16} strokeWidth={1.5}/></div>
          <p className="th2-stat-title">距離優惠到期</p>
          {offerInfo.active && offerRemaining > 0 ? (
            <>
              <p className="th2-countdown">{fmtMs(offerRemaining)}</p>
              <p className="th2-stat-sub">達人班 $29,800，立即省 1 萬，可分期辦理</p>
              <button className="th2-stat-btn primary" onClick={() => setShowUpgradeModal(true)}>
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
          {offerInfo.active && offerRemaining > 0 ? (
            <>
              <p className="th2-stat-val">$29,800</p>
              <p className="th2-stat-sub">體驗完課 24H 內優惠，立即省 1 萬</p>
              <button className="th2-stat-btn primary" onClick={() => setShowUpgradeModal(true)}>
                聯繫官方帳號 @xgfx
              </button>
            </>
          ) : (
            <>
              <p className="th2-stat-val">完成體驗解鎖</p>
              <p className="th2-stat-sub">看完體驗課後，才會顯示 24H 升級優惠</p>
            </>
          )}
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
      {showUpgradeModal && (
        <ManualPaymentModal
          planName={ADVANCED_OFFER_PLAN}
          amount={ADVANCED_OFFER_PRICE}
          title="聯繫官方帳號 @xgfx"
          kicker="Upgrade Contact"
          description="請先複製升級詢問文字，再前往 Line@ 貼給客服，我們會協助說明分期與開通方式。"
          messageLabel="請複製這段文字貼到 Line@"
          customMessage={ADVANCED_OFFER_MESSAGE}
          primaryLabel="複製並前往 Line@"
          onClose={() => setShowUpgradeModal(false)}
        />
      )}
    </div>
  )
}
