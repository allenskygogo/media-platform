import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getProjects } from '../../data/mockData'

const STATUS_META = {
  planning:  { label: '企劃中', bar: '#4F9FFF', bg: 'rgba(79,159,255,0.14)',  text: 'rgba(79,159,255,0.95)'  },
  filming:   { label: '拍攝中', bar: '#fb923c', bg: 'rgba(251,146,60,0.14)',  text: 'rgba(251,146,60,0.95)'  },
  editing:   { label: '剪輯中', bar: '#a78bfa', bg: 'rgba(167,139,250,0.14)', text: 'rgba(167,139,250,0.95)' },
  completed: { label: '已完成', bar: '#34d399', bg: 'rgba(52,211,153,0.14)',  text: 'rgba(52,211,153,0.95)'  },
}

const PIPELINE = ['planning', 'filming', 'editing', 'completed']

export default function VideoProgress() {
  const { currentUser } = useAuth()
  const [filter, setFilter] = useState('all')
  const projects = getProjects().filter(p => p.clientId === currentUser.id)
  const visible  = filter === 'all' ? projects : projects.filter(p => p.status === filter)
  const counts   = PIPELINE.reduce((acc, s) => ({ ...acc, [s]: projects.filter(p => p.status === s).length }), {})

  return (
    <div>
      <div className="page-heading">
        <h1>影片製作進度</h1>
        <p>共 {projects.length} 個影片專案</p>
      </div>

      {/* Pipeline overview */}
      <div className="stats-grid" style={{ marginBottom: 28 }}>
        {PIPELINE.map(s => {
          const m = STATUS_META[s]
          return (
            <div key={s} className="stat-card"
              style={{
                cursor: 'pointer',
                borderColor: filter === s ? m.bar : undefined,
                borderWidth: filter === s ? 1 : undefined,
              }}
              onClick={() => setFilter(filter === s ? 'all' : s)}
            >
              <div className="stat-icon" style={{ background: m.bg }}>
                <span style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: m.bar, display: 'inline-block',
                }} />
              </div>
              <span className="stat-label">{m.label}</span>
              <span className="stat-value">{counts[s]}</span>
            </div>
          )
        })}
      </div>

      {/* Filters */}
      <div className="filter-bar" style={{ marginBottom: 20 }}>
        <button className={`filter-chip ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>全部</button>
        {PIPELINE.map(s => (
          <button key={s} className={`filter-chip ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
            {STATUS_META[s].label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="empty-state">
          <h3>沒有符合的影片</h3>
        </div>
      ) : (
        <div className="project-list">
          {visible.map(p => {
            const m = STATUS_META[p.status]
            return (
              <div key={p.id} className="project-item">
                <div style={{
                  width: 4, borderRadius: 4, alignSelf: 'stretch', flexShrink: 0,
                  background: m.bar,
                }} />
                <div className="project-info" style={{ flex: 1 }}>
                  <div className="project-title">{p.title}</div>
                  {p.notes && <div className="project-notes">{p.notes}</div>}
                  <div className="project-meta">更新於 {p.updatedAt}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center',
                    padding: '3px 10px', borderRadius: 999,
                    fontSize: 12, fontWeight: 700,
                    background: m.bg, color: m.text,
                  }}>
                    {m.label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
