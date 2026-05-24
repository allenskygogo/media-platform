import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { IconHome, IconBook, IconPlay, IconChart, IconCalendar, IconUser } from './Icons'

const STUDENT_NAV = [
  { Icon: IconHome,     to: '/dashboard',         label: '首頁', end: true },
  { Icon: IconBook,     to: '/dashboard/courses',  label: '課程' },
  { Icon: IconPlay,     to: '/dashboard/trial',    label: '試聽' },
  { Icon: IconChart,    to: '/dashboard/ai-tools', label: 'AI'  },
  { Icon: IconCalendar, to: '/dashboard/booking',  label: '預約' },
  { Icon: IconUser,     to: '/dashboard/profile',  label: '個人' },
]

const MANAGED_NAV = [
  { Icon: IconHome,     to: '/managed',           label: '總覽', end: true },
  { Icon: IconPlay,     to: '/managed/videos',    label: '影片' },
  { Icon: IconCalendar, to: '/managed/booking',   label: '預約' },
  { Icon: IconUser,     to: '/dashboard/profile', label: '個人' },
]

export default function LeftSidebar() {
  const { currentUser } = useAuth()
  if (currentUser?.role === 'admin') return null
  const nav = currentUser?.tier === 'managed' ? MANAGED_NAV : STUDENT_NAV
  return (
    <aside className="left-sidebar">
      {nav.map(({ Icon, to, label, end }) => (
        <NavLink key={to} to={to} end={end} className="ls-link" title={label}>
          {({ isActive }) => (
            <div className={`ls-item${isActive ? ' active' : ''}`}>
              {isActive && <div className="ls-active-line" />}
              <Icon size={18} strokeWidth={1.5} />
            </div>
          )}
        </NavLink>
      ))}
    </aside>
  )
}
