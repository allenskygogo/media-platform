import { useEffect, useMemo, useState } from 'react'
import {
  canAccessCourse,
  getCourses,
  getLessonProgress,
  getUsers,
  TIER_META,
} from '../../data/mockData'
import { hasSupabase, supabase } from '../../lib/supabase'

const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'https://media-platform-api.allen-a76.workers.dev'
const TIER_MARK = { basic: '體驗課', standard: '頂流達人', advanced: '頂流私塾', managed: '頂流代操' }
const REMINDER_KEY = 'mp_learning_reminders'
const DEFAULT_MESSAGE = '提醒你回來完成課程進度，有問題可以私訊官方客服 @xgfx。'
const DEFAULT_SUBJECT = '頂級流量課程進度提醒'

function formatDateTime(value) {
  if (!value) return '尚無紀錄'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '尚無紀錄'
  return date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getLocalReminders() {
  return JSON.parse(localStorage.getItem(REMINDER_KEY) || '[]')
}

function saveLocalReminders(rows) {
  localStorage.setItem(REMINDER_KEY, JSON.stringify(rows))
}

function buildLocalLearningProgress() {
  const courses = getCourses().filter(course => course.published !== false)
  const students = getUsers().filter(user => user.role === 'student' && user.tier !== 'managed')
  const reminders = getLocalReminders()

  return students.map(user => {
    const visibleCourses = courses.filter(course => canAccessCourse(user.tier, course.accessLevels || course.accessLevel || course.tier))
    const progress = visibleCourses.map(course => {
      const lessons = course.lessons || []
      const lessonRows = lessons.map(lesson => ({
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        ...(getLessonProgress(user.id, course.id, lesson.id) || {}),
      }))
      const completedLessons = lessonRows.filter(row => row.completed).length
      const latest = lessonRows
        .filter(row => row.updatedAt)
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0] || null
      return {
        courseId: course.id,
        courseTitle: course.title,
        totalLessons: lessons.length,
        completedLessons,
        percent: lessons.length ? Math.round((completedLessons / lessons.length) * 100) : 0,
        latestLessonTitle: latest?.lessonTitle || null,
        latestSecond: latest?.currentSecond || 0,
        latestUpdatedAt: latest?.updatedAt || null,
      }
    })

    const totalLessons = progress.reduce((sum, item) => sum + item.totalLessons, 0)
    const completedLessons = progress.reduce((sum, item) => sum + item.completedLessons, 0)
    const latestCourse = progress
      .filter(item => item.latestUpdatedAt)
      .sort((a, b) => new Date(b.latestUpdatedAt) - new Date(a.latestUpdatedAt))[0] || null
    const lastReminder = reminders
      .filter(item => item.userId === user.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      status: user.status,
      tier: user.tier,
      planId: user.planId,
      totalLessons,
      completedLessons,
      percent: totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0,
      latestCourseTitle: latestCourse?.courseTitle || '尚未觀看',
      latestLessonTitle: latestCourse?.latestLessonTitle || '',
      latestSecond: latestCourse?.latestSecond || 0,
      latestUpdatedAt: latestCourse?.latestUpdatedAt || null,
      lastReminderAt: lastReminder?.createdAt || null,
      progress,
    }
  })
}

function ProgressBar({ percent }) {
  return (
    <div style={{ minWidth: 160 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
        <span style={{ fontWeight: 800, color: 'var(--gray-800)' }}>{percent}%</span>
        <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>完成</span>
      </div>
      <div style={{ height: 8, borderRadius: 999, background: 'var(--gray-100)', overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(100, Math.max(0, percent))}%`, height: '100%', borderRadius: 999, background: 'var(--grad-blue)' }} />
      </div>
    </div>
  )
}

export default function LearningProgressAdmin() {
  const [students, setStudents] = useState([])
  const [courses, setCourses] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [search, setSearch] = useState('')
  const [tier, setTier] = useState('all')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [subject, setSubject] = useState(DEFAULT_SUBJECT)
  const [message, setMessage] = useState(DEFAULT_MESSAGE)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const flash = (text) => { setErr(''); setMsg(text); setTimeout(() => setMsg(''), 3000) }
  const flashError = (text) => { setMsg(''); setErr(text); setTimeout(() => setErr(''), 5000) }

  const getAdminToken = async ({ refresh = false } = {}) => {
    const { data: sessionData } = refresh
      ? await supabase.auth.refreshSession()
      : await supabase.auth.getSession()
    const token = sessionData?.session?.access_token
    if (!token) throw new Error('找不到管理員登入 token，請重新登入後台。')
    return token
  }

  const isInvalidTokenError = (data) => String(data?.error || data?.message || '').includes('Invalid authorization token')

  const workerJson = async (path, options = {}) => {
    const request = async (token) => {
      const response = await fetch(`${WORKER_URL.replace(/\/$/, '')}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(options.headers || {}),
        },
      })
      const data = await response.json().catch(() => ({}))
      return { response, data }
    }

    let { response, data } = await request(await getAdminToken())
    if ((!response.ok || data.success === false) && isInvalidTokenError(data)) {
      ;({ response, data } = await request(await getAdminToken({ refresh: true })))
    }
    if (!response.ok || data.success === false) {
      throw new Error(isInvalidTokenError(data) ? '登入狀態已過期，請重新整理或重新登入後台。' : data.error || '學習進度讀取失敗')
    }
    return data
  }

  const loadProgress = async () => {
    setLoading(true)
    try {
      if (hasSupabase && supabase) {
        const data = await workerJson('/api/admin/learning-progress')
        setStudents(data.students || [])
        setCourses(data.courses || [])
      } else {
        setStudents(buildLocalLearningProgress())
        setCourses(getCourses())
      }
      setSelectedIds([])
      setErr('')
    } catch (error) {
      flashError(error.message || '學習進度讀取失敗')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProgress()
  }, [])

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return students.filter(student => {
      const matchKeyword = !keyword
        || student.name?.toLowerCase().includes(keyword)
        || student.email?.toLowerCase().includes(keyword)
        || student.latestCourseTitle?.toLowerCase().includes(keyword)
      const matchTier = tier === 'all' || student.tier === tier
      return matchKeyword && matchTier
    })
  }, [students, search, tier])

  const stats = useMemo(() => {
    const total = students.length
    const active = students.filter(student => student.percent > 0).length
    const done = students.filter(student => student.totalLessons > 0 && student.percent >= 100).length
    const average = total ? Math.round(students.reduce((sum, item) => sum + item.percent, 0) / total) : 0
    const needReminder = students.filter(student => student.totalLessons > 0 && student.percent < 100).length
    return { total, active, done, average, needReminder }
  }, [students])

  const selectedStudents = students.filter(student => selectedIds.includes(student.id))
  const incompleteStudents = filtered.filter(student => student.totalLessons > 0 && student.percent < 100)
  const allFilteredSelected = filtered.length > 0 && filtered.every(student => selectedIds.includes(student.id))

  const toggleSelected = (id) => {
    setSelectedIds(ids => ids.includes(id) ? ids.filter(item => item !== id) : [...ids, id])
  }

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      setSelectedIds(ids => ids.filter(id => !filtered.some(student => student.id === id)))
      return
    }
    setSelectedIds(ids => [...new Set([...ids, ...filtered.map(student => student.id)])])
  }

  const sendReminders = async (targetIds) => {
    const ids = [...new Set(targetIds)].filter(Boolean)
    if (!ids.length || sending) return
    if (!message.trim()) {
      flashError('請先填寫提醒訊息。')
      return
    }
    if (!subject.trim()) {
      flashError('請先填寫 Email 主旨。')
      return
    }

    setSending(true)
    try {
      if (hasSupabase && supabase) {
        const data = await workerJson('/api/admin/learning-progress/reminders', {
          method: 'POST',
          body: JSON.stringify({
            userIds: ids,
            subject: subject.trim(),
            message: message.trim(),
            channel: 'email',
          }),
        })
        await loadProgress()
        flash(`已寄出 ${data.sentCount || data.count || ids.length} 封 Email 提醒`)
        return
      } else {
        const now = new Date().toISOString()
        const rows = ids.map(userId => ({
          id: `${Date.now()}-${userId}`,
          userId,
          message: message.trim(),
          channel: 'email',
          createdAt: now,
        }))
        saveLocalReminders([...getLocalReminders(), ...rows])
      }
      await loadProgress()
      flash(`已建立 ${ids.length} 位學員的 Email 提醒紀錄`)
    } catch (error) {
      flashError(error.message || '發送提醒失敗')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">學習進度</h1>
          <p style={{ color: 'var(--gray-500)', marginTop: 8 }}>查看所有學員觀看影片進度，並對未完成學員建立提醒紀錄。</p>
        </div>
        <button className="btn btn-secondary" onClick={loadProgress} disabled={loading}>
          {loading ? '更新中...' : '重新整理'}
        </button>
      </div>

      {msg && <div className="auth-alert success" style={{ marginBottom: 16 }}>{msg}</div>}
      {err && <div className="auth-alert error" style={{ marginBottom: 16 }}>{err}</div>}

      <div className="ai-stats-grid" style={{ marginBottom: 20 }}>
        <div className="ai-stat-card"><p className="ai-stat-label">學員總數</p><p className="ai-stat-val">{stats.total}</p><p className="ai-stat-sub">可追蹤學習帳號</p></div>
        <div className="ai-stat-card"><p className="ai-stat-label">已開始學習</p><p className="ai-stat-val">{stats.active}</p><p className="ai-stat-sub">至少觀看過一堂</p></div>
        <div className="ai-stat-card"><p className="ai-stat-label">平均進度</p><p className="ai-stat-val">{stats.average}%</p><p className="ai-stat-sub">依可看課程統計</p></div>
        <div className="ai-stat-card"><p className="ai-stat-label">未完成提醒</p><p className="ai-stat-val">{stats.needReminder}</p><p className="ai-stat-sub">可一鍵建立提醒</p></div>
      </div>

      <div className="admin-card" style={{ marginBottom: 20 }}>
        <div className="admin-card-header">提醒設定</div>
        <div className="admin-card-body" style={{ display: 'grid', gap: 14 }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Email 主旨</label>
            <input
              className="form-input"
              value={subject}
              onChange={event => setSubject(event.target.value)}
              placeholder="輸入 Email 主旨"
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Email 內容</label>
            <textarea
              className="form-input"
              rows={3}
              value={message}
              onChange={event => setMessage(event.target.value)}
              placeholder="輸入提醒訊息"
              style={{ resize: 'vertical' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" disabled={!selectedStudents.length || sending} onClick={() => sendReminders(selectedIds)}>
              {sending ? '發送中...' : `發送 Email 給已選 ${selectedStudents.length} 位`}
            </button>
            <button className="btn btn-secondary" disabled={!incompleteStudents.length || sending} onClick={() => sendReminders(incompleteStudents.map(student => student.id))}>
              一鍵 Email 提醒未完成
            </button>
          </div>
        </div>
      </div>

      <div className="filter-bar" style={{ marginBottom: 20 }}>
        <input className="form-input" placeholder="搜尋姓名、Email、最近觀看課程..." value={search} onChange={event => setSearch(event.target.value)} style={{ maxWidth: 320 }} />
        {['all', 'basic', 'standard', 'advanced'].map(item => (
          <button key={item} className={`filter-chip ${tier === item ? 'active' : ''}`} onClick={() => setTier(item)}>
            {item === 'all' ? '全部' : TIER_MARK[item]}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 42 }}>
                  <input type="checkbox" checked={allFilteredSelected} onChange={toggleSelectAllFiltered} disabled={!filtered.length || loading} />
                </th>
                <th>學員</th>
                <th>方案</th>
                <th>完成進度</th>
                <th>最近觀看</th>
                <th>上次提醒</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>讀取學習進度中...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>沒有符合條件的學員</td></tr>
              ) : filtered.map(student => (
                <tr key={student.id}>
                  <td><input type="checkbox" checked={selectedIds.includes(student.id)} onChange={() => toggleSelected(student.id)} /></td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <strong>{student.name}</strong>
                      <span style={{ color: 'var(--gray-500)', fontSize: 13 }}>{student.email}</span>
                    </div>
                  </td>
                  <td><span className="badge badge-active">{TIER_MARK[student.tier] || TIER_META[student.tier]?.label || student.tier || '未設定'}</span></td>
                  <td>
                    <ProgressBar percent={student.percent || 0} />
                    <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--gray-500)' }}>
                      {student.completedLessons || 0}/{student.totalLessons || 0} 堂
                    </p>
                  </td>
                  <td style={{ minWidth: 220 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <strong>{student.latestCourseTitle || '尚未觀看'}</strong>
                      <span style={{ color: 'var(--gray-500)', fontSize: 13 }}>{student.latestLessonTitle || '沒有影片進度'} · {formatDateTime(student.latestUpdatedAt)}</span>
                    </div>
                  </td>
                  <td style={{ whiteSpace: 'nowrap', color: student.lastReminderAt ? 'var(--gray-600)' : 'var(--gray-400)', fontSize: 13 }}>
                    {formatDateTime(student.lastReminderAt)}
                  </td>
                  <td>
                    <button className="btn btn-secondary btn-sm" disabled={sending} onClick={() => sendReminders([student.id])}>
                      提醒
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p style={{ marginTop: 14, color: 'var(--gray-500)', fontSize: 13 }}>
        Email 發送成功後會同步建立後台提醒紀錄；若發送服務尚未設定，系統會提示需要先設定 RESEND_API_KEY。
      </p>
    </div>
  )
}
