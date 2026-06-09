import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getCourses, canAccessCourse, TIER_META, getAdvancedOfferStatus, getManagedOfferStatus, getSystemSettings } from '../../data/mockData'
import { fetchCourseCatalog } from '../../services/courseCatalog'
import { AdvancedOfferBanner, CompletionOfferBanner } from '../../components/CountdownBanner'
import { IconBook, IconPlay, IconAI, IconCalendar, IconZap, IconArrow, COURSE_CAT_CONFIG, DEFAULT_CAT_CONFIG } from '../../components/Icons'

export default function PremiumHome() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [courses, setCourses] = useState(() => getCourses())

  useEffect(() => {
    let cancelled = false
    fetchCourseCatalog()
      .then(catalog => {
        if (!cancelled) setCourses(catalog.courses)
      })
      .catch(err => console.error('Course catalog refresh failed:', err))
    return () => { cancelled = true }
  }, [])

  const allCourses = courses.filter(c => c.published)
  const accessible = allCourses.filter(c => canAccessCourse(currentUser.tier, c.accessLevels || c.accessLevel))
  const featured   = accessible.slice(0, 3)
  const meta       = TIER_META[currentUser.tier]
  const advOffer   = getAdvancedOfferStatus(currentUser)
  const mgtOffer   = getManagedOfferStatus(currentUser)

  // Apply custom background image if admin has set one
  useEffect(() => {
    const { bgImages } = getSystemSettings()
    if (bgImages?.advanced) {
      document.body.style.backgroundImage = `url(${bgImages.advanced})`
      document.body.style.backgroundSize  = 'cover'
      document.body.style.backgroundPosition = 'center'
    }
    return () => {
      document.body.style.backgroundImage = ''
      document.body.style.backgroundSize  = ''
      document.body.style.backgroundPosition = ''
    }
  }, [])

  return (
    <div className="ph2-page bg-vip-private">
      {advOffer.active && <AdvancedOfferBanner offer={advOffer} />}
      {mgtOffer.active && <CompletionOfferBanner offer={mgtOffer} />}

      {/* Hero */}
      <div className="ph2-hero">
        <div className="ph2-hero-left">
          <p className="ph2-eyebrow">TOP LEVEL PRIVATE</p>
          <h1 className="ph2-name">你好，{currentUser.name}！</h1>
          <p className="ph2-sub">歡迎回到頂流私塾，今天想學習什麼呢？</p>
          <span className="ph2-badge">{meta?.label}</span>
          <p className="ph2-date">加入日期 {currentUser.createdAt}{currentUser.expiresAt && ` · 效期至 ${currentUser.expiresAt}`}</p>
        </div>
      </div>

      {/* 4 stat cards */}
      <div className="ph2-stats">
        {[
          { icon: <IconBook size={16} strokeWidth={1.5}/>, val: accessible.length, label: '解鎖課程' },
          { icon: <IconPlay size={16} strokeWidth={1.5}/>, val: accessible.reduce((s,c)=>s+c.lessons.length,0), label: '課程節數' },
          { icon: <IconAI size={16} strokeWidth={1.5}/>,   val: '已解鎖', label: 'AI 智能助理', small: true },
          { icon: <IconCalendar size={16} strokeWidth={1.5}/>, val: '可預約', label: '一對一輔導', small: true },
        ].map(({ icon, val, label, small }) => (
          <div key={label} className="ph2-stat-card">
            <div className="ph2-stat-icon">{icon}</div>
            <div className={`ph2-stat-val${small ? ' small' : ''}`}>{val}</div>
            <div className="ph2-stat-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Feature cards */}
      <p className="ph2-section-title">專屬功能</p>
      <div className="ph2-features">
        <div className="ph2-feature" onClick={() => navigate('/dashboard/ai-tools')}>
          <div className="ph2-feature-icon"><IconAI size={22} strokeWidth={1.5}/></div>
          <div className="ph2-feature-title">AI 智能體顧問</div>
          <div className="ph2-feature-desc">與 AI 顧問對話，獲得個人化自媒體建議與策略規劃</div>
          <button className="ph2-feature-btn">開始對話 <IconArrow size={12}/></button>
        </div>
        <div className="ph2-feature" onClick={() => navigate('/dashboard/booking')}>
          <div className="ph2-feature-icon"><IconCalendar size={22} strokeWidth={1.5}/></div>
          <div className="ph2-feature-title">一對一輔導</div>
          <div className="ph2-feature-desc">直接與老師預約，針對你的內容量身提供深度建議</div>
          <button className="ph2-feature-btn">立即預約 <IconArrow size={12}/></button>
        </div>
        <div className="ph2-feature" onClick={() => navigate('/dashboard/profile')}>
          <div className="ph2-feature-icon"><IconZap size={22} strokeWidth={1.5}/></div>
          <div className="ph2-feature-title">頂流代操服務</div>
          <div className="ph2-feature-desc">讓我們直接幫你經營帳號，實現最高效率的帳號成長</div>
          <button className="ph2-feature-btn">了解更多 <IconArrow size={12}/></button>
        </div>
      </div>

      {/* Courses */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <p className="ph2-courses-title">精選課程</p>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/dashboard/courses')}>查看全部 →</button>
      </div>
      <div className="ph2-course-grid">
        {featured.map(course => {
          const cfg = COURSE_CAT_CONFIG[course.category] || DEFAULT_CAT_CONFIG
          const ThumbIcon = cfg.Icon
          return (
            <div key={course.id} className="ph2-course" onClick={() => navigate(`/dashboard/courses/${course.id}`)}>
              <div
                className={`ph2-course-thumb${course.coverUrl ? ' has-cover' : ''}`}
                style={course.coverUrl ? { backgroundImage:`url(${course.coverUrl})`, backgroundSize:'cover', backgroundPosition:'center' } : { background: cfg.bg }}
              >
                {!course.coverUrl && <ThumbIcon size={40} stroke={cfg.color} strokeWidth={1} />}
              </div>
              <div className="ph2-course-body">
                <span className="ph2-course-tag">{course.category}</span>
                <h3 className="ph2-course-title">{course.title}</h3>
              </div>
              <div className="ph2-course-footer">
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
