import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { TIER_META } from '../../data/mockData'
import { plans, planComparisonRows, getPlanByTier, getNextPlanByTier } from '../../data/plans'

const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'https://media-platform-api.allen-a76.workers.dev'

const TIER_PERKS = {
  basic: {
    perks:  ['爆款選題 AI', '體驗課內容', '三個月使用期限'],
    locked: ['爆款文案 AI', '社群貼文 AI', '老師批改作業', '一對一策略輔導', '實體拍攝訓練'],
  },
  standard: {
    perks:  ['頂流達人系統課程', '爆款文案 AI', '社群貼文 AI', '老師批改作業'],
    locked: ['一對一策略輔導', '三天兩夜實體課程', '實體一對一代練拍攝'],
  },
  advanced: {
    perks:  ['全部課程開放', '高階 AI 工具全開', '一對一策略輔導', '每月成果覆盤', '高階陪跑專屬群'],
    locked: ['帳號全權管理', '內容交付', '數據每日更新'],
  },
  managed: {
    perks:  ['帳號全權管理', '拍攝統籌安排', '內容交付', '數據每日更新與定期回報'],
    locked: [],
  },
}

const planSummaryRows = [
  {
    label: '學習深度',
    trial: '體驗',
    creator: '系統學習',
    master: '一對一陪跑',
    managed: '團隊執行',
  },
  {
    label: '實體資源',
    trial: '無',
    creator: '實體課',
    master: '實體課＋實體一對一',
    managed: '依方案安排',
  },
  {
    label: '最終得到',
    trial: '掌握內容起步方法',
    creator: '建立自媒體獲客系統',
    master: '提升內容品質與執行穩定度',
    managed: '團隊協助營運與內容交付',
  },
]

const planPriceDetails = {
  trial: {
    kind: 'single',
    primary: 'NT$980',
    primaryMeta: '三個月體驗',
    note: '一次體驗，先掌握內容起步方向',
  },
  creator: {
    kind: 'annual',
    monthly: '月付 NT$3,980／月',
    annual: '年付 NT$39,800／年',
    save: '年省 NT$7,960',
    off: '約 16.7% OFF',
  },
  master: {
    kind: 'annual',
    monthly: '月付 NT$14,800／月',
    annual: '年付 NT$129,800／年',
    save: '年省 NT$47,800',
    off: '約 26.9% OFF',
  },
  managed: {
    kind: 'quote',
    primary: '專案報價',
    primaryMeta: '依帳號需求評估',
    note: '由團隊評估帳號需求後報價',
  },
}

function PlanPriceBlock({ plan }) {
  const price = planPriceDetails[plan.id]
  if (!price) return null

  if (price.kind === 'annual') {
    return (
      <div className="plan-price-block has-discount">
        <span className="annual-recommend-badge">推薦年付</span>
        <div className="plan-annual-price">{price.annual}</div>
        <div className="plan-monthly-price">{price.monthly}</div>
        <div className="plan-discount-row">
          <span className="discount-pill save">{price.save}</span>
          <span className="discount-pill off">{price.off}</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`plan-price-block ${price.kind}`}>
      <div className="plan-annual-price">{price.primary}</div>
      <div className="plan-monthly-price">{price.primaryMeta}</div>
      <p className="plan-price-note">{price.note}</p>
    </div>
  )
}

function getCheckoutAmount(planId, billingCycle) {
  const price = planPriceDetails[planId]
  if (!price) return ''
  if (price.kind === 'annual') {
    return billingCycle === 'monthly' ? price.monthly : price.annual
  }
  return price.primary
}

function normalizeTaiwanMobilePhone(value) {
  let digits = String(value || '').trim().replace(/[^\d+]/g, '')
  if (digits.startsWith('+886')) digits = `0${digits.slice(4)}`
  else if (digits.startsWith('886')) digits = `0${digits.slice(3)}`
  digits = digits.replace(/\D/g, '')
  return /^09\d{8}$/.test(digits) ? digits : ''
}

function submitPaymentCheckout(payment) {
  if (!payment?.configured || !payment?.action || !payment?.params) {
    throw new Error(payment?.message || '付款尚未設定完成，請稍後再試。')
  }

  const formEl = document.createElement('form')
  formEl.method = payment.method || 'POST'
  formEl.action = payment.action
  formEl.style.display = 'none'

  Object.entries(payment.params).forEach(([key, value]) => {
    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = key
    input.value = String(value ?? '')
    formEl.appendChild(input)
  })

  document.body.appendChild(formEl)
  formEl.submit()
}

function PlanCheckoutPreview({
  plan,
  currentUser,
  billingCycle,
  setBillingCycle,
  acceptedContract,
  setAcceptedContract,
  checkoutStep,
  setCheckoutStep,
  onClose,
}) {
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const price = planPriceDetails[plan.id]
  const isQuote = price?.kind === 'quote'
  const isAnnualPlan = price?.kind === 'annual'
  const amount = getCheckoutAmount(plan.id, billingCycle)

  const startUpgradePayment = async () => {
    if (loading) return
    const normalizedPhone = normalizeTaiwanMobilePhone(phone)
    if (!normalizedPhone) {
      setError('請輸入有效的台灣手機號碼（例：0912-345-678）。')
      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    try {
      const { data: sessionData } = supabase ? await supabase.auth.getSession() : { data: { session: null } }
      const token = sessionData?.session?.access_token
      if (!token) throw new Error('登入狀態已過期，請重新登入後再升級。')

      const response = await fetch(`${WORKER_URL.replace(/\/$/, '')}/api/checkout/upgrade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          planId: plan.id,
          phone: normalizedPhone,
          billingCycle,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || data.success === false) {
        throw new Error(data.error || '建立升級訂單失敗，請稍後再試。')
      }
      setMessage(`升級訂單已建立：${data.order.orderNumber}。正在前往付款頁...`)
      submitPaymentCheckout(data.ecpay || data.payment || data.newebpay)
    } catch (err) {
      setError(err.message || '建立升級訂單失敗，請稍後再試。')
      setLoading(false)
    }
  }

  if (isQuote) {
    return (
      <section className="plan-checkout-panel">
        <div className="checkout-panel-head">
          <div>
            <p>專案評估預覽</p>
            <h3>{plan.name}</h3>
          </div>
          <button type="button" onClick={onClose}>關閉</button>
        </div>
        <div className="checkout-preview-card">
          <h4>頂流代操採專案報價</h4>
          <p>正式版會送出帳號需求評估，團隊確認服務範圍後提供報價與合約，不會在此頁直接刷卡。</p>
        </div>
      </section>
    )
  }

  return (
    <section className="plan-checkout-panel">
      <div className="checkout-panel-head">
        <div>
          <p>升級流程</p>
          <h3>{plan.name}</h3>
        </div>
        <button type="button" onClick={onClose}>關閉</button>
      </div>

      <div className="checkout-steps" aria-label="升級流程">
        {['選擇付款', '確認資料', '前往付款'].map((step, index) => (
          <span key={step} className={checkoutStep === index ? 'active' : checkoutStep > index ? 'done' : ''}>
            {step}
          </span>
        ))}
      </div>

      {checkoutStep === 0 && (
        <div className="checkout-preview-card">
          <div className="checkout-card-title">
            <h4>選擇付款週期</h4>
            <span>付款成功後自動升級會員</span>
          </div>
          <div className="billing-options">
            {price.kind === 'single' && (
              <button type="button" className="billing-option active">
                <strong>{price.primary}</strong>
                <span>{price.primaryMeta}</span>
              </button>
            )}
            {isAnnualPlan && (
              <>
                <button
                  type="button"
                  className="billing-option"
                  disabled
                >
                  <strong>{price.monthly}</strong>
                  <span>分期請聯繫官方帳號 @xgfx</span>
                </button>
                <button
                  type="button"
                  className={`billing-option highlight ${billingCycle === 'annual' ? 'active' : ''}`}
                  onClick={() => setBillingCycle('annual')}
                >
                  <strong>{price.annual}</strong>
                  <span>{price.save}，{price.off}</span>
                </button>
              </>
            )}
          </div>
          <div className="checkout-summary-line">
            <span>本次選擇</span>
            <strong>{amount}</strong>
          </div>
          <button type="button" className="checkout-next-btn" onClick={() => setCheckoutStep(1)}>
            下一步，確認合約事項
          </button>
        </div>
      )}

      {checkoutStep === 1 && (
        <div className="checkout-preview-card">
          <div className="checkout-card-title">
            <h4>確認升級資料</h4>
            <span>{currentUser?.email}</span>
          </div>
          <div className="contract-placeholder">
            <p>本次升級方案：{plan.name}，付款金額：{amount}。</p>
            <p>付款成功後，系統會自動開通新的會員方案；若付款中斷，訂單會維持待付款狀態。</p>
          </div>
          <div className="form-group" style={{ marginTop: 14 }}>
            <label className="form-label">聯絡手機</label>
            <input
              className="form-input"
              value={phone}
              onChange={event => {
                setPhone(event.target.value)
                setError('')
              }}
              placeholder="例：0912-345-678"
              inputMode="tel"
              autoComplete="tel"
            />
          </div>
          <label className="contract-check">
            <input
              type="checkbox"
              checked={acceptedContract}
              onChange={event => setAcceptedContract(event.target.checked)}
            />
            <span>我已確認升級方案與付款金額，並同意付款成功後開通對應會員權限。</span>
          </label>
          {error && <div className="auth-alert error" style={{ marginTop: 14 }}>{error}</div>}
          <div className="checkout-actions">
            <button type="button" className="checkout-back-btn" onClick={() => setCheckoutStep(0)}>上一步</button>
            <button
              type="button"
              className="checkout-next-btn"
              disabled={!acceptedContract}
              onClick={() => setCheckoutStep(2)}
            >
              下一步，確認付款
            </button>
          </div>
        </div>
      )}

      {checkoutStep === 2 && (
        <div className="checkout-preview-card">
          <div className="checkout-card-title">
            <h4>確認付款</h4>
            <span>將前往付款頁</span>
          </div>
          <div className="mock-card-box">
            <div>
              <span>付款方案</span>
              <strong>{plan.name}</strong>
            </div>
            <div>
              <span>付款金額</span>
              <strong>{amount}</strong>
            </div>
            <div>
              <span>帳號</span>
              <strong>{currentUser?.email}</strong>
            </div>
          </div>
          <p className="checkout-safe-note">
            付款完成後系統會自動升級會員。若付款頁未完成，會員方案不會改變。
          </p>
          {message && <div className="auth-alert success" style={{ marginTop: 14 }}>{message}</div>}
          {error && <div className="auth-alert error" style={{ marginTop: 14 }}>{error}</div>}
          <div className="checkout-actions">
            <button type="button" className="checkout-back-btn" onClick={() => setCheckoutStep(1)} disabled={loading}>上一步</button>
            <button type="button" className="checkout-next-btn" onClick={startUpgradePayment} disabled={loading}>
              {loading ? '建立訂單中...' : '前往付款'}
            </button>
          </div>
        </div>
      )}

      {checkoutStep === 3 && (
        <div className="checkout-preview-card success">
          <h4>流程預覽完成</h4>
          <p>正式版會在付款成功後自動升級為 {plan.name}。目前是前端預覽，因此沒有扣款，也沒有修改會員資料。</p>
          <button type="button" className="checkout-next-btn" onClick={onClose}>回到方案比較</button>
        </div>
      )}
    </section>
  )
}

function PlanComparisonModal({ currentPlan, currentUser, onClose }) {
  const [showFullComparison, setShowFullComparison] = useState(false)
  const [checkoutPlan, setCheckoutPlan] = useState(null)
  const [billingCycle, setBillingCycle] = useState('annual')
  const [acceptedContract, setAcceptedContract] = useState(false)
  const [checkoutStep, setCheckoutStep] = useState(0)
  const nextPlan = plans.find(plan => plan.level === (currentPlan?.level || 0) + 1) || null

  const getPlanBadge = (plan) => {
    if (currentPlan?.id === plan.id) return '目前方案'
    if (nextPlan?.id === plan.id) return currentPlan?.id === 'master' ? '可了解' : '推薦升級'
    return ''
  }

  const getPlanCellClass = (plan) => {
    if (currentPlan?.id === plan.id) return 'is-current'
    if (nextPlan?.id === plan.id) return 'is-recommended'
    return ''
  }

  const startCheckout = (plan) => {
    setCheckoutPlan(plan)
    setBillingCycle(planPriceDetails[plan.id]?.kind === 'annual' ? 'annual' : 'single')
    setAcceptedContract(false)
    setCheckoutStep(0)
  }

  const closeCheckout = () => {
    setCheckoutPlan(null)
    setAcceptedContract(false)
    setCheckoutStep(0)
  }

  const getUpgradeAction = (plan) => {
    if (currentPlan?.id === plan.id) return { label: '目前方案', disabled: true }
    if (currentPlan && plan.level < currentPlan.level) return { label: '已包含', disabled: true }
    if (nextPlan?.id !== plan.id) return { label: plan.id === 'managed' ? '聯繫官方帳號' : '依序升級', disabled: true }
    if (plan.id === 'managed') return { label: '聯繫官方帳號', disabled: true }
    return { label: '立即升級', disabled: false }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal plan-comparison-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">方案比較</h2>
            <p className="plan-modal-subtitle">
              目前方案：{currentPlan?.name || '未設定'}
            </p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="關閉">✕</button>
        </div>
        <div className="modal-body">
          <div className="plan-aligned-grid plan-level-cards">
            <aside className="plan-modal-info-card">
              <div className="plan-modal-info-icon" aria-hidden="true" />
              <p>升級路徑</p>
              <h3>自媒體成長</h3>
              <span>從內容定位、AI 工具到陪跑與代操，依照不同階段選擇合適方案。</span>
              <div className="plan-modal-info-tags" aria-label="成長路徑重點">
                <strong>內容定位</strong>
                <strong>AI 工具</strong>
                <strong>成長交付</strong>
              </div>
            </aside>
            {plans.map(plan => (
              <article key={plan.id} className={`plan-level-card ${getPlanCellClass(plan)}`}>
                <p>LEVEL {plan.level}</p>
                <h3>{plan.name}</h3>
                <span>{plan.positioning}</span>
                <PlanPriceBlock plan={plan} />
                {getPlanBadge(plan) && <strong>{getPlanBadge(plan)}</strong>}
                <button
                  type="button"
                  className="plan-upgrade-btn"
                  disabled={getUpgradeAction(plan).disabled}
                  onClick={() => startCheckout(plan)}
                >
                  {getUpgradeAction(plan).label}
                </button>
              </article>
            ))}
          </div>

          {checkoutPlan && (
            <PlanCheckoutPreview
              plan={checkoutPlan}
              currentUser={currentUser}
              billingCycle={billingCycle}
              setBillingCycle={setBillingCycle}
              acceptedContract={acceptedContract}
              setAcceptedContract={setAcceptedContract}
              checkoutStep={checkoutStep}
              setCheckoutStep={setCheckoutStep}
              onClose={closeCheckout}
            />
          )}

          <section className="plan-summary-box">
            <div className="plan-summary-desktop">
              <div className="comparison-row comparison-head">
                <div className="comparison-label">升級重點</div>
                {plans.map(plan => <div key={plan.id} className={getPlanCellClass(plan)}>{plan.name}</div>)}
              </div>
              {planSummaryRows.map(row => (
                <div key={row.label} className="comparison-row">
                  <div className="comparison-label">{row.label}</div>
                  {plans.map(plan => (
                    <div key={plan.id} className={getPlanCellClass(plan)}>{row[plan.id]}</div>
                  ))}
                </div>
              ))}
            </div>

            <div className="plan-summary-mobile">
              {planSummaryRows.map(row => (
                <article key={row.label} className="plan-summary-mobile-card">
                  <h3>{row.label}</h3>
                  {plans.map(plan => (
                    <p key={plan.id} className={getPlanCellClass(plan)}>
                      <span>{plan.name}</span>
                      <strong>{row[plan.id]}</strong>
                    </p>
                  ))}
                </article>
              ))}
            </div>
          </section>

          <div className="plan-expand-actions">
            <button
              type="button"
              className="plan-expand-btn"
              onClick={() => setShowFullComparison(value => !value)}
            >
              {showFullComparison ? '收合完整方案比較' : '展開完整方案比較'}
            </button>
          </div>

          {showFullComparison && (
            <div className="plan-table-scroll full" role="region" aria-label="完整方案比較">
              <div className="plan-full-grid comparison-row comparison-head">
                <div className="comparison-label">比較項目</div>
                {plans.map(plan => <div key={plan.id} className={getPlanCellClass(plan)}>{plan.name}</div>)}
              </div>
              <div className="plan-full-grid-body">
                {planComparisonRows.map(row => (
                  <div key={row.key} className="plan-full-grid comparison-row">
                    <div className="comparison-label">{row.label}</div>
                    {plans.map(plan => (
                      <div key={plan.id} className={getPlanCellClass(plan)} title={plan[row.key]}>
                        {plan[row.key]}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>關閉</button>
        </div>
      </div>
    </div>
  )
}

export default function Profile() {
  const { currentUser, updateCurrentUser, updatePassword } = useAuth()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: currentUser.name })
  const [passwordForm, setPasswordForm] = useState({ password: '', confirm: '' })
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordErr, setPasswordErr] = useState('')
  const [msg, setMsg] = useState('')
  const [showPlanModal, setShowPlanModal] = useState(false)

  const meta = TIER_META[currentUser.tier] || {}
  const perks = TIER_PERKS[currentUser.tier] || { perks: [], locked: [] }
  const currentPlan = getPlanByTier(currentUser.tier)
  const nextPlan = getNextPlanByTier(currentUser.tier)

  const saveProfile = (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    updateCurrentUser({ name: form.name.trim(), avatar: form.name.trim().charAt(0) })
    setEditing(false)
    setMsg('個人資料已更新！')
    setTimeout(() => setMsg(''), 3000)
  }

  const savePassword = async (e) => {
    e.preventDefault()
    setPasswordErr('')
    if (passwordForm.password.length < 6) {
      setPasswordErr('新密碼至少需要 6 碼。')
      return
    }
    if (passwordForm.password !== passwordForm.confirm) {
      setPasswordErr('兩次輸入的密碼不一致。')
      return
    }

    setPasswordSaving(true)
    try {
      await updatePassword(passwordForm.password)
      setPasswordForm({ password: '', confirm: '' })
      setMsg('密碼已更新！下次登入請使用新密碼。')
      setTimeout(() => setMsg(''), 3000)
    } catch (error) {
      setPasswordErr(error.message || '密碼更新失敗，請稍後再試。')
    } finally {
      setPasswordSaving(false)
    }
  }

  const daysLeft = currentUser.expiresAt
    ? Math.ceil((new Date(currentUser.expiresAt) - new Date()) / 86400000)
    : null

  return (
    <div className="page-content">
      <div className="page-heading"><h1>個人資料</h1><p>管理你的帳號資訊與會員方案</p></div>
      {msg && <div className="auth-alert success" style={{ marginBottom: 20 }}>{msg}</div>}

      <div className="profile-grid">
        {/* Left: tier card + upgrade */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className={`tier-card ${meta.color}`}>
            <span className={`tier-name ${meta.color}`}>目前方案：{currentPlan?.name || meta.label}</span>
            {daysLeft !== null && (
              <span style={{ fontSize: 13, color: 'var(--gray-600)', background: 'rgba(255,255,255,0.6)', borderRadius: 999, padding: '2px 10px' }}>
                {daysLeft > 0 ? `剩餘 ${daysLeft} 天` : '已過期'}
              </span>
            )}
            <ul className="tier-perks">
              {perks.perks.map(p => <li key={p}><span>已解鎖</span>{p}</li>)}
              {perks.locked.map(p => <li key={p} style={{ opacity: 0.5 }}><span>未解鎖</span>{p}</li>)}
            </ul>
          </div>

          {nextPlan && (
            <div className="card">
              <div className="card-body" style={{ textAlign: 'center', padding: 24 }}>
                <p style={{ fontSize: 12, color: 'var(--gray-500)', fontWeight: 800, letterSpacing: '0.12em', marginBottom: 8 }}>NEXT STEP</p>
                <h3 style={{ fontWeight: 700, marginBottom: 8 }}>建議升級：{nextPlan.name}</h3>
                <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 16 }}>
                  {currentUser.tier === 'basic'
                    ? '從 AI 選題體驗，升級到完整自媒體獲客系統課。'
                    : nextPlan.coreValue}
                </p>
                <button className="btn btn-primary btn-block btn-lg" onClick={() => setShowPlanModal(true)}>
                  立即升級
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: profile form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">基本資料</h2>
              {!editing && <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>編輯</button>}
            </div>
            <div className="card-body">
              {editing ? (
                <form onSubmit={saveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">姓名</label>
                    <input className="form-input" value={form.name} onChange={e => setForm({ name: e.target.value })} required />
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="submit" className="btn btn-primary">儲存</button>
                    <button type="button" className="btn btn-secondary" onClick={() => { setEditing(false); setForm({ name: currentUser.name }) }}>取消</button>
                  </div>
                </form>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {[
                    { label: '姓名',     value: currentUser.name },
                    { label: '電子郵件', value: currentUser.email },
                    { label: '加入日期', value: currentUser.createdAt },
                    { label: '方案效期', value: currentUser.expiresAt ? `${currentUser.expiresAt}${daysLeft !== null ? `（剩 ${daysLeft} 天）` : ''}` : '依合約' },
                    { label: '帳號狀態', value: currentUser.status === 'active' ? '正常' : '停用' },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid var(--gray-100)' }}>
                      <span style={{ fontSize: 14, color: 'var(--gray-500)' }}>{label}</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-800)' }}>{value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h2 className="card-title">更改密碼</h2></div>
            <div className="card-body">
              {passwordErr && <div className="auth-alert error" style={{ marginBottom: 16 }}>{passwordErr}</div>}
              <form onSubmit={savePassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">新密碼</label>
                  <input
                    className="form-input"
                    type="password"
                    value={passwordForm.password}
                    onChange={e => setPasswordForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="至少 6 碼"
                    autoComplete="new-password"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">確認新密碼</label>
                  <input
                    className="form-input"
                    type="password"
                    value={passwordForm.confirm}
                    onChange={e => setPasswordForm(f => ({ ...f, confirm: e.target.value }))}
                    placeholder="再次輸入新密碼"
                    autoComplete="new-password"
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={passwordSaving}>
                  {passwordSaving ? '更新中...' : '更新密碼'}
                </button>
              </form>
            </div>
          </div>

          {/* Pricing summary */}
          <div className="card">
            <div className="card-header"><h2 className="card-title">方案比較</h2>
              <button className="btn btn-outline btn-sm" onClick={() => setShowPlanModal(true)}>查看完整方案</button>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {plans.map(plan => {
                const isCurrent = currentPlan?.id === plan.id
                return (
                  <div key={plan.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 'var(--radius)', background: isCurrent ? 'var(--primary-light)' : 'var(--gray-50)', border: isCurrent ? '2px solid var(--primary)' : '1px solid var(--gray-200)' }}>
                    <span style={{ flex: 1, fontWeight: isCurrent ? 700 : 500, fontSize: 14 }}>{plan.name}</span>
                    <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>{plan.positioning}</span>
                    {isCurrent && <span className="badge badge-active">目前方案</span>}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
      {showPlanModal && <PlanComparisonModal currentPlan={currentPlan} currentUser={currentUser} onClose={() => setShowPlanModal(false)} />}
    </div>
  )
}
