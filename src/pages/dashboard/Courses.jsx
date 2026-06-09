import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getCourses, canAccessCourse } from '../../data/mockData'
import { fetchCourseCatalog } from '../../services/courseCatalog'

const CAT_EMOJI = { '影音創作': '🎬', '社群媒體': '📱', '音頻創作': '🎙️', '商業變現': '💰', '數據分析': '📊', 'AI 應用': '🤖' }
const COURSE_LEVEL_LABEL = { basic: '體驗', standard: '達人', advanced: '私塾' }
const ACCESS_LEVEL_LABEL = { trial: '體驗', standard: '達人', advanced: '私塾' }
const ACCESS_LEVEL_ORDER = ['trial', 'standard', 'advanced']

function courseAccessLevels(course) {
  if (Array.isArray(course.accessLevels) && course.accessLevels.length > 0) return course.accessLevels
  const legacyAccess = course.accessLevel || 'standard'
  const startIndex = ACCESS_LEVEL_ORDER.indexOf(legacyAccess)
  return startIndex >= 0 ? ACCESS_LEVEL_ORDER.slice(startIndex) : [legacyAccess]
}

function courseLevelText(course) {
  return courseAccessLevels(course).map(level => ACCESS_LEVEL_LABEL[level]).filter(Boolean).join(' / ') || COURSE_LEVEL_LABEL[course.tier] || '達人'
}

export default function CoursesPage() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [courses, setCourses] = useState(() => getCourses())
  const [loadError, setLoadError] = useState('')
  const allCourses = courses.filter(c => c.published)
  const [filter, setFilter] = useState('all')
  const [search, setSearch]  = useState('')

  const categories = ['all', ...new Set(allCourses.map(c => c.category))]

  const visible = allCourses.filter(c => {
    const matchCat = filter === 'all' || c.category === filter
    const matchSearch = c.title.includes(search) || c.description.includes(search) || c.instructor.includes(search)
    return matchCat && matchSearch
  })

  const accessible = (c) => canAccessCourse(currentUser.tier, courseAccessLevels(c))

  useEffect(() => {
    let cancelled = false
    fetchCourseCatalog()
      .then(catalog => {
        if (!cancelled) {
          setCourses(catalog.courses)
          setLoadError('')
        }
      })
      .catch(err => {
        console.error('Course catalog load failed:', err)
        if (!cancelled) setLoadError('課程同步失敗，請重新整理後再試')
      })
    return () => { cancelled = true }
  }, [])

  const LOCK_LABEL = {
    standard: '需頂流達人或以上',
    advanced: '需頂流私塾',
  }

  return (
    <div className="page-content">
      <div className="page-heading">
        <h1>所有課程</h1>
        <p>共 {allCourses.length} 門課程，你目前可觀看 {allCourses.filter(c => accessible(c)).length} 門</p>
      </div>
      {loadError && <div className="auth-alert error" style={{ marginBottom: 16 }}>{loadError}</div>}

      <div style={{ marginBottom: 16 }}>
        <input className="form-input" placeholder="搜尋課程名稱、講師…" value={search}
          onChange={e => setSearch(e.target.value)} style={{ maxWidth: 360 }} />
      </div>

      <div className="filter-bar">
        {categories.map(cat => (
          <button key={cat} className={`filter-chip ${filter === cat ? 'active' : ''}`} onClick={() => setFilter(cat)}>
            {cat === 'all' ? '全部' : `${CAT_EMOJI[cat] || ''} ${cat}`}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">🔍</div><h3>找不到課程</h3><p>試試其他關鍵字或分類</p></div>
      ) : (
        <div className="courses-grid">
          {visible.map(course => {
            const ok = accessible(course)
            return (
              <div key={course.id} className={`course-card ${!ok ? 'locked' : ''}`}
                onClick={() => ok && navigate(`/dashboard/courses/${course.id}`)}>
                <div
                  className={`course-thumb course-thumb-${course.tier}`}
                  style={course.coverUrl ? { backgroundImage:`url(${course.coverUrl})`, backgroundSize:'cover', backgroundPosition:'center' } : undefined}
                >
                  {!course.coverUrl && <span>{CAT_EMOJI[course.category] || '📖'}</span>}
                  {!ok && <div className="course-lock-overlay">🔒</div>}
                </div>
                <div className="course-body">
                  <div className="course-meta">
                    <span className={`badge badge-${course.tier}`}>{courseLevelText(course)}</span>
                    <span className="tag">{course.category}</span>
                    {!ok && <span className="tag" style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}>🔒 {LOCK_LABEL[course.accessLevel] || '需升級'}</span>}
                  </div>
                  <h3 className="course-title">{course.title}</h3>
                  <p className="course-desc">{course.description}</p>
                </div>
                <div className="course-footer">
                  <div className="course-stats">
                    <span>👨‍🏫 {course.instructor}</span>
                    <span>📖 {course.lessons.length} 節</span>
                    <span>⏱ {course.duration}</span>
                  </div>
                  <span className="course-rating">★ {course.rating}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
