import { useState } from 'react'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']
const MONTHS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']

export default function Calendar({ selected, onChange, bookedDates = [], minDate = null }) {
  const today = new Date()
  const [view, setView] = useState(() => {
    const ref = selected ? new Date(selected) : today
    return { year: ref.getFullYear(), month: ref.getMonth() }
  })

  const { year, month } = view

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const toStr = (d) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

  const isPast = (d) => {
    const ref = minDate ? new Date(minDate) : today
    ref.setHours(0, 0, 0, 0)
    return new Date(toStr(d)) < ref
  }

  const isBooked = (d) => bookedDates.includes(toStr(d))
  const isSelected = (d) => selected === toStr(d)
  const isToday = (d) => toStr(d) === today.toISOString().split('T')[0]

  const prev = () => setView(v => v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 })
  const next = () => setView(v => v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 })

  return (
    <div className="cal-wrap">
      <div className="cal-header">
        <button className="cal-nav" onClick={prev}>‹</button>
        <span className="cal-title">{year} 年 {MONTHS[month]}</span>
        <button className="cal-nav" onClick={next}>›</button>
      </div>
      <div className="cal-grid">
        {WEEKDAYS.map(w => <div key={w} className="cal-weekday">{w}</div>)}
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} />
          const past = isPast(d)
          const booked = isBooked(d)
          const sel = isSelected(d)
          const tod = isToday(d)
          let cls = 'cal-day'
          if (past) cls += ' cal-past'
          else if (sel) cls += ' cal-selected'
          else if (booked) cls += ' cal-booked'
          else if (tod) cls += ' cal-today'
          else cls += ' cal-available'
          return (
            <button
              key={d}
              className={cls}
              disabled={past || booked}
              onClick={() => onChange(toStr(d))}
            >
              {d}
              {booked && <span className="cal-dot" />}
            </button>
          )
        })}
      </div>
      <div className="cal-legend">
        <span><span className="cal-dot-ex cal-dot-ex-selected" />已選擇</span>
        <span><span className="cal-dot-ex cal-dot-ex-today" />今天</span>
        <span><span className="cal-dot-ex cal-dot-ex-booked" />已預約</span>
      </div>
    </div>
  )
}
