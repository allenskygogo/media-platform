import { useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { IconGrid, IconPlay, IconCalendar, IconShare2 } from '../../components/Icons'
import { TIER_META, getSystemSettings } from '../../data/mockData'

const NAV = [
  { to: '/managed',          label: '帳號總覽', Icon: IconGrid,     end: true },
  { to: '/managed/videos',   label: '影片進度', Icon: IconPlay },
  { to: '/managed/publisher', label: '一鍵發布', Icon: IconShare2 },
  { to: '/managed/booking',  label: '預約拍攝', Icon: IconCalendar },
]

export default function ManagedLayout() {
  const { currentUser } = useAuth()
  const meta = TIER_META[currentUser?.tier]

  useEffect(() => {
    const { bgImages } = getSystemSettings()
    if (bgImages?.managed) {
      document.body.style.backgroundImage = `url(${bgImages.managed})`
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
    <div className="mg2-shell">
      {/* Left info panel (desktop) */}
      <aside className="mg2-panel">
        <p className="mg2-panel-label">代操專區</p>
        <span className="mg2-panel-badge">{meta?.label || '頂流代操'}</span>
        <div className="mg2-panel-nav">
          {NAV.map(({ to, label, Icon, end }) => (
            <NavLink key={to} to={to} end={end} style={{ textDecoration:'none' }}>
              {({ isActive }) => (
                <div className={`mg2-panel-item${isActive ? ' active' : ''}`}>
                  {isActive && <div className="mg2-panel-line"/>}
                  <Icon size={16} strokeWidth={1.5}/>
                  <span>{label}</span>
                </div>
              )}
            </NavLink>
          ))}
        </div>
      </aside>

      {/* Main content */}
      <div className="mg2-main">
        {/* Top tab bar */}
        <div className="mg2-tabs">
          {NAV.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `mg2-tab${isActive ? ' active' : ''}`}>
              {label}
            </NavLink>
          ))}
        </div>
        <div className="mg2-content">
          <Outlet/>
        </div>
      </div>

      {/* Mobile bottom tabs */}
      <nav className="managed-mobile-tabs" aria-label="代操導覽">
        {NAV.map(({ to, label, Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `mobile-tab${isActive ? ' active' : ''}`}>
            <span className="mobile-tab-icon"><Icon size={20} strokeWidth={1.5}/></span>
            <span className="mobile-tab-label">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
