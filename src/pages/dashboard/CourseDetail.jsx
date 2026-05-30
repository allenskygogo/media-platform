import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  getCourses, canAccessCourse, TIER_META,
  getLessonProgress, getLatestHomework, getHomeworkSpec,
} from '../../data/mockData'
import { getCourseProgressRecords } from '../../services/courseProgress'
import LessonPlayer  from '../../components/LessonPlayer'
import HomeworkPanel from '../../components/HomeworkPanel'

const CAT_EMOJI = { '影音創作':'🎬', '社群媒體':'📱', '音頻創作':'🎙️', '商業變現':'💰', '數據分析':'📊', 'AI 應用':'🤖' }

// Only standard/advanced tier students get the forced-watch + homework system
const NEEDS_HOMEWORK = ['standard', 'advanced']

function mapProgress(records) {
  return records.reduce((acc, record) => {
    acc[record.lessonId] = record
    return acc
  }, {})
}

function lessonProgress(userId, courseId, lessonId, progressByLesson) {
  return progressByLesson[lessonId] || getLessonProgress(userId, courseId, lessonId)
}

function isLessonUnlockedByProgress(userId, courseId, lessons, idx, needsHomework, progressByLesson) {
  if (!needsHomework) return true
  if (idx === 0) return true
  const prev = lessons[idx - 1]
  const prog = lessonProgress(userId, courseId, prev.id, progressByLesson)
  if (!prog?.completed) return false
  const spec = getHomeworkSpec(prev.id)
  if (!spec) return true
  const hw = getLatestHomework(userId, courseId, prev.id)
  return hw?.status === 'approved'
}

function lessonStatusIcon(userId, courseId, lessons, idx, needsHomework, progressByLesson) {
  if (!needsHomework) return null
  if (!isLessonUnlockedByProgress(userId, courseId, lessons, idx, needsHomework, progressByLesson)) return { icon:'🔒', color:'var(--gray-300)', label:'尚未解鎖' }
  const lesson = lessons[idx]
  const prog = lessonProgress(userId, courseId, lesson.id, progressByLesson)
  if (!prog?.completed) return { icon:'▶', color:'var(--primary)', label:'可觀看' }
  const spec = getHomeworkSpec(lesson.id)
  if (!spec) return { icon:'✅', color:'var(--success)', label:'已完成' }
  const hw = getLatestHomework(userId, courseId, lesson.id)
  if (!hw) return { icon:'📝', color:'var(--advanced-text)', label:'需繳作業' }
  if (hw.status === 'approved') return { icon:'✅', color:'var(--success)', label:'已完成' }
  if (hw.status === 'pending')  return { icon:'⏳', color:'var(--advanced-text)', label:'審核中' }
  if (hw.status === 'rejected') return { icon:'❌', color:'var(--danger)', label:'已退回' }
  return null
}

export default function CourseDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentUser } = useAuth()

  // view: 'info' | 'player' | 'homework'
  const [view, setView]               = useState('info')
  const [activeLessonId, setActiveLessonId] = useState(null)
  const [progressByLesson, setProgressByLesson] = useState({})
  const [progressLoadError, setProgressLoadError] = useState('')
  const [, forceRender] = useState(0) // trigger re-render after homework submit

  const course = getCourses().find(c => c.id === Number(id))

  useEffect(() => {
    if (!course || !currentUser?.id) return
    let cancelled = false

    getCourseProgressRecords(currentUser.id, course.id, course.lessons.map(lesson => lesson.id))
      .then(records => {
        if (cancelled) return
        setProgressByLesson(mapProgress(records))
        setProgressLoadError('')
      })
      .catch(err => {
        console.error('Course progress load failed:', err)
        if (!cancelled) setProgressLoadError('課程進度讀取失敗，請重新整理後再試')
      })

    return () => { cancelled = true }
  }, [course?.id, currentUser?.id])

  if (!course) return (
    <div className="page-content">
      <div className="empty-state">
        <div className="empty-state-icon">😕</div><h3>找不到課程</h3>
        <button className="btn btn-primary" style={{ marginTop:12 }} onClick={() => navigate('/dashboard/courses')}>
          回到課程列表
        </button>
      </div>
    </div>
  )

  const ok = canAccessCourse(currentUser.tier, course.accessLevel)
  if (!ok) {
    const meta = TIER_META[course.accessLevel] || TIER_META.standard
    return (
      <div className="page-content">
        <button className="btn btn-ghost btn-sm" style={{ marginBottom:20 }} onClick={() => navigate(-1)}>← 返回</button>
        <div className="card" style={{ maxWidth:560, margin:'0 auto', textAlign:'center' }}>
          <div className="card-body" style={{ padding:48, display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
            <span style={{ fontSize:56 }}>🔒</span>
            <h2 style={{ fontSize:20, fontWeight:700 }}>此課程需要{meta.label}</h2>
            <p style={{ color:'var(--gray-500)', fontSize:14, maxWidth:360 }}>
              《{course.title}》需要「{meta.label}」以上方案才能觀看。
            </p>
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/pricing')}>查看升級方案</button>
          </div>
        </div>
      </div>
    )
  }

  const needsHomework = NEEDS_HOMEWORK.includes(currentUser.tier)
  const activeLesson  = course.lessons.find(l => l.id === activeLessonId) || null

  const handleLessonClick = (lesson, lessonIdx) => {
    if (needsHomework && !isLessonUnlockedByProgress(currentUser.id, course.id, course.lessons, lessonIdx, needsHomework, progressByLesson)) return
    setActiveLessonId(lesson.id)
    // If already completed and replaying, go straight to player in free mode
    setView('player')
  }

  const handleProgressChange = useCallback((record) => {
    if (!record?.lessonId) return
    setProgressByLesson(prev => ({ ...prev, [record.lessonId]: record }))
  }, [])

  const handlePlayerComplete = useCallback(() => {
    // After forced-watch done → show homework panel (if spec exists)
    setView('homework')
  }, [])

  const handleClose = () => {
    setView('info')
    setActiveLessonId(null)
  }

  const handleHomeworkSubmitted = () => {
    forceRender(n => n + 1) // refresh lesson list statuses
  }

  return (
    <div className="page-content">
      <button className="btn btn-ghost btn-sm" style={{ marginBottom:20 }} onClick={() => navigate(-1)}>
        ← 返回課程列表
      </button>
      {progressLoadError && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          {progressLoadError}
        </div>
      )}

      <div className={`course-detail-layout${activeLesson ? ' has-active-lesson' : ''}`}>
        {/* ── Left column ── */}
        <div className="course-detail-main">
          {/* Course cover (when no lesson selected) */}
          {view === 'info' && (
            <div className="card" style={{ marginBottom:24 }}>
              <div className={`course-thumb course-thumb-${course.tier}`}
                style={{ height:220, borderRadius:'var(--radius-lg) var(--radius-lg) 0 0', fontSize:64 }}>
                <span>{CAT_EMOJI[course.category] || '📖'}</span>
              </div>
              <div className="card-body">
                <div className="course-meta" style={{ marginBottom:12 }}>
                  <span className={`badge badge-${course.tier}`}>
                    {course.tier === 'basic' ? '🎓 基礎' : '🏆 進階'}
                  </span>
                  <span className="tag">{course.category}</span>
                </div>
                <h1 style={{ fontSize:22, fontWeight:800, marginBottom:10 }}>{course.title}</h1>
                <p style={{ fontSize:14, color:'var(--gray-600)', lineHeight:1.7, marginBottom:16 }}>{course.description}</p>
                <div style={{ display:'flex', gap:20, flexWrap:'wrap', fontSize:14, color:'var(--gray-500)' }}>
                  <span>👨‍🏫 {course.instructor}</span>
                  <span>⏱ {course.duration}</span>
                  <span>👥 {course.students.toLocaleString()} 位學員</span>
                  <span className="course-rating">★ {course.rating} ({course.ratingCount})</span>
                </div>
              </div>
            </div>
          )}

          {/* Player */}
          {view === 'player' && activeLesson && (
            <div style={{ marginBottom:24 }}>
              <LessonPlayer
                lesson={activeLesson}
                courseId={course.id}
                userId={currentUser.id}
                initialProgress={progressByLesson[activeLesson.id]}
                onProgressChange={handleProgressChange}
                onComplete={handlePlayerComplete}
                onClose={handleClose}
              />
            </div>
          )}

          {/* Homework panel */}
          {view === 'homework' && activeLesson && (
            <div style={{ marginBottom:24 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setView('player')}>← 重播</button>
                <button className="btn btn-ghost btn-sm" onClick={handleClose}>✕ 關閉</button>
              </div>
              <HomeworkPanel
                lesson={activeLesson}
                courseId={course.id}
                userId={currentUser.id}
                onSubmitted={handleHomeworkSubmitted}
              />
            </div>
          )}
        </div>

        {/* ── Right column: lesson list ── */}
        {activeLesson && (
          <div className="course-detail-sidebar">
            <div className="card course-sidebar-card">
              <div className="card-header">
                <h2 className="card-title">課程目錄</h2>
                <span style={{ fontSize:13, color:'var(--gray-500)' }}>{course.lessons.length} 節</span>
              </div>
              <div className="lesson-list" style={{ padding:'8px 0' }}>
                {course.lessons.map((lesson, idx) => {
                  const isActive  = activeLessonId === lesson.id
                  const statusCfg = lessonStatusIcon(currentUser.id, course.id, course.lessons, idx, needsHomework, progressByLesson)
                  const locked    = needsHomework && !isLessonUnlockedByProgress(currentUser.id, course.id, course.lessons, idx, needsHomework, progressByLesson)

                  return (
                    <div
                      key={lesson.id}
                      className="lesson-item"
                      style={{
                        cursor: locked ? 'not-allowed' : 'pointer',
                        opacity: locked ? 0.5 : 1,
                        background: isActive ? 'var(--primary-light)' : undefined,
                        margin: '0 8px',
                      }}
                      onClick={() => !locked && handleLessonClick(lesson, idx)}
                    >
                      <div className="lesson-num"
                        style={{ background: isActive ? 'var(--primary)' : undefined,
                          color: isActive ? '#fff' : undefined }}>
                        {isActive ? '▶' : statusCfg ? statusCfg.icon : idx + 1}
                      </div>
                      <div className="lesson-info">
                        <div className="lesson-title"
                          style={{ color: isActive ? 'var(--primary-text)' : undefined }}>
                          {lesson.title}
                        </div>
                        <div className="lesson-duration">
                          {lesson.duration}
                          {statusCfg && !isActive && (
                            <span style={{ marginLeft:6, fontSize:11, color: statusCfg.color, fontWeight:600 }}>
                              · {statusCfg.label}
                            </span>
                          )}
                        </div>
                      </div>
                      {lesson.free && <span className="badge badge-active lesson-badge">免費</span>}
                    </div>
                  )
                })}
              </div>

              {/* Homework tab for active lesson */}
              {activeLesson && needsHomework && (
                <div style={{ padding:'12px 16px', borderTop:'1px solid var(--gray-200)' }}>
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ width:'100%' }}
                    onClick={() => setView(v => v === 'homework' ? 'player' : 'homework')}
                  >
                    {view === 'homework' ? '▶ 返回播放' : '📝 作業'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Show lesson list on info view too (single column) */}
        {!activeLesson && (
          <div style={{ gridColumn:'1/-1' }}>
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">課程目錄</h2>
                <span style={{ fontSize:13, color:'var(--gray-500)' }}>{course.lessons.length} 節</span>
              </div>
              <div className="lesson-list" style={{ padding:'8px 0' }}>
                {course.lessons.map((lesson, idx) => {
                  const statusCfg = lessonStatusIcon(currentUser.id, course.id, course.lessons, idx, needsHomework, progressByLesson)
                  const locked    = needsHomework && !isLessonUnlockedByProgress(currentUser.id, course.id, course.lessons, idx, needsHomework, progressByLesson)
                  const prog      = lessonProgress(currentUser.id, course.id, lesson.id, progressByLesson)

                  return (
                    <div
                      key={lesson.id}
                      className="lesson-item"
                      style={{ cursor: locked ? 'not-allowed' : 'pointer', opacity: locked ? 0.5 : 1, margin:'0 8px' }}
                      onClick={() => !locked && handleLessonClick(lesson, idx)}
                    >
                      <div className="lesson-num">
                        {statusCfg ? statusCfg.icon : idx + 1}
                      </div>
                      <div className="lesson-info" style={{ flex:1 }}>
                        <div className="lesson-title">{lesson.title}</div>
                        <div className="lesson-duration" style={{ display:'flex', alignItems:'center', gap:8 }}>
                          {lesson.duration}
                          {statusCfg && (
                            <span style={{ color: statusCfg.color, fontWeight:600, fontSize:11 }}>
                              · {statusCfg.label}
                            </span>
                          )}
                          {/* Progress bar for partially-watched lessons */}
                          {prog && !prog.completed && (
                            <div style={{ flex:1, maxWidth:80, height:3, background:'var(--gray-200)', borderRadius:2 }}>
                              <div style={{
                                height:'100%', borderRadius:2, background:'var(--primary)',
                                width:`${Math.round((prog.currentSecond / Math.max(1, prog.currentSecond + 1)) * 100)}%`,
                              }} />
                            </div>
                          )}
                        </div>
                      </div>
                      {lesson.free && <span className="badge badge-active lesson-badge">免費</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
