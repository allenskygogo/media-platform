import { getUsers, getCourses, getBookings } from '../../data/mockData'

export default function AdminDashboard() {
  const users    = getUsers().filter(u => u.role !== 'admin')
  const students = users.filter(u => u.tier !== 'managed')
  const managed  = users.filter(u => u.tier === 'managed')
  const courses  = getCourses()
  const bookings = getBookings()

  const stats = {
    total:    students.length,
    basic:    students.filter(u => u.tier === 'basic').length,
    standard: students.filter(u => u.tier === 'standard').length,
    advanced: students.filter(u => u.tier === 'advanced').length,
    managed:  managed.length,
    courses:  courses.filter(c => c.published).length,
    pendingBookings: bookings.filter(b => b.status === 'pending').length,
  }

  const recentUsers    = [...students].sort((a, b) => b.id - a.id).slice(0, 5)
  const topCourses     = [...courses].sort((a, b) => b.students - a.students).slice(0, 4)
  const recentBookings = [...bookings].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)

  const getName = (id) => getUsers().find(u => u.id === id)?.name || '—'

  return (
    <div>
      <div className="page-heading"><h1>控制台</h1><p>平台最新數據總覽</p></div>

      <div className="stats-grid" style={{ marginBottom: 32 }}>
        {[
          { label: '一般學員', value: stats.total, sub: `啟用 ${students.filter(u=>u.status==='active').length} 位`, icon: '👥', bg: 'var(--primary-light)' },
          { label: '初階試聽', value: stats.basic,    sub: `${Math.round(stats.basic/Math.max(stats.total,1)*100)}%`, icon: '🎓', bg: 'var(--basic-light)' },
          { label: '達人班',   value: stats.standard, sub: `${Math.round(stats.standard/Math.max(stats.total,1)*100)}%`, icon: '⭐', bg: 'var(--standard-light)' },
          { label: '高階陪跑', value: stats.advanced, sub: `${Math.round(stats.advanced/Math.max(stats.total,1)*100)}%`, icon: '🏆', bg: 'var(--advanced-light)' },
          { label: '代操會員', value: stats.managed, sub: '獨立服務', icon: '🤝', bg: 'var(--managed-light)' },
          { label: '待確認預約', value: stats.pendingBookings, sub: '點擊查看', icon: '🗓️', bg: 'var(--danger-light)' },
        ].map(({ label, value, sub, icon, bg }) => (
          <div key={label} className="stat-card">
            <div className="stat-icon" style={{ background: bg }}>{icon}</div>
            <span className="stat-label">{label}</span>
            <span className="stat-value">{value}</span>
            <span className="stat-sub">{sub}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        {/* Recent students */}
        <div className="card">
          <div className="card-header"><h2 className="card-title">最新學員</h2></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>姓名</th><th>等級</th><th>效期</th></tr></thead>
              <tbody>
                {recentUsers.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="avatar" style={{ width: 28, height: 28, fontSize: 12 }}>{u.avatar}</div>
                        {u.name}
                      </div>
                    </td>
                    <td>
                      <span className={`badge badge-${u.tier}`}>
                        {u.tier === 'basic' ? '🎓 初階' : u.tier === 'standard' ? '⭐ 達人班' : '🏆 高階'}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>{u.expiresAt || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top courses */}
        <div className="card">
          <div className="card-header"><h2 className="card-title">熱門課程</h2></div>
          <div style={{ padding: '8px 0' }}>
            {topCourses.map((c, i) => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: '1px solid var(--gray-100)' }}>
                <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--gray-600)', flexShrink: 0 }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</p>
                  <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>★ {c.rating} · {c.students} 人</p>
                </div>
                <span className={`badge badge-${c.tier}`}>{c.tier === 'basic' ? '基礎' : '進階'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent bookings */}
      <div className="card">
        <div className="card-header"><h2 className="card-title">近期預約</h2></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>客戶</th><th>類型</th><th>日期</th><th>主題</th><th>狀態</th></tr></thead>
            <tbody>
              {recentBookings.map(b => (
                <tr key={b.id}>
                  <td style={{ fontWeight: 600 }}>{getName(b.userId)}</td>
                  <td><span className={`badge ${b.type === 'oneonone' ? 'badge-advanced' : 'badge-managed'}`}>{b.type === 'oneonone' ? '一對一' : '拍攝'}</span></td>
                  <td>{b.date}</td>
                  <td style={{ fontSize: 13, color: 'var(--gray-700)' }}>{b.topic}</td>
                  <td><span className={`badge badge-${b.status}`}>{b.status === 'pending' ? '待確認' : b.status === 'confirmed' ? '已確認' : '已取消'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
