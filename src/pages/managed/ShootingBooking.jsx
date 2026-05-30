import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { createBookingRecord, getBookingsRecords, getUnavailableBookingSlots } from '../../services/bookings'
import { BOOKING_TIME_SLOTS } from '../../data/bookingSlots'
import Calendar from '../../components/Calendar'

const TIME_SLOTS = BOOKING_TIME_SLOTS

const STATUS_LABEL = { pending: '待確認', confirmed: '已確認', cancelled: '已取消' }

export default function ShootingBooking() {
  const { currentUser } = useAuth()
  const [step, setStep] = useState(1)
  const [date, setDate]  = useState('')
  const [slot, setSlot]  = useState('')
  const [form, setForm]  = useState({ topic: '', notes: '' })
  const [done, setDone]  = useState(false)
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [unavailableSlots, setUnavailableSlots] = useState([])
  const [slotLoading, setSlotLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    getBookingsRecords({ userId: currentUser.id, type: 'shooting' })
      .then(records => {
        if (!cancelled) setBookings(records)
      })
      .catch(err => {
        console.error('Shooting booking load failed:', err)
        if (!cancelled) setError('預約資料讀取失敗，請重新整理後再試')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [currentUser.id])

  useEffect(() => {
    if (!date) {
      setUnavailableSlots([])
      return
    }

    let cancelled = false
    setSlotLoading(true)
    getUnavailableBookingSlots('shooting', date)
      .then(slots => {
        if (!cancelled) setUnavailableSlots(slots)
      })
      .catch(err => {
        console.error('Unavailable shooting slot load failed:', err)
        if (!cancelled) setError('可預約時段讀取失敗，請重新整理後再試')
      })
      .finally(() => {
        if (!cancelled) setSlotLoading(false)
      })

    return () => { cancelled = true }
  }, [date])

  const myBookings   = bookings.filter(b => b.userId === currentUser.id && b.type === 'shooting')
  const bookedDates  = []

  const submit = async () => {
    if (!date || !slot || !form.topic.trim()) return
    setSaving(true)
    setError('')
    try {
      const record = await createBookingRecord({
        userId: currentUser.id,
        type: 'shooting',
        date,
        timeSlot: slot,
        topic: form.topic.trim(),
        notes: form.notes.trim(),
      })
      setBookings(prev => [record, ...prev])
      setDone(true)
    } catch (err) {
      console.error('Shooting booking submit failed:', err)
      setError(err.message || '預約送出失敗，請稍後再試')
    } finally {
      setSaving(false)
    }
  }

  const reset = () => { setStep(1); setDate(''); setSlot(''); setForm({ topic: '', notes: '' }); setDone(false) }

  if (done) return (
    <div>
      <div className="page-heading"><h1>預約拍攝</h1></div>
      <div className="card" style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center' }}>
        <div className="card-body" style={{ padding: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 56 }}>🎬</span>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>拍攝預約已送出！</h2>
          <p style={{ color: 'var(--gray-500)', fontSize: 14 }}>
            日期：<strong>{date}</strong>　時段：<strong>{TIME_SLOTS.find(s => s.key === slot)?.label}</strong><br />
            主題：{form.topic}
          </p>
          <p style={{ fontSize: 13, color: 'var(--gray-400)' }}>管理員確認後將通知你，請保持聯繫方式暢通。</p>
          <button className="btn btn-primary" onClick={reset}>再新增預約</button>
        </div>
      </div>
    </div>
  )

  return (
    <div>
      <div className="page-heading"><h1>預約拍攝</h1><p>選擇拍攝日期、時段與主題，管理員確認後即完成預約</p></div>
      {error && <div className="auth-alert danger" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="booking-layout">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Steps */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {[1, 2, 3].map(s => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: step >= s ? 'linear-gradient(135deg, #5060ff, #8040e0)' : 'rgba(255,255,255,0.06)', color: step >= s ? '#fff' : 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, boxShadow: step >= s ? '0 2px 8px rgba(80,80,220,0.35)' : 'none' }}>{s}</div>
                <span style={{ fontSize: 13, color: step >= s ? '#FFFFFF' : 'rgba(255,255,255,0.35)', fontWeight: step === s ? 700 : 400 }}>
                  {s === 1 ? '選擇日期' : s === 2 ? '選擇時段' : '填寫主題'}
                </span>
                {s < 3 && <span style={{ color: 'rgba(255,255,255,0.2)' }}>›</span>}
              </div>
            ))}
          </div>

          {step === 1 && (
            <div className="card">
              <div className="card-header"><h2 className="card-title">選擇拍攝日期</h2></div>
              <div className="card-body">
                <Calendar selected={date} onChange={d => { setDate(d); setSlot(''); setStep(2) }} bookedDates={bookedDates} minDate={new Date().toISOString().split('T')[0]} />
              </div>
            </div>
          )}

          {step >= 2 && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">選擇時段</h2>
                <button className="btn btn-ghost btn-sm" onClick={() => setStep(1)}>修改日期</button>
              </div>
              <div className="card-body">
                <p style={{ fontSize: 14, color: 'var(--gray-600)', marginBottom: 16 }}>
                  拍攝日期：<strong>{date}</strong>{slotLoading ? '，讀取可預約時段中…' : ''}
                </p>
                <div className="time-slots">
                  {TIME_SLOTS.map(ts => {
                    const disabled = unavailableSlots.includes(ts.key)
                    return (
                    <button key={ts.key} className={`time-slot-btn ${slot === ts.key ? 'selected' : ''}`}
                      disabled={disabled}
                      onClick={() => { if (!disabled) { setSlot(ts.key); setStep(3) } }}>
                      <div className="time-slot-info">
                        <strong>{ts.label}</strong>
                        <span>{disabled ? '已被預約或行事曆衝突' : ts.time}</span>
                      </div>
                    </button>
                  )})}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">拍攝主題與備註</h2>
                <button className="btn btn-ghost btn-sm" onClick={() => setStep(2)}>修改時段</button>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">拍攝主題 *</label>
                  <input className="form-input" placeholder="例：產品開箱、美妝教學、戶外街拍…" value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">備註說明</label>
                  <textarea className="form-textarea" placeholder="場地需求、服裝準備、特殊要求…" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ minHeight: 80 }} />
                </div>
                <button className="btn btn-primary btn-lg btn-block" onClick={submit} disabled={!form.topic.trim() || saving}>
                  {saving ? '送出中…' : '送出拍攝預約'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* My bookings */}
        <div>
          <div className="card" style={{ position: 'sticky', top: 80 }}>
            <div className="card-header"><h2 className="card-title">預約記錄</h2></div>
            {loading ? (
              <div className="card-body" style={{ textAlign: 'center', color: 'var(--gray-400)', fontSize: 14 }}>讀取中…</div>
            ) : myBookings.length === 0 ? (
              <div className="card-body" style={{ textAlign: 'center', color: 'var(--gray-400)', fontSize: 14 }}>尚無預約記錄</div>
            ) : (
              <div style={{ padding: '8px 0' }}>
                {[...myBookings].sort((a, b) => b.date.localeCompare(a.date)).map(b => (
                  <div key={b.id} style={{ padding: '12px 20px', borderBottom: '1px solid var(--gray-100)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{b.date}</span>
                      <span className={`badge badge-${b.status}`}>{STATUS_LABEL[b.status]}</span>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--gray-700)' }}>{b.topic}</p>
                    <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>{TIME_SLOTS.find(s => s.key === b.timeSlot)?.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
