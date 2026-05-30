import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getUsers, getCourses, getBookings, getProjects, getAllHomework } from '../../data/mockData'
import { getAIUsageLogs, getPracticeSubmissions } from '../../services/aiService'
import { getBookingSubmitterProfiles, getBookingsRecords } from '../../services/bookings'

const TIER_LABELS = {
  basic: '體驗課',
  standard: '頂流達人',
  advanced: '頂流私塾',
  managed: '頂流代操',
}

const BOOKING_TYPE_LABELS = {
  oneonone: '一對一輔導',
  shooting: '拍攝安排',
}

const STATUS_LABELS = {
  active: '啟用',
  inactive: '停用',
  pending: '待處理',
  confirmed: '已確認',
  cancelled: '已取消',
  planning: '規劃中',
  filming: '拍攝中',
  editing: '剪輯中',
  completed: '已完成',
}

const AI_FEATURE_LABELS = {
  topics: '爆款選題',
  script: '腳本生成',
  shooting: '拍攝形式',
  planning: '策劃提案',
  marketing: '行銷文案',
  livestream: '直播話術',
}

const DASHBOARD_ICONS = {
  users: <path d="M16 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9.5 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8M21 20v-2a4 4 0 0 0-3-3.87" />,
  trial: <path d="M12 3l8 4-8 4-8-4zM4 11l8 4 8-4M7 13.5V18c1.4 1 3 1.5 5 1.5s3.6-.5 5-1.5v-4.5" />,
  homework: <path d="M8 4h8l4 4v12H4V4zM15 4v5h5M8 14h8M8 18h5" />,
  booking: <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />,
  managed: <path d="M13 2L4 14h7l-1 8 10-13h-7z" />,
  beta: <path d="M9 2h6M10 2v6l-5.5 9.5A3 3 0 0 0 7.1 22h9.8a3 3 0 0 0 2.6-4.5L14 8V2M8 15h8" />,
  ai: <path d="M12 2l1.7 5.3L19 9l-5.3 1.7L12 16l-1.7-5.3L5 9l5.3-1.7zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />,
}

function DashboardIcon({ name }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {DASHBOARD_ICONS[name] || DASHBOARD_ICONS.users}
      </g>
    </svg>
  )
}

function readLocalArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' })
}

function isWithinDays(value, days) {
  if (!value) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false
  return Date.now() - date.getTime() <= days * 24 * 60 * 60 * 1000
}

function topValue(items, fallback = '尚無資料') {
  const counts = items.filter(Boolean).reduce((acc, item) => {
    acc[item] = (acc[item] || 0) + 1
    return acc
  }, {})
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
  return top ? top[0] : fallback
}

export default function AdminDashboard() {
  const [cloudBookings, setCloudBookings] = useState(null)
  const [bookingProfilesById, setBookingProfilesById] = useState({})
  const users = getUsers()
  const memberUsers = users.filter(user => user.role !== 'admin')
  const students = memberUsers.filter(user => user.tier !== 'managed')
  const managedUsers = memberUsers.filter(user => user.tier === 'managed')
  const courses = getCourses()
  const bookings = cloudBookings || getBookings()
  const projects = getProjects()
  const homework = getAllHomework()
  const practiceSubmissions = getPracticeSubmissions()
  const aiLogs = getAIUsageLogs()
  const betaApplications = readLocalArray('beta_applications')

  const pendingHomework = homework.filter(item => item.status === 'pending')
  const pendingBookings = bookings.filter(item => item.status === 'pending')
  const activeManagedProjects = projects.filter(item => item.status !== 'completed')
  const betaPending = betaApplications.filter(item => item.status === 'pending')
  const betaApproved = betaApplications.filter(item => item.status === 'approved')
  const betaRejected = betaApplications.filter(item => item.status === 'rejected')
  const todayAiLogs = aiLogs.filter(item => new Date(item.created_at).toDateString() === new Date().toDateString())

  const recentActivityIds = new Set([
    ...homework.filter(item => isWithinDays(item.submittedAt, 30)).map(item => item.userId),
    ...bookings.filter(item => isWithinDays(item.createdAt, 30)).map(item => item.userId),
    ...students.filter(item => isWithinDays(item.createdAt, 30)).map(item => item.id),
  ])

  const publishedCourses = courses.filter(course => course.published)
  const courseViews = courses.reduce((sum, course) => sum + (course.students || 0), 0)
  const activeLearners = students.filter(user => user.status === 'active').length
  const activeLearners30 = recentActivityIds.size || activeLearners
  const completionRate = students.length
    ? Math.round((students.filter(user => user.courseCompletedAt || user.trialCompletedAt || user.expiresAt).length / students.length) * 100)
    : 0

  const latestUsers = [...memberUsers]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 5)

  const recentBookings = [...bookings]
    .sort((a, b) => `${b.date || ''}${b.timeSlot || ''}`.localeCompare(`${a.date || ''}${a.timeSlot || ''}`))
    .slice(0, 5)

  useEffect(() => {
    let cancelled = false
    getBookingsRecords()
      .then(async records => {
        if (cancelled) return
        setCloudBookings(records)
        const profiles = await getBookingSubmitterProfiles(records.map(item => item.userId))
        if (!cancelled) setBookingProfilesById(Object.fromEntries(profiles.map(profile => [profile.id, profile])))
      })
      .catch(err => console.error('Dashboard bookings load failed:', err))
    return () => { cancelled = true }
  }, [])

  const getName = (id) => bookingProfilesById[id]?.name || users.find(user => user.id === id)?.name || '—'

  const statCards = [
    { label: '總學員數', value: students.length, sub: `啟用 ${activeLearners} 位`, icon: 'users', to: '/admin/users' },
    { label: '體驗課學員', value: students.filter(user => user.tier === 'basic').length, sub: '體驗課資格與進度', icon: 'trial', to: '/admin/trial' },
    { label: '待審作業', value: pendingHomework.length, sub: `總提交 ${homework.length + practiceSubmissions.length} 份`, icon: 'homework', to: '/admin/homework' },
    { label: '待處理預約', value: pendingBookings.length, sub: '輔導與拍攝安排', icon: 'booking', to: '/admin/bookings' },
    { label: '代操進行中', value: activeManagedProjects.length, sub: `${managedUsers.length} 個代操帳號`, icon: 'managed', to: '/admin/managed' },
    { label: '封測申請', value: betaApplications.length, sub: `待審 ${betaPending.length} 份`, icon: 'beta', to: '/admin/beta' },
    { label: 'AI 使用次數', value: aiLogs.length, sub: `今日 ${todayAiLogs.length} 次`, icon: 'ai', to: '/admin/ai-analytics' },
  ]

  const todoItems = [
    { label: '待審作業', value: pendingHomework.length, to: '/admin/homework' },
    { label: '待確認預約', value: pendingBookings.length, to: '/admin/bookings' },
    { label: '待處理封測申請', value: betaPending.length, to: '/admin/beta' },
    { label: '待更新代操進度', value: activeManagedProjects.length, to: '/admin/managed' },
  ]

  return (
    <div className="admin-dashboard-v2">
      <div className="admin-dashboard-hero">
        <div>
          <p className="admin-kicker">OPERATIONS CENTER</p>
          <h1>控制台</h1>
          <p>平台最新數據總覽，集中查看教學會員、AI 工具、體驗課、預約、代操與封測申請的營運狀態。</p>
        </div>
        <div className="admin-dashboard-actions">
          <Link to="/" className="btn btn-secondary btn-sm">回到首頁</Link>
          <a href="/beta" target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">查看封測申請頁</a>
        </div>
      </div>

      <div className="admin-metric-grid">
        {statCards.map(card => (
          <Link key={card.label} to={card.to} className="admin-metric-card">
            <span className="admin-metric-icon"><DashboardIcon name={card.icon} /></span>
            <span className="admin-metric-label">{card.label}</span>
            <strong>{card.value}</strong>
            <span className="admin-metric-sub">{card.sub}</span>
          </Link>
        ))}
      </div>

      <div className="admin-dashboard-grid">
        <section className="admin-panel-card admin-panel-large">
          <div className="admin-panel-header">
            <div>
              <h2>最新學員</h2>
              <p>最近加入或啟用的會員</p>
            </div>
            <Link to="/admin/users">查看全部</Link>
          </div>
          <div className="admin-list">
            {latestUsers.map(user => (
              <div className="admin-list-row" key={user.id}>
                <div className="avatar" style={{ width: 34, height: 34, fontSize: 12 }}>{user.avatar}</div>
                <div>
                  <strong>{user.name}</strong>
                  <span>{user.email}</span>
                </div>
                <span className={`badge badge-${user.tier || user.status}`}>{TIER_LABELS[user.tier] || STATUS_LABELS[user.status] || user.status}</span>
                <small>{formatDate(user.createdAt)}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="admin-panel-card">
          <div className="admin-panel-header">
            <div>
              <h2>待處理事項</h2>
              <p>今天優先確認的營運工作</p>
            </div>
          </div>
          <div className="admin-todo-list">
            {todoItems.map(item => (
              <Link key={item.label} to={item.to} className="admin-todo-item">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </Link>
            ))}
          </div>
        </section>

        <section className="admin-panel-card">
          <div className="admin-panel-header">
            <div>
              <h2>近期預約</h2>
              <p>輔導、私塾與代操拍攝排程</p>
            </div>
            <Link to="/admin/bookings">管理預約</Link>
          </div>
          <div className="admin-list compact">
            {recentBookings.map(booking => (
              <div className="admin-list-row" key={booking.id}>
                <div>
                  <strong>{getName(booking.userId)}</strong>
                  <span>{BOOKING_TYPE_LABELS[booking.type] || booking.type} · {booking.topic}</span>
                </div>
                <span className={`badge badge-${booking.status}`}>{STATUS_LABELS[booking.status] || booking.status}</span>
                <small>{formatDate(booking.date)}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="admin-panel-card">
          <div className="admin-panel-header">
            <div>
              <h2>AI 使用摘要</h2>
              <p>工具使用、熱門需求與輸入方向</p>
            </div>
            <Link to="/admin/ai-analytics">查看 AI 數據</Link>
          </div>
          <div className="admin-mini-stats">
            <div><span>今日使用</span><strong>{todayAiLogs.length}</strong></div>
            <div><span>累積使用</span><strong>{aiLogs.length}</strong></div>
            <div><span>熱門行業</span><strong>{topValue(aiLogs.map(log => log.industry))}</strong></div>
            <div><span>常用功能</span><strong>{topValue(aiLogs.map(log => AI_FEATURE_LABELS[log.feature]))}</strong></div>
          </div>
        </section>

        <section className="admin-panel-card">
          <div className="admin-panel-header">
            <div>
              <h2>頂流代操摘要</h2>
              <p>代操帳號、內容交付與進度</p>
            </div>
            <Link to="/admin/managed">管理代操</Link>
          </div>
          <div className="admin-mini-stats">
            <div><span>代操帳號</span><strong>{managedUsers.length}</strong></div>
            <div><span>進行中專案</span><strong>{activeManagedProjects.length}</strong></div>
            <div><span>待交付內容</span><strong>{projects.filter(project => project.status === 'editing').length}</strong></div>
            <div><span>拍攝安排</span><strong>{projects.filter(project => project.status === 'filming').length}</strong></div>
          </div>
        </section>

        <section className="admin-panel-card">
          <div className="admin-panel-header">
            <div>
              <h2>課程數據總覽</h2>
              <p>觀看、完課與作業提交概況</p>
            </div>
            <Link to="/admin/courses">課程與影片</Link>
          </div>
          <div className="admin-mini-stats">
            <div><span>已發布課程</span><strong>{publishedCourses.length}</strong></div>
            <div><span>課程觀看數</span><strong>{courseViews.toLocaleString('zh-TW')}</strong></div>
            <div><span>完課率</span><strong>{completionRate}%</strong></div>
            <div><span>近 30 天活躍</span><strong>{activeLearners30}</strong></div>
          </div>
          <div className="admin-progress-track" aria-label="完課率">
            <span style={{ width: `${completionRate}%` }} />
          </div>
        </section>

        <section className="admin-panel-card">
          <div className="admin-panel-header">
            <div>
              <h2>封測管理摘要</h2>
              <p>/beta 封閉測試申請名單</p>
            </div>
            <Link to="/admin/beta">封測管理</Link>
          </div>
          <div className="admin-mini-stats">
            <div><span>總申請</span><strong>{betaApplications.length}</strong></div>
            <div><span>待審核</span><strong>{betaPending.length}</strong></div>
            <div><span>已通過</span><strong>{betaApproved.length}</strong></div>
            <div><span>已拒絕</span><strong>{betaRejected.length}</strong></div>
          </div>
          <a href="/beta" target="_blank" rel="noreferrer" className="admin-link-arrow">查看前台封測申請頁</a>
        </section>
      </div>
    </div>
  )
}
