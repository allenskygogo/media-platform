import { useEffect, useState } from 'react'
import { getUsers } from '../../data/mockData'
import { getBookingSubmitterProfiles, getBookingsRecords, updateBookingStatusRecord } from '../../services/bookings'

const TIME_SLOTS = { morning: '上午場', afternoon: '下午場', evening: '晚上場' }
const STATUS_META = {
  pending:   { label: '待確認', next: 'confirmed', nextLabel: '確認預約', btnCls: 'btn-success' },
  confirmed: { label: '已確認', next: 'cancelled', nextLabel: '取消預約', btnCls: 'btn-danger' },
  cancelled: { label: '已取消', next: null, nextLabel: null, btnCls: '' },
}
const TYPE_LABEL = { oneonone: '一對一輔導', shooting: '拍攝預約' }

export default function BookingsAdmin() {
  const users = getUsers()
  const [bookings, setBookings] = useState([])
  const [filterType, setFilterType]   = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const [submittersById, setSubmittersById] = useState({})

  const flash = (t) => { setMsg(t); setTimeout(() => setMsg(''), 3000) }

  const refresh = () => {
    setLoading(true)
    return getBookingsRecords()
      .then(async records => {
        setBookings(records)
        const profiles = await getBookingSubmitterProfiles(records.map(item => item.userId))
        setSubmittersById(Object.fromEntries(profiles.map(profile => [profile.id, profile])))
      })
      .catch(err => {
        console.error('Bookings admin load failed:', err)
        flash('預約資料讀取失敗，請重新整理後再試')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { refresh() }, [])

  const getName = (id) => submittersById[id]?.name || users.find(u => u.id === id)?.name || `用戶 ${id}`

  const visible = bookings.filter(b => {
    const matchType   = filterType   === 'all' || b.type   === filterType
    const matchStatus = filterStatus === 'all' || b.status === filterStatus
    return matchType && matchStatus
  }).sort((a, b) => b.date.localeCompare(a.date))

  const changeStatus = async (id, status) => {
    try {
      const updatedBooking = await updateBookingStatusRecord(id, status)
      setBookings(prev => prev.map(b => b.id === id ? updatedBooking : b))
      flash(`預約狀態已更新為「${STATUS_META[status]?.label}」`)
    } catch (err) {
      console.error('Booking status update failed:', err)
      flash('預約狀態更新失敗，請稍後再試')
    }
  }

  const counts = { all: bookings.length, pending: bookings.filter(b => b.status === 'pending').length, confirmed: bookings.filter(b => b.status === 'confirmed').length, cancelled: bookings.filter(b => b.status === 'cancelled').length }

  return (
    <div>
      <div className="page-heading"><h1>預約管理</h1><p>一對一輔導與代操拍攝預約總覽</p></div>
      {msg && <div className="auth-alert success" style={{ marginBottom: 16 }}>{msg}</div>}

      {/* Summary cards */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {[
          { label: '全部預約', val: counts.all, icon: '預約', bg: 'var(--primary-light)' },
          { label: '待確認', val: counts.pending, icon: '待', bg: 'var(--advanced-light)' },
          { label: '已確認', val: counts.confirmed, icon: '確', bg: 'var(--success-light)' },
          { label: '已取消', val: counts.cancelled, icon: '停', bg: 'var(--danger-light)' },
        ].map(({ label, val, icon, bg }) => (
          <div key={label} className="stat-card">
            <div className="stat-icon" style={{ background: bg }}>{icon}</div>
            <span className="stat-label">{label}</span>
            <span className="stat-value">{val}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="filter-bar" style={{ marginBottom: 20 }}>
        {[['all','全部'], ['oneonone','一對一輔導'], ['shooting','拍攝預約']].map(([k, lbl]) => (
          <button key={k} className={`filter-chip ${filterType === k ? 'active' : ''}`} onClick={() => setFilterType(k)}>{lbl}</button>
        ))}
        <div style={{ width: 1, height: 20, background: 'var(--gray-300)' }} />
        {[['all','全部狀態'], ['pending','待確認'], ['confirmed','已確認'], ['cancelled','已取消']].map(([k, lbl]) => (
          <button key={k} className={`filter-chip ${filterStatus === k ? 'active' : ''}`} onClick={() => setFilterStatus(k)}>{lbl}</button>
        ))}
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>客戶</th><th>類型</th><th>日期</th><th>時段</th><th>主題</th><th>狀態</th><th>操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>讀取預約資料中…</td></tr>
              ) : visible.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>沒有符合的預約</td></tr>
              ) : visible.map(b => {
                const sm = STATUS_META[b.status]
                return (
                  <tr key={b.id}>
                    <td style={{ fontWeight: 600 }}>{getName(b.userId)}</td>
                    <td>
                      <span className={`badge ${b.type === 'oneonone' ? 'badge-advanced' : 'badge-managed'}`}>
                        {b.type === 'oneonone' ? '一對一' : '拍攝'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{b.date}</td>
                    <td style={{ fontSize: 13, color: 'var(--gray-600)' }}>{TIME_SLOTS[b.timeSlot]}</td>
                    <td style={{ fontSize: 13, maxWidth: 200 }}>
                      <p style={{ fontWeight: 600 }}>{b.topic}</p>
                      {b.notes && <p style={{ color: 'var(--gray-500)', fontSize: 12, marginTop: 2 }}>{b.notes}</p>}
                    </td>
                    <td><span className={`badge badge-${b.status}`}>{sm.label}</span></td>
                    <td>
                      {sm.next && (
                        <button className={`btn btn-sm ${sm.btnCls}`} onClick={() => changeStatus(b.id, sm.next)}>
                          {sm.nextLabel}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
