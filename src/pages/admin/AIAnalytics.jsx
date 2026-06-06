import { useEffect, useMemo, useState } from 'react'
import { fetchAIUsageLogs, getAIUsageLogs } from '../../services/aiService'

const FEATURE_LABELS = {
  topics:     '爆款選題生成',
  script:     '腳本全文生成',
  shooting:   '拍攝形式推薦',
  planning:   '三個月策劃提案',
  marketing:  '行銷文案生成',
  livestream: '直播話術生成',
}

const PLAN_LABELS = {
  free:     '免費訪客',
  trial:    '體驗課',
  basic:    '體驗課',
  standard: '頂流達人',
  advanced: '頂流私塾',
  premium:  '頂流私塾',
  managed:  '頂流代操',
}

const PLAN_COLORS = {
  free:     '#6b7280',
  trial:    '#3b82f6',
  basic:    '#3b82f6',
  standard: '#8b5cf6',
  advanced: '#f59e0b',
  premium:  '#f59e0b',
  managed:  '#10b981',
}

function StatCard({ label, value, sub, color }) {
  return (
    <div className="ai-stat-card">
      <p className="ai-stat-label">{label}</p>
      <p className="ai-stat-val" style={color ? { color } : {}}>{value}</p>
      {sub && <p className="ai-stat-sub">{sub}</p>}
    </div>
  )
}

function BarRow({ label, count, max, color }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0
  return (
    <div className="ai-bar-row">
      <span className="ai-bar-label">{label}</span>
      <div className="ai-bar-track">
        <div className="ai-bar-fill" style={{ width: `${pct}%`, background: color || 'var(--grad-blue)' }} />
      </div>
      <span className="ai-bar-count">{count}</span>
    </div>
  )
}

export default function AIAnalytics() {
  const [range, setRange] = useState('month') // 'today' | 'month' | 'all'
  const [logs, setLogs] = useState(() => getAIUsageLogs())
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetchAIUsageLogs()
      .then(records => {
        if (cancelled) return
        setLogs(records)
        setLoadError('')
      })
      .catch(error => {
        if (cancelled) return
        setLoadError(error.message || '雲端 AI 數據讀取失敗，暫時顯示本機資料')
      })
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    const now = new Date()
    return logs.filter(l => {
      const d = new Date(l.created_at)
      if (range === 'today') return d.toDateString() === now.toDateString()
      if (range === 'month') return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
      return true
    })
  }, [logs, range])

  // ── Aggregations ──────────────────────────────────
  const todayLogs  = logs.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString())
  const monthLogs  = logs.filter(l => {
    const d = new Date(l.created_at)
    return d.getFullYear() === new Date().getFullYear() && d.getMonth() === new Date().getMonth()
  })

  const freeTodayCount  = todayLogs.filter(l => l.plan === 'free').length
  const freeMonthCount  = monthLogs.filter(l => l.plan === 'free').length

  // By plan
  const byPlan = useMemo(() => {
    const acc = {}
    filtered.forEach(l => { acc[l.plan] = (acc[l.plan] || 0) + 1 })
    return Object.entries(acc).sort((a, b) => b[1] - a[1])
  }, [filtered])
  const maxPlan = Math.max(...byPlan.map(([, c]) => c), 1)

  // By feature
  const byFeature = useMemo(() => {
    const acc = {}
    filtered.forEach(l => { acc[l.feature] = (acc[l.feature] || 0) + 1 })
    return Object.entries(acc).sort((a, b) => b[1] - a[1])
  }, [filtered])
  const maxFeature = Math.max(...byFeature.map(([, c]) => c), 1)

  // Top 10 industries
  const topIndustries = useMemo(() => {
    const acc = {}
    filtered.forEach(l => {
      if (l.industry) acc[l.industry] = (acc[l.industry] || 0) + 1
    })
    return Object.entries(acc).sort((a, b) => b[1] - a[1]).slice(0, 10)
  }, [filtered])
  const maxIndustry = Math.max(...topIndustries.map(([, c]) => c), 1)

  // Total by plan (member only)
  const memberTotal = filtered.filter(l => l.plan !== 'free').length

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">AI 數據分析</h1>
        <div className="ai-range-tabs">
          {[['today', '今日'], ['month', '本月'], ['all', '全部']].map(([k, l]) => (
            <button
              key={k}
              className={`ai-range-tab ${range === k ? 'active' : ''}`}
              onClick={() => setRange(k)}
            >{l}</button>
          ))}
        </div>
      </div>
      {loadError && <div className="admin-alert admin-alert-warning">{loadError}</div>}

      {/* ── Top stat cards ── */}
      <div className="ai-stats-grid">
        <StatCard
          label="今日免費試用"
          value={freeTodayCount}
          sub={`本月累計 ${freeMonthCount} 次`}
          color="#3b82f6"
        />
        <StatCard
          label={`${range === 'today' ? '今日' : range === 'month' ? '本月' : '全部'}會員使用`}
          value={memberTotal}
          sub="付費方案學員"
          color="#8b5cf6"
        />
        <StatCard
          label="總使用次數"
          value={filtered.length}
          sub={`共 ${logs.length} 次（全時間）`}
        />
        <StatCard
          label="熱門行業 TOP 1"
          value={topIndustries[0]?.[0] || '—'}
          sub={topIndustries[0] ? `${topIndustries[0][1]} 次` : '尚無資料'}
          color="#f59e0b"
        />
      </div>

      <div className="ai-analytics-grid">
        {/* ── By plan ── */}
        <div className="admin-card">
          <div className="admin-card-header">各方案使用次數</div>
          <div className="admin-card-body">
            {byPlan.length === 0 ? (
              <p className="ai-empty">尚無資料</p>
            ) : byPlan.map(([plan, count]) => (
              <BarRow
                key={plan}
                label={PLAN_LABELS[plan] || plan}
                count={count}
                max={maxPlan}
                color={PLAN_COLORS[plan]}
              />
            ))}
          </div>
        </div>

        {/* ── By feature ── */}
        <div className="admin-card">
          <div className="admin-card-header">各功能使用排行</div>
          <div className="admin-card-body">
            {byFeature.length === 0 ? (
              <p className="ai-empty">尚無資料</p>
            ) : byFeature.map(([feat, count], i) => (
              <BarRow
                key={feat}
                label={`${i + 1}. ${FEATURE_LABELS[feat] || feat}`}
                count={count}
                max={maxFeature}
                color={`hsl(${220 + i * 25}, 80%, 60%)`}
              />
            ))}
          </div>
        </div>

        {/* ── Top industries ── */}
        <div className="admin-card ai-analytics-wide">
          <div className="admin-card-header">熱門行業關鍵字 Top 10</div>
          <div className="admin-card-body">
            {topIndustries.length === 0 ? (
              <p className="ai-empty">尚無資料</p>
            ) : topIndustries.map(([ind, count], i) => (
              <BarRow
                key={ind}
                label={`${i + 1}. ${ind}`}
                count={count}
                max={maxIndustry}
                color={i < 3 ? '#f59e0b' : 'var(--grad-blue)'}
              />
            ))}
          </div>
        </div>

        {/* ── Raw log ── */}
        <div className="admin-card ai-analytics-wide">
          <div className="admin-card-header">
            <span>使用記錄</span>
            <span style={{ fontSize: 12, color: 'var(--gray-500)', fontWeight: 400 }}>
              共 {filtered.length} 筆（{range === 'today' ? '今日' : range === 'month' ? '本月' : '全部'}）
            </span>
          </div>
          <div className="admin-card-body" style={{ padding: 0 }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>時間</th>
                    <th>功能</th>
                    <th>行業輸入</th>
                    <th>方案</th>
                    <th>用戶 ID</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={5} className="ai-empty">尚無使用記錄</td></tr>
                  ) : [...filtered].reverse().slice(0, 50).map((l, i) => (
                    <tr key={i}>
                      <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>
                        {new Date(l.created_at).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td>{FEATURE_LABELS[l.feature] || l.feature}</td>
                      <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {l.industry || '—'}
                      </td>
                      <td>
                        <span className="ai-plan-badge" style={{ background: PLAN_COLORS[l.plan] + '22', color: PLAN_COLORS[l.plan] }}>
                          {PLAN_LABELS[l.plan] || l.plan}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                        {l.user_id || '訪客'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
