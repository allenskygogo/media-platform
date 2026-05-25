import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  callAI,
  getScriptUsageStatus,
  bumpScriptUsage,
  savePracticeSubmission,
} from '../../services/aiService'
import { getAdvancedOfferStatus } from '../../data/mockData'

// ── Feature definitions ───────────────────────────────
const FEATURES = [
  {
    id: 'topics',
    label: '爆款選題生成',
    icon: '🎯',
    desc: '輸入行業，AI 生成 8 個高流量選題',
    subtitle: '每個選題都是爆款公式提煉',
    placeholder: '例：美食、健身、親子、美妝…',
    inputLabel: '你的行業 / 主題',
    minTier: 'basic',
    unlockLabel: null,
  },
  {
    id: 'script',
    label: '腳本全文生成',
    icon: '📝',
    desc: '輸入選題，AI 生成完整影片腳本',
    subtitle: '鉤子 · 主體 · CTA 三段結構',
    placeholder: '例：內向者做美食最大的優勢是什麼',
    inputLabel: '選題 / 主題',
    minTier: 'standard',
    unlockLabel: '達人班解鎖',
    standardLimit: 50,
  },
  {
    id: 'shooting',
    label: '拍攝形式推薦',
    icon: '🎬',
    desc: '根據行業推薦最適合的拍攝方式與器材',
    subtitle: '找到最省錢、最高完播的拍法',
    placeholder: '例：美食料理、旅遊探店…',
    inputLabel: '你的內容領域',
    minTier: 'standard',
    unlockLabel: '達人班解鎖',
  },
  {
    id: 'planning',
    label: '三個月策劃提案',
    icon: '📅',
    desc: 'AI 幫你規劃未來三個月完整內容行事曆',
    subtitle: '從 0 到 1000 粉的完整路線圖',
    placeholder: '例：健身、財經知識、親子日常…',
    inputLabel: '你的內容方向',
    minTier: 'advanced',
    unlockLabel: '頂流私塾解鎖',
    standardPreview: true,
  },
  {
    id: 'marketing',
    label: '行銷文案生成',
    icon: '📢',
    desc: '生成標題、圖文文案、限時動態文案',
    subtitle: '讓每一個字都有帶貨力',
    placeholder: '例：美妝品牌、線上課程、手作商品…',
    inputLabel: '你的產品 / 服務',
    minTier: 'advanced',
    unlockLabel: '頂流私塾解鎖',
  },
  {
    id: 'livestream',
    label: '直播話術生成',
    icon: '📡',
    desc: '生成開場白、互動話術、引流話術、結尾 CTA',
    subtitle: '讓直播間留人、互動、轉化',
    placeholder: '例：保養品、料理教學、健身課…',
    inputLabel: '你的直播主題',
    minTier: 'advanced',
    unlockLabel: '頂流私塾解鎖',
  },
]

// ── Script types ──────────────────────────────────────
const SCRIPT_TYPES = [
  { id: 'knowledge', icon: '📚', label: '教知識' },
  { id: 'opinion',   icon: '💬', label: '說觀點' },
  { id: 'story',     icon: '📖', label: '說故事' },
  { id: 'process',   icon: '🎬', label: '曬過程' },
]

// ── Element tag colours ───────────────────────────────
const ELEMENT_COLORS = {
  '奇葩':   '#9333ea',
  '人群':   '#3b82f6',
  '懷舊':   '#f97316',
  '最差':   '#ef4444',
  '頭牌':   '#f59e0b',
  '荷爾蒙': '#ec4899',
  '反差':   '#06b6d4',
  '成本':   '#22c55e',
}

// ── Step-loading messages ─────────────────────────────
const LOADING_STEPS = [
  '🔍 分析行業關鍵字…',
  '📊 匹配爆款公式…',
  '✍️ 生成內容框架…',
  '🎯 優化流量潛力…',
  '✅ 完成生成！',
]

// ── Course links ──────────────────────────────────────
const COURSE_LINKS = {
  topics:     { icon: '🎯', title: '爆款選題密碼',   desc: '學習如何找出高流量選題的底層邏輯' },
  script:     { icon: '📝', title: '腳本寫作公式',   desc: '掌握讓觀眾看完不跳走的腳本結構' },
  shooting:   { icon: '🎬', title: '拍攝技術入門',   desc: '手機就能拍出高質感影片的完整方法' },
  planning:   { icon: '📅', title: '帳號成長策略',   desc: '頭部創作者不說的帳號起號路線' },
  marketing:  { icon: '📢', title: '行銷文案密碼',   desc: '讓每一個字都有帶貨力' },
  livestream: { icon: '📡', title: '直播帶貨技術',   desc: '從冷啟動到穩定帶貨的直播方法論' },
}

// ── Upgrade plans for Modal ───────────────────────────
const UPGRADE_PLANS = [
  { id: 'basic',    name: '試聽課',   price: '$399',     period: '90 天' },
  { id: 'standard', name: '達人班',   price: '$39,800',  period: '1 年' },
  { id: 'advanced', name: '頂流私塾', price: '$128,000', period: '1 年' },
]

// ── Tier helpers ──────────────────────────────────────
const TIER_ORDER = { basic: 1, standard: 2, advanced: 3, managed: 4 }
function tierGte(userTier, minTier) {
  return (TIER_ORDER[userTier] || 0) >= (TIER_ORDER[minTier] || 99)
}

function extractElement(text) {
  const m = text.match(/^【(.+?)】/)
  return m ? m[1] : null
}

// ══════════════════════════════════════════════════════
//  Sub-components
// ══════════════════════════════════════════════════════

function StatsBar() {
  return (
    <div className="ait-stats-bar">
      <div className="ait-stats-item">
        <span className="ait-stats-num">1,200+</span>
        <span className="ait-stats-label">創作者使用</span>
      </div>
      <div className="ait-stats-divider" />
      <div className="ait-stats-item">
        <span className="ait-stats-num">50,000+</span>
        <span className="ait-stats-label">爆款選題生成</span>
      </div>
      <div className="ait-stats-divider" />
      <div className="ait-stats-item">
        <span className="ait-stats-num">2.3 萬</span>
        <span className="ait-stats-label">平均選題觀看</span>
      </div>
    </div>
  )
}

function ElementTags() {
  return (
    <div className="ait-element-tags">
      {Object.entries(ELEMENT_COLORS).map(([tag, color]) => (
        <span
          key={tag}
          className="ait-element-tag"
          style={{ background: color + '22', color, borderColor: color + '44' }}
        >
          {tag}
        </span>
      ))}
    </div>
  )
}

// ── Topic card with checkbox ──────────────────────────
function TopicCard({ topic, index, checked, onCheck, checkDisabled }) {
  const element = extractElement(topic)
  const color   = element ? (ELEMENT_COLORS[element] || '#6b7280') : '#6b7280'
  const text    = topic.replace(/^【.+?】/, '').trim()

  return (
    <div
      className={`ait-topic-card ${checked ? 'ait-topic-selected' : ''} ${checkDisabled && !checked ? 'ait-topic-disabled' : ''}`}
      style={{ animationDelay: `${index * 0.12}s` }}
      onClick={() => onCheck(index)}
    >
      {/* Checkbox */}
      <span
        className={`ait-topic-checkbox ${checked ? 'checked' : ''} ${checkDisabled && !checked ? 'disabled' : ''}`}
        onClick={e => { e.stopPropagation(); onCheck(index) }}
      >
        {checked && '✓'}
      </span>

      {element && (
        <span
          className="ait-topic-element"
          style={{ background: color + '22', color, borderColor: color + '44' }}
        >
          {element}
        </span>
      )}
      <span className="ait-topic-text">{text}</span>
      <div className="ait-topic-right">
        <span className="ait-topic-flow">預估流量：高</span>
      </div>
    </div>
  )
}

// ── Script type selector ──────────────────────────────
function ScriptTypeSelector({ checkedCount, scriptType, onSelect, loading }) {
  if (checkedCount === 0) return null
  return (
    <div className="ait-script-type-selector">
      <div className="ait-script-type-header">
        <span className="ait-script-type-title">
          已選 <strong>{checkedCount}</strong> 個選題，請選擇腳本類型
        </span>
      </div>
      <div className="ait-script-type-grid">
        {SCRIPT_TYPES.map(t => (
          <button
            key={t.id}
            className={`ait-script-type-card ${scriptType === t.id ? 'selected' : ''}`}
            onClick={() => onSelect(t.id)}
            disabled={loading}
          >
            <span className="ait-script-type-icon">{t.icon}</span>
            <span className="ait-script-type-label">{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Script preview ────────────────────────────────────
function ScriptPreview({ script, userTier, onUpgrade }) {
  if (!script) return null

  // ── Basic (trial) users: 2 lines visible, rest blurred ──
  if (userTier === 'basic') {
    const nonEmpty    = script.split('\n').filter(l => l.trim())
    const visible     = nonEmpty.slice(0, 2)
    const blurred     = nonEmpty.slice(2)

    return (
      <div className="ait-script-preview">
        <div className="ait-script-preview-header">
          <span>📝 腳本預覽</span>
          <span className="ait-script-type-badge trial">試聽預覽</span>
        </div>
        <div className="ait-script-section">
          <div className="ait-script-hook">{visible.join('\n')}</div>
        </div>
        {blurred.length > 0 && (
          <div className="ait-script-basic-blur">
            <div className="ait-script-basic-blur-content">
              <div className="ait-script-hook" style={{ userSelect: 'none', pointerEvents: 'none' }}>
                {blurred.join('\n')}
              </div>
            </div>
            <div className="ait-script-basic-overlay">
              <p className="ait-script-basic-overlay-text">升級達人班查看完整腳本</p>
              <button className="btn btn-primary btn-sm" onClick={onUpgrade}>
                立即升級
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Standard+ users: section-based, blur advanced-only content ──
  const sections = []
  const lines    = script.split('\n')
  let cur        = null

  lines.forEach(line => {
    if (line.startsWith('【') && line.includes('】')) {
      if (cur) sections.push(cur)
      cur = { heading: line, body: [] }
    } else if (cur) {
      cur.body.push(line)
    } else {
      cur = { heading: '', body: [line] }
    }
  })
  if (cur) sections.push(cur)

  const visible   = sections.slice(0, 2)
  const blurred   = sections.slice(2)
  const canSeeAll = tierGte(userTier, 'standard')

  return (
    <div className="ait-script-preview">
      <div className="ait-script-preview-header">
        <span>📝 腳本預覽</span>
        <span className="ait-script-type-badge">完整腳本</span>
      </div>

      {visible.map((sec, i) => (
        <div key={i} className="ait-script-section">
          {sec.heading && <div className="ait-script-section-label">{sec.heading}</div>}
          <div className="ait-script-hook">{sec.body.join('\n')}</div>
        </div>
      ))}

      {blurred.length > 0 && (
        canSeeAll ? (
          blurred.map((sec, i) => (
            <div key={i} className="ait-script-section">
              {sec.heading && <div className="ait-script-section-label">{sec.heading}</div>}
              <div className="ait-script-hook">{sec.body.join('\n')}</div>
            </div>
          ))
        ) : (
          <div className="ait-script-blur-wrap">
            <div className="ait-script-blur-content">
              {blurred.map((sec, i) => (
                <div key={i} className="ait-script-section" style={{ pointerEvents: 'none' }}>
                  {sec.heading && <div className="ait-script-section-label">{sec.heading}</div>}
                  <div className="ait-script-hook">{sec.body.join('\n')}</div>
                </div>
              ))}
            </div>
            <div className="ait-script-blur-gradient" />
            <div className="ait-script-blur-cta">
              <p className="ait-script-lock-card">🔒 升級達人班，解鎖完整腳本生成功能</p>
              <button className="btn btn-primary btn-sm" onClick={onUpgrade}>
                立即升級達人班 →
              </button>
            </div>
          </div>
        )
      )}
    </div>
  )
}

// ── Upgrade Modal ─────────────────────────────────────
function UpgradeModal({ userTier, onClose }) {
  return (
    <>
      {/* Backdrop */}
      <div className="upgrade-modal-backdrop" onClick={onClose} />

      {/* Modal */}
      <div className="upgrade-modal">
        <button className="upgrade-modal-close" onClick={onClose} aria-label="關閉">✕</button>
        <div className="upgrade-modal-title">選擇升級方案</div>
        <p className="upgrade-modal-sub">解鎖更多 AI 功能，加速你的創作成長</p>

        <div className="upgrade-modal-plans">
          {UPGRADE_PLANS.map(plan => {
            const isCurrent = plan.id === userTier
            return (
              <div
                key={plan.id}
                className={`upgrade-plan-card ${isCurrent ? 'current' : ''} ${plan.id === 'advanced' ? 'featured' : ''}`}
              >
                {plan.id === 'advanced' && !isCurrent && (
                  <div className="upgrade-plan-popular">推薦</div>
                )}
                {isCurrent && (
                  <div className="upgrade-plan-current-badge">目前方案</div>
                )}
                <div className="upgrade-plan-name">{plan.name}</div>
                <div className="upgrade-plan-price">{plan.price}</div>
                <div className="upgrade-plan-period">{plan.period}</div>
                {!isCurrent && (
                  <button className={`upgrade-plan-btn ${plan.id === 'advanced' ? 'featured' : ''}`}>
                    立即升級
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

// ── Practice block ────────────────────────────────────
function PracticeBlock({ feature, onSubmit, submitted }) {
  const isScript = feature === 'script'
  const [fields, setFields] = useState(
    isScript ? { hook: '', body: '', cta: '' } : { practice: '' }
  )

  if (submitted) {
    return (
      <div className="ait-practice-submitted">
        <span>✅</span>
        <span className="ait-practice-submitted-text">練習已提交！已解鎖下載與複製權限</span>
      </div>
    )
  }

  const canSubmit = isScript
    ? (fields.hook || '').length >= 20 && (fields.body || '').length >= 50 && (fields.cta || '').length >= 20
    : (fields.practice || '').length >= 50

  const handleSubmit = () => {
    if (!canSubmit) return
    onSubmit(isScript ? { ...fields } : { practice: fields.practice })
  }

  return (
    <div className="ait-practice-block">
      <div className="ait-practice-header">
        <span className="ait-practice-title">✍️ 練習作業</span>
      </div>
      <p className="ait-practice-desc">
        {isScript
          ? '根據 AI 生成的腳本，用自己的話重新寫一遍，完成後即可下載'
          : '選一個你喜歡的選題，用自己的話說明你會怎麼拍這支影片（至少 50 字），完成後即可下載'}
      </p>
      <div className="ait-practice-fields">
        {isScript ? (
          <>
            <div>
              <label className="ait-practice-label">你的鉤子（前 3 秒，至少 20 字）</label>
              <textarea className="ait-practice-input" rows={2} placeholder="寫下你的開場鉤子…"
                value={fields.hook} onChange={e => setFields(f => ({ ...f, hook: e.target.value }))} />
              <span className="ait-char-count">{fields.hook.length} / 20+ 字</span>
            </div>
            <div>
              <label className="ait-practice-label">你的主體內容（至少 50 字）</label>
              <textarea className="ait-practice-input" rows={4} placeholder="寫下你的主要內容…"
                value={fields.body} onChange={e => setFields(f => ({ ...f, body: e.target.value }))} />
              <span className="ait-char-count">{fields.body.length} / 50+ 字</span>
            </div>
            <div>
              <label className="ait-practice-label">你的結尾 CTA（至少 20 字）</label>
              <textarea className="ait-practice-input" rows={2} placeholder="寫下你的行動呼籲…"
                value={fields.cta} onChange={e => setFields(f => ({ ...f, cta: e.target.value }))} />
              <span className="ait-char-count">{fields.cta.length} / 20+ 字</span>
            </div>
          </>
        ) : (
          <div>
            <label className="ait-practice-label">你的練習（至少 50 字）</label>
            <textarea className="ait-practice-input" rows={5} placeholder="選一個選題，說說你會怎麼拍這支影片…"
              value={fields.practice} onChange={e => setFields(f => ({ ...f, practice: e.target.value }))} />
            <span className="ait-char-count">{fields.practice.length} / 50+ 字</span>
          </div>
        )}
        <button className="btn btn-primary" onClick={handleSubmit} disabled={!canSubmit}>
          提交練習，解鎖下載 →
        </button>
      </div>
    </div>
  )
}

function CourseCard({ feature }) {
  const navigate = useNavigate()
  const course   = COURSE_LINKS[feature]
  if (!course) return null
  return (
    <div className="ait-course-card" onClick={() => navigate('/dashboard/courses')}>
      <div className="ait-course-icon">{course.icon}</div>
      <div className="ait-course-content">
        <div className="ait-course-title">📚 配套課程：{course.title}</div>
        <div className="ait-course-desc">{course.desc}</div>
      </div>
      <span style={{ color: 'var(--gray-400)', fontSize: 20, flexShrink: 0 }}>›</span>
    </div>
  )
}

function DownloadBtn({ content, feature, unlocked }) {
  const handleDownload = () => {
    if (!unlocked) return
    const text = Array.isArray(content) ? content.join('\n') : (content || '')
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `${feature}_AI生成_${new Date().toLocaleDateString('zh-TW')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <div className="ait-download-row">
      <button
        className={`ait-download-btn ${unlocked ? 'unlocked' : 'locked'}`}
        onClick={handleDownload}
        disabled={!unlocked}
      >
        {unlocked ? '⬇️ 下載 .txt 檔案' : '🔒 完成練習後解鎖下載'}
      </button>
    </div>
  )
}

// ══════════════════════════════════════════════════════
//  Main Component
// ══════════════════════════════════════════════════════
export default function AITools() {
  const { currentUser } = useAuth()
  const userTier        = currentUser?.tier || 'basic'
  const offerStatus     = getAdvancedOfferStatus(currentUser)

  // Copy-permission tiers
  const canCopyDirectly = userTier === 'managed'
  const needsPractice   = userTier === 'standard' || userTier === 'advanced'
  const viewOnly        = userTier === 'basic'

  const [activeId,          setActiveId]          = useState('topics')
  const [input,             setInput]             = useState('')
  const [loading,           setLoading]           = useState(false)
  const [scriptLoading,     setScriptLoading]     = useState(false)
  const [loadStep,          setLoadStep]          = useState(-1)
  const [result,            setResult]            = useState(null)
  const [resultKey,         setResultKey]         = useState(0)
  const [error,             setError]             = useState('')

  // ── Topic selection (Phase 4 checkboxes) ──
  const [checkedTopics,     setCheckedTopics]     = useState([])   // array of indices
  const [maxWarning,        setMaxWarning]        = useState(false)
  const [scriptType,        setScriptType]        = useState(null) // selected script type id
  const [scriptPreview,     setScriptPreview]     = useState(null)

  // ── Practice ──
  const [practiceSubmitted, setPracticeSubmitted] = useState(false)
  const [practiceUnlocked,  setPracticeUnlocked]  = useState(false)
  const [showSuccess,       setShowSuccess]       = useState(false)

  // ── Upgrade modal ──
  const [showUpgradeModal,  setShowUpgradeModal]  = useState(false)

  const [scriptUsage,       setScriptUsage]       = useState(() =>
    getScriptUsageStatus(currentUser?.id)
  )

  const activeFeature   = FEATURES.find(f => f.id === activeId)
  const canUse          = tierGte(userTier, activeFeature.minTier)
  const isBlurPreview   = !canUse && activeFeature.standardPreview && userTier === 'standard'
  const overScriptLimit = activeId === 'script' && userTier === 'standard' && scriptUsage.remaining <= 0

  const canCopyAfterPractice = needsPractice && practiceUnlocked
  const canCopy              = canCopyDirectly || canCopyAfterPractice

  // Reset when feature changes
  useEffect(() => {
    setResult(null)
    setInput('')
    setError('')
    setCheckedTopics([])
    setScriptType(null)
    setScriptPreview(null)
    setPracticeSubmitted(false)
    setPracticeUnlocked(false)
  }, [activeId])

  // Step-loading animation
  useEffect(() => {
    if (!loading) { setLoadStep(-1); return }
    setLoadStep(0)
    let step = 0
    const timer = setInterval(() => {
      step += 1
      if (step >= LOADING_STEPS.length) { clearInterval(timer); return }
      setLoadStep(step)
    }, 380)
    return () => clearInterval(timer)
  }, [loading])

  // ── Generate topics / scripts ─────────────────────
  const handleGenerate = async () => {
    if (!input.trim() || loading || !canUse) return
    if (overScriptLimit) { setError('本月使用次數已達上限（50 次）'); return }

    setLoading(true)
    setResult(null)
    setError('')
    setCheckedTopics([])
    setScriptType(null)
    setScriptPreview(null)
    setPracticeSubmitted(false)
    setPracticeUnlocked(false)

    try {
      const tierLabel = { basic: 'trial', standard: 'standard', advanced: 'premium', managed: 'managed' }[userTier] || 'free'
      const data = await callAI(activeId, input.trim(), tierLabel, currentUser?.id)
      setResult(data)
      setResultKey(k => k + 1)

      if (activeId === 'script' && userTier === 'standard') {
        bumpScriptUsage(currentUser.id)
        setScriptUsage(getScriptUsageStatus(currentUser.id))
      }
    } catch {
      setError('生成失敗，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  // ── Checkbox toggle (max 3) ───────────────────────
  const handleCheckTopic = (index) => {
    setCheckedTopics(prev => {
      if (prev.includes(index)) {
        setMaxWarning(false)
        return prev.filter(i => i !== index)
      }
      if (prev.length >= 3) {
        setMaxWarning(true)
        setTimeout(() => setMaxWarning(false), 2200)
        return prev
      }
      return [...prev, index]
    })
    // reset script preview when selection changes
    setScriptType(null)
    setScriptPreview(null)
  }

  // ── Script type selection → generate script preview ──
  const handleScriptTypeSelect = async (type) => {
    if (scriptLoading) return
    setScriptType(type)
    setScriptPreview(null)

    if (checkedTopics.length === 0 || !result) return
    const topicText = result[checkedTopics[0]]

    setScriptLoading(true)
    try {
      const tierLabel = { basic: 'trial', standard: 'standard', advanced: 'premium', managed: 'managed' }[userTier] || 'trial'
      const data = await callAI('script', topicText, tierLabel, currentUser?.id)
      setScriptPreview(data)
    } catch {
      // silent
    } finally {
      setScriptLoading(false)
    }
  }

  // ── Practice submit ───────────────────────────────
  const handlePracticeSubmit = (practiceData) => {
    savePracticeSubmission({
      user_id:       currentUser?.id,
      user_name:     currentUser?.name || '未知用戶',
      feature:       activeId,
      ai_output:     Array.isArray(result) ? result.join('\n') : (result || ''),
      practice_data: practiceData,
    })
    setPracticeSubmitted(true)
    setPracticeUnlocked(true)
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 3500)
  }

  // ── Upgrade: open modal (no navigation) ──────────
  const handleUpgrade = () => setShowUpgradeModal(true)

  return (
    <div className="ait-shell">

      {/* ── Upgrade Modal ── */}
      {showUpgradeModal && (
        <UpgradeModal
          userTier={userTier}
          onClose={() => setShowUpgradeModal(false)}
        />
      )}

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
            >
              <span className="ait-nav-icon">{f.icon}</span>
              <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                <div className="ait-nav-label">{f.label}</div>
                <div className="ait-nav-desc">{f.subtitle}</div>
              </div>
              {f.unlockLabel && !unlocked
                ? <span className="ait-unlock-tag">{f.unlockLabel}</span>
                : (!unlocked && <span className="ait-nav-lock">🔒</span>)
              }
            </button>
          )
        })}
      </aside>

      {/* ── Main area ── */}
      <div className="ait-main">

        <StatsBar />

        {/* Header */}
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
          {(userTier === 'advanced' || userTier === 'managed') && (
            <div className="ait-quota-badge unlimited">無限次數</div>
          )}
        </div>

        {/* Element tags (topics only, after generation) */}
        {activeId === 'topics' && result && <ElementTags />}

        {/* Input card */}
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
          {!canUse && (
            <div className="ait-lock-overlay" onClick={handleUpgrade}>
              <div className="ait-lock-icon">🔒</div>
              <p className="ait-lock-text">
                {activeFeature.unlockLabel
                  ? `升級${activeFeature.unlockLabel.replace('解鎖', '')}解鎖此功能`
                  : '升級解鎖此功能'}
              </p>
              <p className="ait-lock-sub">{activeFeature.desc}</p>
              <button className="btn btn-primary btn-sm">立即升級 →</button>
            </div>
          )}
        </div>

        {/* Step-loading */}
        {loading && (
          <div className="ait-loading-bar">
            <div className="ait-loading-fill" />
            <p className="ait-loading-text">
              {loadStep >= 0 ? LOADING_STEPS[Math.min(loadStep, LOADING_STEPS.length - 1)] : 'AI 生成中…'}
            </p>
          </div>
        )}

        {/* Success flash */}
        {showSuccess && (
          <div className="ait-success-banner">✅ 練習提交成功！已解鎖下載與複製功能</div>
        )}

        {/* Copy-protection notices */}
        {result && !loading && viewOnly && activeId !== 'topics' && (
          <div className="ait-no-copy-notice">
            ⚠️ 試聽課學員僅供閱覽，升級達人班後可完整使用 AI 工具
          </div>
        )}
        {result && !loading && needsPractice && !canCopy && (
          <div className="ait-no-copy-notice">
            📝 完成下方練習作業後，即可複製 / 下載內容
          </div>
        )}

        {/* ── Result block ── */}
        {result && !loading && (
          <div
            key={resultKey}
            className="ait-result-card"
            onContextMenu={canCopy ? undefined : e => e.preventDefault()}
            onCopy={canCopy ? undefined : e => e.preventDefault()}
            style={canCopy ? {} : { userSelect: 'none' }}
          >
            {/* Topics — checkbox list */}
            {activeId === 'topics' && Array.isArray(result) && (
              <>
                {maxWarning && (
                  <div className="ait-max-warning">⚠️ 最多選 3 個選題</div>
                )}
                <div className="ait-topic-list">
                  {result.map((topic, i) => (
                    <TopicCard
                      key={i}
                      topic={topic}
                      index={i}
                      checked={checkedTopics.includes(i)}
                      onCheck={handleCheckTopic}
                      checkDisabled={checkedTopics.length >= 3 && !checkedTopics.includes(i)}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Script (from script feature directly) */}
            {activeId === 'script' && (
              <ScriptPreview
                script={result}
                userTier={userTier}
                onUpgrade={handleUpgrade}
              />
            )}

            {/* Other plain text */}
            {activeId !== 'topics' && activeId !== 'script' && (
              <div className="ait-result-text-wrap">
                <pre className="ait-result-pre">{result}</pre>
              </div>
            )}
          </div>
        )}

        {/* ── Script type selector (topics page only) ── */}
        {activeId === 'topics' && result && !loading && (
          <ScriptTypeSelector
            checkedCount={checkedTopics.length}
            scriptType={scriptType}
            onSelect={handleScriptTypeSelect}
            loading={scriptLoading}
          />
        )}

        {/* ── Script preview from topic selection ── */}
        {activeId === 'topics' && scriptLoading && (
          <div className="ait-loading-bar">
            <div className="ait-loading-fill" />
            <p className="ait-loading-text">✍️ 生成腳本預覽中…</p>
          </div>
        )}
        {activeId === 'topics' && scriptPreview && !scriptLoading && (
          <ScriptPreview
            script={scriptPreview}
            userTier={userTier}
            onUpgrade={handleUpgrade}
          />
        )}

        {/* Blur preview notice for standard seeing planning */}
        {result && !loading && isBlurPreview && (
          <div className="ait-blur-lock">
            <p>🔒 升級頂流私塾完整使用此功能</p>
            <button className="btn btn-primary btn-sm" onClick={handleUpgrade}>立即升級</button>
          </div>
        )}

        {/* Practice block — standard / advanced only */}
        {result && !loading && needsPractice && canUse && (
          <PracticeBlock
            feature={activeId}
            onSubmit={handlePracticeSubmit}
            submitted={practiceSubmitted}
          />
        )}

        {/* Download button */}
        {result && !loading && canUse && (canCopyDirectly || needsPractice) && (
          <DownloadBtn
            content={result}
            feature={activeId}
            unlocked={canCopy}
          />
        )}

        {/* Course card */}
        {result && !loading && <CourseCard feature={activeId} />}

        {/* Upgrade nudge — basic seeing topics */}
        {result && !loading && activeId === 'topics' && userTier === 'basic' && (
          <div className="ait-nudge">
            <span className="ait-nudge-icon">✨</span>
            <div>
              <p className="ait-nudge-text">想把這個選題變成完整腳本？</p>
              <p className="ait-nudge-sub">升級達人班，AI 幫你寫好每一個字 →</p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={handleUpgrade}>升級達人班</button>
          </div>
        )}

        {/* Offer banner */}
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
