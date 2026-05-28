import { useState, useEffect } from 'react'
import {
  getSessions, saveSessions, initLiveSessions,
  getSessionBookings, getWatchProgress, getSessionState,
} from '../../data/mockData'

const DEMO_VIDEOS = [
  { id: 1, title: 'YouTube 頻道從零開始' },
  { id: 2, title: '短影音爆紅公式：IG Reels & TikTok' },
]

const STATE_LABEL = { upcoming: '即將開始', live: '進行中', ended: '已結束' }
const STATE_COLOR = { upcoming: 'var(--primary)', live: '#ef4444', ended: 'var(--gray-400)' }

const EMPTY_FORM = {
  title: '', scheduledAt: '', durationMin: 45,
  videoId: 1, recurrenceDisplay: '', published: true,
}

export default function LiveAdmin() {
  const [sessions, setSessions]   = useState([])
  const [bookings, setBookings]   = useState([])
  const [showForm, setShowForm]   = useState(false)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [detailId, setDetailId]   = useState(null)
  const [msg, setMsg]             = useState('')
  const [, tick]                  = useState(0)

  const refresh = () => {
    initLiveSessions()
    setSessions(getSessions())
    setBookings(getSessionBookings())
  }

  useEffect(() => {
    refresh()
    const t = setInterval(() => tick(n => n + 1), 5000)
    return () => clearInterval(t)
  }, [])

  const flash = (t) => { setMsg(t); setTimeout(() => setMsg(''), 3000) }

  const upd = (k) => (e) =>
    setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const saveSession = () => {
    if (!form.title.trim() || !form.scheduledAt) return
    const all = getSessions()
    all.push({
      id: Date.now(),
      isDemo: false, isPrivate: false,
      title: form.title.trim(),
      videoId: Number(form.videoId),
      scheduledAt: new Date(form.scheduledAt).toISOString(),
      durationSec: Number(form.durationMin) * 60,
      recurrenceDisplay: form.recurrenceDisplay.trim() || '單次場次',
      published: form.published,
    })
    saveSessions(all)
    setShowForm(false)
    setForm(EMPTY_FORM)
    flash('場次已新增')
    refresh()
  }

  const deleteSession = (id) => {
    if (!window.confirm('確定刪除此場次？')) return
    saveSessions(getSessions().filter(s => s.id !== id))
    if (detailId === id) setDetailId(null)
    flash('場次已刪除')
    refresh()
  }

  const togglePublish = (session) => {
    const all = getSessions()
    const idx = all.findIndex(s => s.id === session.id)
    all[idx] = { ...all[idx], published: !all[idx].published }
    saveSessions(all)
    refresh()
  }

  const bookCount      = (sid) => bookings.filter(b => String(b.sessionId) === String(sid)).length
  const completedCount = (sid) => {
    const all = JSON.parse(localStorage.getItem('mp_watch_progress') || '[]')
    return all.filter(w => String(w.sessionId) === String(sid) && w.completed).length
  }

  // Sort: live first, then upcoming, then ended
  const ORDER = { live: 0, upcoming: 1, ended: 2 }
  const sorted = [...sessions].sort((a, b) => {
    const sa = getSessionState(a), sb = getSessionState(b)
    return (ORDER[sa] ?? 9) - (ORDER[sb] ?? 9)
  })

  const detailSession = sessions.find(s => s.id === detailId)
  const detailBookers = detailSession
    ? bookings.filter(b => String(b.sessionId) === String(detailSession.id))
    : []

  return (
    <div>
      <div className="page-actions" style={{ marginBottom: 24 }}>
        <div className="page-heading" style={{ margin: 0 }}>
          <h1>直播管理</h1>
          <p>固定場次排程與學員觀看數據</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowForm(true); setDetailId(null) }}>
          + 新增場次
        </button>
      </div>

      {msg && (
        <div className="auth-alert success" style={{ marginBottom: 16 }}>{msg}</div>
      )}

      {/* ── Add session form ── */}
      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <h2 className="card-title">新增直播場次</h2>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>×</button>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">場次標題 *</label>
                <input className="form-input" placeholder="例：自媒體入門直播課 EP4" value={form.title} onChange={upd('title')} />
              </div>
              <div className="form-group">
                <label className="form-label">排定時間 *</label>
                <input type="datetime-local" className="form-input" value={form.scheduledAt} onChange={upd('scheduledAt')} />
              </div>
              <div className="form-group">
                <label className="form-label">課程長度（分鐘）</label>
                <input type="number" className="form-input" min={10} max={180} value={form.durationMin} onChange={upd('durationMin')} />
              </div>
              <div className="form-group">
                <label className="form-label">使用課程影片</label>
                <select className="form-select" value={form.videoId} onChange={upd('videoId')}>
                  {DEMO_VIDEOS.map(v => (
                    <option key={v.id} value={v.id}>{v.title}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">重複說明（顯示用）</label>
                <input className="form-input" placeholder="例：每週四 20:00" value={form.recurrenceDisplay} onChange={upd('recurrenceDisplay')} />
              </div>
              <div className="form-group" style={{ justifyContent: 'flex-end' }}>
                <label className="form-label">發布狀態</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 8 }}>
                  <input type="checkbox" checked={form.published} onChange={upd('published')} style={{ width: 16, height: 16 }} />
                  <span style={{ fontSize: 14 }}>立即發布（學員可見）</span>
                </label>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-primary" onClick={saveSession} disabled={!form.title.trim() || !form.scheduledAt}>
                儲存場次
              </button>
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>取消</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: detailId ? '1fr 360px' : '1fr', gap: 24 }}>
        {/* ── Session table ── */}
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>場次標題</th><th>排定時間</th><th>長度</th>
                  <th>狀態</th><th>預約</th><th>完課</th><th>操作</th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>
                      尚無場次資料
                    </td>
                  </tr>
                ) : sorted.map(s => {
                  const state = getSessionState(s)
                  const bc    = bookCount(s.id)
                  const cc    = completedCount(s.id)
                  return (
                    <tr key={s.id} style={{ cursor: 'pointer', background: detailId === s.id ? 'var(--primary-light)' : undefined }}
                      onClick={() => setDetailId(id => id === s.id ? null : s.id)}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{s.title}</div>
                        {s.isDemo && <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>示範場次</span>}
                        {s.isPrivate && <span style={{ fontSize: 11, color: 'var(--managed-text)' }}>私人場次</span>}
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--gray-600)' }}>
                        {new Date(s.scheduledAt).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ fontSize: 13 }}>{Math.floor(s.durationSec / 60)} 分</td>
                      <td>
                        <span style={{ fontSize: 12, fontWeight: 700, color: STATE_COLOR[state] }}>
                          ● {STATE_LABEL[state]}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700 }}>{bc}</td>
                      <td>
                        <span style={{ color: cc > 0 ? 'var(--success)' : 'var(--gray-400)', fontWeight: cc > 0 ? 700 : 400 }}>
                          {cc}
                        </span>
                        {bc > 0 && (
                          <span style={{ fontSize: 11, color: 'var(--gray-400)', marginLeft: 4 }}>
                            ({Math.round(cc / bc * 100)}%)
                          </span>
                        )}
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-secondary btn-sm"
                            onClick={() => togglePublish(s)}>
                            {s.published ? '下架' : '發布'}
                          </button>
                          {!s.isDemo && (
                            <button className="btn btn-sm" style={{ background: 'var(--danger-light)', color: '#b91c1c', border: 'none' }}
                              onClick={() => deleteSession(s.id)}>
                              刪除
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Detail panel ── */}
        {detailId && detailSession && (
          <div className="card" style={{ alignSelf: 'start', position: 'sticky', top: 80 }}>
            <div className="card-header">
              <h2 className="card-title" style={{ fontSize: 14 }}>場次詳情</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setDetailId(null)}>×</button>
            </div>
            <div className="card-body" style={{ fontSize: 14 }}>
              <p style={{ fontWeight: 700, marginBottom: 12 }}>{detailSession.title}</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, color: 'var(--gray-600)', marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>排定時間</span>
                  <span style={{ fontWeight: 600, color: 'var(--gray-900)' }}>
                    {new Date(detailSession.scheduledAt).toLocaleString('zh-TW')}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>課程長度</span>
                  <span style={{ fontWeight: 600, color: 'var(--gray-900)' }}>
                    {Math.floor(detailSession.durationSec / 60)} 分鐘
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>預約人數</span>
                  <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{bookCount(detailId)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>完課人數</span>
                  <span style={{ fontWeight: 700, color: 'var(--success)' }}>{completedCount(detailId)}</span>
                </div>
              </div>

              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-500)', marginBottom: 8 }}>預約學員</p>
              {detailBookers.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--gray-400)' }}>尚無預約</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {detailBookers.map(b => {
                    const progress = JSON.parse(localStorage.getItem('mp_watch_progress') || '[]')
                      .find(w => w.userId === b.userId && String(w.sessionId) === String(b.sessionId))
                    return (
                      <div key={b.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        background: 'var(--gray-50)', padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                      }}>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>學員 #{b.userId}</span>
                        <span style={{
                          fontSize: 12, fontWeight: 700,
                          color: progress?.completed ? 'var(--success)' : progress ? 'var(--primary)' : 'var(--gray-400)',
                        }}>
                          {progress?.completed
                            ? '已完課'
                            : progress
                            ? `觀看至 ${Math.floor(progress.currentSecond / 60)} 分`
                            : '未觀看'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
