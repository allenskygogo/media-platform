import { useState, useMemo } from 'react'
import { getPracticeSubmissions } from '../../services/aiService'

const FEATURE_LABELS = {
  topics:     '爆款選題生成',
  script:     '腳本全文生成',
  shooting:   '拍攝形式推薦',
  planning:   '三個月策劃提案',
  marketing:  '行銷文案生成',
  livestream: '直播話術生成',
}

const FEATURE_COLORS = {
  topics:     '#3b82f6',
  script:     '#8b5cf6',
  shooting:   '#f59e0b',
  planning:   '#10b981',
  marketing:  '#ef4444',
  livestream: '#ec4899',
}

export default function PracticeAdmin() {
  const [filterFeature, setFilterFeature] = useState('all')
  const submissions = getPracticeSubmissions()

  const filtered = useMemo(() => {
    const list = filterFeature === 'all'
      ? submissions
      : submissions.filter(s => s.feature === filterFeature)
    return [...list].reverse()
  }, [submissions, filterFeature])

  // Stats
  const byFeature = useMemo(() => {
    const acc = {}
    submissions.forEach(s => { acc[s.feature] = (acc[s.feature] || 0) + 1 })
    return acc
  }, [submissions])

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">✍️ 練習作業審核</h1>
        <div className="ai-range-tabs">
          <button
            className={`ai-range-tab ${filterFeature === 'all' ? 'active' : ''}`}
            onClick={() => setFilterFeature('all')}
          >全部</button>
          {Object.entries(FEATURE_LABELS).map(([id, label]) => (
            <button
              key={id}
              className={`ai-range-tab ${filterFeature === id ? 'active' : ''}`}
              onClick={() => setFilterFeature(id)}
            >{label}</button>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="ai-stats-grid" style={{ marginBottom: 24 }}>
        <div className="ai-stat-card">
          <p className="ai-stat-label">總提交數</p>
          <p className="ai-stat-val" style={{ color: '#3b82f6' }}>{submissions.length}</p>
          <p className="ai-stat-sub">學員練習作業</p>
        </div>
        {Object.entries(FEATURE_LABELS).slice(0, 3).map(([id, label]) => (
          <div key={id} className="ai-stat-card">
            <p className="ai-stat-label">{label}</p>
            <p className="ai-stat-val" style={{ color: FEATURE_COLORS[id] }}>
              {byFeature[id] || 0}
            </p>
            <p className="ai-stat-sub">份</p>
          </div>
        ))}
      </div>

      {/* Records list */}
      {filtered.length === 0 ? (
        <div className="admin-card">
          <div className="admin-card-body">
            <p className="ai-empty">尚無練習記錄</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filtered.map((sub) => {
            const color = FEATURE_COLORS[sub.feature] || '#6b7280'
            const practiceText = sub.practice_data
              ? (sub.practice_data.practice || [
                  sub.practice_data.hook && `【鉤子】${sub.practice_data.hook}`,
                  sub.practice_data.body && `【主體】${sub.practice_data.body}`,
                  sub.practice_data.cta  && `【CTA】${sub.practice_data.cta}`,
                ].filter(Boolean).join('\n\n'))
              : '（無內容）'

            return (
              <div key={sub.id} className="practice-record">
                <div className="practice-record-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span
                      className="practice-feature"
                      style={{ background: color + '20', color, borderColor: color + '40' }}
                    >
                      {FEATURE_LABELS[sub.feature] || sub.feature}
                    </span>
                    <span className="practice-user">👤 {sub.user_name || sub.user_id || '訪客'}</span>
                    <span className="practice-date">
                      {new Date(sub.submitted_at).toLocaleString('zh-TW', {
                        month: 'numeric', day: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>
                  {sub.unlocked && (
                    <span className="practice-unlocked">✅ 已解鎖</span>
                  )}
                </div>

                <div className="practice-compare">
                  <div className="practice-ai-output">
                    <div className="practice-section-label">🤖 AI 生成內容</div>
                    <pre className="practice-content">{sub.ai_output || '（無內容）'}</pre>
                  </div>
                  <div className="practice-user-output">
                    <div className="practice-section-label">✍️ 學員練習</div>
                    <pre className="practice-content">{practiceText}</pre>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
