import { useEffect, useMemo, useState } from 'react'
import { getUsers, TIER_META } from '../../data/mockData'

const ACTIVITY_MESSAGES_KEY = 'mp_activity_messages'
const ACTIVITY_SEND_LOG_KEY = 'mp_activity_send_logs'

const ACTIVITY_TYPES = [
  { key: 'offline_class', label: '實體課程' },
  { key: 'online_event', label: '線上活動' },
  { key: 'workshop', label: '工作坊' },
  { key: 'offer', label: '優惠通知' },
  { key: 'announcement', label: '一般公告' },
]

const AUDIENCES = [
  { key: 'all', label: '全部學員' },
  { key: 'basic', label: '體驗課會員' },
  { key: 'standard', label: '頂流達人' },
  { key: 'advanced', label: '頂流私塾' },
]

const DEFAULT_FORM = {
  title: '',
  type: 'offline_class',
  audience: 'all',
  date: '',
  location: '',
  body: '',
  ctaText: '立即回覆報名',
  ctaUrl: '',
}

function readJson(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null')
    return value ?? fallback
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

function formatDateTime(value) {
  if (!value) return '未設定'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getActivityTypeLabel(type) {
  return ACTIVITY_TYPES.find(item => item.key === type)?.label || '活動'
}

function getAudienceLabel(audience) {
  return AUDIENCES.find(item => item.key === audience)?.label || '全部學員'
}

function buildMessage(form) {
  const lines = [
    `【${getActivityTypeLabel(form.type)}】${form.title || '活動通知'}`,
    form.date ? `時間：${formatDateTime(form.date)}` : null,
    form.location ? `地點：${form.location}` : null,
    '',
    form.body || '活動內容待補充。',
    '',
    form.ctaText ? `行動：${form.ctaText}` : null,
    form.ctaUrl ? `連結：${form.ctaUrl}` : null,
  ]
  return lines.filter(line => line !== null).join('\n')
}

function targetStudents(users, audience) {
  const students = users.filter(user => user.role === 'student' && user.tier !== 'managed' && user.status !== 'inactive')
  if (audience === 'all') return students
  return students.filter(user => user.tier === audience)
}

export default function TrialAdmin() {
  const [users, setUsers] = useState(() => getUsers())
  const [messages, setMessages] = useState(() => readJson(ACTIVITY_MESSAGES_KEY, []))
  const [sendLogs, setSendLogs] = useState(() => readJson(ACTIVITY_SEND_LOG_KEY, []))
  const [form, setForm] = useState(DEFAULT_FORM)
  const [selectedId, setSelectedId] = useState('')
  const [msg, setMsg] = useState('')

  const selectedMessage = messages.find(item => String(item.id) === String(selectedId)) || null
  const recipients = useMemo(() => targetStudents(users, form.audience), [users, form.audience])
  const latestLogs = sendLogs.slice(0, 8)

  useEffect(() => {
    const sync = () => setUsers(getUsers())
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  const flash = (text) => {
    setMsg(text)
    setTimeout(() => setMsg(''), 3500)
  }

  const updateForm = (key) => (event) => {
    setForm(prev => ({ ...prev, [key]: event.target.value }))
  }

  const saveMessage = () => {
    if (!form.title.trim()) {
      flash('請先填寫活動標題')
      return
    }
    if (!form.body.trim()) {
      flash('請先填寫活動內容')
      return
    }

    const nextMessage = {
      ...form,
      id: selectedMessage?.id || Date.now(),
      updatedAt: new Date().toISOString(),
      createdAt: selectedMessage?.createdAt || new Date().toISOString(),
    }
    const next = selectedMessage
      ? messages.map(item => item.id === selectedMessage.id ? nextMessage : item)
      : [nextMessage, ...messages]
    setMessages(next)
    writeJson(ACTIVITY_MESSAGES_KEY, next)
    setSelectedId(String(nextMessage.id))
    flash(selectedMessage ? '活動訊息已更新' : '活動訊息已建立')
  }

  const loadMessage = (id) => {
    setSelectedId(id)
    const item = messages.find(message => String(message.id) === String(id))
    if (item) {
      const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...nextForm } = item
      setForm({ ...DEFAULT_FORM, ...nextForm })
    }
  }

  const resetForm = () => {
    setSelectedId('')
    setForm(DEFAULT_FORM)
  }

  const sendActivity = () => {
    if (!form.title.trim() || !form.body.trim()) {
      flash('請先填寫活動標題與內容')
      return
    }
    if (recipients.length === 0) {
      flash('目前沒有符合條件的收件學員')
      return
    }

    const activity = selectedMessage || {
      ...form,
      id: Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const savedMessages = selectedMessage ? messages : [activity, ...messages]
    setMessages(savedMessages)
    writeJson(ACTIVITY_MESSAGES_KEY, savedMessages)
    setSelectedId(String(activity.id))

    const log = {
      id: Date.now(),
      activityId: activity.id,
      title: form.title,
      type: form.type,
      audience: form.audience,
      recipientCount: recipients.length,
      sentAt: new Date().toISOString(),
      preview: buildMessage(form),
    }
    const nextLogs = [log, ...sendLogs]
    setSendLogs(nextLogs)
    writeJson(ACTIVITY_SEND_LOG_KEY, nextLogs)
    flash(`已建立發送紀錄：${getAudienceLabel(form.audience)} ${recipients.length} 位`)
  }

  return (
    <div>
      <div className="page-actions" style={{ marginBottom: 24 }}>
        <div className="page-heading" style={{ margin: 0 }}>
          <h1>活動管理</h1>
          <p>建立實體課程、線上活動、優惠公告，之後可接 Email、Line OA 或簡訊一鍵發送。</p>
        </div>
        <button className="btn btn-primary" onClick={sendActivity}>
          一鍵發送活動資訊
        </button>
      </div>

      {msg && <div className="auth-alert success" style={{ marginBottom: 16 }}>{msg}</div>}

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {AUDIENCES.map(audience => {
          const count = targetStudents(users, audience.key).length
          return (
            <div key={audience.key} className="stat-card">
              <div className="stat-icon" style={{ background: audience.key === form.audience ? 'var(--primary-light)' : 'var(--gray-100)' }}>
                {audience.label.slice(0, 1)}
              </div>
              <span className="stat-label">{audience.label}</span>
              <span className="stat-value">{count}</span>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.15fr) minmax(320px, 0.85fr)', gap: 20, alignItems: 'start' }}>
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">{selectedMessage ? '編輯活動訊息' : '新增活動訊息'}</h2>
              <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 4 }}>儲存後可重複使用，一鍵發送會留下紀錄方便追蹤。</p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={resetForm}>新增空白活動</button>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label">載入既有活動</label>
              <select className="form-select" value={selectedId} onChange={e => loadMessage(e.target.value)}>
                <option value="">新增活動訊息</option>
                {messages.map(item => (
                  <option key={item.id} value={item.id}>{item.title}｜{getActivityTypeLabel(item.type)}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">活動標題 *</label>
                <input className="form-input" value={form.title} onChange={updateForm('title')} placeholder="例：台北實體課程｜短影音定位工作坊" />
              </div>
              <div className="form-group">
                <label className="form-label">活動類型</label>
                <select className="form-select" value={form.type} onChange={updateForm('type')}>
                  {ACTIVITY_TYPES.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">發送對象</label>
                <select className="form-select" value={form.audience} onChange={updateForm('audience')}>
                  {AUDIENCES.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}
                </select>
                <span className="form-hint">目前符合條件：{recipients.length} 位</span>
              </div>
              <div className="form-group">
                <label className="form-label">活動時間</label>
                <input className="form-input" type="datetime-local" value={form.date} onChange={updateForm('date')} />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">活動地點 / 連線方式</label>
                <input className="form-input" value={form.location} onChange={updateForm('location')} placeholder="例：台北市中山區 / Zoom 連結開課前提供" />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">活動內容 *</label>
                <textarea
                  className="form-textarea"
                  value={form.body}
                  onChange={updateForm('body')}
                  rows={7}
                  placeholder="寫給學員看的活動說明，例如課程亮點、適合對象、名額限制、報名方式..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">行動按鈕文字</label>
                <input className="form-input" value={form.ctaText} onChange={updateForm('ctaText')} placeholder="例：我要報名" />
              </div>
              <div className="form-group">
                <label className="form-label">活動連結</label>
                <input className="form-input" value={form.ctaUrl} onChange={updateForm('ctaUrl')} placeholder="Line@、表單、活動頁連結" />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="btn btn-secondary" onClick={saveMessage}>儲存活動訊息</button>
              <button className="btn btn-primary" onClick={sendActivity}>一鍵發送</button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">訊息預覽</h2>
              <span className="badge badge-active">{getAudienceLabel(form.audience)}</span>
            </div>
            <div className="card-body">
              <pre style={{
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontFamily: 'inherit',
                fontSize: 13,
                lineHeight: 1.8,
                color: 'var(--gray-700)',
                background: 'var(--gray-50)',
                border: '1px solid var(--gray-200)',
                borderRadius: 8,
                padding: 14,
              }}>{buildMessage(form)}</pre>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="card-title">最近發送紀錄</h2>
              <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>{sendLogs.length} 筆</span>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {latestLogs.length === 0 ? (
                <p style={{ color: 'var(--gray-400)', fontSize: 13, margin: 0 }}>尚無發送紀錄</p>
              ) : latestLogs.map(log => (
                <div key={log.id} style={{ padding: 12, borderRadius: 8, border: '1px solid var(--gray-200)', background: 'var(--gray-50)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 4 }}>
                    <strong style={{ fontSize: 13, color: 'var(--gray-900)' }}>{log.title}</strong>
                    <span style={{ fontSize: 12, color: 'var(--gray-400)', whiteSpace: 'nowrap' }}>{formatDateTime(log.sentAt)}</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--gray-500)', margin: 0 }}>
                    {getActivityTypeLabel(log.type)}｜{getAudienceLabel(log.audience)}｜{log.recipientCount} 位
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="card-title">發送對象預覽</h2>
              <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>{recipients.length} 位</span>
            </div>
            <div className="card-body" style={{ maxHeight: 260, overflow: 'auto' }}>
              {recipients.length === 0 ? (
                <p style={{ color: 'var(--gray-400)', fontSize: 13, margin: 0 }}>沒有符合條件的學員</p>
              ) : recipients.slice(0, 20).map(user => (
                <div key={user.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--gray-100)' }}>
                  <div>
                    <strong style={{ fontSize: 13 }}>{user.name}</strong>
                    <p style={{ fontSize: 12, color: 'var(--gray-400)', margin: 0 }}>{user.email}</p>
                  </div>
                  <span className={`badge badge-${user.tier || 'basic'}`}>{TIER_META[user.tier]?.label || '學員'}</span>
                </div>
              ))}
              {recipients.length > 20 && (
                <p style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 10 }}>另有 {recipients.length - 20} 位未顯示</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
