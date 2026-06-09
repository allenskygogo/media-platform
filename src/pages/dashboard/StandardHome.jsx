import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getCourses, canAccessCourse, TIER_META, getLessonProgress, getAdvancedOfferStatus, getManagedOfferStatus, getSystemSettings } from '../../data/mockData'
import { fetchCourseCatalog } from '../../services/courseCatalog'
import { AdvancedOfferBanner, CompletionOfferBanner } from '../../components/CountdownBanner'
import { IconBook, IconPlay, IconStar, IconArrow, IconTrophy, COURSE_CAT_CONFIG, DEFAULT_CAT_CONFIG } from '../../components/Icons'

export default function StandardHome() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [courses, setCourses] = useState(() => getCourses())

  useEffect(() => {
    const { bgImages } = getSystemSettings()
    if (bgImages?.standard) {
      document.body.style.backgroundImage = `url(${bgImages.standard})`
      document.body.style.backgroundSize  = 'cover'
      document.body.style.backgroundPosition = 'center'
    }
    return () => {
      document.body.style.backgroundImage = ''
      document.body.style.backgroundSize  = ''
      document.body.style.backgroundPosition = ''
    }
  }, [])
  useEffect(() => {
    let cancelled = false
    fetchCourseCatalog()
      .then(catalog => {
        if (!cancelled) setCourses(catalog.courses)
      })
      .catch(err => console.error('Course catalog refresh failed:', err))
    return () => { cancelled = true }
  }, [])

  const allCourses   = courses.filter(c => c.published)
  const accessible   = allCourses.filter(c => canAccessCourse(currentUser.tier, c.accessLevels || c.accessLevel))
  const featured     = accessible.slice(0, 3)
  const meta         = TIER_META[currentUser.tier]
  const advOffer     = getAdvancedOfferStatus(currentUser)
  const mgtOffer     = getManagedOfferStatus(currentUser)
  const totalLessons = accessible.reduce((s,c)=>s+c.lessons.length,0)
  const doneL        = accessible.reduce((s,c)=>s+c.lessons.filter(l=>getLessonProgress(currentUser.id,c.id,l.id)?.completed).length,0)
  const pct          = totalLessons > 0 ? Math.round((doneL/totalLessons)*100) : 0

  return (
    <div className="sh2-page bg-master-class">
      {advOffer.active && <AdvancedOfferBanner offer={advOffer} />}
      {mgtOffer.active && <CompletionOfferBanner offer={mgtOffer} />}

      {/* Hero */}
      <div className="sh2-hero">
        <div className="sh2-hero-left">
          <p className="sh2-eyebrow">WELCOME BACK</p>
          <h1 className="sh2-name">你好，{currentUser.name}！</h1>
          <span className="sh2-badge">{meta?.label}</span>
          {currentUser.expiresAt && <p className="sh2-date">效期至 {currentUser.expiresAt}</p>}
          <div className="sh2-progress-wrap">
            <div className="sh2-progress-header">
              <span>課程完成進度</span>
              <span>{pct}%</span>
            </div>
            <div className="sh2-progress-bar">
              <div className="sh2-progress-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* 3 stat cards */}
      <div className="sh2-stats">
        <div className="sh2-stat-card">
          <div className="sh2-stat-icon"><IconBook size={16} strokeWidth={1.5}/></div>
          <div className="sh2-stat-val">{accessible.length}</div>
          <div className="sh2-stat-label">可觀看課程</div>
          <div className="sh2-stat-sub">共 {allCourses.length} 門</div>
        </div>
        <div className="sh2-stat-card">
          <div className="sh2-stat-icon"><IconPlay size={16} strokeWidth={1.5}/></div>
          <div className="sh2-stat-val">{totalLessons}</div>
          <div className="sh2-stat-label">課程總節數</div>
          <div className="sh2-stat-sub">節課程內容</div>
        </div>
        <div className="sh2-stat-card">
          <div className="sh2-stat-icon"><IconStar size={16} strokeWidth={1.5}/></div>
          <div className="sh2-stat-val" style={{ fontSize:20, fontFamily:'Inter,sans-serif' }}>{meta?.label}</div>
          <div className="sh2-stat-label">會員等級</div>
          <div className="sh2-stat-sub">加入 {currentUser.createdAt}</div>
        </div>
      </div>

      {/* Upgrade banner */}
      {currentUser.tier === 'standard' && (
        <div className="sh2-upgrade">
          <div className="sh2-upgrade-left">
            <div className="sh2-upgrade-icon"><IconTrophy size={20} strokeWidth={1.5}/></div>
            <div>
              <div className="sh2-upgrade-title">完成所有課程，解鎖頂流私塾折抵優惠</div>
              <div className="sh2-upgrade-desc">頂流私塾包含 AI 工具、一對一輔導、高階商業變現課程</div>
            </div>
          </div>
          <button className="btn btn-primary btn-sm" disabled>
            即將開放
          </button>
        </div>
      )}

      {/* Courses */}
      <div className="sh2-courses-header">
        <h2 className="sh2-courses-title">推薦課程</h2>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/dashboard/courses')}>查看全部 →</button>
      </div>
      <div className="sh2-course-grid">
        {featured.map(course => {
          const cfg = COURSE_CAT_CONFIG[course.category] || DEFAULT_CAT_CONFIG
          const ThumbIcon = cfg.Icon
          return (
            <div key={course.id} className="sh2-course" onClick={() => navigate(`/dashboard/courses/${course.id}`)}>
              <div
                className={`sh2-course-thumb${course.coverUrl ? ' has-cover' : ''}`}
                style={course.coverUrl ? { backgroundImage:`url(${course.coverUrl})`, backgroundSize:'cover', backgroundPosition:'center' } : { background: cfg.bg }}
              >
                {!course.coverUrl && <ThumbIcon size={36} stroke={cfg.color} strokeWidth={1}/>}
              </div>
              <div className="sh2-course-body">
                <span className="sh2-course-tag">{course.category}</span>
                <h3 className="sh2-course-title">{course.title}</h3>
                <p className="sh2-course-desc">{course.description}</p>
              </div>
              <div className="sh2-course-footer">
                <span>{course.instructor}</span>
                <span>★ {course.rating}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
