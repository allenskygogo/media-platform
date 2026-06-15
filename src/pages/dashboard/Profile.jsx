import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { TIER_META } from '../../data/mockData'
import { plans, planComparisonRows, getPlanByTier, getNextPlanByTier } from '../../data/plans'
import ManualPaymentModal from '../../components/ManualPaymentModal'

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

const contractProjectItems = [
  '一年陪跑學習：服務期間自本合約簽署並完成付款之日起算一年。',
  '一年內兩次實體課：依乙方開課梯次與場地安排通知甲方參與。',
  '每週線上內訓：提供短影音經營、內容系統化與商業轉換相關訓練。',
  '短影音商業定位：協助理解短影音變現方式，明確自身商業定位。',
  '個人 IP 內容定位：建立適合甲方產業與個人品牌的內容主軸。',
  '爆款選題系統：協助建立素材庫分類、搜尋技巧與爆款選題發想流程。',
  '腳本寫作訓練：協助學習講觀點、曬過程與商業內容腳本落地化。',
  '自然風拍攝技巧：學習符合短影音平台觀看習慣之拍攝與表達方式。',
  '鏡頭表達訓練：強化口播、觀點表達與觀眾黏著度。',
  '剪輯與上架優化：提供影片剪輯、標題、發布與上架優化觀念。',
  '流量數據分析：學習觀察影片數據與判斷內容調整方向。',
  '變現路徑規劃：理解導流、成交與商業內容設計方向。',
]

const contractClauses = [
  {
    title: '第一條　費用與付款',
    paragraphs: [
      '本次合作總費用：新台幣 參萬玖仟捌佰 元整（NT$39,800），未稅。',
      '如甲方需乙方開立統一發票，應另加 5% 營業稅，稅額依實際開立金額計算。',
      '付款方式：本合約簽署後，甲方應以全額一次付清方式支付款項。乙方確認款項入帳後，依約提供課程與陪跑服務。',
      '匯款資訊：中國信託三民分行；戶名：遐光映畫工作室；帳號：118540475715。',
    ],
  },
  {
    title: '第二條　雙方義務',
    groups: [
      {
        subtitle: '（一）甲方義務',
        items: [
          '甲方應指定主要聯絡窗口，配合乙方課程通知、作業提交、檢討與相關溝通。',
          '甲方應依照課程安排參與學習、完成必要作業及回饋，以利學習成果累積。',
          '甲方應確保提供給乙方之文字、圖片、影片、品牌資料、商業資料及其他內容均具合法使用權，如有侵權或違法情事，概由甲方自行負責。',
          '甲方如需請假、改期或調整參與時間，應提前通知乙方，實體課與線上課程相關安排依乙方公告與實際名額為準。',
          '甲方不得將課程帳號、教材、錄影、講義、AI 工具、社群內容或陪跑資料提供予第三人使用、轉售、公開散布或作商業轉載。',
        ],
      },
      {
        subtitle: '（二）乙方義務',
        items: [
          '乙方應依本合約約定提供短影音一年達人班之課程、內訓、陪跑與相關學習資源。',
          '乙方應於合理範圍內提供內容方向、腳本、拍攝表達、數據判斷及變現路徑等學習建議。',
          '乙方提供之課程與工具內容，屬教學與方法輔助，不保證特定流量、粉絲數、營收或成交結果。',
          '乙方應妥善維護課程與學員社群秩序，並依實際課程進度調整教學與服務安排。',
        ],
      },
    ],
  },
  {
    title: '第三條　服務期間與交付方式',
    paragraphs: [
      '本服務期間自本合約完成線上簽署並完成付款之日起算一年。',
      '課程與陪跑服務以線上課程、線上內訓、群組通知、實體課程及其他乙方指定方式提供。',
      '實體課程之日期、地點及參與方式由乙方另行公告；如遇不可抗力或場地、師資、政策等因素，乙方得調整課程形式或時間。',
    ],
  },
  {
    title: '第四條　智慧財產權與使用限制',
    paragraphs: [
      '乙方提供之課程教材、簡報、錄影、作業範例、AI 工具、社群內容與相關方法論，均為乙方或其授權人所有，甲方僅得於個人學習目的範圍內使用。',
      '甲方不得擅自重製、錄影、截圖散布、公開傳輸、改作、轉售、出租、授權、提供帳號予他人使用或以任何方式侵害乙方權益。',
      '甲方依課程產出之自身帳號內容、作業及個人品牌素材，除另有約定外，由甲方自行持有；乙方得於取得甲方同意後作為案例展示。',
    ],
  },
  {
    title: '第五條　保密約定',
    paragraphs: ['雙方因本合作所知悉之商業資訊、課程內容、學員資料、策略建議、帳號數據及其他未公開資訊，均負保密義務。未經他方書面或線上明確同意，不得洩漏、公開或提供予第三人。'],
  },
  {
    title: '第六條　退費與解除',
    paragraphs: [
      '本服務包含數位課程、實體課程服務、社群資源及實體課程名額安排，甲方完成付款並取得課程或社群存取權後，除法律另有規定或乙方重大違約外，甲方不得任意要求解除或退費。',
      '甲方如有違反本合約、侵害乙方智慧財產權、干擾課程秩序、惡意散布不實資訊或其他重大違約情事，乙方得暫停或終止服務，且甲方不得要求退費。',
      '乙方如因不可歸責於雙方之因素需調整課程時間或提供方式，應以合理方式通知甲方，並以改期、線上替代、補課或其他可行方式處理。',
    ],
  },
  {
    title: '第七條　不可抗力',
    paragraphs: ['因天災、戰爭、疫情、政府命令、網路服務中斷、平台政策變動或其他不可抗力因素，致任一方無法依約履行全部或一部義務時，受影響之一方得於合理範圍內延期或調整履行方式，且不負違約責任。'],
  },
  {
    title: '第八條　爭議處理',
    paragraphs: ['本合約之解釋、履行及爭議處理，雙方同意以中華民國法律為準據法。如因本合約涉訟，雙方同意以臺灣高雄地方法院為第一審管轄法院。'],
  },
  {
    title: '第九條　線上簽署與合約效力',
    paragraphs: [
      '雙方同意本合約得以線上簽署、電子簽章或其他可辨識簽署人身分之電子方式完成簽署。',
      '本合約以線上簽署方式完成時，與紙本親筆簽名或蓋章具有同等效力。',
      '本合約自雙方完成線上簽署且甲方完成付款之日起生效。',
    ],
  },
  {
    title: '第十條　其他',
    paragraphs: [
      '本合約未盡事宜，雙方得另以書面、電子郵件或線上簽署補充協議約定之。',
      '本合約以電子檔形式供雙方保存。雙方得各自下載或列印保存，作為履約憑證。',
    ],
  },
]

function SignaturePadModal({ onClose, onSave, existingSignature = '' }) {
  const canvasRef = useRef(null)
  const drawingRef = useRef(false)
  const hasStrokeRef = useRef(false)
  const [emptyError, setEmptyError] = useState('')

  const getPoint = event => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const point = event.touches?.[0] || event
    return {
      x: point.clientX - rect.left,
      y: point.clientY - rect.top,
    }
  }

  const prepareCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ratio = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * ratio
    canvas.height = rect.height * ratio
    const context = canvas.getContext('2d')
    context.scale(ratio, ratio)
    context.lineWidth = 2.4
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.strokeStyle = '#111827'
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, rect.width, rect.height)

    if (existingSignature) {
      const image = new Image()
      image.onload = () => {
        context.drawImage(image, 0, 0, rect.width, rect.height)
        hasStrokeRef.current = true
      }
      image.src = existingSignature
    }
  }

  useEffect(() => {
    prepareCanvas()
    const onResize = () => prepareCanvas()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const startDrawing = event => {
    event.preventDefault()
    setEmptyError('')
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    const point = getPoint(event)
    drawingRef.current = true
    context.beginPath()
    context.moveTo(point.x, point.y)
  }

  const draw = event => {
    if (!drawingRef.current) return
    event.preventDefault()
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    const point = getPoint(event)
    context.lineTo(point.x, point.y)
    context.stroke()
    hasStrokeRef.current = true
  }

  const stopDrawing = event => {
    if (event) event.preventDefault()
    drawingRef.current = false
  }

  const clear = () => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const context = canvas.getContext('2d')
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, rect.width, rect.height)
    hasStrokeRef.current = false
    setEmptyError('')
  }

  const save = () => {
    if (!hasStrokeRef.current) {
      setEmptyError('請在簽名框內完成親筆簽名。')
      return
    }
    onSave(canvasRef.current.toDataURL('image/png'))
  }

  return createPortal(
    <div className="modal-overlay signature-modal-overlay" onClick={onClose}>
      <div className="modal signature-modal" onClick={event => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="sp-checkout-kicker">Online Signature</p>
            <h2 className="modal-title">電子簽名</h2>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="關閉電子簽名視窗">✕</button>
        </div>
        <div className="modal-body">
          <p className="signature-modal-note">請用滑鼠、觸控板或手機手寫電子簽名。完成後，簽名會顯示在甲方簽署欄，系統會把簽名、日期與合約一起保存，後台可下載。</p>
          <canvas
            ref={canvasRef}
            className="signature-pad"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          {emptyError && <div className="auth-alert error">{emptyError}</div>}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={clear}>重新簽名</button>
          <button type="button" className="btn btn-primary" onClick={save}>確認簽名</button>
        </div>
      </div>
    </div>,
    document.body
  )
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

function parsePriceNumber(value) {
  return Number(String(value || '').replace(/[^\d]/g, '')) || 0
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
  const [manualMonthlyOpen, setManualMonthlyOpen] = useState(false)
  const [signatureModalOpen, setSignatureModalOpen] = useState(false)
  const [signatureDataUrl, setSignatureDataUrl] = useState('')
  const [pendingSignatureAction, setPendingSignatureAction] = useState('')
  const price = planPriceDetails[plan.id]
  const isQuote = price?.kind === 'quote'
  const isAnnualPlan = price?.kind === 'annual'
  const amount = getCheckoutAmount(plan.id, billingCycle)
  const monthlyAmount = price?.monthly?.replace(/^月付\s*/, '') || ''

  const signContract = async ({ cycle = billingCycle, signerName = currentUser?.name, signerPhone = phone } = {}) => {
    const normalizedPhone = normalizeTaiwanMobilePhone(signerPhone) || String(signerPhone || '').trim()
    const amountLabel = getCheckoutAmount(plan.id, cycle)
    const { data: sessionData } = supabase ? await supabase.auth.getSession() : { data: { session: null } }
    const token = sessionData?.session?.access_token
    if (!token) throw new Error('登入狀態已過期，請重新登入後再升級。')

    const response = await fetch(`${WORKER_URL.replace(/\/$/, '')}/api/contracts/sign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        planId: plan.id,
        billingCycle: cycle,
        amount: parsePriceNumber(amountLabel),
        amountLabel: amountLabel.replace(/^年付\s*/, '').replace(/^月付\s*/, ''),
        signerName,
        signerEmail: currentUser?.email,
        signerPhone: normalizedPhone,
        signerSignatureDataUrl: signatureDataUrl,
      }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok || data.success === false) {
      throw new Error(data.error || '合約簽署紀錄建立失敗，請稍後再試。')
    }
    return data.contract
  }

  const startUpgradePayment = async () => {
    if (loading) return
    const normalizedPhone = normalizeTaiwanMobilePhone(phone)
    if (!normalizedPhone) {
      setError('請輸入有效的台灣手機號碼（例：0912-345-678）。')
      return
    }
    if (!signatureDataUrl) {
      setError('請先完成電子簽名。')
      setPendingSignatureAction('checkout')
      setSignatureModalOpen(true)
      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    try {
      await signContract({ cycle: billingCycle, signerPhone: normalizedPhone })
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

  const handleContractNext = () => {
    if (!acceptedContract) return
    if (!signatureDataUrl) {
      setError('請先完成電子簽名。')
      setPendingSignatureAction('checkout')
      setSignatureModalOpen(true)
      return
    }
    setError('')
    setCheckoutStep(2)
  }

  const handleMonthlyClick = () => {
    if (!signatureDataUrl) {
      setPendingSignatureAction('monthly')
      setSignatureModalOpen(true)
      return
    }
    setManualMonthlyOpen(true)
  }

  const handleSignatureSave = dataUrl => {
    setSignatureDataUrl(dataUrl)
    setSignatureModalOpen(false)
    setError('')
    if (pendingSignatureAction === 'monthly') setManualMonthlyOpen(true)
    if (pendingSignatureAction === 'checkout' && acceptedContract) setCheckoutStep(2)
    setPendingSignatureAction('')
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
                  onClick={handleMonthlyClick}
                >
                  <strong>{price.monthly}</strong>
                  <span>點選複製報名訊息，前往官方 Line@ 辦理月付</span>
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
            <div className="contract-preview-head">
              <div>
                <span>線上簽署合約</span>
                <strong>{plan.name}合作協議書</strong>
              </div>
              <em>簽署後後台可下載</em>
            </div>
            <div className="contract-preview-meta">
              <p><span>甲方</span>{currentUser?.name || '目前登入學員'}</p>
              <p><span>Email</span>{currentUser?.email}</p>
              <p><span>方案</span>{plan.name}</p>
              <p><span>付款金額</span>{amount}</p>
            </div>
            <div className="contract-preview-scroll">
              <h5>短影音一年達人班合作協議書</h5>
              <p>（線上簽署版）</p>
              <p>立合約書人（以下簡稱甲方）與遐光映畫工作室（以下簡稱乙方），就「短影音一年陪跑達人班」課程與陪跑服務合作案，經雙方協議訂定本合約，以茲共同信守。</p>
              <div className="contract-party-card">
                <strong>甲方客戶聯絡資訊（線上簽署前填寫）</strong>
                <dl>
                  <div><dt>甲方名稱</dt><dd>{currentUser?.name || '目前登入學員'}</dd></div>
                  <div><dt>統一編號 / 身分證字號</dt><dd>線上簽署未填寫</dd></div>
                  <div><dt>負責人 / 簽署人</dt><dd>{currentUser?.name || '目前登入學員'}</dd></div>
                  <div><dt>聯絡電話</dt><dd>{phone || '請於下方填寫'}</dd></div>
                  <div><dt>電子信箱</dt><dd>{currentUser?.email}</dd></div>
                  <div><dt>聯絡地址</dt><dd>線上簽署未填寫</dd></div>
                  <div><dt>LINE ID / 其他聯絡方式</dt><dd>線上簽署未填寫</dd></div>
                </dl>
              </div>
              <h5>專案內容</h5>
              <ol>
                {contractProjectItems.map(item => <li key={item}>{item}</li>)}
              </ol>
              {contractClauses.map(clause => (
                <section className="contract-clause" key={clause.title}>
                  <h5>{clause.title}</h5>
                  {clause.paragraphs?.map((paragraph, index) => (
                    <p key={`${clause.title}-${index}`}>{paragraph}</p>
                  ))}
                  {clause.groups?.map(group => (
                    <div className="contract-clause-group" key={group.subtitle}>
                      <h6>{group.subtitle}</h6>
                      <ol>
                        {group.items.map(item => <li key={item}>{item}</li>)}
                      </ol>
                    </div>
                  ))}
                </section>
              ))}
              <h5>線上簽署欄</h5>
              <div className="contract-sign-grid">
                <div>
                  <strong>甲方（客戶）</strong>
                  <p>名稱：{currentUser?.name || '目前登入學員'}</p>
                  <p>統一編號 / 身分證字號：線上簽署未填寫</p>
                  <p>簽署人：{currentUser?.name || '目前登入學員'}</p>
                  <p>電子信箱：{currentUser?.email}</p>
                  <p>電話：{phone || '請於下方填寫'}</p>
                  {signatureDataUrl && <img className="contract-signer-signature" src={signatureDataUrl} alt="甲方電子簽名" />}
                  <p>電子簽名：{signatureDataUrl ? '已完成' : '尚未完成'}</p>
                  <p>簽署日期：完成付款流程時紀錄</p>
                </div>
                <div>
                  <strong>乙方</strong>
                  <p>名稱：遐光映畫工作室</p>
                  <p>統一編號：71622113</p>
                  <p>負責人：張峻翔</p>
                  <p>E-mail：web@xgfx-tw.com</p>
                  <p>電話：07-2367660</p>
                  <p>線上簽署：乙方系統紀錄</p>
                  <p>簽署日期：完成付款流程時紀錄</p>
                  <img className="contract-company-seal" src="/contract-assets/xgfx-company-seal.png" alt="遐光映畫工作室印章" />
                </div>
              </div>
              <p className="contract-company-line">遐光映畫工作室｜高雄市苓雅區中山二路 412 號 11 樓之 5｜TEL: 07-2367660｜E-mail: xgfxstudio.ks01@gmail.com｜統一編號：71622113｜負責人：張峻翔</p>
            </div>
          </div>
          <div className="signature-status-card">
            <div>
              <span>甲方電子簽名（必填）</span>
              <strong>{signatureDataUrl ? '已完成簽名' : '尚未簽名'}</strong>
            </div>
            {signatureDataUrl && <img src={signatureDataUrl} alt="甲方親筆簽名預覽" />}
            <button
              type="button"
              className="checkout-back-btn"
              onClick={() => {
                setPendingSignatureAction('')
                setSignatureModalOpen(true)
              }}
            >
              {signatureDataUrl ? '重新電子簽名' : '電子簽名'}
            </button>
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
            <span>我已閱讀並同意本合作協議書內容，確認以上資料為本人真實資料，並同意以線上點擊確認作為簽署意思表示。</span>
          </label>
          {error && <div className="auth-alert error" style={{ marginTop: 14 }}>{error}</div>}
          <div className="checkout-actions">
            <button type="button" className="checkout-back-btn" onClick={() => setCheckoutStep(0)}>上一步</button>
            <button
              type="button"
              className="checkout-next-btn"
              disabled={!acceptedContract}
              onClick={handleContractNext}
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

      {manualMonthlyOpen && (
        <ManualPaymentModal
          planName={`${plan.name}｜月付`}
          amount={monthlyAmount}
          amountLabel={price.monthly}
          email={currentUser?.email}
          defaultName={currentUser?.name || ''}
          requireContact
          title="Line@ 月付報名"
          kicker="Monthly Plan"
          description="月付需由官方 Line@ 協助確認資料與開通。請填寫真實姓名與電話，複製報名訊息後貼給客服。"
          messageLabel="請複製這段報名訊息貼到 Line@"
          primaryLabel="複製並前往官方 Line"
          onBeforeCopy={({ name, phone: modalPhone }) => signContract({
            cycle: 'monthly',
            signerName: name,
            signerPhone: modalPhone,
          })}
          onClose={() => setManualMonthlyOpen(false)}
        />
      )}
      {signatureModalOpen && (
        <SignaturePadModal
          existingSignature={signatureDataUrl}
          onClose={() => {
            setSignatureModalOpen(false)
            setPendingSignatureAction('')
          }}
          onSave={handleSignatureSave}
        />
      )}
    </section>
  )
}

function PlanComparisonModal({ currentPlan, currentUser, initialPlanId, onClose }) {
  const [showFullComparison, setShowFullComparison] = useState(false)
  const [checkoutPlan, setCheckoutPlan] = useState(null)
  const [billingCycle, setBillingCycle] = useState('annual')
  const [acceptedContract, setAcceptedContract] = useState(false)
  const [checkoutStep, setCheckoutStep] = useState(0)
  const [autoStartedPlanId, setAutoStartedPlanId] = useState('')
  const nextPlan = plans.find(plan => plan.level === (currentPlan?.level || 0) + 1) || null

  const getPlanBadge = (plan) => {
    if (currentPlan?.id === plan.id) return '目前方案'
    if (nextPlan?.id === plan.id) return currentPlan?.id === 'master' ? '可了解' : '推薦升級'
    if (currentPlan && plan.level > currentPlan.level && plan.id !== 'managed') return '可直接升級'
    return ''
  }

  const getPlanCellClass = (plan) => {
    if (currentPlan?.id === plan.id) return 'is-current'
    if (nextPlan?.id === plan.id) return 'is-recommended'
    if (currentPlan && plan.level > currentPlan.level && plan.id !== 'managed') return 'is-recommended'
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

  useEffect(() => {
    if (!initialPlanId || autoStartedPlanId === initialPlanId) return
    const plan = plans.find(item => item.id === initialPlanId)
    if (!plan) return
    const action = getUpgradeAction(plan)
    if (action.disabled) return
    startCheckout(plan)
    setAutoStartedPlanId(initialPlanId)
  }, [initialPlanId, autoStartedPlanId])

  const getUpgradeAction = (plan) => {
    if (currentPlan?.id === plan.id) return { label: '目前方案', disabled: true }
    if (currentPlan && plan.level < currentPlan.level) return { label: '已包含', disabled: true }
    if (plan.id === 'managed') return { label: '聯繫官方帳號', disabled: true }
    if (currentPlan && plan.level <= currentPlan.level) return { label: '已包含', disabled: true }
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
  const location = useLocation()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: currentUser.name })
  const [passwordForm, setPasswordForm] = useState({ password: '', confirm: '' })
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordErr, setPasswordErr] = useState('')
  const [msg, setMsg] = useState('')
  const [showPlanModal, setShowPlanModal] = useState(false)
  const upgradePlanId = new URLSearchParams(location.search).get('upgrade') || ''

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

  useEffect(() => {
    if (upgradePlanId) setShowPlanModal(true)
  }, [upgradePlanId])

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
      {showPlanModal && <PlanComparisonModal currentPlan={currentPlan} currentUser={currentUser} initialPlanId={upgradePlanId} onClose={() => setShowPlanModal(false)} />}
    </div>
  )
}
