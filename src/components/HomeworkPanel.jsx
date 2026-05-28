import { useState } from 'react'
import {
  getHomeworkSpec, getLatestHomework, submitHomework,
} from '../data/mockData'

const STATUS_CFG = {
  pending:  { label: '等待審核', color: 'var(--advanced-text)', bg: 'var(--advanced-light)', icon: '⏳' },
  approved: { label: '已批准', color: 'var(--success)',       bg: 'var(--success-light)',  icon: '✅' },
  rejected: { label: '已退回', color: 'var(--danger)',        bg: 'var(--danger-light)',   icon: '❌' },
}

export default function HomeworkPanel({ lesson, courseId, userId, onSubmitted }) {
  const spec = getHomeworkSpec(lesson.id)
  const hw   = getLatestHomework(userId, courseId, lesson.id)

  const [videoUrl, setVideoUrl] = useState('')
  const [note, setNote]         = useState('')
  const [submitting, setSub]    = useState(false)
  const [msg, setMsg]           = useState('')

  const statusCfg = hw ? STATUS_CFG[hw.status] : null

  const handleSubmit = () => {
    if (!videoUrl.trim()) { setMsg('請填寫影片連結'); return }
    setSub(true)
    submitHomework(userId, courseId, lesson.id, videoUrl.trim(), note.trim())
    setMsg('✅ 作業已送出，等待老師審核')
    setSub(false)
    setVideoUrl('')
    setNote('')
    onSubmitted?.()
  }

  if (!spec) {
    return (
      <div className="hw-panel">
        <div style={{ textAlign:'center', padding:'32px 0', color:'var(--gray-400)' }}>
          <div style={{ fontSize:36, marginBottom:12 }}>📋</div>
          <p>此堂課尚未設定作業，下一堂課已自動解鎖。</p>
        </div>
      </div>
    )
  }

  return (
    <div className="hw-panel">
      <div className="hw-panel-header">
        <h3 className="hw-panel-title">📝 作業提交</h3>
        <p className="hw-panel-lesson">{lesson.title}</p>
      </div>

      {/* Spec */}
      <div className="hw-spec-box">
        <p style={{ fontSize:12, fontWeight:700, color:'var(--gray-500)', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.06em' }}>作業規範</p>
        <p style={{ fontSize:14, color:'var(--gray-800)', lineHeight:1.8 }}>{spec.spec}</p>
      </div>

      {/* Current status */}
      {hw && (
        <div style={{ display:'flex', alignItems:'center', gap:10, margin:'16px 0',
          padding:'12px 16px', borderRadius:'var(--radius)', background: statusCfg.bg }}>
          <span style={{ fontSize:20 }}>{statusCfg.icon}</span>
          <div>
            <p style={{ fontWeight:700, color: statusCfg.color, fontSize:14 }}>{statusCfg.label}</p>
            {hw.status === 'approved' && (
              <p style={{ fontSize:12, color:'var(--gray-500)' }}>
                批准於 {new Date(hw.reviewedAt).toLocaleDateString('zh-TW')}
              </p>
            )}
            {hw.status === 'rejected' && hw.rejectionReason && (
              <p style={{ fontSize:13, color:'var(--danger)', marginTop:4 }}>
                退回原因：{hw.rejectionReason}
              </p>
            )}
            {hw.status === 'pending' && (
              <p style={{ fontSize:12, color:'var(--gray-500)' }}>
                提交於 {new Date(hw.submittedAt).toLocaleString('zh-TW', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' })}
              </p>
            )}
          </div>
          {hw.videoUrl && (
            <a href={hw.videoUrl} target="_blank" rel="noreferrer"
              className="btn btn-ghost btn-sm" style={{ marginLeft:'auto' }}>
              查看影片 ↗
            </a>
          )}
        </div>
      )}

      {/* Submission form — show if: never submitted, OR rejected */}
      {(!hw || hw.status === 'rejected') && (
        <div style={{ marginTop:16 }}>
          {hw?.status === 'rejected' && (
            <p style={{ fontSize:13, color:'var(--danger)', marginBottom:12, fontWeight:600 }}>
              請修改後重新提交
            </p>
          )}
          <div className="form-group">
            <label className="form-label">影片連結 *</label>
            <input
              type="url"
              className="form-input"
              placeholder="https://youtube.com/... 或 TikTok / IG 連結"
              value={videoUrl}
              onChange={e => setVideoUrl(e.target.value)}
            />
            <span className="form-hint">支援 YouTube、TikTok、Instagram Reels</span>
          </div>
          <div className="form-group" style={{ marginTop:14 }}>
            <label className="form-label">補充說明（選填）</label>
            <textarea
              className="form-input"
              rows={4}
              placeholder="說明你的製作過程、遇到的問題、心得等…"
              value={note}
              onChange={e => setNote(e.target.value)}
              style={{ resize:'vertical' }}
            />
          </div>
          {msg && <p style={{ color:'var(--success)', fontSize:14, margin:'8px 0' }}>{msg}</p>}
          <button
            className="btn btn-primary"
            style={{ marginTop:12 }}
            disabled={submitting}
            onClick={handleSubmit}
          >
            {submitting ? '送出中…' : '提交作業'}
          </button>
        </div>
      )}

      {hw?.status === 'approved' && (
        <div style={{ marginTop:12, padding:'12px 16px', background:'var(--success-light)',
          borderRadius:'var(--radius)', fontSize:14, color:'var(--success)', fontWeight:600 }}>
          🎉 作業已通過！下一堂課已解鎖。
        </div>
      )}
    </div>
  )
}
