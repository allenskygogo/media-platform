import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Header from './components/Header'
import MobileTabBar from './components/MobileTabBar'
import LeftSidebar from './components/LeftSidebar'

import SalesPage       from './pages/SalesPage'
import Login           from './pages/Login'
import Register        from './pages/Register'
import Pricing         from './pages/Pricing'
import TrialAutoLogin  from './pages/TrialAutoLogin'

import DashboardHome      from './pages/dashboard/Home'
import CoursesPage        from './pages/dashboard/Courses'
import CourseDetail       from './pages/dashboard/CourseDetail'
import Profile            from './pages/dashboard/Profile'
import AITools            from './pages/dashboard/AITools'
import OneOnOneBooking    from './pages/dashboard/OneOnOneBooking'
import Trial              from './pages/dashboard/Trial'
import TrialPlayer        from './pages/dashboard/TrialPlayer'

import ManagedLayout      from './pages/managed/ManagedLayout'
import AccountOverview    from './pages/managed/AccountOverview'
import VideoProgress      from './pages/managed/VideoProgress'
import ShootingBooking    from './pages/managed/ShootingBooking'

import AdminLayout        from './pages/admin/AdminLayout'
import AdminDashboard     from './pages/admin/Dashboard'
import UsersAdmin         from './pages/admin/Users'
import CoursesAdmin       from './pages/admin/CoursesAdmin'
import ManagedAdmin       from './pages/admin/ManagedAdmin'
import BookingsAdmin      from './pages/admin/BookingsAdmin'
import TrialAdmin         from './pages/admin/TrialAdmin'
import HomeworkAdmin      from './pages/admin/HomeworkAdmin'
import PricingAdmin       from './pages/admin/PricingAdmin'
import PageBuilder        from './pages/admin/PageBuilder'
import SystemSettings     from './pages/admin/SystemSettings'
import AIAnalytics        from './pages/admin/AIAnalytics'

function StudentShell({ children }) {
  const { currentUser } = useAuth()
  useEffect(() => {
    const tier = currentUser?.tier || 'basic'
    const cls  = `tier-${tier}`
    document.body.classList.add(cls)
    return () => document.body.classList.remove(cls)
  }, [currentUser?.tier])

  return (
    <div className="app-layout">
      <Header />
      <LeftSidebar />
      <div className="main-scroll-area">
        {children}
      </div>
      <MobileTabBar />
    </div>
  )
}

function ManagedShell({ children }) {
  useEffect(() => {
    document.body.classList.add('tier-managed')
    return () => document.body.classList.remove('tier-managed')
  }, [])
  return (
    <div className="app-layout app-layout-managed">
      <Header />
      <LeftSidebar />
      <div className="main-scroll-area">
        {children}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public sales page — logged-in users are auto-redirected inside SalesPage */}
          <Route path="/"             element={<SalesPage />} />
          <Route path="/login"        element={<Login />} />
          <Route path="/register"     element={<Register />} />
          <Route path="/pricing"      element={<Pricing />} />
          <Route path="/trial-login"  element={<TrialAutoLogin />} />

          {/* ── Student routes ── */}
          <Route path="/dashboard" element={<ProtectedRoute><StudentShell><DashboardHome /></StudentShell></ProtectedRoute>} />
          <Route path="/dashboard/courses" element={<ProtectedRoute><StudentShell><CoursesPage /></StudentShell></ProtectedRoute>} />
          <Route path="/dashboard/courses/:id" element={<ProtectedRoute><StudentShell><CourseDetail /></StudentShell></ProtectedRoute>} />
          <Route path="/dashboard/profile"  element={<ProtectedRoute><StudentShell><Profile /></StudentShell></ProtectedRoute>} />
          <Route path="/dashboard/trial"        element={<ProtectedRoute><StudentShell><Trial /></StudentShell></ProtectedRoute>} />
          <Route path="/dashboard/trial-player" element={<ProtectedRoute><StudentShell><TrialPlayer /></StudentShell></ProtectedRoute>} />
          <Route path="/dashboard/ai-tools" element={<ProtectedRoute requireTier="basic"><StudentShell><AITools /></StudentShell></ProtectedRoute>} />
          <Route path="/dashboard/booking"  element={<ProtectedRoute requireTier="advanced"><StudentShell><OneOnOneBooking /></StudentShell></ProtectedRoute>} />

          {/* ── Managed member routes ── */}
          <Route path="/managed" element={<ProtectedRoute requireManaged><ManagedShell><ManagedLayout /></ManagedShell></ProtectedRoute>}>
            <Route index          element={<AccountOverview />} />
            <Route path="videos"  element={<VideoProgress />} />
            <Route path="booking" element={<ShootingBooking />} />
          </Route>

          {/* ── Admin routes ── */}
          <Route path="/admin" element={<ProtectedRoute requireAdmin><div className="app-layout"><Header /><AdminLayout /></div></ProtectedRoute>}>
            <Route index               element={<AdminDashboard />} />
            <Route path="users"        element={<UsersAdmin />} />
            <Route path="courses"      element={<CoursesAdmin />} />
            <Route path="managed"      element={<ManagedAdmin />} />
            <Route path="bookings"     element={<BookingsAdmin />} />
            <Route path="trial"        element={<TrialAdmin />} />
            <Route path="homework"     element={<HomeworkAdmin />} />
            <Route path="pricing"      element={<PricingAdmin />} />
            <Route path="page-builder" element={<PageBuilder />} />
            <Route path="settings"     element={<SystemSettings />} />
            <Route path="ai-analytics" element={<AIAnalytics />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
