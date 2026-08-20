import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getSystemSettings } from '../../data/mockData'
import BrandLogo from '../../components/BrandLogo'

const MAIN_NAV = [
  { to: '/admin',              label: '控制台', icon: 'dashboard', end: true },
  { to: '/admin/orders',       label: '訂單管理', icon: 'booking' },
  { to: '/admin/users',        label: '學員管理', icon: 'users' },
  { to: '/admin/courses',      label: '課程與影片', icon: 'video' },
  { to: '/admin/learning-progress', label: '學習進度', icon: 'video' },
  { to: '/admin/homework',     label: '作業審核', icon: 'edit' },
  { to: '/admin/trial',        label: '活動管理', icon: 'calendar' },
  { to: '/admin/bookings',     label: '預約管理', icon: 'booking' },
  { to: '/admin/managed',      label: '頂流代操', icon: 'bolt' },
  { to: '/admin/ai-analytics', label: 'AI 數據', icon: 'spark' },
  { to: '/admin/ai-agents',    label: 'AI Agent 管理', icon: 'spark' },
  { to: '/admin/beta',         label: '封測管理', icon: 'flask' },
]

const SYSTEM_NAV = [
  { to: '/admin/settings', label: '系統設定', icon: 'settings' },
]

const ICONS = {
  dashboard: <path d="M4 5h6v6H4zM14 5h6v6h-6zM4 15h6v4H4zM14 15h6v4h-6z" />,
  users: <path d="M16 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9.5 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8M21 20v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />,
  video: <path d="M4 6h11a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zM17 10l5-3v10l-5-3z" />,
  edit: <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />,
  calendar: <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />,
  booking: <path d="M4 5h16M7 3v4M17 3v4M6 11h4M6 15h4M14 11h4M14 15h4M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />,
  bolt: <path d="M13 2L4 14h7l-1 8 10-13h-7z" />,
  spark: <path d="M12 2l1.7 5.3L19 9l-5.3 1.7L12 16l-1.7-5.3L5 9l5.3-1.7zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />,
  flask: <path d="M9 2h6M10 2v6l-5.5 9.5A3 3 0 0 0 7.1 22h9.8a3 3 0 0 0 2.6-4.5L14 8V2M8 15h8" />,
  settings: <path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5zM19.4 15a1.7 1.7 0 0 0 .34 1.88l.05.05a2 2 0 0 1-2.83 2.83l-.05-.05A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6l-.08.08a2 2 0 0 1-3.84 0L10 20a1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.88.34l-.05.05a2 2 0 0 1-2.83-2.83l.05-.05A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1l-.08-.08a2 2 0 0 1 0-3.84L4 10a1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.34-1.88l-.05-.05a2 2 0 0 1 2.83-2.83l.05.05A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6l.08-.08a2 2 0 0 1 3.84 0L14 4a1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.88-.34l.05-.05a2 2 0 0 1 2.83 2.83l-.05.05A1.7 1.7 0 0 0 19.4 9c.13.38.34.72.6 1l.08.08a2 2 0 0 1 0 3.84L20 14c-.26.28-.47.62-.6 1z" />,
  home: <path d="M3 11l9-8 9 8M5 10v10h14V10M9 20v-6h6v6" />,
  external: <path d="M14 3h7v7M21 3l-9 9M12 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />,
  logout: <path d="M10 17l5-5-5-5M15 12H3M21 3v18h-8" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
}

function LineIcon({ name }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {ICONS[name] || ICONS.dashboard}
      </g>
    </svg>
  )
}

export default function AdminLayout() {
  const { logout }         = useAuth()
  const navigate           = useNavigate()
  const [open, setOpen]    = useState(false)
  const [logoUrl, setLogoUrl] = useState(() => getSystemSettings().logoUrl || '')
  const close              = () => setOpen(false)

  useEffect(() => {
    const sync = () => setLogoUrl(getSystemSettings().logoUrl || '')
    window.addEventListener('settingsChanged', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('settingsChanged', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  return (
    <div className="admin-shell">
      {/* Mobile overlay backdrop */}
      <div
        className={`admin-sidebar-overlay${open ? ' open' : ''}`}
        onClick={close}
        aria-hidden="true"
      />

      <aside className={`admin-sidebar${open ? ' open' : ''}`}>
        {/* Mobile close button inside sidebar */}
        <button className="admin-sidebar-close-btn" onClick={close} aria-label="關閉選單">×</button>

        <div style={{ padding: '0 20px 16px', borderBottom: '1px solid var(--glass-border)', marginBottom: 8 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: 'var(--gray-400)', marginBottom: 8 }}>管理後台</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" style={{ height: 28, width: 'auto', objectFit: 'contain' }} />
            ) : (
              <>
                <BrandLogo size={28} />
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                  <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>TOP LEVEL</span>
                  <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.18em', color: '#fff', textTransform: 'uppercase' }}>TRAFFIC</span>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="sidebar-section">
          <p className="sidebar-label">主選單</p>
          {MAIN_NAV.map(({ to, label, icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={close}>
              {({ isActive }) => (
                <div className={`sidebar-link ${isActive ? 'active' : ''}`}>
                  <span className="sidebar-icon"><LineIcon name={icon} /></span>{label}
                </div>
              )}
            </NavLink>
          ))}
        </div>
        <div className="sidebar-divider" />
        <div className="sidebar-section">
          <p className="sidebar-label">網站與系統</p>
          <button className="sidebar-link" onClick={() => { close(); navigate('/') }}>
            <span className="sidebar-icon"><LineIcon name="home" /></span>回到首頁
          </button>
          <a className="sidebar-link" href="/beta" target="_blank" rel="noreferrer" onClick={close}>
            <span className="sidebar-icon"><LineIcon name="external" /></span>查看資料包頁
          </a>
          {SYSTEM_NAV.map(({ to, label, icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={close}>
              {({ isActive }) => (
                <div className={`sidebar-link ${isActive ? 'active' : ''}`}>
                  <span className="sidebar-icon"><LineIcon name={icon} /></span>{label}
                </div>
              )}
            </NavLink>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <div className="sidebar-divider" />
        <div className="sidebar-section">
          <button className="sidebar-link" onClick={() => { logout(); navigate('/login') }}>
            <span className="sidebar-icon"><LineIcon name="logout" /></span>登出
          </button>
        </div>
      </aside>

      <main className="admin-main">
        {/* Mobile toolbar — only visible on mobile via CSS */}
        <div className="admin-mobile-bar">
          <button className="admin-hamburger-btn" onClick={() => setOpen(true)} aria-label="開啟選單">
            <LineIcon name="menu" />
          </button>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--gray-800)' }}>管理後台</span>
        </div>
        <Outlet />
      </main>
    </div>
  )
}
