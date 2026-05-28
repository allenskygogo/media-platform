import { useState } from 'react'
import { getPricing, savePricing, DEFAULT_PRICING, getExpiryReminderLog, getUsers, getReminderLog } from '../../data/mockData'

function PriceInput({ label, hint, value, onChange }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <span style={{ fontSize:14, color:'var(--gray-500)', fontWeight:600 }}>NT$</span>
        <input
          type="number"
          className="form-input"
          style={{ maxWidth:160 }}
          value={value}
          min={0}
          onChange={e => onChange(Number(e.target.value))}
        />
      </div>
      {hint && <span className="form-hint">{hint}</span>}
    </div>
  )
}

export default function PricingAdmin() {
  const [pricing, setPricing] = useState(getPricing())
  const [msg, setMsg]         = useState('')

  const set = (key, val) => setPricing(p => ({ ...p, [key]: val }))
  const flash = t => { setMsg(t); setTimeout(() => setMsg(''), 3000) }

  const handleSave = () => {
    savePricing(pricing)
    flash('定價設定已儲存')
  }

  const handleReset = () => {
    setPricing(DEFAULT_PRICING)
    savePricing(DEFAULT_PRICING)
    flash('已重設為預設定價')
  }

  // Expiry reminder log for display
  const users = getUsers().filter(u => u.role === 'student' && u.expiresAt)
  const expiryLogs = users.map(u => {
    const log = getExpiryReminderLog(u.id)
    const daysLeft = Math.ceil((new Date(u.expiresAt).getTime() - Date.now()) / 86400000)
    return { user: u, log, daysLeft }
  }).filter(e => e.log.log.length > 0 || e.daysLeft <= 14)
    .sort((a, b) => a.daysLeft - b.daysLeft)

  // Trial reminder log
  const trialStudents = getUsers().filter(u => u.role === 'student' && u.tier === 'basic' && !u.expiresAt)
  const trialLogs = trialStudents.map(u => ({
    user: u,
    log: getReminderLog(u.id),
  }))

  return (
    <div>
      <div className="page-heading">
        <div>
          <h1>定價管理</h1>
          <p>設定各方案定價及優惠條件；測試版前台暫不顯示正式價格</p>
        </div>
      </div>

      {msg && <div className="auth-alert success" style={{ marginBottom:16 }}>{msg}</div>}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24, alignItems:'start' }}>
        {/* Pricing settings */}
        <div>
          <div className="card" style={{ marginBottom:20 }}>
            <div className="card-header"><h2 className="card-title">體驗課</h2></div>
            <div className="card-body">
              <PriceInput label="體驗課定價" value={pricing.trialPrice}
                onChange={v => set('trialPrice', v)} />
            </div>
          </div>

          <div className="card" style={{ marginBottom:20 }}>
            <div className="card-header"><h2 className="card-title">頂流達人</h2></div>
            <div className="card-body">
              <PriceInput label="原價" value={pricing.advancedPrice}
                onChange={v => set('advancedPrice', v)} />
              <PriceInput label="體驗後 24 小時優惠價"
                hint="學員完成體驗課後 24 小時內購買頂流達人時顯示此價格"
                value={pricing.advancedDiscountPrice}
                onChange={v => set('advancedDiscountPrice', v)} />
              <div className="form-group">
                <label className="form-label">體驗後優惠時效（小時）</label>
                <input type="number" className="form-input" style={{ maxWidth:100 }}
                  min={1} max={168} value={pricing.trialOfferHours}
                  onChange={e => set('trialOfferHours', Number(e.target.value))} />
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom:20 }}>
            <div className="card-header"><h2 className="card-title">頂流私塾 / 頂流代操</h2></div>
            <div className="card-body">
              <PriceInput label="原價" value={pricing.managedPrice}
                onChange={v => set('managedPrice', v)} />
              <p style={{ fontSize:13, color:'var(--gray-500)', marginTop:4, lineHeight:1.6 }}>
                完課後折抵：高階服務原價 - 學員實際付款的頂流達人金額。
                折抵金額自動從學員資料的 <code>advancedPaidAmount</code> 欄位讀取。
              </p>
              <div className="form-group" style={{ marginTop:12 }}>
                <label className="form-label">完課後優惠時效（小時）</label>
                <input type="number" className="form-input" style={{ maxWidth:100 }}
                  min={1} max={168} value={pricing.completionOfferHours}
                  onChange={e => set('completionOfferHours', Number(e.target.value))} />
              </div>
            </div>
          </div>

          <div style={{ display:'flex', gap:12 }}>
            <button className="btn btn-primary" onClick={handleSave}>儲存定價</button>
            <button className="btn btn-secondary" onClick={handleReset}>重設預設值</button>
          </div>
        </div>

        {/* Reminder logs */}
        <div>
          {/* Expiry reminders */}
          <div className="card" style={{ marginBottom:20 }}>
            <div className="card-header"><h2 className="card-title">到期提醒記錄</h2></div>
            <div className="card-body" style={{ padding:0 }}>
              {expiryLogs.length === 0 ? (
                <p style={{ padding:'24px 20px', color:'var(--gray-400)', fontSize:13 }}>暫無到期提醒記錄</p>
              ) : (
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                  <thead>
                    <tr style={{ borderBottom:'1px solid var(--gray-200)' }}>
                      <th style={{ padding:'10px 16px', textAlign:'left', fontWeight:700, color:'var(--gray-500)' }}>學員</th>
                      <th style={{ padding:'10px 16px', textAlign:'left', fontWeight:700, color:'var(--gray-500)' }}>到期日</th>
                      <th style={{ padding:'10px 16px', textAlign:'left', fontWeight:700, color:'var(--gray-500)' }}>已發提醒</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expiryLogs.map(({ user: u, log, daysLeft }) => (
                      <tr key={u.id} style={{ borderBottom:'1px solid var(--gray-100)' }}>
                        <td style={{ padding:'10px 16px' }}>
                          <p style={{ fontWeight:700 }}>{u.name}</p>
                          <p style={{ color:'var(--gray-400)', fontSize:11 }}>{u.email}</p>
                        </td>
                        <td style={{ padding:'10px 16px' }}>
                          <span style={{ color: daysLeft <= 3 ? 'var(--danger)' : daysLeft <= 7 ? 'var(--warning)' : 'var(--gray-700)', fontWeight:600 }}>
                            {u.expiresAt}
                          </span>
                          <p style={{ color:'var(--gray-500)', fontSize:11 }}>{daysLeft > 0 ? `剩 ${daysLeft} 天` : '已到期'}</p>
                        </td>
                        <td style={{ padding:'10px 16px' }}>
                          {log.sentDays.length === 0
                            ? <span style={{ color:'var(--gray-400)' }}>未發送</span>
                            : log.sentDays.map(d => (
                              <span key={d} style={{ display:'inline-block', marginRight:4, marginBottom:4,
                                padding:'2px 8px', borderRadius:999, fontSize:11, fontWeight:700,
                                background: d === 3 ? 'var(--danger-light)' : d === 7 ? 'var(--advanced-light)' : 'var(--gray-100)',
                                color: d === 3 ? 'var(--danger)' : d === 7 ? 'var(--advanced-text)' : 'var(--gray-600)' }}>
                                {d} 天前
                              </span>
                            ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Trial reminders */}
          <div className="card">
            <div className="card-header"><h2 className="card-title">體驗提醒記錄</h2></div>
            <div className="card-body" style={{ padding:0 }}>
              {trialLogs.length === 0 ? (
                <p style={{ padding:'24px 20px', color:'var(--gray-400)', fontSize:13 }}>暫無待體驗學員</p>
              ) : (
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                  <thead>
                    <tr style={{ borderBottom:'1px solid var(--gray-200)' }}>
                      <th style={{ padding:'10px 16px', textAlign:'left', fontWeight:700, color:'var(--gray-500)' }}>學員</th>
                      <th style={{ padding:'10px 16px', textAlign:'left', fontWeight:700, color:'var(--gray-500)' }}>已送</th>
                      <th style={{ padding:'10px 16px', textAlign:'left', fontWeight:700, color:'var(--gray-500)' }}>最後發送</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trialLogs.map(({ user: u, log }) => (
                      <tr key={u.id} style={{ borderBottom:'1px solid var(--gray-100)' }}>
                        <td style={{ padding:'10px 16px' }}>
                          <p style={{ fontWeight:700 }}>{u.name}</p>
                          <p style={{ color:'var(--gray-400)', fontSize:11 }}>{u.email}</p>
                        </td>
                        <td style={{ padding:'10px 16px', fontWeight:700 }}>{log.count} 封</td>
                        <td style={{ padding:'10px 16px', color:'var(--gray-500)' }}>
                          {log.log.length > 0
                            ? new Date(log.log[log.log.length - 1].sentAt).toLocaleString('zh-TW', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' })
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
