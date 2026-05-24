import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { TIER_META } from '../../data/mockData'

const TIER_PERKS = {
  basic: {
    perks:  ['YouTube 頻道從零開始（試聽）', '短影音爆紅公式（試聽）', '課程討論區'],
    locked: ['Podcast 製作完整課程', '商業變現 / 數據分析課程', 'AI 選題腳本工具', '預約實體一對一'],
  },
  standard: {
    perks:  ['全部基礎課程（YouTube / 短影音 / Podcast）', '課程討論區', '學習進度追蹤'],
    locked: ['商業變現 / 數據分析課程', 'AI 選題腳本工具', '預約實體一對一'],
  },
  advanced: {
    perks:  ['全部課程（含商業變現 / 數據分析）', '✨ AI 選題腳本工具', '🗓️ 預約實體一對一輔導', '優先客服支援', '新課程搶先體驗'],
    locked: [],
  },
}

const UPGRADE_TO = { basic: 'standard', standard: 'advanced' }
const UPGRADE_LABEL = { standard: '升級達人班', advanced: '升級高階陪跑' }
const UPGRADE_COLOR = { standard: 'var(--standard-text)', advanced: 'var(--advanced-text)' }

export default function Profile() {
  const { currentUser, updateCurrentUser } = useAuth()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: currentUser.name })
  const [msg, setMsg] = useState('')

  const meta = TIER_META[currentUser.tier] || {}
  const perks = TIER_PERKS[currentUser.tier] || { perks: [], locked: [] }
  const upgradeTo = UPGRADE_TO[currentUser.tier]

  const saveProfile = (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    updateCurrentUser({ name: form.name.trim(), avatar: form.name.trim().charAt(0) })
    setEditing(false)
    setMsg('個人資料已更新！')
    setTimeout(() => setMsg(''), 3000)
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
            <span className="tier-icon">{meta.emoji}</span>
            <span className={`tier-name ${meta.color}`}>{meta.label}</span>
            {daysLeft !== null && (
              <span style={{ fontSize: 13, color: 'var(--gray-600)', background: 'rgba(255,255,255,0.6)', borderRadius: 999, padding: '2px 10px' }}>
                {daysLeft > 0 ? `剩餘 ${daysLeft} 天` : '已過期'}
              </span>
            )}
            <ul className="tier-perks">
              {perks.perks.map(p => <li key={p}><span>✅</span>{p}</li>)}
              {perks.locked.map(p => <li key={p} style={{ opacity: 0.5 }}><span>🔒</span>{p}</li>)}
            </ul>
          </div>

          {upgradeTo && (
            <div className="card">
              <div className="card-body" style={{ textAlign: 'center', padding: 24 }}>
                <p style={{ fontSize: 20, marginBottom: 8 }}>{TIER_META[upgradeTo]?.emoji}</p>
                <h3 style={{ fontWeight: 700, marginBottom: 8 }}>{UPGRADE_LABEL[upgradeTo]}</h3>
                <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 16 }}>
                  {upgradeTo === 'standard'
                    ? '解鎖全部基礎課程，包含 Podcast 製作完整教學。'
                    : '解鎖所有進階課程 + AI 工具 + 一對一實體輔導。'}
                </p>
                <button className="btn btn-block btn-lg" style={{ background: UPGRADE_COLOR[upgradeTo], color: '#fff' }}
                  onClick={() => navigate('/pricing')}>
                  查看升級方案
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
                    { label: '帳號狀態', value: currentUser.status === 'active' ? '✅ 正常' : '⛔ 停用' },
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

          {/* Pricing summary */}
          <div className="card">
            <div className="card-header"><h2 className="card-title">方案比較</h2>
              <button className="btn btn-outline btn-sm" onClick={() => navigate('/pricing')}>查看完整定價</button>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {['basic', 'standard', 'advanced'].map(t => {
                const m = TIER_META[t]
                const isCurrent = currentUser.tier === t
                return (
                  <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 'var(--radius)', background: isCurrent ? 'var(--primary-light)' : 'var(--gray-50)', border: isCurrent ? '2px solid var(--primary)' : '1px solid var(--gray-200)' }}>
                    <span style={{ fontSize: 18 }}>{m.emoji}</span>
                    <span style={{ flex: 1, fontWeight: isCurrent ? 700 : 500, fontSize: 14 }}>{m.label}</span>
                    <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>{m.duration}</span>
                    {isCurrent && <span className="badge badge-active">目前方案</span>}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
