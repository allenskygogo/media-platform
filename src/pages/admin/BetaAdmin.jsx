import { Fragment, useState, useEffect } from 'react'
import { supabase, hasSupabase, allowLocalBetaFallback } from '../../lib/supabase'

const LS_KEY = 'beta_applications'

const STATUS_CONFIG = {
  pending:  { label: '待審核', color: '#fbbf24', bg: 'rgba(251,191,36,0.10)', border: 'rgba(251,191,36,0.30)' },
  approved: { label: '已通過', color: '#22c55e', bg: 'rgba(34,197,94,0.10)',  border: 'rgba(34,197,94,0.30)' },
  rejected: { label: '已拒絕', color: '#ef4444', bg: 'rgba(239,68,68,0.10)',  border: 'rgba(239,68,68,0.30)' },
}

const REFERRAL_LABELS = {
  ig: 'IG 帳號',
  tiktok: 'TikTok 帳號',
  friend: '朋友介紹',
  google: 'Google 搜尋',
  other: '其他',
}

const SOCIAL_LABELS = {
  yes: '有，目前在經營 IG / TikTok / YouTube',
  starting: '剛開始，還在起步階段',
  no: '還沒有，但很想開始',
}

const HOURS_LABELS = {
  '1-2': '1-2 小時',
  '3-5': '3-5 小時',
  '5+': '5 小時以上，我非常認真',
}

const SAMPLE_APPLICATIONS = [
  {
    id: 1764057601001,
    name: '林家瑋',
    email: 'chiawei.lin@example.com',
    phone: '0912-345-678',
    line_id: 'chiawei_content',
    referral_source: 'ig',
    knows_about_us: '你們主要在教自媒體如何找到有流量的題材，並把內容變成可以成交的系統。',
    industry: '健身教練',
    has_social_media: 'yes',
    weekly_hours: '5+',
    motivation: '我目前有經營健身教學帳號，但常常卡在選題和腳本，每週花很多時間還是不穩定。想參加封測是希望能用 AI 工具建立更固定的內容產出流程，也願意認真提供使用回饋。',
    pain_points: '不知道每天要拍什麼，腳本常常太像教科書，短影音前 3 秒留不住人。',
    committed: true,
    status: 'pending',
    created_at: '2026-05-26T09:10:00+08:00',
    notes: '',
  },
  {
    id: 1764057601002,
    name: '陳品妤',
    email: 'pin.yu.chen@example.com',
    phone: '0922-118-356',
    line_id: 'pinyu.foodie',
    referral_source: 'tiktok',
    knows_about_us: '頂級流量是在教創作者怎麼做短影音定位、爆款選題、內容策劃和流量轉換。',
    industry: '美食探店',
    has_social_media: 'starting',
    weekly_hours: '3-5',
    motivation: '我剛開始做美食探店內容，發現只拍好看的畫面不夠，需要更會包裝主題和故事。想加入封測，因為我希望在起步階段就建立正確的方法，也能回報新手使用工具時遇到的問題。',
    pain_points: '標題不夠吸引人，影片結構鬆散，也不知道怎麼把觀眾導到私訊或名單。',
    committed: true,
    status: 'pending',
    created_at: '2026-05-26T10:25:00+08:00',
    notes: '新手樣本，可以觀察 onboarding 是否清楚。',
  },
  {
    id: 1764057601003,
    name: '黃柏翰',
    email: 'bohan.huang@example.com',
    phone: '0930-778-521',
    line_id: '',
    referral_source: 'friend',
    knows_about_us: '你們不是只教剪影片，而是教怎麼設計內容策略、抓人群痛點和做成交。',
    industry: '線上教育',
    has_social_media: 'yes',
    weekly_hours: '1-2',
    motivation: '我有自己的線上課程，但內容行銷一直做得很零散。這次想測試 AI 能不能幫我把課程知識拆成短影音主題，提升產出速度。雖然每週時間不算多，但我會固定紀錄使用結果。',
    pain_points: '課程內容很多，但不知道怎麼切成觀眾願意看的短內容。',
    committed: true,
    status: 'pending',
    created_at: '2026-05-26T11:40:00+08:00',
    notes: '',
  },
  {
    id: 1764057601004,
    name: '吳若涵',
    email: 'ruohan.wu@example.com',
    phone: '0988-201-736',
    line_id: 'ruohan.brand',
    referral_source: 'google',
    knows_about_us: '主要教創作者從定位、內容、流量到轉換，把自媒體當成生意經營。',
    industry: '品牌顧問',
    has_social_media: 'yes',
    weekly_hours: '5+',
    motivation: '我長期協助小品牌做內容，但現在需要更高效率的題材和腳本工具。想參加封測是因為我可以用多個真實案例測試，也能從顧問角度提供產品功能和商業化建議。',
    pain_points: '不同客戶需要不同語氣和定位，希望 AI 可以快速產出可調整的內容架構。',
    committed: true,
    status: 'approved',
    created_at: '2026-05-25T16:05:00+08:00',
    notes: '已通過，適合深度訪談。',
  },
  {
    id: 1764057601005,
    name: '張育誠',
    email: 'yucheng.chang@example.com',
    phone: '0905-443-210',
    line_id: 'yc_shop',
    referral_source: 'other',
    knows_about_us: '大概是教流量和短影音變現，但細節還不太清楚。',
    industry: '電商選品',
    has_social_media: 'no',
    weekly_hours: '1-2',
    motivation: '我目前還沒有正式開始做自媒體，但想用短影音幫自己的電商產品帶流量。申請封測是想先了解 AI 工具能不能降低我的起步門檻，也希望知道自己適不適合做內容。',
    pain_points: '不知道從哪個平台開始，也不知道產品內容要怎麼拍。',
    committed: true,
    status: 'rejected',
    created_at: '2026-05-24T14:30:00+08:00',
    notes: '本輪優先給已有內容產出者。',
  },
]

function localLoad() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') }
  catch { return [] }
}

function localSave(arr) {
  localStorage.setItem(LS_KEY, JSON.stringify(arr))
}

function ensureLocalSeed() {
  const existing = localLoad()
  if (existing.length > 0) return existing
  localSave(SAMPLE_APPLICATIONS)
  return SAMPLE_APPLICATIONS
}

function sortByCreatedAt(arr) {
  return [...arr].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
}

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusBadge(status) {
  const sc = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '4px 10px',
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 700,
      color: sc.color,
      background: sc.bg,
      border: `0.5px solid ${sc.border}`,
      whiteSpace: 'nowrap',
    }}>
      {sc.label}
    </span>
  )
}

function csvEscape(value) {
  const str = String(value ?? '')
  return `"${str.replace(/"/g, '""')}"`
}

function toCsv(rows) {
  const headers = [
    ['name', '姓名'],
    ['email', 'Email'],
    ['phone', '手機'],
    ['line_id', 'Line ID'],
    ['referral_source', '從哪裡認識'],
    ['knows_about_us', '知道我們做什麼'],
    ['industry', '行業'],
    ['has_social_media', '有無自媒體'],
    ['weekly_hours', '每週時間'],
    ['motivation', '為什麼想參加'],
    ['pain_points', '希望解決的問題'],
    ['status', '狀態'],
    ['created_at', '申請時間'],
    ['notes', '備註'],
  ]
  const body = rows.map(app => headers.map(([key]) => {
    if (key === 'referral_source') return csvEscape(REFERRAL_LABELS[app[key]] || app[key])
    if (key === 'has_social_media') return csvEscape(SOCIAL_LABELS[app[key]] || app[key])
    if (key === 'weekly_hours') return csvEscape(HOURS_LABELS[app[key]] || app[key])
    if (key === 'status') return csvEscape(STATUS_CONFIG[app[key]]?.label || app[key])
    if (key === 'created_at') return csvEscape(formatDate(app[key]))
    return csvEscape(app[key])
  }).join(','))
  return `\uFEFF${headers.map(([, label]) => csvEscape(label)).join(',')}\n${body.join('\n')}`
}

function downloadCsv(rows) {
  const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `beta-applications-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function approvedEmailTemplate(name) {
  return {
    subject: '恭喜！你已通過頂級流量封測審核',
    body: `${name} 你好！

恭喜你通過頂級流量封測計劃的審核！

接下來我們會為你開通帳號，並寄出登入連結與封測說明。封測期間請依照承諾提供至少 3 次真實反饋，包含使用心得、建議和遇到的問題。

開通帳號連結：
${window.location.origin}/register

感謝你的支持，期待和你一起打磨這個產品。

頂級流量團隊`,
  }
}

function rejectedEmailTemplate(name) {
  return {
    subject: '感謝你申請頂級流量封測計劃',
    body: `${name} 你好！

感謝你申請頂級流量封測計劃。

由於本次封測名額有限，我們目前優先邀請最符合本輪測試條件的創作者，很遺憾這次未能邀請你參與。

產品正式上架後，仍非常歡迎你加入使用完整版本。

感謝你對頂級流量的支持。

頂級流量團隊`,
  }
}

function DetailBlock({ title, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'var(--gray-400)',
        marginBottom: 6,
      }}>
        {title}
      </div>
      <div style={{
        fontSize: 13,
        color: 'var(--gray-700)',
        lineHeight: 1.8,
        padding: '12px 14px',
        borderRadius: 8,
        background: 'rgba(255,255,255,0.025)',
        border: '0.5px solid rgba(255,255,255,0.06)',
      }}>
        {children || '-'}
      </div>
    </div>
  )
}

export default function BetaAdmin() {
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [dataError, setDataError] = useState('')
  const [usingLocalFallback, setUsingLocalFallback] = useState(false)
  const [filter, setFilter] = useState('all')
  const [expanded, setExpanded] = useState(null)
  const [draftNotes, setDraftNotes] = useState({})
  const [emailModal, setEmailModal] = useState(null)
  const [flashMsg, setFlashMsg] = useState('')

  useEffect(() => { loadApps() }, [])

  async function loadApps() {
    setLoading(true)
    setDataError('')
    setUsingLocalFallback(false)

    if (hasSupabase && supabase) {
      const { data, error } = await supabase
        .from('beta_applications')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error) {
        setApps(data || [])
        setLoading(false)
        return
      }

      setApps([])
      setDataError(`無法讀取 Supabase beta_applications：${error.message}`)
      setLoading(false)
      return
    }

    if (allowLocalBetaFallback) {
      // Development-only fallback. Production admins must see a clear Supabase setup error.
      setApps(sortByCreatedAt(ensureLocalSeed()))
      setUsingLocalFallback(true)
    } else {
      setApps([])
      setDataError('Supabase 尚未設定，無法讀取正式封測申請資料。')
    }
    setLoading(false)
  }

  function flash(msg) {
    setFlashMsg(msg)
    setTimeout(() => setFlashMsg(''), 3000)
  }

  function replaceApp(id, updates) {
    setApps(prev => sortByCreatedAt(prev.map(app => (
      String(app.id) === String(id) ? { ...app, ...updates } : app
    ))))

    if (allowLocalBetaFallback && !hasSupabase) {
      const local = localLoad()
      const idx = local.findIndex(app => String(app.id) === String(id))
      if (idx !== -1) {
        local[idx] = { ...local[idx], ...updates }
        localSave(local)
      }
    }
  }

  async function updateStatus(app, status) {
    if (hasSupabase && supabase) {
      const { error } = await supabase
        .from('beta_applications')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', app.id)
      if (error) {
        setDataError(`狀態更新失敗：${error.message}`)
        return
      }
    } else if (!allowLocalBetaFallback) {
      setDataError('Supabase 尚未設定，無法更新正式封測申請資料。')
      return
    }

    replaceApp(app.id, { status, updated_at: new Date().toISOString() })
    const tpl = status === 'approved' ? approvedEmailTemplate(app.name) : rejectedEmailTemplate(app.name)
    setEmailModal({ ...tpl, email: app.email, status })
    flash(status === 'approved' ? `已通過 ${app.name} 的申請` : `已拒絕 ${app.name} 的申請`)
  }

  async function saveNotes(app) {
    const notes = draftNotes[app.id] ?? app.notes ?? ''

    if (hasSupabase && supabase) {
      const { error } = await supabase
        .from('beta_applications')
        .update({ notes, updated_at: new Date().toISOString() })
        .eq('id', app.id)
      if (error) {
        setDataError(`備註更新失敗：${error.message}`)
        return
      }
    } else if (!allowLocalBetaFallback) {
      setDataError('Supabase 尚未設定，無法更新正式封測申請資料。')
      return
    }

    replaceApp(app.id, { notes, updated_at: new Date().toISOString() })
    flash(`已儲存 ${app.name} 的備註`)
  }

  function openNotes(app) {
    setExpanded(app.id)
    setDraftNotes(prev => ({ ...prev, [app.id]: prev[app.id] ?? app.notes ?? '' }))
    setTimeout(() => document.getElementById(`beta-notes-${app.id}`)?.focus(), 0)
  }

  const filtered = filter === 'all' ? apps : apps.filter(app => app.status === filter)
  const stats = {
    total: apps.length,
    pending: apps.filter(app => app.status === 'pending').length,
    approved: apps.filter(app => app.status === 'approved').length,
    rejected: apps.filter(app => app.status === 'rejected').length,
  }

  return (
    <div>
      <div className="page-actions" style={{ marginBottom: 24, alignItems: 'flex-start' }}>
        <div className="page-heading" style={{ margin: 0 }}>
          <h1>封測管理</h1>
          <p>管理封測申請、審核狀態與內部備註</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <a href="/beta" target="_blank" rel="noreferrer" className="btn btn-secondary">
            查看資料包頁
          </a>
          <button className="btn btn-primary" onClick={() => downloadCsv(apps)} disabled={apps.length === 0}>
            匯出 CSV
          </button>
        </div>
      </div>

      {flashMsg && <div className="auth-alert success" style={{ marginBottom: 16 }}>{flashMsg}</div>}
      {dataError && <div className="auth-alert error" style={{ marginBottom: 16 }}>{dataError}</div>}
      {usingLocalFallback && (
        <div className="auth-alert" style={{ marginBottom: 16 }}>
          目前使用開發測試資料（localStorage），尚未連線到正式 Supabase beta_applications。
        </div>
      )}

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {[
          { label: '總申請數', value: stats.total },
          { label: '待審核', value: stats.pending },
          { label: '已通過', value: stats.approved },
          { label: '已拒絕', value: stats.rejected },
        ].map(item => (
          <div key={item.label} className="stat-card">
            <div className="stat-value">{item.value}</div>
            <div className="stat-label">{item.label}</div>
          </div>
        ))}
      </div>

      <div className="filter-bar">
        {[
          { key: 'all', label: `全部 (${stats.total})` },
          { key: 'pending', label: `待審核 (${stats.pending})` },
          { key: 'approved', label: `已通過 (${stats.approved})` },
          { key: 'rejected', label: `已拒絕 (${stats.rejected})` },
        ].map(item => (
          <button
            key={item.key}
            className={`filter-chip ${filter === item.key ? 'active' : ''}`}
            onClick={() => setFilter(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--gray-400)' }}>載入中...</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>姓名</th>
                  <th>Email</th>
                  <th>手機</th>
                  <th>行業</th>
                  <th>從哪裡認識</th>
                  <th>知道我們做什麼</th>
                  <th>每週時間</th>
                  <th>申請時間</th>
                  <th>狀態</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>
                      沒有符合條件的申請
                    </td>
                  </tr>
                ) : filtered.map(app => {
                  const isOpen = String(expanded) === String(app.id)
                  return (
                    <Fragment key={app.id}>
                      <tr style={{ cursor: 'pointer' }} onClick={() => setExpanded(isOpen ? null : app.id)}>
                        <td style={{ fontWeight: 700, color: 'var(--gray-900)', whiteSpace: 'nowrap' }}>{app.name}</td>
                        <td>{app.email}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{app.phone}</td>
                        <td>{app.industry}</td>
                        <td>{REFERRAL_LABELS[app.referral_source] || app.referral_source || '-'}</td>
                        <td style={{ maxWidth: 220 }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {app.knows_about_us || '-'}
                          </div>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>{HOURS_LABELS[app.weekly_hours] || app.weekly_hours || '-'}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{formatDate(app.created_at)}</td>
                        <td>{statusBadge(app.status)}</td>
                        <td onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => updateStatus(app, 'approved')}
                              disabled={app.status === 'approved'}
                              style={{ background: '#22c55e', color: '#fff' }}
                            >
                              通過
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => updateStatus(app, 'rejected')}
                              disabled={app.status === 'rejected'}
                              style={{ background: '#ef4444', color: '#fff' }}
                            >
                              拒絕
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={() => openNotes(app)}>
                              備註
                            </button>
                          </div>
                        </td>
                      </tr>

                      {isOpen && (
                        <tr>
                          <td colSpan={10} style={{ background: 'rgba(0,0,0,0.18)', padding: 20 }}>
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
                              gap: 16,
                              marginBottom: 16,
                            }}>
                              <DetailBlock title="有無自媒體">{SOCIAL_LABELS[app.has_social_media] || app.has_social_media}</DetailBlock>
                              <DetailBlock title="Line ID">{app.line_id || '未填'}</DetailBlock>
                              <DetailBlock title="承諾狀態">{app.committed ? '已勾選承諾' : '未勾選'}</DetailBlock>
                            </div>

                            <DetailBlock title="為什麼想參加">{app.motivation}</DetailBlock>
                            <DetailBlock title="希望 AI 工具解決什麼問題">{app.pain_points || '未填'}</DetailBlock>

                            <div>
                              <div style={{
                                fontSize: 11,
                                fontWeight: 700,
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                color: 'var(--gray-400)',
                                marginBottom: 6,
                              }}>
                                內部備註
                              </div>
                              <textarea
                                id={`beta-notes-${app.id}`}
                                className="form-textarea"
                                value={draftNotes[app.id] ?? app.notes ?? ''}
                                onChange={e => setDraftNotes(prev => ({ ...prev, [app.id]: e.target.value }))}
                                placeholder="新增內部備註..."
                                style={{ minHeight: 96, marginBottom: 10 }}
                              />
                              <button className="btn btn-primary btn-sm" onClick={() => saveNotes(app)}>
                                儲存備註
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {emailModal && (
        <div className="modal-overlay" onClick={() => setEmailModal(null)}>
          <div className="modal" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {emailModal.status === 'approved' ? '通過通知 Email 預覽' : '拒絕感謝 Email 預覽'}
              </h2>
              <button className="modal-close" onClick={() => setEmailModal(null)}>x</button>
            </div>
            <div className="modal-body">
              <DetailBlock title="收件人">{emailModal.email}</DetailBlock>
              <DetailBlock title="主旨">{emailModal.subject}</DetailBlock>
              <pre style={{
                fontSize: 13,
                lineHeight: 1.8,
                color: 'var(--gray-700)',
                padding: '12px 14px',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.02)',
                border: '0.5px solid var(--glass-border)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontFamily: 'inherit',
              }}>
                {emailModal.body}
              </pre>
              <p style={{ fontSize: 12, color: 'var(--gray-400)' }}>
                目前為預覽模式；若要真正自動發送，需接入 Email 服務。
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => window.open(`mailto:${emailModal.email}?subject=${encodeURIComponent(emailModal.subject)}&body=${encodeURIComponent(emailModal.body)}`)}
              >
                開啟郵件客戶端
              </button>
              <button className="btn btn-primary" onClick={() => setEmailModal(null)}>關閉</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
