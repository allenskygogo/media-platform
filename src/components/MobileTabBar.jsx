import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { IconHome, IconBook, IconZap, IconCalendar, IconShare2, IconUser } from './Icons'

const STUDENT_TABS = [
  { to: '/dashboard',          label: '首頁',  Icon: IconHome,     end: true  },
  { to: '/dashboard/courses',  label: '課程',  Icon: IconBook,     end: false },
  { to: '/dashboard/ai-tools', label: 'AI工具',Icon: IconZap,      end: false },
  { to: '/dashboard/booking',  label: '預約',  Icon: IconCalendar, end: false },
  { to: '/dashboard/publisher',label: '發布',  Icon: IconShare2,   end: false },
  { to: '/dashboard/profile',  label: '我的',  Icon: IconUser,     end: false },
]

// Managed users get their own tab bar rendered inside ManagedLayout
// Admin users have a hamburger sidebar
export default function MobileTabBar() {
  const { currentUser } = useAuth()

  if (!currentUser || currentUser.role === 'admin' || currentUser.tier === 'managed') return null

  return (
    <nav className="mobile-tab-bar" aria-label="底部導覽">
      {STUDENT_TABS.map(({ to, label, Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => `mobile-tab${isActive ? ' active' : ''}`}
        >
          <span className="mobile-tab-icon">
            <Icon size={22} />
          </span>
          <span className="mobile-tab-label">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
