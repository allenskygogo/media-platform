import { useState, useRef } from 'react'
import {
  getCourses, saveCourses,
  getCFVideos, saveCFVideo, deleteCFVideoLocal,
  getVideoForLesson, assignVideoToLesson,
  getVideoAssignments,
  getHomeworkSpec, saveHomeworkSpec,
} from '../../data/mockData'
import { getUploadUrl, uploadFileToCF, getVideo, listVideos, deleteVideo, extractCustomerSubdomain, isConfigured as workerConfigured } from '../../services/streamApi'

const CATEGORIES = ['影音創作', '社群媒體', '音頻創作', '商業變現', '數據分析', 'AI 應用']
const COURSE_LEVELS = {
  basic: { label: '體驗', accessLevel: 'trial' },
  standard: { label: '達人', accessLevel: 'standard' },
  advanced: { label: '私塾', accessLevel: 'advanced' },
}
const COURSE_LEVEL_ORDER = ['basic', 'standard', 'advanced']
const EMPTY_COURSE = { title:'', description:'', tier:'basic', accessLevel:'trial', category:'影音創作', instructor:'', duration:'', published:true }
const EMPTY_LESSON = { title:'', duration:'', free:false }

// ── Helpers ───────────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = {
    ready:       { label:'已上傳', bg:'var(--success-light)', color:'var(--success)' },
    pendingupload:{ label:'處理中', bg:'var(--advanced-light)', color:'var(--advanced-text)' },
    downloading: { label:'下載中', bg:'var(--advanced-light)', color:'var(--advanced-text)' },
    queued:      { label:'排隊中', bg:'var(--advanced-light)', color:'var(--advanced-text)' },
    error:       { label:'錯誤',   bg:'var(--danger-light)',   color:'var(--danger)' },
    none:        { label:'—  未上傳', bg:'var(--gray-100)',       color:'var(--gray-500)' },
  }
  const c = cfg[status] || cfg.none
  return <span style={{ background:c.bg, color:c.color, padding:'2px 10px', borderRadius:999, fontSize:11, fontWeight:700 }}>{c.label}</span>
}

function courseLevelLabel(tier) {
  return COURSE_LEVELS[tier]?.label || '達人'
}

function courseFormWithAccess(form) {
  const accessLevel = COURSE_LEVELS[form.tier]?.accessLevel || 'standard'
  return { ...form, accessLevel }
}

function compressImage(file, maxW=1200, quality=0.8) {
  return new Promise(resolve => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width)
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(img.width  * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.src = url
  })
}

// ── Upload Modal ──────────────────────────────────────────────────────────────
function UploadModal({ lessonId, lessonTitle, courseId, onClose, onSuccess }) {
  const [file, setFile]     = useState(null)
  const [name, setName]     = useState('')
  const [phase, setPhase]   = useState('idle') // idle|uploading|done|error
  const [pct, setPct]       = useState(0)
  const [errMsg, setErrMsg] = useState('')
  const dropRef = useRef()

  const handleFile = (f) => {
    if (!f || !f.type.startsWith('video/')) return
    setFile(f)
    setName(f.name.replace(/\.[^.]+$/, ''))
  }

  const handleDrop = (e) => {
    e.preventDefault()
    dropRef.current?.classList.remove('drag-over')
    handleFile(e.dataTransfer.files[0])
  }

  const handleUpload = async () => {
    if (!file) return
    try {
      setPhase('uploading'); setErrMsg(''); setPct(0)

      // 1. Get direct upload URL from Worker
      const label = `${lessonTitle || 'Lesson'} - ${name}`
      const res   = await getUploadUrl(label, file.size)
      if (!res?.result?.uploadURL || !res?.result?.uid) throw new Error('無法取得上傳連結')
      const { uploadURL, uid } = res.result

      // 2. Upload file directly to CF Stream
      await uploadFileToCF(uploadURL, file, setPct)
      setPct(100)

      // 3. Poll for video details (up to 30s)
      let video = null
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 3000))
        const vRes = await getVideo(uid)
        if (vRes?.result) { video = vRes.result; break }
      }

      // 4. Save to local CF videos list
      const hlsUrl = video?.playback?.hls || ''
      const record = {
        uid, name: label,
        status: video?.status?.state || 'pendingupload',
        readyToStream: video?.readyToStream || false,
        duration: video?.duration || 0,
        size: file.size,
        created: new Date().toISOString(),
        customerSubdomain: extractCustomerSubdomain(hlsUrl) || 'customer-unknown',
        hlsUrl,
      }
      saveCFVideo(record)

      // 5. Auto-assign to lesson
      assignVideoToLesson(lessonId, uid)

      setPhase('done')
      onSuccess?.()
    } catch(e) {
      setErrMsg(e.message || '上傳失敗')
      setPhase('error')
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth:520 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">上傳影片 — {lessonTitle}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {!workerConfigured() && (
            <div className="cf-not-configured" style={{ marginBottom:12 }}>
              <span style={{ fontSize:20 }}></span>
              <div><strong>Worker 未設定</strong><br /><span style={{ fontSize:12 }}>請在 .env.local 設定 VITE_WORKER_URL 並重啟 Vite</span></div>
            </div>
          )}

          {/* File drop zone */}
          {phase === 'idle' && (
            <>
              <div
                ref={dropRef}
                className="upload-drop-zone"
                onDragOver={e => { e.preventDefault(); dropRef.current.classList.add('drag-over') }}
                onDragLeave={() => dropRef.current?.classList.remove('drag-over')}
                onDrop={handleDrop}
                onClick={() => document.getElementById('vup-file').click()}
              >
                {file ? (
                  <div>
                    <div style={{ fontSize:24, marginBottom:8 }}>影片 </div>
                    <p style={{ fontWeight:700 }}>{file.name}</p>
                    <p style={{ fontSize:12, color:'var(--gray-400)' }}>{(file.size/1024/1024).toFixed(1)} MB</p>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize:32, marginBottom:8 }}>檔案 </div>
                    <p style={{ fontWeight:600 }}>拖曳影片到此處，或點擊選擇檔案</p>
                    <p style={{ fontSize:12, color:'var(--gray-400)', marginTop:4 }}>支援 MP4、MOV、WebM</p>
                  </div>
                )}
                <input id="vup-file" type="file" accept="video/*" style={{ display:'none' }}
                  onChange={e => handleFile(e.target.files[0])} />
              </div>
              {file && (
                <div className="form-group" style={{ marginTop:12 }}>
                  <label className="form-label">影片名稱</label>
                  <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="影片顯示名稱" />
                </div>
              )}
            </>
          )}

          {/* Uploading */}
          {phase === 'uploading' && (
            <div style={{ textAlign:'center', padding:'24px 0' }}>
              <div style={{ fontSize:32, marginBottom:12 }}>⬆️</div>
              <p style={{ fontWeight:700, marginBottom:12 }}>上傳中… {pct}%</p>
              <div className="upload-progress-bar">
                <div className="upload-progress-fill" style={{ width:`${pct}%` }} />
              </div>
              <p style={{ fontSize:12, color:'var(--gray-400)', marginTop:8 }}>請勿關閉此視窗</p>
            </div>
          )}

          {/* Done */}
          {phase === 'done' && (
            <div style={{ textAlign:'center', padding:'24px 0' }}>
              <div style={{ fontSize:40, marginBottom:12 }}>已</div>
              <p style={{ fontWeight:700 }}>上傳完成，已自動綁定此課堂</p>
            </div>
          )}

          {/* Error */}
          {phase === 'error' && (
            <div style={{ textAlign:'center', padding:'24px 0' }}>
              <div style={{ fontSize:40, marginBottom:12 }}>錯誤</div>
              <p style={{ color:'var(--danger)', fontWeight:700 }}>{errMsg}</p>
              <button className="btn btn-secondary" style={{ marginTop:12 }} onClick={() => setPhase('idle')}>重試</button>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>{phase==='done' ? '關閉' : '取消'}</button>
          {phase === 'idle' && (
            <button className="btn btn-primary" onClick={handleUpload} disabled={!file || !name.trim() || !workerConfigured()}>
              開始上傳
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Homework Spec Modal ───────────────────────────────────────────────────────
function HomeworkModal({ lessonId, lessonTitle, onClose }) {
  const [spec, setSpec] = useState(() => getHomeworkSpec(lessonId)?.spec || '')
  const save = () => { saveHomeworkSpec(lessonId, spec); onClose() }
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth:540 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">設定作業規範 — {lessonTitle}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">作業說明（顯示給學員）</label>
            <textarea className="form-textarea" rows={6}
              placeholder="例：請拍攝一支 60–90 秒的自我介紹影片，說明你的頻道定位與目標受眾，上傳至 YouTube 後提交連結。"
              value={spec} onChange={e => setSpec(e.target.value)} />
          </div>
          <p style={{ fontSize:12, color:'var(--gray-400)' }}>留空表示此課堂不設作業（學員可直接解鎖下一堂）</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={save}>儲存作業規範</button>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function CoursesAdmin() {
  const [courses,     setCourses]     = useState(getCourses)
  const [cfVideos,    setCfVideos]    = useState(getCFVideos)
  const [view,        setView]        = useState('list')      // 'list' | 'detail'
  const [course,      setCourse]      = useState(null)        // selected course
  const [msg,         setMsg]         = useState('')

  // Course modal
  const [showCourseModal, setShowCourseModal] = useState(false)
  const [editCourseId,    setEditCourseId]    = useState(null)
  const [courseForm,      setCourseForm]      = useState(EMPTY_COURSE)

  // Lesson modal
  const [showLessonModal, setShowLessonModal] = useState(false)
  const [editLessonId,    setEditLessonId]    = useState(null)
  const [lessonForm,      setLessonForm]      = useState(EMPTY_LESSON)

  // Upload / homework modals
  const [uploadForLesson,   setUploadForLesson]   = useState(null)
  const [homeworkForLesson, setHomeworkForLesson]  = useState(null)

  // Delete confirm
  const [deleteId, setDeleteId] = useState(null)

  const flash = (t) => { setMsg(t); setTimeout(() => setMsg(''), 3000) }
  const refreshCourses = () => { const c = getCourses(); setCourses(c); if (course) setCourse(c.find(x=>x.id===course?.id)||null) }
  const refreshVideos  = () => setCfVideos(getCFVideos())

  // ── Course CRUD ─────────────────────────────────────────────────────────────
  const openNewCourse = () => { setEditCourseId(null); setCourseForm(EMPTY_COURSE); setShowCourseModal(true) }
  const openEditCourse = (c) => {
    setEditCourseId(c.id)
    setCourseForm({ title:c.title, description:c.description, tier:c.tier, accessLevel:c.accessLevel, category:c.category, instructor:c.instructor, duration:c.duration, published:c.published })
    setShowCourseModal(true)
  }
  const saveCourse = () => {
    if (!courseForm.title.trim() || !courseForm.instructor.trim()) return
    const payload = courseFormWithAccess(courseForm)
    let updated
    if (editCourseId) {
      updated = courses.map(c => c.id===editCourseId ? {...c,...payload} : c)
      flash('課程已更新')
    } else {
      updated = [...courses, { ...payload, id:Date.now(), students:0, rating:0, ratingCount:0, createdAt:new Date().toISOString().split('T')[0], lessons:[] }]
      flash('新課程已新增')
    }
    saveCourses(updated); setCourses(updated); setShowCourseModal(false)
  }
  const confirmDeleteCourse = () => {
    const updated = courses.filter(c => c.id!==deleteId)
    saveCourses(updated); setCourses(updated); setDeleteId(null); flash('課程已刪除')
    if (course?.id === deleteId) { setView('list'); setCourse(null) }
  }

  // ── Lesson CRUD ─────────────────────────────────────────────────────────────
  const openNewLesson = () => { setEditLessonId(null); setLessonForm(EMPTY_LESSON); setShowLessonModal(true) }
  const openEditLesson = (l) => { setEditLessonId(l.id); setLessonForm({ title:l.title, duration:l.duration, free:l.free }); setShowLessonModal(true) }
  const saveLesson = () => {
    if (!lessonForm.title.trim()) return
    const updated = courses.map(c => {
      if (c.id !== course.id) return c
      const lessons = editLessonId
        ? c.lessons.map(l => l.id===editLessonId ? {...l,...lessonForm} : l)
        : [...c.lessons, { ...lessonForm, id: Date.now() }]
      return {...c, lessons}
    })
    saveCourses(updated); setCourses(updated)
    setCourse(updated.find(c=>c.id===course.id))
    setShowLessonModal(false)
    flash(editLessonId ? '課堂已更新' : '課堂已新增')
  }
  const deleteLesson = (lessonId) => {
    const updated = courses.map(c => {
      if (c.id !== course.id) return c
      return {...c, lessons: c.lessons.filter(l => l.id!==lessonId)}
    })
    saveCourses(updated); setCourses(updated)
    setCourse(updated.find(c=>c.id===course.id))
    flash('課堂已刪除')
  }

  // ── Enter course detail ──────────────────────────────────────────────────────
  const enterCourse = (c) => { setCourse(c); setView('detail') }

  // ── Video status for a lesson ────────────────────────────────────────────────
  const videoStatus = (lessonId) => {
    const uid = getVideoForLesson(lessonId)
    if (!uid) return 'none'
    const v = cfVideos.find(v => v.uid === uid)
    return v ? v.status : 'none'
  }
  const videoName = (lessonId) => {
    const uid = getVideoForLesson(lessonId)
    if (!uid) return ''
    return cfVideos.find(v=>v.uid===uid)?.name || uid.slice(0,8)+'…'
  }
  const homeworkStatus = (lessonId) => {
    const spec = getHomeworkSpec(lessonId)
    return spec?.spec ? '已設定' : '— 未設定'
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Render: List view
  // ════════════════════════════════════════════════════════════════════════════
  if (view === 'list') return (
    <div>
      <div className="page-actions" style={{ marginBottom:24 }}>
        <div className="page-heading" style={{ margin:0 }}>
          <h1>課程與影片管理</h1>
          <p>共 {courses.length} 門課程，點課程進入管理課堂與上傳影片</p>
        </div>
        <button className="btn btn-primary" onClick={openNewCourse}>＋ 新增課程</button>
      </div>

      {msg && <div className="auth-alert success" style={{ marginBottom:16 }}>{msg}</div>}

      {!workerConfigured() && (
        <div className="cf-not-configured" style={{ marginBottom:20 }}>
          <span style={{ fontSize:20 }}></span>
          <div>
            <strong>Cloudflare Worker 未設定</strong><br />
            <span style={{ fontSize:12 }}>影片上傳功能需要設定 VITE_WORKER_URL。<a href="https://workers.cloudflare.com" target="_blank" rel="noreferrer">了解更多</a></span>
          </div>
        </div>
      )}

      {COURSE_LEVEL_ORDER.map(level => {
        const groupCourses = courses.filter(c => c.tier === level)
        return (
          <section key={level} style={{ marginBottom: 28 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <h2 style={{ fontSize:16, fontWeight:800 }}>{courseLevelLabel(level)}課程</h2>
              <span style={{ fontSize:12, color:'var(--gray-500)' }}>{groupCourses.length} 門</span>
            </div>
            {groupCourses.length === 0 ? (
              <div className="card" style={{ padding:18, color:'var(--gray-400)', fontSize:13 }}>尚未建立{courseLevelLabel(level)}課程</div>
            ) : (
              <div className="courses-admin-grid">
                {groupCourses.map(c => {
                  const lessons = c.lessons || []
                  const uploaded = lessons.filter(l => getVideoForLesson(l.id)).length
                  return (
                    <div key={c.id} className="course-admin-card">
                      <div className="course-admin-card-header">
                        <span className={`badge badge-${c.tier}`}>{courseLevelLabel(c.tier)}</span>
                        <span className={`badge ${c.published?'badge-published':'badge-draft'}`}>{c.published?'上架':'草稿'}</span>
                      </div>
                      <h3 className="course-admin-card-title">{c.title}</h3>
                      <p className="course-admin-card-meta">{c.instructor} · {lessons.length} 堂 · {c.duration||'—'}</p>
                      <div className="course-admin-card-stats">
                        <span>{uploaded}/{lessons.length} 已上傳</span>
                        <span>{c.students.toLocaleString()} 人</span>
                      </div>
                      <div className="course-admin-card-actions">
                        <button className="btn btn-primary btn-sm" onClick={() => enterCourse(c)}>進入課程 →</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEditCourse(c)}>編輯</button>
                        <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(c.id)}>刪除</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )
      })}

      {/* Course Form Modal */}
      {showCourseModal && (
        <div className="modal-overlay" onClick={() => setShowCourseModal(false)}>
          <div className="modal" style={{ maxWidth:560 }} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editCourseId ? '編輯課程' : '新增課程'}</h2>
              <button className="modal-close" onClick={() => setShowCourseModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">課程標題 *</label>
                <input className="form-input" placeholder="輸入課程標題" value={courseForm.title} onChange={e=>setCourseForm(f=>({...f,title:e.target.value}))} />
              </div>
              <div className="form-group">
                <label className="form-label">課程簡介</label>
                <textarea className="form-textarea" placeholder="輸入課程簡介" value={courseForm.description} onChange={e=>setCourseForm(f=>({...f,description:e.target.value}))} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div className="form-group">
                  <label className="form-label">課程方案</label>
                  <select className="form-select" value={courseForm.tier} onChange={e=>setCourseForm(f=>({...f,tier:e.target.value,accessLevel:COURSE_LEVELS[e.target.value]?.accessLevel||'standard'}))}>
                    <option value="basic">體驗</option>
                    <option value="standard">達人</option>
                    <option value="advanced">私塾</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">課程分類</label>
                  <select className="form-select" value={courseForm.category} onChange={e=>setCourseForm(f=>({...f,category:e.target.value}))}>
                    {CATEGORIES.map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">講師姓名 *</label>
                  <input className="form-input" placeholder="例：王志明老師" value={courseForm.instructor} onChange={e=>setCourseForm(f=>({...f,instructor:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">課程時長</label>
                  <input className="form-input" placeholder="例：3小時20分" value={courseForm.duration} onChange={e=>setCourseForm(f=>({...f,duration:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">發布狀態</label>
                  <select className="form-select" value={String(courseForm.published)} onChange={e=>setCourseForm(f=>({...f,published:e.target.value==='true'}))}>
                    <option value="true">上架</option>
                    <option value="false">草稿</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCourseModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={saveCourse} disabled={!courseForm.title.trim()||!courseForm.instructor.trim()}>
                {editCourseId ? '儲存變更' : '新增課程'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal" style={{ maxWidth:400 }} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">確認刪除</h2>
              <button className="modal-close" onClick={() => setDeleteId(null)}>×</button>
            </div>
            <div className="modal-body">
              <p>確定要刪除《{courses.find(c=>c.id===deleteId)?.title}》嗎？此操作無法復原。</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>取消</button>
              <button className="btn btn-danger" onClick={confirmDeleteCourse}>確認刪除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // ════════════════════════════════════════════════════════════════════════════
  // Render: Detail view (lessons + video + homework)
  // ════════════════════════════════════════════════════════════════════════════
  const lessons = course?.lessons || []

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => { setView('list'); setCourse(null) }}>
          ← 課程列表
        </button>
        <span style={{ color:'var(--gray-300)' }}>/</span>
        <span style={{ fontWeight:700, color:'var(--gray-700)' }}>{course?.title}</span>
      </div>

      {msg && <div className="auth-alert success" style={{ marginBottom:16 }}>{msg}</div>}

      {/* Course header */}
      <div className="card" style={{ marginBottom:24 }}>
        <div className="card-body" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:16 }}>
          <div>
            <div style={{ display:'flex', gap:8, marginBottom:8 }}>
              <span className={`badge badge-${course?.tier}`}>{courseLevelLabel(course?.tier)}</span>
              <span className={`badge ${course?.published?'badge-published':'badge-draft'}`}>{course?.published?'上架':'草稿'}</span>
            </div>
            <h2 style={{ fontWeight:800, fontSize:20, marginBottom:4 }}>{course?.title}</h2>
            <p style={{ fontSize:13, color:'var(--gray-500)' }}>{course?.instructor} · {course?.duration||'—'} · {lessons.length} 堂課</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => openEditCourse(course)}>編輯課程資訊</button>
        </div>
      </div>

      {/* Lessons table */}
      <div className="card">
        <div className="card-body">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <h3 style={{ fontWeight:700, fontSize:16 }}>課堂管理 <span style={{ color:'var(--gray-400)', fontWeight:400 }}>（{lessons.length} 堂）</span></h3>
            <button className="btn btn-primary btn-sm" onClick={openNewLesson}>＋ 新增課堂</button>
          </div>

          {lessons.length === 0 ? (
            <div style={{ textAlign:'center', padding:'48px 0', color:'var(--gray-400)' }}>
              <div style={{ fontSize:36, marginBottom:12 }}>課程</div>
              <p>還沒有課堂，點「新增課堂」開始建立</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="video-admin-table">
                <thead>
                  <tr>
                    <th style={{ width:40 }}>#</th>
                    <th>課堂標題</th>
                    <th>時長</th>
                    <th>影片狀態</th>
                    <th>作業規範</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {lessons.map((l, i) => (
                    <tr key={l.id}>
                      <td style={{ color:'var(--gray-400)', fontWeight:600 }}>{i+1}</td>
                      <td>
                        <div style={{ fontWeight:600, fontSize:14 }}>{l.title}</div>
                        {l.free && <span style={{ fontSize:11, color:'var(--success)', background:'var(--success-light)', padding:'1px 6px', borderRadius:4, marginTop:2, display:'inline-block' }}>免費試看</span>}
                        {videoName(l.id) && <div className="vid-uid">{videoName(l.id)}</div>}
                      </td>
                      <td style={{ fontSize:13, color:'var(--gray-600)' }}>{l.duration||'—'}</td>
                      <td><StatusBadge status={videoStatus(l.id)} /></td>
                      <td style={{ fontSize:12, color:'var(--gray-500)' }}>{homeworkStatus(l.id)}</td>
                      <td>
                        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                          <button className="btn btn-primary btn-sm" onClick={() => setUploadForLesson(l)}>
                            {videoStatus(l.id)==='none' ? '上傳影片' : '重新上傳'}
                          </button>
                          <button className="btn btn-secondary btn-sm" onClick={() => setHomeworkForLesson(l)}>作業</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => openEditLesson(l)}>編輯</button>
                          <button className="btn btn-danger btn-sm" onClick={() => deleteLesson(l.id)}>刪</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Lesson Modal */}
      {showLessonModal && (
        <div className="modal-overlay" onClick={() => setShowLessonModal(false)}>
          <div className="modal" style={{ maxWidth:480 }} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editLessonId ? '編輯課堂' : '新增課堂'}</h2>
              <button className="modal-close" onClick={() => setShowLessonModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">課堂標題 *</label>
                <input className="form-input" placeholder="例：頻道定位與受眾分析" value={lessonForm.title} onChange={e=>setLessonForm(f=>({...f,title:e.target.value}))} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div className="form-group">
                  <label className="form-label">課堂時長</label>
                  <input className="form-input" placeholder="例：25分鐘" value={lessonForm.duration} onChange={e=>setLessonForm(f=>({...f,duration:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">免費試看</label>
                  <select className="form-select" value={String(lessonForm.free)} onChange={e=>setLessonForm(f=>({...f,free:e.target.value==='true'}))}>
                    <option value="false">需要解鎖</option>
                    <option value="true">🆓 免費試看</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowLessonModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={saveLesson} disabled={!lessonForm.title.trim()}>
                {editLessonId ? '儲存' : '新增課堂'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {uploadForLesson && (
        <UploadModal
          lessonId={uploadForLesson.id}
          lessonTitle={uploadForLesson.title}
          courseId={course?.id}
          onClose={() => setUploadForLesson(null)}
          onSuccess={() => { refreshVideos(); flash('影片上傳完成並已綁定課堂') }}
        />
      )}

      {/* Homework Modal */}
      {homeworkForLesson && (
        <HomeworkModal
          lessonId={homeworkForLesson.id}
          lessonTitle={homeworkForLesson.title}
          onClose={() => { setHomeworkForLesson(null); flash('作業規範已儲存') }}
        />
      )}

      {/* Edit course modal (reuse) */}
      {showCourseModal && (
        <div className="modal-overlay" onClick={() => setShowCourseModal(false)}>
          <div className="modal" style={{ maxWidth:560 }} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">編輯課程</h2>
              <button className="modal-close" onClick={() => setShowCourseModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">課程標題 *</label>
                <input className="form-input" value={courseForm.title} onChange={e=>setCourseForm(f=>({...f,title:e.target.value}))} />
              </div>
              <div className="form-group">
                <label className="form-label">課程簡介</label>
                <textarea className="form-textarea" value={courseForm.description} onChange={e=>setCourseForm(f=>({...f,description:e.target.value}))} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div className="form-group">
                  <label className="form-label">課程方案</label>
                  <select className="form-select" value={courseForm.tier} onChange={e=>setCourseForm(f=>({...f,tier:e.target.value,accessLevel:COURSE_LEVELS[e.target.value]?.accessLevel||'standard'}))}>
                    <option value="basic">體驗</option>
                    <option value="standard">達人</option>
                    <option value="advanced">私塾</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">課程分類</label>
                  <select className="form-select" value={courseForm.category} onChange={e=>setCourseForm(f=>({...f,category:e.target.value}))}>
                    {CATEGORIES.map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">講師姓名 *</label>
                  <input className="form-input" value={courseForm.instructor} onChange={e=>setCourseForm(f=>({...f,instructor:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">課程時長</label>
                  <input className="form-input" value={courseForm.duration} onChange={e=>setCourseForm(f=>({...f,duration:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">發布狀態</label>
                  <select className="form-select" value={String(courseForm.published)} onChange={e=>setCourseForm(f=>({...f,published:e.target.value==='true'}))}>
                    <option value="true">上架</option>
                    <option value="false">草稿</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCourseModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={saveCourse}>儲存變更</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
