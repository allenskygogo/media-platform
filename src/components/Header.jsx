import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { TIER_META, getSystemSettings } from '../data/mockData'
import BrandLogo from './BrandLogo'

export default function Header() {
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()
  const [logoUrl, setLogoUrl]   = useState(() => getSystemSettings().logoUrl || '')
  const [siteName, setSiteName] = useState(() => getSystemSettings().siteName || '頂級流量')

  // Re-read settings whenever admin saves them (same tab or other tab)
  useEffect(() => {
    const sync = () => {
      const s = getSystemSettings()
      setLogoUrl(s.logoUrl || '')
      setSiteName(s.siteName || '頂級流量')
    }
    window.addEventListener('settingsChanged', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('settingsChanged', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  // Keep browser tab title in sync
  useEffect(() => {
    if (siteName) document.title = siteName
  }, [siteName])

  const handleLogout = () => { logout(); navigate('/login') }

  const isAdmin   = currentUser?.role === 'admin'
  const isManaged = currentUser?.tier === 'managed'
  const tier      = currentUser?.tier
  const meta      = tier ? TIER_META[tier] : null

  const nl = (to, label, end = false) => (
    <NavLink to={to} end={end} className={({ isActive }) => isActive ? 'active' : ''}>{label}</NavLink>
  )

  return (
    <header className={`header ${isAdmin ? 'admin-topbar' : ''}`}>
      <NavLink to="/" className="header-logo" title="回到首頁">
        {logoUrl ? (
          <img src={logoUrl} alt={siteName} style={{ height: 32, width: 'auto', display: 'block', objectFit: 'contain' }} />
        ) : (
          <>
            <BrandLogo size={28} />
            <span className="header-logo-text">
              <span className="header-logo-line1">TOP LEVEL</span>
              <span className="header-logo-line2">TRAFFIC</span>
            </span>
          </>
        )}
      </NavLink>

      {!isAdmin && !isManaged && (
        <nav className="header-nav">
          {nl('/', '回到首頁', true)}
          {nl('/dashboard', '首頁', true)}
          {nl('/dashboard/courses', '課程')}
          {nl('/dashboard/ai-tools', '✨ AI 工具')}
          {nl('/dashboard/booking', '預約一對一')}
          {nl('/dashboard/profile', '個人資料')}
        </nav>
      )}

      {isManaged && (
        <nav className="header-nav">
          {nl('/', '回到首頁', true)}
          {nl('/managed', '帳號總覽', true)}
          {nl('/managed/videos', '影片進度')}
          {nl('/managed/booking', '預約拍攝')}
        </nav>
      )}

      {isAdmin && (
        <nav className="header-nav">
          {nl('/', '回到首頁', true)}
          {nl('/admin', '控制台', true)}
        </nav>
      )}

      <div className="header-spacer" />

      <div className="header-user">
        <div
          className={`avatar ${isAdmin ? 'admin' : ''}`}
          style={isManaged ? { background: 'linear-gradient(135deg, var(--managed), #f472b6)' } : {}}
        >
          {currentUser?.avatar || currentUser?.name?.charAt(0)}
        </div>
        <span className="header-user-name">{currentUser?.name}</span>
        {isAdmin && <span className="header-tier-badge">平台管理員</span>}
        {meta && <span className="header-tier-badge">{meta.label}</span>}
        <span className="header-caret">▾</span>
        <button className="btn btn-ghost btn-sm" onClick={handleLogout}>登出</button>
      </div>
    </header>
  )
}
