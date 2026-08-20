import { useState } from 'react'

const PAGE_URL = '/beta'
const LINE_ID = '@tt_01'
const LINE_URL = 'https://line.me/R/ti/p/@tt_01'
const COPY_TEXT = '你好，我想領取「短影音從0到千粉資料包」。'

const PACK_ITEMS = [
  {
    title: '五大定位公式',
    desc: '商業內容、製作、變現玩法，把帳號從「亂拍」變成「有系統」。',
  },
  {
    title: '爆款選題公版',
    desc: '不用每天從零開始想，直接用受眾興趣交叉做出選題方向。',
  },
  {
    title: '腳本與剪輯實戰',
    desc: '拆解短影音腳本結構、拍攝剪輯 SOP，新手也看得懂。',
  },
]

const AUDIENCES = [
  { tag: '學員', title: '自媒體新手', value: '30 天', desc: '從不知道拍什麼，到穩定產出內容。' },
  { tag: '業主', title: '實體店家', value: '3 套', desc: '整理可直接拍攝的短影音題材。' },
  { tag: '顧問', title: '服務業者', value: '12 支', desc: '把專業服務轉成可被理解的內容。' },
  { tag: '創作者', title: '個人品牌', value: '1 套', desc: '重新建立定位與內容主軸。' },
]

const STEPS = [
  '複製領取文字',
  '加入官方 LINE',
  '貼上訊息領資料包',
]

function InfoCard({ label, value, sub }) {
  return (
    <div className="stat-card">
      <div className="stat-value" style={{ fontSize: 28 }}>{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div style={{ color: 'var(--gray-400)', fontSize: 12, marginTop: 8 }}>{sub}</div>}
    </div>
  )
}

function SectionCard({ title, children, action }) {
  return (
    <section className="card" style={{ padding: 24 }}>
      <div className="page-actions" style={{ marginBottom: 18, alignItems: 'center' }}>
        <div className="page-heading" style={{ margin: 0 }}>
          <h2 style={{ fontSize: 20, margin: 0 }}>{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function DetailRow({ label, value }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '140px minmax(0, 1fr)',
      gap: 14,
      padding: '14px 0',
      borderBottom: '0.5px solid rgba(255,255,255,0.07)',
      alignItems: 'start',
    }}>
      <div style={{ color: 'var(--gray-400)', fontSize: 13, fontWeight: 700 }}>{label}</div>
      <div style={{ color: 'var(--gray-800)', fontSize: 14, lineHeight: 1.8, wordBreak: 'break-word' }}>{value}</div>
    </div>
  )
}

function copyText(text, onDone) {
  const finish = () => {
    onDone?.()
    setTimeout(() => onDone?.(''), 1800)
  }
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(finish).catch(finish)
    return
  }
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
  finish()
}

export default function BetaAdmin() {
  const [flash, setFlash] = useState('')

  const handleCopy = (text, message) => {
    copyText(text, (value) => setFlash(value === '' ? '' : message))
  }

  return (
    <div>
      <div className="page-actions" style={{ marginBottom: 24, alignItems: 'flex-start' }}>
        <div className="page-heading" style={{ margin: 0 }}>
          <h1>資料包管理</h1>
          <p>管理資料包領取頁、LINE 導流設定與前台顯示內容</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <a href={PAGE_URL} target="_blank" rel="noreferrer" className="btn btn-secondary">
            查看資料包頁
          </a>
          <button className="btn btn-primary" onClick={() => handleCopy(`${window.location.origin}${PAGE_URL}`, '已複製資料包頁連結')}>
            複製頁面連結
          </button>
        </div>
      </div>

      {flash && <div className="auth-alert success" style={{ marginBottom: 16 }}>{flash}</div>}

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <InfoCard label="前台頁面" value="已上線" sub="/beta" />
        <InfoCard label="導流目標" value={LINE_ID} sub="官方 LINE 帳號" />
        <InfoCard label="資料包內容" value={PACK_ITEMS.length} sub="目前顯示項目" />
        <InfoCard label="領取流程" value={STEPS.length} sub="複製文字 → 加 LINE → 貼上" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.15fr) minmax(320px, 0.85fr)', gap: 20 }}>
        <div style={{ display: 'grid', gap: 20 }}>
          <SectionCard title="前台主視覺內容">
            <DetailRow label="頁面定位" value="免費資料包" />
            <DetailRow label="主標題" value="短影音從0到千粉，只靠這一份資料包" />
            <DetailRow label="說明文字" value="五大定位公式、爆款選題公版、腳本與拍攝整理，一次把新手最常卡住的內容方向整理好。" />
            <DetailRow label="主要按鈕" value="加 LINE 好友，免費領資料包" />
            <DetailRow label="補充提醒" value="加好友後自動收到資料包，不用等，隨時可封鎖取消。" />
          </SectionCard>

          <SectionCard title="資料包內容區">
            <div style={{ display: 'grid', gap: 12 }}>
              {PACK_ITEMS.map((item, index) => (
                <div key={item.title} style={{
                  display: 'grid',
                  gridTemplateColumns: '44px minmax(0, 1fr)',
                  gap: 14,
                  padding: 16,
                  borderRadius: 12,
                  border: '0.5px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.025)',
                }}>
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    display: 'grid',
                    placeItems: 'center',
                    background: 'linear-gradient(135deg,#38bdf8,#5060ff)',
                    color: '#fff',
                    fontWeight: 900,
                  }}>
                    {index + 1}
                  </div>
                  <div>
                    <h3 style={{ margin: '0 0 4px', fontSize: 16, color: 'var(--gray-900)' }}>{item.title}</h3>
                    <p style={{ margin: 0, color: 'var(--gray-500)', lineHeight: 1.75, fontSize: 13 }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="適合對象">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
              {AUDIENCES.map(item => (
                <div key={item.title} style={{
                  padding: 16,
                  borderRadius: 12,
                  border: '0.5px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.025)',
                }}>
                  <span style={{
                    display: 'inline-flex',
                    marginBottom: 12,
                    padding: '4px 10px',
                    borderRadius: 999,
                    color: '#8ecaff',
                    background: 'rgba(56,189,248,0.12)',
                    fontSize: 12,
                    fontWeight: 800,
                  }}>{item.tag}</span>
                  <h3 style={{ margin: 0, fontSize: 16, color: 'var(--gray-900)' }}>{item.title}</h3>
                  <div style={{ color: '#fbbf24', fontSize: 24, fontWeight: 900, margin: '10px 0 6px' }}>{item.value}</div>
                  <p style={{ margin: 0, color: 'var(--gray-500)', lineHeight: 1.75, fontSize: 13 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        <div style={{ display: 'grid', gap: 20, alignContent: 'start' }}>
          <SectionCard
            title="LINE 領取設定"
            action={(
              <button className="btn btn-secondary btn-sm" onClick={() => handleCopy(COPY_TEXT, '已複製領取文字')}>
                複製領取文字
              </button>
            )}
          >
            <DetailRow label="LINE ID" value={LINE_ID} />
            <DetailRow label="LINE 連結" value={LINE_URL} />
            <DetailRow label="使用者要貼上" value={COPY_TEXT} />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
              <a href={LINE_URL} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm">
                測試加入 LINE
              </a>
              <button className="btn btn-secondary btn-sm" onClick={() => handleCopy(LINE_URL, '已複製 LINE 連結')}>
                複製 LINE 連結
              </button>
            </div>
          </SectionCard>

          <SectionCard title="領取流程">
            <div style={{ display: 'grid', gap: 10 }}>
              {STEPS.map((step, index) => (
                <div key={step} style={{
                  display: 'flex',
                  gap: 12,
                  alignItems: 'center',
                  padding: 14,
                  borderRadius: 12,
                  border: '0.5px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.025)',
                }}>
                  <span style={{ color: '#7fbfff', fontSize: 13, fontWeight: 900 }}>{String(index + 1).padStart(2, '0')}</span>
                  <strong style={{ color: 'var(--gray-900)', fontSize: 14 }}>{step}</strong>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="目前狀態">
            <div style={{
              padding: 16,
              borderRadius: 12,
              border: '0.5px solid rgba(34,197,94,0.28)',
              background: 'rgba(34,197,94,0.08)',
              color: '#86efac',
              lineHeight: 1.8,
              fontSize: 13,
              fontWeight: 700,
            }}>
              資料包頁已上線。後台目前顯示資料包內容與 LINE 導流設定，供上廣告前快速檢查。
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
