import { useState, useEffect } from 'react'
import {
  getUsers, saveUsers,
  getTrialSession, getTrialProgress,
  saveTrialProgress, completeTrialInStorage,
  addDays,
  getReminderLog, recordReminder, nextReminderTemplate,
  REMINDER_TEMPLATES, makeAutoLoginToken,
} from '../../data/mockData'

function getStatus(user) {
  const prog    = getTrialProgress(user.id)
  const session = getTrialSession(user.id)

  if (user.expiresAt || prog?.completed) {
    const dateStr = prog?.completedAt
      ? new Date(prog.completedAt).toLocaleDateString('zh-TW')
      : user.expiresAt
    return { key: 'completed', label: '已完成', color: 'var(--success)', sub: dateStr }
  }
  if (prog && !prog.completed) {
    const m = Math.floor(prog.currentSecond / 60)
    return { key: 'watching', label: '觀看中', color: 'var(--primary)', sub: `已看 ${m} 分` }
  }
  if (session) {
    const dt = new Date(session.scheduledAt)
    const str = dt.toLocaleString('zh-TW', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' })
    return { key: 'booked', label: '已預約', color: 'var(--advanced-text)', sub: str }
  }
  return { key: 'none', label: '未預約', color: 'var(--gray-400)', sub: '' }
}

function renderTemplate(tpl, user) {
  const loginToken = makeAutoLoginToken(user.id, user.email)
  const loginUrl = `${window.location.origin}/trial-login?uid=${user.id}&t=${loginToken}`
  return {
    subject: tpl.subject.replace(/{{姓名}}/g, user.name),
    body: tpl.body
      .replace(/{{姓名}}/g, user.name)
      .replace(/{{按鈕：立即預約觀看時段}}/g, `[ 立即預約觀看時段 ]\n${loginUrl}`),
  }
}

// ── Template badge ──────────────────────────────────────────────────────────
function TplBadge({ tplKey }) {
  if (!tplKey) return <span style={{ color: 'var(--gray-300)', fontSize: 12 }}>—</span>
  const colors = { A: 'var(--primary)', B: 'var(--advanced-text)', C: '#d97706' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 24, height: 24, borderRadius: '50%', fontSize: 12, fontWeight: 800,
      background: colors[tplKey] || 'var(--gray-300)', color: '#fff',
    }}>{tplKey}</span>
  )
}

// ── Email preview modal ─────────────────────────────────────────────────────
function PreviewModal({ user, tplKey, onClose }) {
  if (!user || !tplKey) return null
  const tpl = REMINDER_TEMPLATES[tplKey]
  const { subject, body } = renderTemplate(tpl, user)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">信件預覽 — 範本 {tplKey}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--gray-400)', marginBottom: 4 }}>主旨</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--gray-900)', padding: '10px 14px', background: 'var(--gray-50)', borderRadius: 8, border: '1px solid var(--gray-200)' }}>
              {subject}
            </p>
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--gray-400)', marginBottom: 4 }}>內容</p>
            <pre style={{
              fontSize: 13, lineHeight: 1.8, color: 'var(--gray-700)',
              padding: '14px 16px', background: 'var(--gray-50)',
              borderRadius: 8, border: '1px solid var(--gray-200)',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'inherit',
            }}>
              {body}
            </pre>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>關閉</button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────
export default function TrialAdmin() {
  const [students, setStudents] = useState([])
  const [editUser, setEditUser] = useState(null)
  const [editExpiry, setEditExpiry] = useState('')
  const [previewUser, setPreviewUser] = useState(null)
  const [previewTpl, setPreviewTpl]   = useState(null)
  const [msg, setMsg]  = useState('')
  const [, tick]       = useState(0)

  const refresh = () => {
    setStudents(getUsers().filter(u => u.role === 'student' && u.tier === 'basic'))
  }

  useEffect(() => {
    refresh()
    const t = setInterval(() => tick(n => n + 1), 10000)
    return () => clearInterval(t)
  }, [])

  const flash = (t) => { setMsg(t); setTimeout(() => setMsg(''), 3500) }

  // ── Actions ───────────────────────────────────────────────────────────────
  const manualComplete = (user) => {
    completeTrialInStorage(user.id)
    refresh()
    flash(`✅ ${user.name} 已手動標記為完成，期限設為今天起 90 天`)
  }

  const openEdit = (user) => {
    setEditUser(user)
    setEditExpiry(user.expiresAt || '')
  }

  const saveExpiry = () => {
    const all = getUsers()
    const idx = all.findIndex(u => u.id === editUser.id)
    all[idx].expiresAt = editExpiry || null
    saveUsers(all)
    refresh()
    setEditUser(null)
    flash(`✅ ${editUser.name} 的使用期限已更新`)
  }

  // Send reminder to a single student
  const sendReminder = (user) => {
    const tplKey = nextReminderTemplate(user.id)
    recordReminder(user.id, tplKey)
    refresh()
    flash(`📧 已模擬發送信件 ${tplKey} 給 ${user.name}`)
  }

  // Send today's reminder to all non-completed students
  const sendAllReminders = () => {
    const pending = students.filter(u => getStatus(u).key !== 'completed')
    if (pending.length === 0) { flash('目前沒有待發提醒的學員'); return }
    pending.forEach(u => {
      const tplKey = nextReminderTemplate(u.id)
      recordReminder(u.id, tplKey)
    })
    refresh()
    flash(`📧 已模擬發送今日提醒給 ${pending.length} 位學員`)
  }

  // Preview modal helpers
  const openPreview = (user) => {
    setPreviewUser(user)
    setPreviewTpl(nextReminderTemplate(user.id))
  }

  // ── Stats ─────────────────────────────────────────────────────────────────
  const pct = (prog) => {
    if (!prog) return 0
    return Math.round((prog.currentSecond / 10800) * 100)
  }

  const statusCounts = {
    completed: students.filter(u => getStatus(u).key === 'completed').length,
    watching:  students.filter(u => getStatus(u).key === 'watching').length,
    booked:    students.filter(u => getStatus(u).key === 'booked').length,
    none:      students.filter(u => getStatus(u).key === 'none').length,
  }

  return (
    <div>
      <div className="page-heading">
        <div>
          <h1>試聽管理</h1>
          <p>初階學員試聽課進度總覽</p>
        </div>
        <button className="btn btn-primary" onClick={sendAllReminders}>
          📧 一鍵發送今日提醒
        </button>
      </div>

      {msg && <div className="auth-alert success" style={{ marginBottom: 16 }}>{msg}</div>}

      {/* Summary */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {[
          { label: '未預約', val: statusCounts.none,      icon: '⬜', bg: 'var(--gray-100)' },
          { label: '已預約', val: statusCounts.booked,    icon: '📅', bg: 'var(--advanced-light)' },
          { label: '觀看中', val: statusCounts.watching,  icon: '▶️', bg: 'var(--primary-light)' },
          { label: '已完成', val: statusCounts.completed, icon: '✅', bg: 'var(--success-light)' },
        ].map(({ label, val, icon, bg }) => (
          <div key={label} className="stat-card">
            <div className="stat-icon" style={{ background: bg }}>{icon}</div>
            <span className="stat-label">{label}</span>
            <span className="stat-value">{val}</span>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>學員</th>
                <th>狀態</th>
                <th>觀看進度</th>
                <th>使用期限</th>
                <th>提醒信</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign:'center', padding:40, color:'var(--gray-400)' }}>尚無初階學員</td></tr>
              )}
              {students.map(user => {
                const status  = getStatus(user)
                const prog    = getTrialProgress(user.id)
                const p       = pct(prog)
                const remLog  = getReminderLog(user.id)
                const lastTpl = remLog.log.length > 0 ? remLog.log[remLog.log.length - 1].template : null
                const nextTpl = status.key !== 'completed' ? nextReminderTemplate(user.id) : null

                return (
                  <tr key={user.id}>
                    {/* Name */}
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div className="avatar" style={{ width:32, height:32, fontSize:13 }}>{user.avatar}</div>
                        <div>
                          <p style={{ fontWeight:700, fontSize:14 }}>{user.name}</p>
                          <p style={{ fontSize:12, color:'var(--gray-400)' }}>{user.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td>
                      <span style={{ fontWeight:700, color:status.color, fontSize:13 }}>
                        ● {status.label}
                      </span>
                      {status.sub && (
                        <p style={{ fontSize:12, color:'var(--gray-500)', marginTop:2 }}>{status.sub}</p>
                      )}
                    </td>

                    {/* Progress bar */}
                    <td style={{ minWidth: 140 }}>
                      {prog ? (
                        <div>
                          <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--gray-500)', marginBottom:4 }}>
                            <span>{Math.floor(prog.currentSecond / 60)} 分 / 180 分</span>
                            <span>{p}%</span>
                          </div>
                          <div style={{ height:6, background:'var(--gray-100)', borderRadius:3, overflow:'hidden' }}>
                            <div style={{ height:'100%', width:`${p}%`, background: p >= 100 ? 'var(--success)' : 'var(--primary)', borderRadius:3 }} />
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize:13, color:'var(--gray-300)' }}>—</span>
                      )}
                    </td>

                    {/* Expires */}
                    <td style={{ fontSize:13, color: user.expiresAt ? 'var(--gray-700)' : 'var(--gray-400)' }}>
                      {user.expiresAt || '尚未起算'}
                    </td>

                    {/* Reminder info */}
                    <td>
                      <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <span style={{ fontSize:11, color:'var(--gray-400)' }}>已送</span>
                          <span style={{ fontSize:13, fontWeight:700, color:'var(--gray-700)' }}>{remLog.count}</span>
                          <span style={{ fontSize:11, color:'var(--gray-400)' }}>封</span>
                          {lastTpl && (
                            <>
                              <span style={{ fontSize:11, color:'var(--gray-400)', marginLeft:4 }}>最後</span>
                              <TplBadge tplKey={lastTpl} />
                            </>
                          )}
                        </div>
                        {nextTpl && (
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <span style={{ fontSize:11, color:'var(--gray-400)' }}>下封</span>
                            <TplBadge tplKey={nextTpl} />
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ fontSize:11, padding:'2px 8px' }}
                              onClick={() => openPreview(user)}
                            >
                              預覽
                            </button>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td>
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                        {status.key !== 'completed' && (
                          <>
                            <button
                              className="btn btn-sm btn-success"
                              onClick={() => manualComplete(user)}
                            >
                              標記完成
                            </button>
                            <button
                              className="btn btn-sm"
                              style={{ background:'var(--primary-light)', color:'var(--primary)', border:'none' }}
                              onClick={() => sendReminder(user)}
                            >
                              發提醒
                            </button>
                          </>
                        )}
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => openEdit(user)}
                        >
                          調整期限
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit expiry modal */}
      {editUser && (
        <div className="modal-overlay" onClick={() => setEditUser(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">調整使用期限 — {editUser.name}</h2>
              <button className="modal-close" onClick={() => setEditUser(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">使用期限日期</label>
                <input
                  type="date"
                  className="form-input"
                  value={editExpiry}
                  onChange={e => setEditExpiry(e.target.value)}
                />
                <span className="form-hint">留空表示尚未起算（expiresAt = null）</span>
              </div>
              <div style={{ display:'flex', gap:8, marginTop:12 }}>
                {[30, 90, 180, 365].map(d => (
                  <button key={d} className="btn btn-outline btn-sm"
                    onClick={() => setEditExpiry(addDays(new Date().toISOString().split('T')[0], d))}>
                    +{d}天
                  </button>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setEditUser(null)}>取消</button>
              <button className="btn btn-primary" onClick={saveExpiry}>儲存</button>
            </div>
          </div>
        </div>
      )}

      {/* Email preview modal */}
      <PreviewModal
        user={previewUser}
        tplKey={previewTpl}
        onClose={() => { setPreviewUser(null); setPreviewTpl(null) }}
      />
    </div>
  )
}
