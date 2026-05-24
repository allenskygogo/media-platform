import { useState, useEffect } from 'react'
import {
  getAllHomework, getUsers, getCourses,
  approveHomework, rejectHomework,
  getHomeworkSpec, saveHomeworkSpec,
} from '../../data/mockData'

const REJECTION_TEMPLATES = [
  '影片長度不符合規範（需 60–90 秒）',
  '主題偏離本堂課內容，請重新製作',
  '畫質或音質需要改善，請重新錄製',
  '請依照課程規範重新製作並提交',
]

const STATUS_LABEL = {
  pending:  { text:'待審核', color:'var(--advanced-text)', bg:'var(--advanced-light)' },
  approved: { text:'已批准', color:'var(--success)',       bg:'var(--success-light)'  },
  rejected: { text:'已退回', color:'var(--danger)',        bg:'var(--danger-light)'   },
}

function RejectModal({ submission, onReject, onClose }) {
  const [reason, setReason] = useState('')
  const [custom, setCustom] = useState('')

  const finalReason = reason === '__custom__' ? custom : reason

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">退回作業</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize:14, color:'var(--gray-600)', marginBottom:16 }}>
            選擇退回原因（學員將收到通知）
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
            {REJECTION_TEMPLATES.map(t => (
              <label key={t} style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer',
                padding:'10px 12px', border:'1.5px solid', borderColor: reason === t ? 'var(--primary)' : 'var(--gray-200)',
                borderRadius:'var(--radius)', background: reason === t ? 'var(--primary-light)' : 'var(--white)',
                fontSize:14, transition:'var(--transition)' }}>
                <input type="radio" name="reason" value={t} checked={reason === t}
                  onChange={() => setReason(t)} style={{ accentColor:'var(--primary)' }} />
                {t}
              </label>
            ))}
            <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer',
              padding:'10px 12px', border:'1.5px solid',
              borderColor: reason === '__custom__' ? 'var(--primary)' : 'var(--gray-200)',
              borderRadius:'var(--radius)', background: reason === '__custom__' ? 'var(--primary-light)' : 'var(--white)',
              fontSize:14 }}>
              <input type="radio" name="reason" value="__custom__" checked={reason === '__custom__'}
                onChange={() => setReason('__custom__')} style={{ accentColor:'var(--primary)' }} />
              自訂原因
            </label>
          </div>
          {reason === '__custom__' && (
            <textarea
              className="form-input"
              rows={3}
              placeholder="輸入退回原因…"
              value={custom}
              onChange={e => setCustom(e.target.value)}
              style={{ resize:'vertical' }}
            />
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>取消</button>
          <button
            className="btn btn-danger"
            disabled={!finalReason.trim()}
            onClick={() => { onReject(submission.id, finalReason); onClose() }}
          >
            確認退回
          </button>
        </div>
      </div>
    </div>
  )
}

function SpecModal({ lessonId, lessonTitle, currentSpec, onSave, onClose }) {
  const [spec, setSpec] = useState(currentSpec?.spec || '')
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">設定作業規範 — {lessonTitle}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">作業要求說明</label>
            <textarea
              className="form-input"
              rows={6}
              placeholder="例如：拍攝一支 60–90 秒短影音，主題需符合本堂課所學，上傳至 YouTube 或 IG Reels 後提交連結。"
              value={spec}
              onChange={e => setSpec(e.target.value)}
              style={{ resize:'vertical' }}
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>取消</button>
          <button className="btn btn-primary"
            onClick={() => { onSave(lessonId, spec); onClose() }}>
            儲存
          </button>
        </div>
      </div>
    </div>
  )
}

export default function HomeworkAdmin() {
  const [homeworks, setHomeworks] = useState([])
  const [filter, setFilter]       = useState('pending')
  const [rejectTarget, setRejectTarget] = useState(null)
  const [specTarget, setSpecTarget]     = useState(null)
  const [msg, setMsg] = useState('')

  const users   = getUsers()
  const courses = getCourses()

  const refresh = () => setHomeworks(getAllHomework())

  useEffect(() => { refresh() }, [])

  const flash = t => { setMsg(t); setTimeout(() => setMsg(''), 3000) }

  const handleApprove = (id) => {
    approveHomework(id)
    refresh()
    flash('✅ 已批准作業，學員下一堂課解鎖')
  }

  const handleReject = (id, reason) => {
    rejectHomework(id, reason)
    refresh()
    flash('已退回作業，學員將收到退回原因')
  }

  const handleSaveSpec = (lessonId, spec) => {
    saveHomeworkSpec(lessonId, spec)
    flash('✅ 作業規範已儲存')
  }

  // Enrich homework with user/course/lesson info
  const enriched = homeworks
    .filter(h => filter === 'all' || h.status === filter)
    .map(h => {
      const user   = users.find(u => u.id === h.userId)
      const course = courses.find(c => c.id === h.courseId)
      const lesson = course?.lessons.find(l => l.id === h.lessonId)
      const spec   = getHomeworkSpec(h.lessonId)
      return { ...h, user, course, lesson, spec }
    })
    .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))

  const pendingCount = homeworks.filter(h => h.status === 'pending').length

  return (
    <div>
      <div className="page-heading">
        <div>
          <h1>作業審核</h1>
          <p>審核學員提交的課後作業</p>
        </div>
      </div>

      {msg && <div className="auth-alert success" style={{ marginBottom:16 }}>{msg}</div>}

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:20 }}>
        {[
          { key:'pending',  label:`待審核 ${pendingCount > 0 ? `(${pendingCount})` : ''}` },
          { key:'approved', label:'已批准' },
          { key:'rejected', label:'已退回' },
          { key:'all',      label:'全部' },
        ].map(({ key, label }) => (
          <button key={key}
            className={`btn btn-sm ${filter === key ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter(key)}>
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>學員</th>
                <th>課程 / 堂</th>
                <th>提交時間</th>
                <th>影片連結</th>
                <th>補充說明</th>
                <th>狀態</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {enriched.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign:'center', padding:40, color:'var(--gray-400)' }}>
                    無作業記錄
                  </td>
                </tr>
              )}
              {enriched.map(hw => {
                const st = STATUS_LABEL[hw.status] || STATUS_LABEL.pending
                return (
                  <tr key={hw.id}>
                    {/* Student */}
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div className="avatar" style={{ width:30, height:30, fontSize:12 }}>
                          {hw.user?.avatar}
                        </div>
                        <div>
                          <p style={{ fontWeight:700, fontSize:13 }}>{hw.user?.name}</p>
                          <p style={{ fontSize:11, color:'var(--gray-400)' }}>{hw.user?.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Course / lesson */}
                    <td>
                      <p style={{ fontSize:13, fontWeight:600, color:'var(--gray-800)' }}>
                        {hw.course?.title}
                      </p>
                      <p style={{ fontSize:12, color:'var(--gray-500)' }}>{hw.lesson?.title}</p>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize:10, padding:'2px 6px', marginTop:4 }}
                        onClick={() => setSpecTarget({ lessonId: hw.lessonId, lessonTitle: hw.lesson?.title, spec: hw.spec })}
                      >
                        ⚙ 編輯作業規範
                      </button>
                    </td>

                    {/* Time */}
                    <td style={{ fontSize:12, color:'var(--gray-500)' }}>
                      {new Date(hw.submittedAt).toLocaleString('zh-TW', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' })}
                      {hw.reviewedAt && (
                        <p style={{ marginTop:2 }}>
                          審核：{new Date(hw.reviewedAt).toLocaleString('zh-TW', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' })}
                        </p>
                      )}
                    </td>

                    {/* Video link */}
                    <td>
                      {hw.videoUrl ? (
                        <a href={hw.videoUrl} target="_blank" rel="noreferrer"
                          className="btn btn-ghost btn-sm" style={{ fontSize:12 }}>
                          查看影片 ↗
                        </a>
                      ) : (
                        <span style={{ color:'var(--gray-300)', fontSize:12 }}>無</span>
                      )}
                    </td>

                    {/* Note */}
                    <td style={{ maxWidth:200 }}>
                      {hw.note ? (
                        <p style={{ fontSize:12, color:'var(--gray-600)', whiteSpace:'pre-wrap', lineClamp:3 }}>
                          {hw.note.slice(0, 100)}{hw.note.length > 100 ? '…' : ''}
                        </p>
                      ) : (
                        <span style={{ color:'var(--gray-300)', fontSize:12 }}>—</span>
                      )}
                      {hw.rejectionReason && (
                        <p style={{ fontSize:11, color:'var(--danger)', marginTop:4 }}>
                          退回：{hw.rejectionReason}
                        </p>
                      )}
                    </td>

                    {/* Status badge */}
                    <td>
                      <span style={{
                        display:'inline-block', padding:'4px 10px', borderRadius:999,
                        fontSize:12, fontWeight:700, background: st.bg, color: st.color,
                      }}>
                        {st.text}
                      </span>
                    </td>

                    {/* Actions */}
                    <td>
                      {hw.status === 'pending' && (
                        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                          <button className="btn btn-sm btn-success"
                            onClick={() => handleApprove(hw.id)}>
                            批准
                          </button>
                          <button className="btn btn-sm btn-danger"
                            onClick={() => setRejectTarget(hw)}>
                            退回
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Spec editor modal */}
      {specTarget && (
        <SpecModal
          lessonId={specTarget.lessonId}
          lessonTitle={specTarget.lessonTitle}
          currentSpec={specTarget.spec}
          onSave={handleSaveSpec}
          onClose={() => setSpecTarget(null)}
        />
      )}

      {/* Reject modal */}
      {rejectTarget && (
        <RejectModal
          submission={rejectTarget}
          onReject={handleReject}
          onClose={() => setRejectTarget(null)}
        />
      )}
    </div>
  )
}
