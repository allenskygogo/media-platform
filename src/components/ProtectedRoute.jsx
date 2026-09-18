import { useEffect, useState } from 'react'
import { canAccessStudentPath, memberHome, isAIOnly, needsAIReview } from '../../shared/memberAccess'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const Loading = () => (
  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontSize:14, color:'#64748b' }}>載入中…</div>
)

export default function ProtectedRoute({ children, requireAdmin = false, requireManaged = false, requireTier = null }) {
  const { currentUser, loading } = useAuth()
  const location = useLocation()
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!isAIOnly(currentUser) || !currentUser.expiresAt) return
    const remaining = new Date(currentUser.expiresAt).getTime() - Date.now()
    const timer = setTimeout(() => setTick(tick => tick + 1), Math.max(0, Math.min(remaining, 2147483647)))
    return () => clearTimeout(timer)
  }, [currentUser?.expiresAt, location.pathname])

  if (loading) return <Loading />
  if (!currentUser) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />

  if (needsAIReview(currentUser)) return <Navigate to="/ai-access" replace />

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

  if (!canAccessStudentPath(currentUser, location.pathname)) {
    return <Navigate to={memberHome(currentUser)} replace />
  }

  // Basic tier without expiresAt → must complete trial first
  // Allow trial, AI tools, and profile so upgrade CTAs can route directly to checkout.
  const onTrialRoute = location.pathname.startsWith('/dashboard/trial')
  const onAITools   = location.pathname.startsWith('/dashboard/ai-tools')
  const onProfile   = location.pathname.startsWith('/dashboard/profile')
  if (currentUser.tier === 'basic' && !currentUser.expiresAt && !onTrialRoute && !onAITools && !onProfile) {
    return <Navigate to="/dashboard/trial" replace />
  }

  if (requireTier && !isAIOnly(currentUser)) {
    const ORDER = { basic: 1, standard: 2, advanced: 3 }
    if ((ORDER[currentUser.tier] || 0) < ORDER[requireTier]) {
      return <Navigate to="/dashboard" replace />
    }
  }

  return children
}
