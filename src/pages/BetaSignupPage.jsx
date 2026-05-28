import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, hasSupabase, allowLocalBetaFallback } from '../lib/supabase'

const LS_KEY = 'beta_applications'

function localLoad() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') }
  catch { return [] }
}
function localSave(arr) {
  localStorage.setItem(LS_KEY, JSON.stringify(arr))
}

function validateEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
}
function validatePhone(p) {
  return /^09\d{8}$/.test(p.replace(/[-\s]/g, ''))
}

const REFERRAL_OPTIONS = [
  { value: 'ig',      label: 'IG 帳號' },
  { value: 'tiktok',  label: 'TikTok 帳號' },
  { value: 'friend',  label: '朋友介紹' },
  { value: 'google',  label: 'Google 搜尋' },
  { value: 'other',   label: '其他' },
]
const SOCIAL_OPTIONS = [
  { value: 'yes',      label: '有，目前在經營 IG / TikTok / YouTube' },
  { value: 'starting', label: '剛開始，還在起步階段' },
  { value: 'no',       label: '還沒有，但很想開始' },
]
const HOURS_OPTIONS = [
  { value: '1-2', label: '1-2 小時' },
  { value: '3-5', label: '3-5 小時' },
  { value: '5+',  label: '5 小時以上，我非常認真' },
]

const BETA_STYLES = `
@keyframes betaDotPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.35; transform: scale(0.55); }
}
@keyframes betaFadeIn {
  from { opacity: 0; transform: translateY(22px); }
  to   { opacity: 1; transform: translateY(0); }
}
.beta-input {
  padding: 10px 14px;
  border: 0.5px solid rgba(255,255,255,0.10);
  border-radius: 8px; font-size: 14px;
  color: #fff; width: 100%;
  background: rgba(255,255,255,0.04);
  outline: none; transition: 0.2s;
  box-sizing: border-box;
  font-family: inherit;
}
.beta-input:focus {
  border-color: rgba(80,96,255,0.55);
  box-shadow: 0 0 0 3px rgba(80,96,255,0.12);
  background: rgba(255,255,255,0.06);
}
.beta-input.err { border-color: #ef4444; }
.beta-input::placeholder { color: rgba(255,255,255,0.25); }
`

// ── Nav ───────────────────────────────────────────────────────────────────────
function BetaNav() {
  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'rgba(9,9,15,0.88)', backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '0.5px solid rgba(255,255,255,0.06)',
      padding: '0 24px', height: 56,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'linear-gradient(135deg,#5060ff,#a040e0)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Rajdhani',sans-serif",
          fontWeight: 900, fontSize: 14, color: '#fff',
        }}>TT</div>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
          <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>TOP LEVEL TRAFFIC</span>
          <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: '0.10em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>只有頂級，沒有套路</span>
        </div>
      </div>
      <Link to="/"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '7px 16px', borderRadius: 8,
          border: '0.5px solid rgba(255,255,255,0.12)',
          background: 'rgba(255,255,255,0.04)',
          color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 500,
          textDecoration: 'none', transition: '0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(80,96,255,0.5)'; e.currentTarget.style.color = '#fff' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)' }}
      >← 回到首頁</Link>
    </nav>
  )
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function HeroSection() {
  return (
    <section style={{ position: 'relative', padding: '80px 24px 60px', textAlign: 'center', overflow: 'hidden' }}>
      {/* top glow */}
      <div style={{
        position: 'absolute', top: -140, left: '50%', transform: 'translateX(-50%)',
        width: 700, height: 420,
        background: 'radial-gradient(ellipse at center top, rgba(80,96,255,0.16) 0%, rgba(160,64,224,0.09) 45%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 680, margin: '0 auto', animation: 'betaFadeIn 0.65s ease both' }}>
        {/* Recruiting badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 18px', borderRadius: 999,
          background: 'rgba(80,96,255,0.10)',
          border: '0.5px solid rgba(80,96,255,0.35)',
          marginBottom: 28, color: 'rgba(130,148,255,1)',
          fontSize: 13, fontWeight: 600,
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%', background: '#6878ff', flexShrink: 0,
            animation: 'betaDotPulse 1.5s ease-in-out infinite',
            display: 'inline-block',
          }} />
          封閉測試招募中
        </div>

        <h1 style={{
          fontSize: 'clamp(26px,5vw,48px)', fontWeight: 800, lineHeight: 1.2,
          color: '#fff', marginBottom: 14, letterSpacing: '-0.02em',
        }}>加入頂級流量封測計劃</h1>

        <p style={{
          fontSize: 'clamp(18px,3vw,26px)', fontWeight: 700, marginBottom: 20,
          background: 'linear-gradient(135deg,#5060ff,#a040e0)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>搶先體驗 AI 自媒體工具</p>

        <p style={{ fontSize: 15, lineHeight: 1.95, color: 'rgba(255,255,255,0.52)', marginBottom: 28 }}>
          我們正在招募 50 位認真的自媒體創作者<br />
          免費使用完整 AI 工具，共同打磨這個產品
        </p>

        {/* Quota badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '8px 20px', borderRadius: 999, marginBottom: 56,
          background: 'rgba(251,191,36,0.07)', border: '0.5px solid rgba(251,191,36,0.28)',
          color: '#fbbf24', fontSize: 13, fontWeight: 600,
        }}>
          🏆 限額 50 人，目前已收到 23 份申請
        </div>

        {/* Benefits */}
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          {[
            { icon: '🎁', title: '免費', desc: '封測期間全功能免費使用，包含 AI 選題、腳本、策劃' },
            { icon: '⚡', title: '搶先', desc: '比正式上架早 3 週體驗，封測結束享有專屬早鳥優惠' },
            { icon: '🤝', title: '共創', desc: '你的反饋會直接影響產品方向，成為產品的共同創造者' },
          ].map(({ icon, title, desc }) => (
            <div key={title} style={{
              flex: '1 1 175px', maxWidth: 210,
              background: 'rgba(255,255,255,0.03)',
              border: '0.5px solid rgba(255,255,255,0.08)',
              borderRadius: 16, padding: '20px 18px', textAlign: 'left',
            }}>
              <div style={{ fontSize: 26, marginBottom: 8 }}>{icon}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{title}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.48)', lineHeight: 1.75 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Shared Field wrapper ───────────────────────────────────────────────────────
function Field({ label, required, hint, error, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.52)', letterSpacing: '0.03em' }}>
          {label}
        </label>
        {required && <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>必填</span>}
      </div>
      {children}
      {hint && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.32)' }}>{hint}</p>}
      {error && <p style={{ fontSize: 12, color: '#ef4444' }}>{error}</p>}
    </div>
  )
}

// ── Custom radio group ────────────────────────────────────────────────────────
function RadioGroup({ name, options, value, onChange, error }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {options.map(opt => (
        <label key={opt.value} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
          border: value === opt.value ? '0.5px solid rgba(80,96,255,0.5)' : '0.5px solid rgba(255,255,255,0.08)',
          background: value === opt.value ? 'rgba(80,96,255,0.08)' : 'rgba(255,255,255,0.02)',
          transition: '0.15s', userSelect: 'none',
        }}>
          <div style={{
            width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
            border: value === opt.value ? '5px solid #6070ff' : '1.5px solid rgba(255,255,255,0.24)',
            background: 'transparent', transition: '0.15s',
          }} />
          <input type="radio" name={name} value={opt.value} checked={value === opt.value}
            onChange={() => onChange(opt.value)} style={{ display: 'none' }} />
          <span style={{
            fontSize: 14,
            fontWeight: value === opt.value ? 600 : 400,
            color: value === opt.value ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.58)',
          }}>{opt.label}</span>
        </label>
      ))}
      {error && <p style={{ fontSize: 12, color: '#ef4444', marginTop: 2 }}>{error}</p>}
    </div>
  )
}

// ── Form Card ─────────────────────────────────────────────────────────────────
function FormCard({ form, set, errors, submitError, submitting, onSubmit }) {
  const motLen = form.motivation.trim().length

  return (
    <div style={{
      background: 'rgba(255,255,255,0.025)',
      border: '0.5px solid rgba(255,255,255,0.08)',
      borderRadius: 20, padding: '32px',
      maxWidth: 580, margin: '0 auto',
    }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 28 }}>填寫封測申請</h2>

      <form onSubmit={onSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

        {/* 1. Name */}
        <Field label="姓名" required error={errors.name}>
          <input
            name="name"
            className={`beta-input${errors.name ? ' err' : ''}`}
            value={form.name} onChange={e => set('name', e.target.value)}
            placeholder="你的真實姓名"
          />
        </Field>

        {/* 2. Email */}
        <Field label="聯絡 Email" required error={errors.email}>
          <input
            name="email"
            type="email"
            className={`beta-input${errors.email ? ' err' : ''}`}
            value={form.email} onChange={e => set('email', e.target.value)}
            placeholder="example@email.com"
          />
        </Field>

        {/* 3. Phone */}
        <Field label="手機號碼" required error={errors.phone}>
          <input
            name="phone"
            type="tel"
            className={`beta-input${errors.phone ? ' err' : ''}`}
            value={form.phone} onChange={e => set('phone', e.target.value)}
            placeholder="例：0912-345-678"
          />
        </Field>

        {/* 4. Line ID */}
        <Field label="Line ID" hint="方便審核通過後聯繫你">
          <input
            name="line_id"
            className="beta-input"
            value={form.line_id} onChange={e => set('line_id', e.target.value)}
            placeholder="方便審核通過後聯繫你"
          />
        </Field>

        {/* 5. Referral */}
        <Field label="你從哪裡認識我們？" required>
          <RadioGroup
            name="referral_source"
            options={REFERRAL_OPTIONS}
            value={form.referral_source}
            onChange={v => set('referral_source', v)}
            error={errors.referral_source}
          />
        </Field>

        {/* 6. Knows about us */}
        <Field
          label="你知道我們主要在教什麼嗎？" required
          hint="這題沒有標準答案，我們想了解你對我們的印象"
          error={errors.knows_about_us}
        >
          <input
            name="knows_about_us"
            className={`beta-input${errors.knows_about_us ? ' err' : ''}`}
            value={form.knows_about_us} onChange={e => set('knows_about_us', e.target.value)}
            placeholder="用你自己的話說說看..."
          />
        </Field>

        {/* 7. Industry */}
        <Field label="你目前從事的行業" required error={errors.industry}>
          <input
            name="industry"
            className={`beta-input${errors.industry ? ' err' : ''}`}
            value={form.industry} onChange={e => set('industry', e.target.value)}
            placeholder="例：美食、健身、教育、餐飲..."
          />
        </Field>

        {/* 8. Has social media */}
        <Field label="你目前有在經營自媒體嗎？" required>
          <RadioGroup
            name="has_social_media"
            options={SOCIAL_OPTIONS}
            value={form.has_social_media}
            onChange={v => set('has_social_media', v)}
            error={errors.has_social_media}
          />
        </Field>

        {/* 9. Weekly hours */}
        <Field label="每週能花多少時間使用和提供反饋？" required>
          <RadioGroup
            name="weekly_hours"
            options={HOURS_OPTIONS}
            value={form.weekly_hours}
            onChange={v => set('weekly_hours', v)}
            error={errors.weekly_hours}
          />
        </Field>

        {/* 10. Motivation */}
        <Field label="為什麼你想參加這次封測？" required error={errors.motivation}>
          <div style={{ position: 'relative' }}>
            <textarea
              name="motivation"
              className={`beta-input${errors.motivation ? ' err' : ''}`}
              value={form.motivation} onChange={e => set('motivation', e.target.value)}
              placeholder="請分享你的動機和期待..."
              style={{ resize: 'vertical', minHeight: 100, paddingBottom: 28 }}
            />
            <span style={{
              position: 'absolute', bottom: 10, right: 12,
              fontSize: 11, pointerEvents: 'none',
              color: motLen >= 50 ? 'rgba(34,197,94,0.85)' : 'rgba(255,255,255,0.28)',
              transition: '0.2s',
            }}>{motLen} / 50 字</span>
          </div>
        </Field>

        {/* 11. Pain points */}
        <Field label="你最希望 AI 工具幫你解決什麼問題？">
          <textarea
            name="pain_points"
            className="beta-input"
            value={form.pain_points} onChange={e => set('pain_points', e.target.value)}
            placeholder="例：每天不知道要拍什麼、腳本寫不好..."
            style={{ resize: 'vertical', minHeight: 80 }}
          />
        </Field>

        {/* Divider */}
        <hr style={{ border: 'none', borderTop: '0.5px solid rgba(255,255,255,0.07)', margin: '2px 0' }} />

        {/* Commitment checkbox */}
        <div data-field="committed">
          <label style={{ display: 'flex', gap: 12, cursor: 'pointer', alignItems: 'flex-start' }}
            onClick={() => set('committed', !form.committed)}>
            <div style={{
              width: 18, height: 18, borderRadius: 4, flexShrink: 0, marginTop: 2,
              border: errors.committed ? '1.5px solid #ef4444' : form.committed ? '2px solid #6070ff' : '1.5px solid rgba(255,255,255,0.22)',
              background: form.committed ? 'linear-gradient(135deg,#5060ff,#a040e0)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: '0.15s',
            }}>
              {form.committed && (
                <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                  <path d="M1 4L4.5 7.5L10 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.58)', lineHeight: 1.75 }}>
              我承諾在封測期間（3 週）至少提供 3 次真實反饋，包含使用心得、建議和遇到的問題。
              我理解若無法履行承諾，可能會被移出封測計劃。
            </span>
          </label>
          {errors.committed && <p style={{ fontSize: 12, color: '#ef4444', marginTop: 6, paddingLeft: 30 }}>{errors.committed}</p>}
        </div>

        {/* Submit */}
        {submitError && (
          <div style={{
            padding: '10px 12px',
            borderRadius: 8,
            background: 'rgba(239,68,68,0.10)',
            border: '0.5px solid rgba(239,68,68,0.30)',
            color: '#ef4444',
            fontSize: 13,
            lineHeight: 1.6,
          }}>
            {submitError}
          </div>
        )}

        <button
          type="submit" disabled={submitting}
          style={{
            width: '100%', padding: '14px 24px',
            background: 'linear-gradient(135deg,#5060ff,#a040e0)',
            border: 'none', borderRadius: 12,
            color: '#fff', fontSize: 15, fontWeight: 700,
            cursor: submitting ? 'not-allowed' : 'pointer',
            opacity: submitting ? 0.6 : 1, transition: '0.2s',
            boxShadow: '0 4px 20px rgba(80,96,255,0.3)', marginTop: 4,
          }}
        >
          {submitting ? '提交中...' : '提交封測申請'}
        </button>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.28)', marginTop: -8 }}>
          我們會在 3 個工作天內審核並以 Email 通知結果
        </p>
      </form>
    </div>
  )
}

// ── Process steps ─────────────────────────────────────────────────────────────
function ProcessSection() {
  const steps = [
    { n: '01', label: '填寫申請' },
    { n: '02', label: '3天內審核' },
    { n: '03', label: 'Email通知' },
    { n: '04', label: '開通帳號' },
    { n: '05', label: '3週免費體驗' },
    { n: '06', label: '早鳥專屬優惠' },
  ]
  return (
    <section style={{ padding: '40px 24px 80px' }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <h3 style={{ textAlign: 'center', fontSize: 17, fontWeight: 700, color: 'rgba(255,255,255,0.75)', marginBottom: 36 }}>申請流程</h3>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 0 }}>
          {steps.map((s, i) => (
            <div key={s.n} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ textAlign: 'center', padding: '0 6px' }}>
                <div style={{
                  width: 42, height: 42, borderRadius: '50%', margin: '0 auto 8px',
                  background: i === 0 ? 'linear-gradient(135deg,#5060ff,#a040e0)' : 'rgba(255,255,255,0.04)',
                  border: i === 0 ? 'none' : '0.5px solid rgba(255,255,255,0.10)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: 13,
                  color: i === 0 ? '#fff' : 'rgba(255,255,255,0.38)',
                }}>{s.n}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap' }}>{s.label}</div>
              </div>
              {i < steps.length - 1 && (
                <div style={{ width: 28, height: 1, background: 'rgba(255,255,255,0.10)', flexShrink: 0, margin: '0 0 20px' }} />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Success view ──────────────────────────────────────────────────────────────
function SuccessView() {
  return (
    <div style={{ minHeight: '100vh', background: '#09090f', color: '#fff' }}>
      <BetaNav />
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: 'calc(100vh - 56px)', padding: '40px 24px', textAlign: 'center',
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%', marginBottom: 28,
          background: 'linear-gradient(135deg,#5060ff,#a040e0)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 30, boxShadow: '0 0 40px rgba(80,96,255,0.35)',
        }}>✓</div>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: '#fff', marginBottom: 16, letterSpacing: '-0.02em' }}>感謝你的申請！</h2>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.52)', lineHeight: 1.9, maxWidth: 440 }}>
          我們會在 3 個工作天內審核<br />
          並以 Email 通知你結果，請留意收件匣。
        </p>
        <Link to="/" style={{
          marginTop: 40, display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '12px 26px', borderRadius: 12,
          background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.12)',
          color: 'rgba(255,255,255,0.65)', fontSize: 14, textDecoration: 'none', transition: '0.2s',
        }}>← 回到首頁</Link>
      </div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function BetaSignupPage() {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', line_id: '',
    referral_source: '', knows_about_us: '', industry: '',
    has_social_media: '', weekly_hours: '', motivation: '',
    pain_points: '', committed: false,
  })
  const [errors, setErrors]       = useState({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted]  = useState(false)

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }))
    if (errors[k]) setErrors(e => ({ ...e, [k]: '' }))
    if (submitError) setSubmitError('')
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim())          e.name = '請填寫姓名'
    if (!form.email.trim())         e.email = '請填寫 Email'
    else if (!validateEmail(form.email)) e.email = 'Email 格式不正確'
    if (!form.phone.trim())         e.phone = '請填寫手機號碼'
    else if (!validatePhone(form.phone)) e.phone = '請輸入有效的台灣手機號碼（例：0912-345-678）'
    if (!form.referral_source)      e.referral_source = '請選擇一個選項'
    if (!form.knows_about_us.trim()) e.knows_about_us = '請填寫此欄位'
    if (!form.industry.trim())      e.industry = '請填寫行業'
    if (!form.has_social_media)     e.has_social_media = '請選擇一個選項'
    if (!form.weekly_hours)         e.weekly_hours = '請選擇一個選項'
    if (!form.motivation.trim())    e.motivation = '請填寫此欄位'
    else if (form.motivation.trim().length < 50) e.motivation = `還需要 ${50 - form.motivation.trim().length} 個字才能提交`
    if (!form.committed)            e.committed = '請勾選承諾以繼續'
    return e
  }

  const handleSubmit = async (ev) => {
    ev.preventDefault()
    setSubmitError('')
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      const firstKey = Object.keys(errs)[0]
      document.querySelector(`[name="${firstKey}"], [data-field="${firstKey}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    setSubmitting(true)
    const now = new Date().toISOString()
    const record = {
      id: Date.now(),
      name:            form.name.trim(),
      email:           form.email.trim(),
      phone:           form.phone.trim(),
      line_id:         form.line_id.trim(),
      referral_source: form.referral_source,
      knows_about_us:  form.knows_about_us.trim(),
      industry:        form.industry.trim(),
      has_social_media: form.has_social_media,
      weekly_hours:    form.weekly_hours,
      motivation:      form.motivation.trim(),
      pain_points:     form.pain_points.trim(),
      committed:       form.committed,
      status:          'pending',
      created_at:      now,
      updated_at:      now,
      notes:           '',
    }

    try {
      if (hasSupabase && supabase) {
        const { error } = await supabase.from('beta_applications').insert([record])
        if (error) {
          setSubmitError(`提交失敗：${error.message}`)
          return
        }
      } else if (allowLocalBetaFallback) {
        // Development-only fallback. Production must fail loudly instead of pretending data reached Supabase.
        const all = localLoad()
        all.push(record)
        localSave(all)
      } else {
        setSubmitError('系統尚未完成資料庫設定，請稍後再試。')
        return
      }

      setSubmitted(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setSubmitError(`提交失敗：${err.message || '請稍後再試'}`)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) return <SuccessView />

  return (
    <div style={{ minHeight: '100vh', background: '#09090f', color: '#fff' }}>
      <style>{BETA_STYLES}</style>
      <BetaNav />
      <HeroSection />
      <section style={{ padding: '0 24px 40px' }}>
        <FormCard form={form} set={set} errors={errors} submitError={submitError} submitting={submitting} onSubmit={handleSubmit} />
      </section>
      <ProcessSection />
    </div>
  )
}
