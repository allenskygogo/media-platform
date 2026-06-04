/**
 * VideoAdmin — Cloudflare Stream video management.
 *
 * Features:
 *  • Upload videos directly to Cloudflare Stream (via Worker)
 *  • View all uploaded videos with status / duration / thumbnail
 *  • Assign videos to lesson slots or the trial slot
 *  • Delete videos (from CF and local record)
 *  • Poll for "processing" videos every 30 seconds
 */

import { useState, useEffect, useRef } from 'react'
import {
  getCFVideos, saveCFVideo, deleteCFVideoLocal,
  getVideoAssignments, assignVideoToLesson,
  getCourses,
} from '../../data/mockData'
import {
  isConfigured, uploadVideoToCF,
  listVideos, deleteVideo, getVideo, extractCustomerSubdomain,
} from '../../services/streamApi'
import { fetchCourseCatalog, getLocalCourseCatalog, saveCourseCatalog } from '../../services/courseCatalog'

// ── Helpers ───────────────────────────────────────────────────────────────
function fmtDuration(sec) {
  if (!sec) return '—'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  return h > 0
    ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
    : `${m}:${String(s).padStart(2,'0')}`
}

function fmtBytes(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 ** 3)   return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`
}

const STATUS_CFG = {
  ready:      { label: '就緒', color: 'var(--success)',       bg: 'var(--success-light)' },
  queued:     { label: '排隊中', color: 'var(--advanced-text)', bg: 'var(--advanced-light)' },
  inprogress: { label: '處理中', color: 'var(--primary)',      bg: 'var(--primary-light)' },
  error:      { label: '錯誤',   color: 'var(--danger)',       bg: 'var(--danger-light)'  },
}

// Build a human-readable "assigned to" string
function describeAssignment(videoUid, assignments, courses) {
  const entries = Object.entries(assignments).filter(([, uid]) => uid === videoUid)
  if (!entries.length) return null
  return entries.map(([key]) => {
    if (key === 'trial') return '體驗課'
    const lessonId = Number(key)
    for (const c of courses) {
      const l = c.lessons.find(l => l.id === lessonId)
      if (l) return `${c.title} — ${l.title}`
    }
    return `課節 #${key}`
  }).join(', ')
}

// ── Upload Modal ──────────────────────────────────────────────────────────
function UploadModal({ courses, onUploaded, onClose }) {
  const [file, setFile]         = useState(null)
  const [name, setName]         = useState('')
  const [assignTo, setAssignTo] = useState('')  // '' | 'trial' | lessonId
  const [progress, setProgress] = useState(0)
  const [phase, setPhase]       = useState('idle') // idle | uploading | done | error
  const [errorMsg, setErrorMsg] = useState('')

  const lessonOptions = []
  for (const c of courses) {
    for (const l of c.lessons) {
      lessonOptions.push({ value: String(l.id), label: `${c.title} — ${l.title}` })
    }
  }

  const handleFileChange = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    if (!name) setName(f.name.replace(/\.[^.]+$/, ''))
  }

  const handleUpload = async () => {
    if (!file) return
    setPhase('uploading')
    setProgress(0)
    try {
      // Step 1-2: Upload file directly to CF Stream.
      // TUS is used first; if the browser/network rejects it, the client retries
      // with Cloudflare's form direct-upload URL.
      const { uid } = await uploadVideoToCF(name || file.name, file, setProgress)
      setProgress(100)

      // Step 3: Poll for video details (may take a few seconds)
      let video = null
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 2000))
        const detail = await getVideo(uid)
        if (detail?.result) { video = detail.result; break }
      }

      // Step 4: Store locally
      const hlsUrl    = video?.playback?.hls || ''
      const subdomain = extractCustomerSubdomain(hlsUrl) || 'customer-unknown'
      saveCFVideo({
        uid,
        name: name || file.name,
        status: video?.status?.state || 'queued',
        duration: Math.round(video?.duration || 0),
        customerSubdomain: subdomain,
        preview: video?.thumbnail || '',
        size: file.size,
        uploadedAt: new Date().toISOString(),
      })

      // Step 5: Assign if requested
      if (assignTo) assignVideoToLesson(assignTo === 'trial' ? 'trial' : Number(assignTo), uid)

      setPhase('done')
      await onUploaded()
    } catch (e) {
      setErrorMsg(e.message)
      setPhase('error')
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">上傳影片到 Cloudflare Stream</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {phase === 'done' ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>已</div>
              <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>上傳完成！</p>
              <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>
                影片正在 Cloudflare Stream 處理中，通常需要 1–5 分鐘。
              </p>
            </div>
          ) : phase === 'error' ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>錯誤</div>
              <p style={{ color: 'var(--danger)', fontWeight: 600 }}>{errorMsg}</p>
            </div>
          ) : (
            <>
              {/* File picker */}
              <div className="form-group">
                <label className="form-label">選擇影片檔案 *</label>
                <input type="file" accept="video/*" className="form-input"
                  onChange={handleFileChange} disabled={phase === 'uploading'} />
                {file && (
                  <span className="form-hint">{file.name} · {fmtBytes(file.size)}</span>
                )}
              </div>

              {/* Display name */}
              <div className="form-group">
                <label className="form-label">顯示名稱</label>
                <input type="text" className="form-input" value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="影片標題（選填，預設為檔名）"
                  disabled={phase === 'uploading'} />
              </div>

              {/* Assignment */}
              <div className="form-group">
                <label className="form-label">指定到課節（選填，稍後也可以設定）</label>
                <select className="form-input" value={assignTo}
                  onChange={e => setAssignTo(e.target.value)}
                  disabled={phase === 'uploading'}>
                  <option value="">— 不指定 —</option>
                  <option value="trial">體驗課（3 小時體驗影片）</option>
                  {lessonOptions.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Upload progress */}
              {phase === 'uploading' && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13,
                    color: 'var(--gray-600)', marginBottom: 6 }}>
                    <span>上傳中…</span>
                    <span>{progress}%</span>
                  </div>
                  <div style={{ height: 8, background: 'var(--gray-200)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progress}%`,
                      background: 'var(--primary)', borderRadius: 4,
                      transition: 'width 0.3s' }} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        <div className="modal-footer">
          {phase === 'done' ? (
            <button className="btn btn-primary" onClick={onClose}>完成</button>
          ) : phase === 'error' ? (
            <button className="btn btn-secondary" onClick={() => setPhase('idle')}>重試</button>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={onClose}
                disabled={phase === 'uploading'}>取消</button>
              <button className="btn btn-primary"
                disabled={!file || phase === 'uploading'} onClick={handleUpload}>
                {phase === 'uploading' ? `上傳中 ${progress}%…` : '開始上傳'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Assign Modal ──────────────────────────────────────────────────────────
function AssignModal({ video, courses, assignments, onSave, onClose }) {
  const lessonOptions = []
  for (const c of courses) {
    for (const l of c.lessons) {
      lessonOptions.push({ value: String(l.id), label: `${c.title} — ${l.title}` })
    }
  }

  // Find current assignment for this video
  const currentKey = Object.entries(assignments).find(([, uid]) => uid === video.uid)?.[0] || ''
  const [selected, setSelected] = useState(currentKey)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">指定影片到課節</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 14, color: 'var(--gray-600)', marginBottom: 16 }}>
            影片：<strong>{video.name}</strong>（{fmtDuration(video.duration)}）
          </p>
          <div className="form-group">
            <label className="form-label">指定到</label>
            <select className="form-input" value={selected}
              onChange={e => setSelected(e.target.value)}>
              <option value="">— 不指定（影片庫中閒置）—</option>
              <option value="trial">體驗課（3 小時體驗影片）</option>
              {lessonOptions.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={async () => { await onSave(video.uid, selected); onClose() }}>
            儲存
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────
export default function VideoAdmin() {
  const [videos, setVideos]           = useState([])
  const [assignments, setAssignments] = useState({})
  const [showUpload, setShowUpload]   = useState(false)
  const [assignTarget, setAssignTarget] = useState(null)
  const [syncing, setSyncing]         = useState(false)
  const [msg, setMsg]                 = useState('')
  const pollRef = useRef(null)

  const courses = getCourses()

  const refreshLocal = () => {
    setVideos(getCFVideos())
    setAssignments(getVideoAssignments())
  }

  const flash = t => { setMsg(t); setTimeout(() => setMsg(''), 3500) }
  const syncCatalog = async () => {
    const synced = await saveCourseCatalog(getLocalCourseCatalog())
    setVideos(synced.cfVideos)
    setAssignments(synced.videoAssignments)
    return synced
  }

  // Sync with CF Stream API
  const syncWithCF = async () => {
    if (!isConfigured()) return
    setSyncing(true)
    try {
      const res = await listVideos()
      const cfList = res?.result || []
      for (const v of cfList) {
        const hlsUrl = v.playback?.hls || ''
        saveCFVideo({
          uid: v.uid,
          name: v.meta?.name || v.uid,
          status: v.status?.state || 'unknown',
          duration: Math.round(v.duration || 0),
          customerSubdomain: extractCustomerSubdomain(hlsUrl) || 'customer-unknown',
          preview: v.thumbnail || '',
          size: v.size || 0,
          uploadedAt: v.created || new Date().toISOString(),
        })
      }
      refreshLocal()
      await syncCatalog()
      flash('已與 Cloudflare Stream 同步')
    } catch (e) {
      flash(`同步失敗：${e.message}`)
    } finally {
      setSyncing(false)
    }
  }

  // Poll status for "processing" videos
  useEffect(() => {
    fetchCourseCatalog()
      .then(catalog => {
        setVideos(catalog.cfVideos)
        setAssignments(catalog.videoAssignments)
      })
      .catch(err => {
        console.error('Course catalog load failed:', err)
        refreshLocal()
      })
    const hasProcessing = getCFVideos().some(v =>
      v.status === 'queued' || v.status === 'inprogress')
    if (hasProcessing && isConfigured()) {
      pollRef.current = setInterval(syncWithCF, 30000)
    }
    return () => clearInterval(pollRef.current)
  }, []) // eslint-disable-line

  const handleDelete = async (uid) => {
    if (!confirm('確定要刪除此影片？此操作無法恢復。')) return
    if (isConfigured()) {
      try { await deleteVideo(uid) } catch (e) { /* ignore CF error, still remove locally */ }
    }
    deleteCFVideoLocal(uid)
    refreshLocal()
    try { await syncCatalog() } catch (e) { flash(`已刪除本機影片，但同步失敗：${e.message}`); return }
    flash('已刪除影片')
  }

  const handleAssignSave = async (videoUid, assignKey) => {
    // Remove old assignment for this video first
    const current = getVideoAssignments()
    Object.keys(current).forEach(k => {
      if (current[k] === videoUid) assignVideoToLesson(k, null)
    })
    // Set new
    if (assignKey) {
      const target = assignKey === 'trial' ? 'trial' : Number(assignKey)
      assignVideoToLesson(target, videoUid)
    }
    refreshLocal()
    await syncCatalog()
    flash('影片指定已更新')
  }

  return (
    <div>
      <div className="page-heading">
        <div>
          <h1>影片管理</h1>
          <p>Cloudflare Stream 影片庫與課節指定</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {isConfigured() && (
            <button className="btn btn-secondary" onClick={syncWithCF} disabled={syncing}>
              {syncing ? '同步中…' : '與 CF 同步'}
            </button>
          )}
          <button className="btn btn-primary" onClick={() => setShowUpload(true)}
            disabled={!isConfigured()}>
            ＋ 上傳影片
          </button>
        </div>
      </div>

      {/* Not configured banner */}
      {!isConfigured() && (
        <div style={{
          background: 'var(--advanced-light)', border: '1.5px solid var(--advanced)',
          borderRadius: 'var(--radius-lg)', padding: '16px 20px', marginBottom: 24,
          display: 'flex', gap: 12, alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: 24, flexShrink: 0 }}>設定 </span>
          <div>
            <p style={{ fontWeight: 700, color: 'var(--advanced-text)', marginBottom: 4 }}>
              Cloudflare Stream 尚未設定
            </p>
            <p style={{ fontSize: 13, color: 'var(--gray-600)', lineHeight: 1.7 }}>
              請在 <code>.env.local</code> 中設定 <code>VITE_WORKER_URL</code>，
              並確認 Cloudflare Worker 已部署並配置環境變數。
              詳見 <code>.env.example</code> 及 <code>worker/wrangler.toml</code>。
            </p>
          </div>
        </div>
      )}

      {msg && <div className="auth-alert success" style={{ marginBottom: 16 }}>{msg}</div>}

      {/* Video table */}
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>縮圖</th>
                <th>名稱</th>
                <th>狀態</th>
                <th>時長</th>
                <th>大小</th>
                <th>上傳時間</th>
                <th>指定課節</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {videos.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 48, color: 'var(--gray-400)' }}>
                    {isConfigured()
                      ? '尚未上傳任何影片，點擊「上傳影片」開始'
                      : '請先完成 Cloudflare Stream 設定'}
                  </td>
                </tr>
              )}
              {videos.map(v => {
                const st  = STATUS_CFG[v.status] || STATUS_CFG.error
                const asgn = describeAssignment(v.uid, assignments, courses)
                return (
                  <tr key={v.uid}>
                    {/* Thumbnail */}
                    <td style={{ width: 80 }}>
                      {v.preview ? (
                        <img src={v.preview} alt={v.name}
                          style={{ width: 72, height: 40, objectFit: 'cover', borderRadius: 6 }} />
                      ) : (
                        <div style={{ width: 72, height: 40, background: 'var(--gray-100)',
                          borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 20 }}>影片 </div>
                      )}
                    </td>

                    {/* Name / UID */}
                    <td>
                      <p style={{ fontWeight: 700, fontSize: 14 }}>{v.name}</p>
                      <p style={{ fontSize: 11, color: 'var(--gray-400)', fontFamily: 'monospace' }}>
                        {v.uid}
                      </p>
                    </td>

                    {/* Status */}
                    <td>
                      <span style={{
                        display: 'inline-block', padding: '3px 10px', borderRadius: 999,
                        fontSize: 12, fontWeight: 700, background: st.bg, color: st.color,
                      }}>
                        {st.label}
                      </span>
                    </td>

                    {/* Duration */}
                    <td style={{ fontSize: 14 }}>{fmtDuration(v.duration)}</td>

                    {/* Size */}
                    <td style={{ fontSize: 13, color: 'var(--gray-500)' }}>{fmtBytes(v.size)}</td>

                    {/* Uploaded */}
                    <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                      {new Date(v.uploadedAt).toLocaleDateString('zh-TW')}
                    </td>

                    {/* Assignment */}
                    <td>
                      {asgn ? (
                        <span style={{ fontSize: 12, color: 'var(--primary-text)',
                          background: 'var(--primary-light)', borderRadius: 'var(--radius-sm)',
                          padding: '3px 8px', fontWeight: 600 }}>
                          {asgn}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>未指定</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm btn-secondary"
                          onClick={() => setAssignTarget(v)}>
                          指定
                        </button>
                        <button className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(v.uid)}>
                          刪除
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

      {/* Upload modal */}
      {showUpload && (
        <UploadModal
          courses={courses}
          onUploaded={async () => { refreshLocal(); await syncCatalog(); await syncWithCF() }}
          onClose={() => setShowUpload(false)}
        />
      )}

      {/* Assign modal */}
      {assignTarget && (
        <AssignModal
          video={assignTarget}
          courses={courses}
          assignments={assignments}
          onSave={handleAssignSave}
          onClose={() => setAssignTarget(null)}
        />
      )}
    </div>
  )
}
