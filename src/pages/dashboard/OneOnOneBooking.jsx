import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { createBookingRecord, getBookingsRecords, getUnavailableBookingSlots } from '../../services/bookings'
import { BOOKING_TIME_SLOTS } from '../../data/bookingSlots'
import Calendar from '../../components/Calendar'

const TIME_SLOTS = BOOKING_TIME_SLOTS
const ALL_SLOT_KEYS = TIME_SLOTS.map(slot => slot.key)

const STATUS_LABEL = { pending: '待確認', confirmed: '已確認', cancelled: '已取消' }

export default function OneOnOneBooking() {
  const { currentUser } = useAuth()
  const [step, setStep] = useState(1)
  const [date, setDate] = useState('')
  const [slot, setSlot] = useState('')
  const [form, setForm] = useState({ topic: '', notes: '' })
  const [done, setDone] = useState(false)
  const [msg, setMsg] = useState('')
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
    getBookingsRecords({ userId: currentUser.id, type: 'oneonone' })
      .then(records => {
        if (!cancelled) setBookings(records)
      })
      .catch(err => {
        console.error('Booking load failed:', err)
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
    getUnavailableBookingSlots('oneonone', date)
      .then(slots => {
        if (!cancelled) setUnavailableSlots(slots)
      })
      .catch(err => {
        console.error('Unavailable slot load failed:', err)
        if (!cancelled) {
          setUnavailableSlots(ALL_SLOT_KEYS)
          setError('')
        }
      })
      .finally(() => {
        if (!cancelled) setSlotLoading(false)
      })

    return () => { cancelled = true }
  }, [date])

  const myBookings  = bookings.filter(b => b.userId === currentUser.id && b.type === 'oneonone')
  const bookedDates = []

  const submit = async () => {
    if (!date || !slot || !form.topic.trim()) return
    setSaving(true)
    setError('')
    try {
      const record = await createBookingRecord({
        userId: currentUser.id,
        type: 'oneonone',
        date,
        timeSlot: slot,
        topic: form.topic.trim(),
        notes: form.notes.trim(),
      })
      setBookings(prev => [record, ...prev])
      setDone(true)
      setMsg(`預約成功！${date} ${TIME_SLOTS.find(s => s.key === slot)?.label}，管理員確認後會通知你。`)
    } catch (err) {
      console.error('Booking submit failed:', err)
      setError(err.message || '預約送出失敗，請稍後再試')
    } finally {
      setSaving(false)
    }
  }

  const reset = () => { setStep(1); setDate(''); setSlot(''); setForm({ topic: '', notes: '' }); setDone(false); setMsg('') }

  return (
    <div className="page-content">
      <div className="page-heading">
        <h1>🗓️ 預約實體一對一</h1>
        <p>選擇日期與時段，預約與講師的實體輔導課程</p>
      </div>
      {error && <div className="auth-alert danger" style={{ marginBottom: 16 }}>{error}</div>}

      {done ? (
        <div className="card" style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
          <div className="card-body" style={{ padding: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 56 }}>🎉</span>
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>預約已送出！</h2>
            <p style={{ color: 'var(--gray-500)', fontSize: 14 }}>{msg}</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-primary" onClick={reset}>再預約一次</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="booking-layout">
          {/* Calendar + slot + form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Step indicator */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {[1, 2, 3].map(s => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: step >= s ? 'var(--primary)' : 'var(--gray-200)', color: step >= s ? '#fff' : 'var(--gray-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>{s}</div>
                  <span style={{ fontSize: 13, color: step >= s ? 'var(--gray-900)' : 'var(--gray-400)', fontWeight: step === s ? 700 : 400 }}>
                    {s === 1 ? '選擇日期' : s === 2 ? '選擇時段' : '填寫資訊'}
                  </span>
                  {s < 3 && <span style={{ color: 'var(--gray-300)', margin: '0 4px' }}>›</span>}
                </div>
              ))}
            </div>

            {step === 1 && (
              <div className="card">
                <div className="card-header"><h2 className="card-title">選擇日期</h2></div>
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
                    已選擇：<strong>{date}</strong>{slotLoading ? '，讀取可預約時段中…' : ''}
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
                          <span>{disabled ? '已滿' : ts.time}</span>
                        </div>
                      </button>
                    )})}
                  </div>
                  {!slotLoading && unavailableSlots.length === TIME_SLOTS.length && (
                    <p style={{ marginTop: 14, fontSize: 13, color: 'var(--gray-500)' }}>
                      當天預約已滿，請選擇其他日期。
                    </p>
                  )}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">填寫輔導主題</h2>
                  <button className="btn btn-ghost btn-sm" onClick={() => setStep(2)}>修改時段</button>
                </div>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">輔導主題 *</label>
                    <input className="form-input" placeholder="例：YouTube 頻道成長策略、IG 互動率提升…" value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">備註說明</label>
                    <textarea className="form-textarea" placeholder="有什麼想特別準備或提前說明的？" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ minHeight: 80 }} />
                  </div>
                  <button className="btn btn-primary btn-lg btn-block" onClick={submit} disabled={!form.topic.trim() || saving}>
                    {saving ? '送出中…' : '確認送出預約'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* My bookings */}
          <div>
            <div className="card" style={{ position: 'sticky', top: 80 }}>
              <div className="card-header"><h2 className="card-title">我的預約記錄</h2></div>
              {loading ? (
                <div className="card-body" style={{ textAlign: 'center', color: 'var(--gray-400)', fontSize: 14, padding: 24 }}>讀取中…</div>
              ) : myBookings.length === 0 ? (
                <div className="card-body" style={{ textAlign: 'center', color: 'var(--gray-400)', fontSize: 14, padding: 24 }}>尚無預約記錄</div>
              ) : (
                <div style={{ padding: '8px 0' }}>
                  {[...myBookings].sort((a, b) => b.date.localeCompare(a.date)).map(b => (
                    <div key={b.id} style={{ padding: '12px 20px', borderBottom: '1px solid var(--gray-100)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{b.date}</span>
                        <span className={`badge badge-${b.status}`}>{STATUS_LABEL[b.status]}</span>
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--gray-700)' }}>{b.topic}</p>
                      <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>
                        {TIME_SLOTS.find(s => s.key === b.timeSlot)?.label}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
