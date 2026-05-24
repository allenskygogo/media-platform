import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { callAI, getScriptUsageStatus, bumpScriptUsage } from '../../services/aiService'
import { getAdvancedOfferStatus } from '../../data/mockData'

// ── Feature definitions ───────────────────────────────
const FEATURES = [
  {
    id: 'topics',
    label: '爆款選題生成',
    icon: '🎯',
    desc: '輸入行業，AI 生成 8 個高流量選題',
    placeholder: '例：美食、健身、親子、美妝…',
    inputLabel: '你的行業 / 主題',
    minTier: 'basic',       // basic+ can use
    standardLimit: null,    // no monthly limit
  },
  {
    id: 'script',
    label: '腳本全文生成',
    icon: '📝',
    desc: '輸入選題，AI 生成完整影片腳本',
    placeholder: '例：內向者做美食最大的優勢是什麼',
    inputLabel: '選題 / 主題',
    minTier: 'standard',
    standardLimit: 50,      // 50 times / month for standard
  },
  {
    id: 'shooting',
    label: '拍攝形式推薦',
    icon: '🎬',
    desc: '根據行業推薦最適合的拍攝方式與器材',
    placeholder: '例：美食料理、旅遊探店…',
    inputLabel: '你的內容領域',
    minTier: 'standard',
    standardLimit: null,
  },
  {
    id: 'planning',
    label: '三個月策劃提案',
    icon: '📅',
    desc: 'AI 幫你規劃未來三個月完整內容行事曆',
    placeholder: '例：健身、財經知識、親子日常…',
    inputLabel: '你的內容方向',
    minTier: 'advanced',    // advanced only
    standardPreview: true,  // standard sees blurred preview
  },
  {
    id: 'marketing',
    label: '行銷文案生成',
    icon: '📢',
    desc: '生成標題、圖文文案、限時動態文案',
    placeholder: '例：美妝品牌、線上課程、手作商品…',
    inputLabel: '你的產品 / 服務',
    minTier: 'advanced',
  },
  {
    id: 'livestream',
    label: '直播話術生成',
    icon: '📡',
    desc: '生成開場白、互動話術、引流話術、結尾 CTA',
    placeholder: '例：保養品、料理教學、健身課…',
    inputLabel: '你的直播主題',
    minTier: 'advanced',
  },
]

const TIER_ORDER = { basic: 1, standard: 2, advanced: 3, managed: 4 }
function tierGte(userTier, minTier) {
  return (TIER_ORDER[userTier] || 0) >= (TIER_ORDER[minTier] || 99)
}

// ── Lock overlay ──────────────────────────────────────
function LockOverlay({ feature, userTier, onUpgrade }) {
  const messages = {
    standard: { text: '升級達人班解鎖', sub: '獲得腳本生成、拍攝推薦等進階功能', tier: 'standard' },
    advanced: { text: '升級頂流私塾解鎖', sub: '獲得策劃提案、行銷文案、直播話術等頂級功能', tier: 'advanced' },
  }
  const msg = userTier === 'basic' && feature.minTier === 'standard'
    ? messages.standard
    : messages.advanced

  return (
    <div className="ait-lock-overlay" onClick={onUpgrade}>
      <div className="ait-lock-icon">🔒</div>
      <p className="ait-lock-text">{msg.text}</p>
      <p className="ait-lock-sub">{msg.sub}</p>
      <button className="btn btn-primary btn-sm">立即升級 →</button>
    </div>
  )
}

// ── Upgrade nudge after generation ───────────────────
function UpgradeNudge({ userTier, feature, offerActive }) {
  const navigate = useNavigate()
  if (feature === 'topics' && userTier === 'basic') {
    return (
      <div className="ait-nudge">
        <span className="ait-nudge-icon">✨</span>
        <div>
          <p className="ait-nudge-text">想把這個選題變成完整腳本？</p>
          <p className="ait-nudge-sub">升級達人班，AI 幫你寫好每一個字 →</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/dashboard/profile')}>
          升級達人班
        </button>
      </div>
    )
  }
  if (feature === 'script' && userTier === 'standard') {
    return (
      <div className="ait-nudge">
        <span className="ait-nudge-icon">🚀</span>
        <div>
          <p className="ait-nudge-text">想要 AI 幫你規劃接下來三個月？</p>
          <p className="ait-nudge-sub">升級頂流私塾，完整策劃一鍵生成 →</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/dashboard/profile')}>
          升級頂流私塾
        </button>
      </div>
    )
  }
  return null
}

// ── Result renderer ───────────────────────────────────
function ResultBlock({ feature, result, copied, onCopy }) {
  if (!result) return null

  if (feature === 'topics') {
    return (
      <div className="ait-result-list">
        {result.map((item, i) => (
          <div key={i} className="ait-result-item" onClick={() => onCopy(item, `t${i}`)}>
            <span className="ait-result-num">T{i + 1}</span>
            <span className="ait-result-text">{item}</span>
            <span className={`ait-copy-hint ${copied === `t${i}` ? 'copied' : ''}`}>
              {copied === `t${i}` ? '✓ 已複製' : '複製'}
            </span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="ait-result-text-wrap">
      <button
        className={`ait-copy-btn ${copied === 'main' ? 'copied' : ''}`}
        onClick={() => onCopy(result, 'main')}
      >
        {copied === 'main' ? '✓ 已複製' : '📋 複製全文'}
      </button>
      <pre className="ait-result-pre">{result}</pre>
    </div>
  )
}

// ══════════════════════════════════════════════════════
//  Main Component
// ══════════════════════════════════════════════════════
export default function AITools() {
  const { currentUser } = useAuth()
  const navigate        = useNavigate()
  const userTier        = currentUser?.tier || 'basic'
  const offerStatus     = getAdvancedOfferStatus(currentUser)

  const [activeId,  setActiveId]  = useState('topics')
  const [input,     setInput]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [result,    setResult]    = useState(null)
  const [copied,    setCopied]    = useState('')
  const [error,     setError]     = useState('')
  const [scriptUsage, setScriptUsage] = useState(() =>
    getScriptUsageStatus(currentUser?.id)
  )

  const activeFeature = FEATURES.find(f => f.id === activeId)
  const canUse = tierGte(userTier, activeFeature.minTier)
  const isBlurPreview = !canUse && activeFeature.standardPreview && userTier === 'standard'

  // Check standard monthly script limit
  const overScriptLimit = activeId === 'script'
    && userTier === 'standard'
    && scriptUsage.remaining <= 0

  // Reset result when switching features
  useEffect(() => {
    setResult(null)
    setInput('')
    setError('')
  }, [activeId])

  const handleGenerate = async () => {
    if (!input.trim() || loading) return
    if (!canUse) return
    if (overScriptLimit) { setError('本月使用次數已達上限（50 次）'); return }

    setLoading(true)
    setResult(null)
    setError('')

    try {
      const tierLabel = { basic: 'trial', standard: 'standard', advanced: 'premium' }[userTier] || 'free'
      const data = await callAI(activeId, input.trim(), tierLabel, currentUser?.id)
      setResult(data)

      if (activeId === 'script' && userTier === 'standard') {
        bumpScriptUsage(currentUser.id)
        setScriptUsage(getScriptUsageStatus(currentUser.id))
      }
    } catch (e) {
      setError('生成失敗，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(Array.isArray(text) ? text.join('\n') : text).catch(() => {})
    setCopied(key)
    setTimeout(() => setCopied(''), 2000)
  }

  const handleUpgrade = () => navigate('/dashboard/profile')

  return (
    <div className="ait-shell">
      {/* ── Left sidebar ── */}
      <aside className="ait-sidebar">
        <div className="ait-sidebar-title">AI 功能選單</div>
        {FEATURES.map(f => {
          const unlocked = tierGte(userTier, f.minTier)
          return (
            <button
              key={f.id}
              className={`ait-nav-item ${activeId === f.id ? 'active' : ''} ${!unlocked ? 'locked' : ''}`}
              onClick={() => setActiveId(f.id)}
              title={!unlocked ? '升級解鎖此功能' : ''}
            >
              <span className="ait-nav-icon">{f.icon}</span>
              <span className="ait-nav-label">{f.label}</span>
              {!unlocked && <span className="ait-nav-lock">🔒</span>}
            </button>
          )
        })}
      </aside>

      {/* ── Main area ── */}
      <div className="ait-main">
        <div className="ait-main-header">
          <div>
            <h1 className="ait-main-title">{activeFeature.icon} {activeFeature.label}</h1>
            <p className="ait-main-desc">{activeFeature.desc}</p>
          </div>
          {activeId === 'script' && userTier === 'standard' && (
            <div className="ait-quota-badge">
              本月剩餘 <strong>{scriptUsage.remaining}</strong> / {scriptUsage.limit} 次
            </div>
          )}
          {activeId === 'topics' && userTier === 'advanced' && (
            <div className="ait-quota-badge unlimited">無限次數</div>
          )}
        </div>

        {/* ── Input + Generate ── */}
        <div className={`ait-input-card ${!canUse ? 'ait-input-locked' : ''}`}>
          <label className="ait-input-label">{activeFeature.inputLabel}</label>
          <div className="ait-input-row">
            <input
              className="form-input ait-input"
              placeholder={activeFeature.placeholder}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleGenerate()}
              disabled={!canUse || loading}
            />
            <button
              className="btn btn-primary ait-gen-btn"
              onClick={handleGenerate}
              disabled={!canUse || loading || !input.trim() || overScriptLimit}
            >
              {loading
                ? <span className="ait-typing"><span /><span /><span /></span>
                : '✨ 生成'}
            </button>
          </div>
          {error && <p className="ait-error">{error}</p>}
          {overScriptLimit && (
            <p className="ait-error">本月腳本生成次數已達上限（50 次），下個月自動重置</p>
          )}

          {/* Lock overlay for locked features */}
          {!canUse && (
            <LockOverlay feature={activeFeature} userTier={userTier} onUpgrade={handleUpgrade} />
          )}
        </div>

        {/* ── Loading typing animation ── */}
        {loading && (
          <div className="ait-loading-bar">
            <div className="ait-loading-fill" />
            <p className="ait-loading-text">AI 生成中，請稍候…</p>
          </div>
        )}

        {/* ── Result ── */}
        {result && !loading && (
          <div className={`ait-result-card ${isBlurPreview ? 'ait-result-blurred' : ''}`}>
            <div className="ait-result-header">
              <span className="ait-result-title">生成結果</span>
              {activeId === 'topics' && (
                <button
                  className={`ait-copy-btn ${copied === 'all' ? 'copied' : ''}`}
                  onClick={() => handleCopy(result, 'all')}
                >
                  {copied === 'all' ? '✓ 已複製全部' : '📋 複製全部'}
                </button>
              )}
            </div>

            <ResultBlock
              feature={activeId}
              result={result}
              copied={copied}
              onCopy={handleCopy}
            />

            {isBlurPreview && (
              <div className="ait-blur-lock">
                <p>🔒 升級頂流私塾完整使用此功能</p>
                <button className="btn btn-primary btn-sm" onClick={handleUpgrade}>立即升級</button>
              </div>
            )}
          </div>
        )}

        {/* ── Upgrade nudge ── */}
        {result && !loading && (
          <UpgradeNudge
            userTier={userTier}
            feature={activeId}
            offerActive={offerStatus?.active}
          />
        )}

        {/* ── Offer countdown banner for standard who completed course ── */}
        {result && !loading && userTier === 'standard' && offerStatus?.active && (
          <div className="ait-offer-banner">
            <div>
              <p className="ait-offer-text">🎉 你有達人班完課優惠，限時特惠升級頂流私塾！</p>
              <p className="ait-offer-sub">解鎖三個月策劃 + 行銷文案 + 直播話術，完整 AI 工具全開</p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={handleUpgrade}>查看優惠 →</button>
          </div>
        )}
      </div>
    </div>
  )
}
