import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getSystemSettings } from '../../data/mockData'
import BrandLogo from '../../components/BrandLogo'

const NAV = [
  { to: '/admin',            label: '控制台',  icon: '📊', end: true },
  { to: '/admin/users',      label: '學員管理', icon: '👥' },
  { to: '/admin/courses',    label: '課程&影片', icon: '🎬' },
  { to: '/admin/trial',      label: '試聽管理', icon: '📅' },
  { to: '/admin/homework',   label: '作業審核', icon: '📝' },
  { to: '/admin/managed',    label: '頂流代操', icon: '🤝' },
  { to: '/admin/bookings',   label: '預約管理', icon: '🗓️' },
  { to: '/admin/pricing',    label: '定價管理', icon: '💰' },
  { to: '/admin/page-builder', label: '頁面編輯', icon: '🖼' },
  { to: '/admin/settings',     label: '系統設定', icon: '⚙️' },
  { to: '/admin/ai-analytics', label: 'AI 數據',  icon: '🤖' },
  { to: '/admin/practice',    label: '練習作業',  icon: '✍️' },
]

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
        <button className="admin-sidebar-close-btn" onClick={close} aria-label="關閉選單">✕</button>

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
          {NAV.map(({ to, label, icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={close}>
              {({ isActive }) => (
                <div className={`sidebar-link ${isActive ? 'active' : ''}`}>
                  <span className="sidebar-icon">{icon}</span>{label}
                </div>
              )}
            </NavLink>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <div className="sidebar-divider" />
        <div className="sidebar-section">
          <button className="sidebar-link" onClick={() => { logout(); navigate('/login') }}>
            <span className="sidebar-icon">🚪</span>登出
          </button>
        </div>
      </aside>

      <main className="admin-main">
        {/* Mobile toolbar — only visible on mobile via CSS */}
        <div className="admin-mobile-bar">
          <button className="admin-hamburger-btn" onClick={() => setOpen(true)} aria-label="開啟選單">
            ☰
          </button>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--gray-800)' }}>管理後台</span>
        </div>
        <Outlet />
      </main>
    </div>
  )
}
