import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  getCourses, canAccessCourse, TIER_META,
  getLessonProgress, getLatestHomework, getHomeworkSpec, parseDurationToSec,
} from '../../data/mockData'
import { getCourseProgressRecords, saveCourseProgressRecord } from '../../services/courseProgress'
import { fetchCourseCatalog } from '../../services/courseCatalog'
import { getHomeworkSpecsRecords, getHomeworkSubmissionsForCourse } from '../../services/homework'
import LessonPlayer  from '../../components/LessonPlayer'
import HomeworkPanel from '../../components/HomeworkPanel'

const CAT_EMOJI = { '影音創作':'🎬', '社群媒體':'📱', '音頻創作':'🎙️', '商業變現':'💰', '數據分析':'📊', 'AI 應用':'🤖' }
const COURSE_LEVEL_LABEL = { basic: '體驗', standard: '達人', advanced: '私塾' }
const ACCESS_LEVEL_LABEL = { trial: '體驗', standard: '達人', advanced: '私塾' }
const ACCESS_LEVEL_ORDER = ['trial', 'standard', 'advanced']
const COURSE_RESUME_KEY = 'mp_course_resume_targets'

// Only standard/advanced tier students get the forced-watch + homework system
const NEEDS_HOMEWORK = ['standard', 'advanced']
const NEEDS_SEQUENTIAL_WATCH = ['basic']

function mapProgress(records) {
  return records.reduce((acc, record) => {
    acc[record.lessonId] = record
    return acc
  }, {})
}

function getCourseResumeTargets() {
  try {
    return JSON.parse(localStorage.getItem(COURSE_RESUME_KEY) || '{}')
  } catch {
    return {}
  }
}

function getCourseResumeTarget(userId, courseId) {
  return getCourseResumeTargets()[`${userId}:${courseId}`] || null
}

function saveCourseResumeTarget(userId, courseId, lessonId) {
  if (!lessonId) return
  const targets = getCourseResumeTargets()
  targets[`${userId}:${courseId}`] = {
    lessonId,
    updatedAt: new Date().toISOString(),
  }
  localStorage.setItem(COURSE_RESUME_KEY, JSON.stringify(targets))
}

function nextLessonFromProgress(lessons, progressByLesson, needsSequentialWatch, needsHomework) {
  if (!Array.isArray(lessons) || lessons.length === 0) return null
  const watched = lessons
    .map((lesson, index) => ({ lesson, index, progress: progressByLesson[lesson.id] }))
    .filter(item => item.progress)
    .sort((a, b) => new Date(b.progress.updatedAt || b.progress.completedAt || 0) - new Date(a.progress.updatedAt || a.progress.completedAt || 0))

  const latestIncomplete = watched.find(item => !item.progress.completed && item.progress.currentSecond > 0)
  if (latestIncomplete) return latestIncomplete.lesson.id

  if (needsSequentialWatch || needsHomework) {
    const firstIncomplete = lessons.find(lesson => !progressByLesson[lesson.id]?.completed)
    return firstIncomplete?.id || lessons[0].id
  }

  return watched[0]?.lesson.id || lessons[0].id
}

function mapHomeworkSpecs(records) {
  return records.reduce((acc, record) => {
    acc[record.lessonId] = record
    return acc
  }, {})
}

function mapLatestHomework(records) {
  return records.reduce((acc, record) => {
    const existing = acc[record.lessonId]
    if (!existing || new Date(record.submittedAt) > new Date(existing.submittedAt)) {
      acc[record.lessonId] = record
    }
    return acc
  }, {})
}

function lessonProgress(userId, courseId, lessonId, progressByLesson) {
  return progressByLesson[lessonId] || getLessonProgress(userId, courseId, lessonId)
}

function homeworkSpecForLesson(lessonId, specByLesson) {
  return specByLesson[lessonId] || getHomeworkSpec(lessonId)
}

function latestHomeworkForLesson(userId, courseId, lessonId, homeworkByLesson) {
  return homeworkByLesson[lessonId] || getLatestHomework(userId, courseId, lessonId)
}

function courseAccessLevels(course) {
  if (Array.isArray(course?.accessLevels) && course.accessLevels.length > 0) return course.accessLevels
  const legacyAccess = course?.accessLevel || 'standard'
  const startIndex = ACCESS_LEVEL_ORDER.indexOf(legacyAccess)
  return startIndex >= 0 ? ACCESS_LEVEL_ORDER.slice(startIndex) : [legacyAccess]
}

function isTrialCourse(course) {
  return course?.tier === 'basic' || courseAccessLevels(course).includes('trial')
}

function courseNeedsHomework(course, userTier) {
  if (isTrialCourse(course)) return false
  return NEEDS_HOMEWORK.includes(userTier)
}

function courseNeedsSequentialWatch(course) {
  return isTrialCourse(course)
}

function courseLevelText(course) {
  return courseAccessLevels(course).map(level => ACCESS_LEVEL_LABEL[level]).filter(Boolean).join(' / ') || COURSE_LEVEL_LABEL[course?.tier] || '達人'
}

function isLessonUnlockedByProgress(userId, courseId, lessons, idx, needsSequentialWatch, needsHomework, progressByLesson, specByLesson, homeworkByLesson) {
  if (!needsSequentialWatch && !needsHomework) return true
  if (idx === 0) return true
  const prev = lessons[idx - 1]
  const prog = lessonProgress(userId, courseId, prev.id, progressByLesson)
  if (!prog?.completed) return false
  if (!needsHomework) return true
  const spec = homeworkSpecForLesson(prev.id, specByLesson)
  if (!spec) return true
  const hw = latestHomeworkForLesson(userId, courseId, prev.id, homeworkByLesson)
  return hw?.status === 'approved'
}

function lessonStatusIcon(userId, courseId, lessons, idx, needsSequentialWatch, needsHomework, progressByLesson, specByLesson, homeworkByLesson) {
  if (!needsSequentialWatch && !needsHomework) return null
  if (!isLessonUnlockedByProgress(userId, courseId, lessons, idx, needsSequentialWatch, needsHomework, progressByLesson, specByLesson, homeworkByLesson)) return { icon:'🔒', color:'var(--gray-300)', label:'尚未解鎖' }
  const lesson = lessons[idx]
  const prog = lessonProgress(userId, courseId, lesson.id, progressByLesson)
  if (!prog?.completed) return { icon:'▶', color:'var(--primary)', label:'可觀看' }
  if (!needsHomework) return { icon:'✅', color:'var(--success)', label:'已完成' }
  const spec = homeworkSpecForLesson(lesson.id, specByLesson)
  if (!spec) return { icon:'✅', color:'var(--success)', label:'已完成' }
  const hw = latestHomeworkForLesson(userId, courseId, lesson.id, homeworkByLesson)
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
  const [specByLesson, setSpecByLesson] = useState({})
  const [homeworkByLesson, setHomeworkByLesson] = useState({})
  const [progressLoadError, setProgressLoadError] = useState('')
  const [courses, setCourses] = useState(() => getCourses())
  const [catalogReady, setCatalogReady] = useState(false)
  const [, forceRender] = useState(0) // trigger re-render after homework submit

  const course = courses.find(c => c.id === Number(id))

  useEffect(() => {
    let cancelled = false
    fetchCourseCatalog()
      .then(catalog => {
        if (!cancelled) {
          setCourses(catalog.courses)
          setCatalogReady(true)
        }
      })
      .catch(err => {
        console.error('Course catalog load failed:', err)
        if (!cancelled) {
          setCatalogReady(true)
          setProgressLoadError('課程同步失敗，請重新整理後再試')
        }
      })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!course || !currentUser?.id) return
    let cancelled = false

    Promise.all([
      getCourseProgressRecords(currentUser.id, course.id, course.lessons.map(lesson => lesson.id)),
      getHomeworkSpecsRecords(),
      getHomeworkSubmissionsForCourse(currentUser.id, course.id),
    ])
      .then(([progressRecords, specRecords, homeworkRecords]) => {
        if (cancelled) return
        const nextProgressByLesson = mapProgress(progressRecords)
        const resumeTarget = getCourseResumeTarget(currentUser.id, course.id)
        const resumeLessonId = resumeTarget && course.lessons.some(lesson => lesson.id === resumeTarget.lessonId)
          ? resumeTarget.lessonId
          : null
        setProgressByLesson(nextProgressByLesson)
        setSpecByLesson(mapHomeworkSpecs(specRecords))
        setHomeworkByLesson(mapLatestHomework(homeworkRecords))
        setActiveLessonId(current => current || resumeLessonId || nextLessonFromProgress(
          course.lessons,
          nextProgressByLesson,
          courseNeedsSequentialWatch(course),
          courseNeedsHomework(course, currentUser.tier),
        ))
        setProgressLoadError('')
      })
      .catch(err => {
        console.error('Course detail data load failed:', err)
        if (!cancelled) setProgressLoadError('')
      })

    return () => { cancelled = true }
  }, [course?.id, currentUser?.id])

  if (!course && !catalogReady) return (
    <div className="page-content">
      <p style={{ color: 'var(--gray-400)', fontSize: 14 }}>載入課程中...</p>
    </div>
  )

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

  const ok = canAccessCourse(currentUser.tier, courseAccessLevels(course))
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
            <button className="btn btn-primary btn-lg" disabled>升級即將開放</button>
          </div>
        </div>
      </div>
    )
  }

  const needsHomework = courseNeedsHomework(course, currentUser.tier)
  const needsSequentialWatch = courseNeedsSequentialWatch(course)
  const activeLesson  = course.lessons.find(l => l.id === activeLessonId) || null

  const handleLessonClick = (lesson, lessonIdx) => {
    if (!isLessonUnlockedByProgress(currentUser.id, course.id, course.lessons, lessonIdx, needsSequentialWatch, needsHomework, progressByLesson, specByLesson, homeworkByLesson)) return
    setActiveLessonId(lesson.id)
    // If already completed and replaying, go straight to player in free mode
    setView('player')
  }

  const handleProgressChange = useCallback((record) => {
    if (!record?.lessonId) return
    setProgressByLesson(prev => ({ ...prev, [record.lessonId]: record }))
  }, [])

  const handlePlayerComplete = useCallback(() => {
    // After forced-watch done → show homework panel only for tiers that require it.
    const activeIndex = activeLesson ? course.lessons.findIndex(lesson => lesson.id === activeLesson.id) : -1
    const nextLesson = activeIndex >= 0 ? course.lessons[activeIndex + 1] : null
    if (activeLesson) {
      const existing = progressByLesson[activeLesson.id]
      const completedSecond = Math.max(existing?.currentSecond || 0, parseDurationToSec(activeLesson.duration))
      setProgressByLesson(prev => ({
        ...prev,
        [activeLesson.id]: {
          ...existing,
          userId: currentUser.id,
          courseId: course.id,
          lessonId: activeLesson.id,
          currentSecond: completedSecond,
          completed: true,
          completedAt: existing?.completedAt || new Date().toISOString(),
        },
      }))
      saveCourseProgressRecord(currentUser.id, course.id, activeLesson.id, completedSecond, true)
        .catch(err => console.error('Course completion retry failed:', err))
    }
    const spec = activeLesson ? homeworkSpecForLesson(activeLesson.id, specByLesson) : null
    if (needsHomework && spec) {
      setView('homework')
      return
    }
    if (nextLesson) {
      saveCourseResumeTarget(currentUser.id, course.id, nextLesson.id)
      setProgressByLesson(prev => {
        const existingNext = prev[nextLesson.id]
        if (existingNext?.completed || existingNext?.currentSecond > 0) return prev
        return {
          ...prev,
          [nextLesson.id]: {
            userId: currentUser.id,
            courseId: course.id,
            lessonId: nextLesson.id,
            currentSecond: 1,
            completed: false,
            completedAt: null,
            watchCount: 0,
            updatedAt: new Date().toISOString(),
          },
        }
      })
      saveCourseProgressRecord(currentUser.id, course.id, nextLesson.id, 1, false)
        .catch(err => console.error('Next lesson resume save failed:', err))
    }
    setView('info')
    setActiveLessonId(null)
  }, [activeLesson, course.id, course.lessons, currentUser.id, needsHomework, progressByLesson, specByLesson])

  const handleClose = () => {
    setView('info')
    setActiveLessonId(null)
  }

  const handleHomeworkSubmitted = () => {
    getHomeworkSubmissionsForCourse(currentUser.id, course.id)
      .then(records => setHomeworkByLesson(mapLatestHomework(records)))
      .catch(err => console.error('Homework refresh failed:', err))
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
              <div
                className={`course-thumb course-thumb-${course.tier}`}
                style={{
                  height:220,
                  borderRadius:'var(--radius-lg) var(--radius-lg) 0 0',
                  fontSize:64,
                  ...(course.coverUrl ? { backgroundImage:`url(${course.coverUrl})`, backgroundSize:'cover', backgroundPosition:'center' } : {}),
                }}
              >
                {!course.coverUrl && <span>{CAT_EMOJI[course.category] || '📖'}</span>}
              </div>
              <div className="card-body">
                <div className="course-meta" style={{ marginBottom:12 }}>
                  <span className={`badge badge-${course.tier}`}>
                    {courseLevelText(course)}
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
                  const statusCfg = lessonStatusIcon(currentUser.id, course.id, course.lessons, idx, needsSequentialWatch, needsHomework, progressByLesson, specByLesson, homeworkByLesson)
                  const locked    = !isLessonUnlockedByProgress(currentUser.id, course.id, course.lessons, idx, needsSequentialWatch, needsHomework, progressByLesson, specByLesson, homeworkByLesson)

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
                  const statusCfg = lessonStatusIcon(currentUser.id, course.id, course.lessons, idx, needsSequentialWatch, needsHomework, progressByLesson, specByLesson, homeworkByLesson)
                  const locked    = !isLessonUnlockedByProgress(currentUser.id, course.id, course.lessons, idx, needsSequentialWatch, needsHomework, progressByLesson, specByLesson, homeworkByLesson)
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
