import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const Loading = () => (
  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontSize:14, color:'#64748b' }}>載入中…</div>
)

export default function ProtectedRoute({ children, requireAdmin = false, requireManaged = false, requireTier = null }) {
  const { currentUser, loading } = useAuth()
  const location = useLocation()

  if (loading) return <Loading />
  if (!currentUser) return <Navigate to="/login" replace />

  const isAdmin   = currentUser.role === 'admin'
  const isManaged = currentUser.tier === 'managed'

  if (requireAdmin) {
    if (!isAdmin) return <Navigate to={isManaged ? '/managed' : '/dashboard'} replace />
    return children
  }

  if (requireManaged) {
    if (!isManaged) return <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace />
    return children
  }

  // Regular student routes
  if (isAdmin)   return <Navigate to="/admin"   replace />
  if (isManaged) return <Navigate to="/managed" replace />

  // Basic tier without expiresAt → must complete trial first
  // Allow /dashboard/trial and /dashboard/trial-player through
  const onTrialRoute = location.pathname.startsWith('/dashboard/trial')
  if (currentUser.tier === 'basic' && !currentUser.expiresAt && !onTrialRoute) {
    return <Navigate to="/dashboard/trial" replace />
  }

  if (requireTier) {
    const ORDER = { basic: 1, standard: 2, advanced: 3 }
    if ((ORDER[currentUser.tier] || 0) < ORDER[requireTier]) {
      return <Navigate to="/dashboard" replace />
    }
  }

  return children
}
