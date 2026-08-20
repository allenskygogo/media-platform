import { useMemo, useState } from 'react'
import BrandLogo from '../components/BrandLogo'

const LINE_URL = 'https://line.me/R/ti/p/@tt_01'
const COPY_TEXT = '你好，我想領取「短影音從0到千粉資料包」。'

function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text)
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
  return Promise.resolve()
}

function PackPreview() {
  const cards = [
    '五大定位公式',
    '爆款選題公版',
    '腳本與剪輯實戰',
    '拍攝呈現清單',
  ]

  return (
    <div className="beta-pack-stack" aria-label="資料包預覽">
      {cards.map((title, index) => (
        <div className={`beta-pack-card beta-pack-card-${index + 1}`} key={title}>
          <span>TOP LEVEL TRAFFIC</span>
          <strong>{title}</strong>
          <small>短影音自媒體獲客資料包</small>
        </div>
      ))}
      <div className="beta-pack-tag">資料包實際內頁，不只一頁</div>
    </div>
  )
}

function LineModal({ onClose }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await copyToClipboard(COPY_TEXT)
    setCopied(true)
  }

  return (
    <div className="beta-modal-backdrop" role="dialog" aria-modal="true" aria-label="領取資料包">
      <div className="beta-modal">
        <button className="beta-modal-close" type="button" onClick={onClose} aria-label="關閉">×</button>
        <p className="beta-kicker">領取資料包</p>
        <h2>先複製這段訊息，再加入官方 LINE</h2>
        <div className="beta-copy-box">{COPY_TEXT}</div>
        <div className="beta-modal-actions">
          <button className="beta-secondary-btn" type="button" onClick={handleCopy}>
            {copied ? '已複製' : '複製文字'}
          </button>
          <a className="beta-primary-btn" href={LINE_URL} target="_blank" rel="noreferrer">
            加入 LINE 領取
          </a>
        </div>
      </div>
    </div>
  )
}

export default function BetaSignupPage() {
  const [modalOpen, setModalOpen] = useState(false)

  const features = useMemo(() => ([
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
  ]), [])

  const cases = useMemo(() => ([
    { tag: '學員', title: '自媒體新手', value: '30 天', desc: '從不知道拍什麼，到穩定產出內容。' },
    { tag: '業主', title: '實體店家', value: '3 套', desc: '整理可直接拍攝的短影音題材。' },
    { tag: '顧問', title: '服務業者', value: '12 支', desc: '把專業服務轉成可被理解的內容。' },
    { tag: '創作者', title: '個人品牌', value: '1 套', desc: '重新建立定位與內容主軸。' },
  ]), [])

  return (
    <main className="beta-pack-page">
      <style>{`
        .beta-pack-page {
          min-height: 100vh;
          background: #09090f;
          color: #fff;
          font-family: -apple-system, BlinkMacSystemFont, "PingFang TC", "Microsoft JhengHei", "Noto Sans TC", sans-serif;
          overflow-x: hidden;
        }
        .beta-pack-nav {
          position: sticky;
          top: 0;
          z-index: 20;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px clamp(18px, 5vw, 64px);
          border-bottom: 1px solid rgba(255,255,255,.08);
          background: rgba(9,9,15,.86);
          backdrop-filter: blur(16px);
        }
        .beta-pack-nav .brand-logo-mark { width: 36px; height: 36px; }
        .beta-pack-nav .brand-logo-text { height: 28px; }
        .beta-nav-link {
          color: rgba(255,255,255,.58);
          font-size: 14px;
          font-weight: 700;
          text-decoration: none;
        }
        .beta-pack-hero {
          max-width: 1120px;
          margin: 0 auto;
          padding: clamp(44px, 8vw, 84px) clamp(18px, 5vw, 40px) 48px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(280px, 420px);
          gap: clamp(28px, 6vw, 72px);
          align-items: center;
        }
        .beta-kicker {
          margin: 0 0 14px;
          color: #77b8ff;
          font-size: 13px;
          font-weight: 900;
          letter-spacing: .12em;
        }
        .beta-pack-hero h1 {
          margin: 0;
          color: #fff;
          font-size: clamp(38px, 7vw, 76px);
          line-height: 1.04;
          letter-spacing: 0;
          font-weight: 900;
        }
        .beta-pack-hero h1 span {
          color: transparent;
          background: linear-gradient(135deg, #4f8cff, #8b4dff);
          -webkit-background-clip: text;
          background-clip: text;
        }
        .beta-hero-copy {
          margin: 20px 0 28px;
          max-width: 560px;
          color: rgba(255,255,255,.68);
          font-size: 17px;
          line-height: 1.9;
        }
        .beta-primary-btn,
        .beta-secondary-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 52px;
          border-radius: 14px;
          padding: 0 22px;
          border: 1px solid rgba(255,255,255,.14);
          color: #fff;
          font-size: 16px;
          font-weight: 900;
          text-decoration: none;
          cursor: pointer;
        }
        .beta-primary-btn {
          background: linear-gradient(135deg, #5060ff, #8040e0);
          box-shadow: 0 18px 36px rgba(80,96,255,.28);
        }
        .beta-secondary-btn {
          background: rgba(255,255,255,.06);
        }
        .beta-cta-row {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          align-items: center;
        }
        .beta-subnote {
          margin-top: 12px;
          color: rgba(255,255,255,.42);
          font-size: 13px;
        }
        .beta-pack-stack {
          position: relative;
          min-height: 330px;
        }
        .beta-pack-card {
          position: absolute;
          left: 50%;
          top: 50%;
          width: min(330px, 78vw);
          min-height: 190px;
          padding: 26px;
          border: 1px solid rgba(255,255,255,.16);
          border-radius: 22px;
          background: linear-gradient(145deg, rgba(20,25,46,.98), rgba(8,10,18,.98));
          box-shadow: 0 22px 42px rgba(0,0,0,.35);
        }
        .beta-pack-card span {
          display: block;
          margin-bottom: 38px;
          color: rgba(255,255,255,.42);
          font-size: 11px;
          font-weight: 900;
          letter-spacing: .16em;
        }
        .beta-pack-card strong {
          display: block;
          color: #fff;
          font-size: 30px;
          line-height: 1.15;
        }
        .beta-pack-card small {
          display: block;
          margin-top: 14px;
          color: #65d8ff;
          font-size: 13px;
        }
        .beta-pack-card-1 { transform: translate(-58%, -50%) rotate(-13deg); opacity: .74; }
        .beta-pack-card-2 { transform: translate(-48%, -50%) rotate(-5deg); opacity: .86; }
        .beta-pack-card-3 { transform: translate(-39%, -50%) rotate(8deg); opacity: .72; }
        .beta-pack-card-4 { transform: translate(-50%, -48%) rotate(0); border-color: rgba(80,96,255,.46); }
        .beta-pack-tag {
          position: absolute;
          left: 50%;
          bottom: 8px;
          transform: translateX(-50%);
          white-space: nowrap;
          padding: 8px 16px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.14);
          background: rgba(5,5,8,.78);
          color: rgba(255,255,255,.86);
          font-size: 12px;
          font-weight: 800;
        }
        .beta-pack-section {
          max-width: 1040px;
          margin: 0 auto;
          padding: 46px clamp(18px, 5vw, 40px);
        }
        .beta-section-title {
          margin: 0 0 8px;
          color: #fff;
          text-align: center;
          font-size: clamp(25px, 4vw, 36px);
          font-weight: 900;
        }
        .beta-section-subtitle {
          margin: 0 0 26px;
          color: rgba(255,255,255,.5);
          text-align: center;
          font-size: 15px;
        }
        .beta-feature-list {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }
        .beta-feature-card,
        .beta-case-card,
        .beta-step {
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 18px;
          background: rgba(255,255,255,.045);
        }
        .beta-feature-card {
          padding: 22px;
          min-width: 0;
        }
        .beta-feature-index {
          width: 34px;
          height: 34px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          margin-bottom: 18px;
          background: linear-gradient(135deg, #38bdf8, #5060ff);
          font-weight: 900;
        }
        .beta-feature-card h3,
        .beta-case-card h3 {
          margin: 0 0 8px;
          color: #fff;
          font-size: 18px;
        }
        .beta-feature-card p,
        .beta-case-card p {
          margin: 0;
          color: rgba(255,255,255,.58);
          font-size: 14px;
          line-height: 1.75;
        }
        .beta-case-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }
        .beta-case-card {
          padding: 18px;
          border-top-color: rgba(80,96,255,.58);
        }
        .beta-case-card small {
          display: inline-flex;
          margin-bottom: 18px;
          padding: 4px 10px;
          border-radius: 999px;
          color: #8ecaff;
          background: rgba(56,189,248,.12);
          font-weight: 800;
        }
        .beta-case-value {
          margin-bottom: 8px;
          color: #ffd86a;
          font-size: 28px;
          font-weight: 900;
        }
        .beta-steps {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }
        .beta-step {
          padding: 20px;
        }
        .beta-step span {
          display: block;
          margin-bottom: 10px;
          color: #7fbfff;
          font-size: 13px;
          font-weight: 900;
        }
        .beta-step strong {
          display: block;
          color: #fff;
          font-size: 18px;
        }
        .beta-final {
          padding-bottom: 92px;
          text-align: center;
        }
        .beta-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: grid;
          place-items: center;
          padding: 18px;
          background: rgba(0,0,0,.72);
        }
        .beta-modal {
          position: relative;
          width: min(520px, 100%);
          padding: 28px;
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 22px;
          background: #14141d;
          box-shadow: 0 24px 80px rgba(0,0,0,.55);
        }
        .beta-modal h2 {
          margin: 0 0 18px;
          color: #fff;
          font-size: 24px;
          line-height: 1.35;
        }
        .beta-modal-close {
          position: absolute;
          top: 14px;
          right: 14px;
          width: 38px;
          height: 38px;
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 12px;
          color: #fff;
          background: rgba(255,255,255,.06);
          font-size: 24px;
          cursor: pointer;
        }
        .beta-copy-box {
          margin-bottom: 18px;
          padding: 16px;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 14px;
          color: rgba(255,255,255,.82);
          background: rgba(255,255,255,.05);
          line-height: 1.8;
        }
        .beta-modal-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        @media (max-width: 820px) {
          .beta-pack-hero {
            grid-template-columns: 1fr;
          }
          .beta-feature-list,
          .beta-case-grid,
          .beta-steps {
            grid-template-columns: 1fr;
          }
          .beta-pack-stack {
            min-height: 280px;
          }
          .beta-pack-nav {
            padding-inline: 16px;
          }
          .beta-nav-link {
            display: none;
          }
        }
      `}</style>

      <nav className="beta-pack-nav">
        <BrandLogo />
        <a className="beta-nav-link" href="/">回到首頁</a>
      </nav>

      <section className="beta-pack-hero">
        <div>
          <p className="beta-kicker">免費資料包</p>
          <h1>短影音從0到千粉<br />只靠這<span>一份資料包</span></h1>
          <p className="beta-hero-copy">
            五大定位公式、爆款選題公版、腳本與拍攝整理，一次把新手最常卡住的內容方向整理好。
          </p>
          <div className="beta-cta-row">
            <button className="beta-primary-btn" type="button" onClick={() => setModalOpen(true)}>
              加 LINE 好友，免費領資料包
            </button>
          </div>
          <p className="beta-subnote">加好友後自動收到資料包，不用等，隨時可封鎖取消。</p>
        </div>
        <PackPreview />
      </section>

      <section className="beta-pack-section">
        <h2 className="beta-section-title">資料包裡有什麼</h2>
        <p className="beta-section-subtitle">不是空泛理論，是能直接照做的方法。</p>
        <div className="beta-feature-list">
          {features.map((item, index) => (
            <article className="beta-feature-card" key={item.title}>
              <div className="beta-feature-index">{index + 1}</div>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="beta-pack-section">
        <h2 className="beta-section-title">適合誰領取</h2>
        <p className="beta-section-subtitle">想開始做內容、正在卡選題、想把服務變成流量的人。</p>
        <div className="beta-case-grid">
          {cases.map(item => (
            <article className="beta-case-card" key={item.title}>
              <small>{item.tag}</small>
              <h3>{item.title}</h3>
              <div className="beta-case-value">{item.value}</div>
              <p>{item.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="beta-pack-section">
        <h2 className="beta-section-title">怎麼領取</h2>
        <p className="beta-section-subtitle">3 步驟，不用留信箱、不用付費。</p>
        <div className="beta-steps">
          <div className="beta-step"><span>01</span><strong>複製領取文字</strong></div>
          <div className="beta-step"><span>02</span><strong>加入官方 LINE</strong></div>
          <div className="beta-step"><span>03</span><strong>貼上訊息領資料包</strong></div>
        </div>
      </section>

      <section className="beta-pack-section beta-final">
        <h2 className="beta-section-title">現在就領取資料包</h2>
        <p className="beta-section-subtitle">先把短影音方向整理好，再開始拍就不會一直重來。</p>
        <button className="beta-primary-btn" type="button" onClick={() => setModalOpen(true)}>
          免費領資料包
        </button>
      </section>

      {modalOpen && <LineModal onClose={() => setModalOpen(false)} />}
    </main>
  )
}
