import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getSessions, initLiveSessions, isUserBooked, getSessionState } from '../../data/mockData'
import SimulatedPlayer from '../../components/SimulatedPlayer'

export default function LivePlayer() {
  const { sessionId }   = useParams()
  const { currentUser } = useAuth()
  const navigate        = useNavigate()

  const [session, setSession] = useState(null)
  const [error, setError]     = useState('')

  useEffect(() => {
    initLiveSessions()
    const all   = getSessions()
    const found = all.find(s => String(s.id) === String(sessionId))

    if (!found) {
      setError('找不到此直播場次')
      return
    }

    // Private session — only the owner can watch
    if (found.isPrivate && found.userId !== currentUser.id) {
      setError('這是其他人的私人場次')
      return
    }

    // Fixed sessions — must be booked to access (allow joining a live session without booking too)
    if (!found.isPrivate) {
      const state = getSessionState(found)
      const booked = isUserBooked(currentUser.id, found.id)
      if (!booked && state === 'ended') {
        setError('您未預約此場次，回放僅供已預約學員使用')
        return
      }
      // If upcoming and not booked — still show (they can watch the countdown and decide)
    }

    setSession(found)
  }, [sessionId, currentUser.id])

  if (error) {
    return (
      <div className="page-content">
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <p style={{ fontSize: 16, color: 'var(--gray-700)', marginBottom: 20 }}>{error}</p>
          <button className="btn btn-primary" onClick={() => navigate('/dashboard/live-classes')}>
            返回直播課列表
          </button>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="page-content">
        <p style={{ color: 'var(--gray-400)', fontSize: 14 }}>載入中…</p>
      </div>
    )
  }

  return (
    <div className="page-content">
      <div style={{ marginBottom: 16 }}>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => navigate('/dashboard/live-classes')}
        >
          ← 返回直播課列表
        </button>
      </div>
      <SimulatedPlayer session={session} />
    </div>
  )
}
