import { useEffect, useMemo, useState } from 'react'
import { fetchAIUsageLogs } from '../../services/aiService'
import { AI_FEATURE_LABELS, newestUsageFirst } from '../../../shared/aiUsage'

const PLAN_LABELS = { free: '免費訪客', ai_free: 'AI 會員', ai_trial: 'AI 會員', ai_subscription: 'AI 會員', trial: '體驗課', basic: '體驗課', creator: '頂流達人', standard: '頂流達人', master: '頂流私塾', advanced: '頂流私塾', premium: '頂流私塾', managed: '頂流代操', admin: '管理員' }
const RANGES = [['today', '今日'], ['week', '近 7 天'], ['month', '本月'], ['all', '全部']]
const taipeiDate = date => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
const formatTime = value => new Date(value).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
function rank(values) {
  const counts = new Map()
  values.forEach(value => counts.set(value, (counts.get(value) || 0) + 1))
  return [...counts].sort((a, b) => b[1] - a[1])
}
function StatCard({ label, value, sub }) {
  return <div className="ai-stat-card"><p className="ai-stat-label">{label}</p><p className="ai-stat-val">{value}</p><p className="ai-stat-sub">{sub}</p></div>
}
function Ranking({ title, rows }) {
  const max = Math.max(1, ...rows.map(([, count]) => count))
  return <div className="admin-card"><div className="admin-card-header">{title}</div><div className="admin-card-body">
    {!rows.length && <p className="ai-empty">尚無資料</p>}
    {rows.map(([label, count]) => <div className="ai-bar-row" key={label}><span className="ai-bar-label">{label}</span><div className="ai-bar-track"><div className="ai-bar-fill" style={{ width: `${count / max * 100}%`, background: 'var(--grad-blue)' }} /></div><span className="ai-bar-count">{count}</span></div>)}
  </div></div>
}

export default function AIAnalytics() {
  const [range, setRange] = useState('week')
  const [feature, setFeature] = useState('all')
  const [search, setSearch] = useState('')
  const [logs, setLogs] = useState([])
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(true)
  const [refresh, setRefresh] = useState(0)
  const [visibleCount, setVisibleCount] = useState(50)
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchAIUsageLogs().then(records => {
      if (!cancelled) { setLogs(newestUsageFirst(records)); setLoadError('') }
    }).catch(error => { if (!cancelled) setLoadError(error.message || 'AI 統計讀取失敗') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [refresh])
  useEffect(() => { setVisibleCount(50) }, [range, feature, search])
  const filtered = useMemo(() => {
    const now = new Date()
    const today = taipeiDate(now)
    const query = search.trim().toLowerCase()
    return newestUsageFirst(logs).filter(log => {
      const date = new Date(log.created_at)
      if (!Number.isFinite(date.getTime())) return false
      const day = taipeiDate(date)
      if (range === 'today' && day !== today) return false
      if (range === 'week' && (date.getTime() < now.getTime() - 7 * 86400000 || date > now)) return false
      if (range === 'month' && day.slice(0, 7) !== today.slice(0, 7)) return false
      if (feature !== 'all' && log.feature !== feature) return false
      return !query || [log.user_name, log.user_email, log.question_summary, ...(log.topics || [])].join(' ').toLowerCase().includes(query)
    })
  }, [logs, range, feature, search])
  const features = ['planning', ...new Set(logs.map(log => log.feature).filter(value => value !== 'planning'))]
  const topicRanks = rank(filtered.flatMap(log => [...new Set(log.topics || [])])).slice(0, 10)
  const featureRanks = rank(filtered.map(log => AI_FEATURE_LABELS[log.feature] || log.feature))
  const planRanks = rank(filtered.map(log => PLAN_LABELS[log.plan] || log.plan))
  const planningCount = filtered.filter(log => log.feature === 'planning').length
  const users = new Set(filtered.map(log => log.user_id).filter(Boolean))
  return <div className="admin-page">
    <div className="admin-page-header"><h1 className="admin-page-title">AI 數據分析</h1><div className="ai-range-tabs">
      {RANGES.map(([key, label]) => <button key={key} className={`ai-range-tab ${range === key ? 'active' : ''}`} onClick={() => setRange(key)}>{label}</button>)}
      <button className="btn btn-secondary btn-sm" disabled={loading} onClick={() => setRefresh(value => value + 1)}>{loading ? '載入中…' : '重新整理'}</button>
    </div></div>
    {loadError && <div role="alert" className="auth-alert error">{loadError}（目前資料可能不是最新，請重新整理。）</div>}
    <p style={{ color: 'var(--gray-500)', fontSize: 13, lineHeight: 1.7, marginBottom: 20 }}>依台灣時間顯示最新 1,000 筆紀錄。企劃定位從本次更新後開始記錄每次成功回覆的提問摘要，不保存完整對話或 AI 回覆。主題依摘要關鍵字自動歸類，同一筆可能包含多個主題。</p>
    <div className="filter-bar" style={{ marginBottom: 20 }}>
      <label htmlFor="analytics-feature">功能</label><select id="analytics-feature" className="form-select" style={{ width: 'auto' }} value={feature} onChange={event => setFeature(event.target.value)}><option value="all">全部功能</option>{features.map(key => <option key={key} value={key}>{AI_FEATURE_LABELS[key] || key}</option>)}</select>
      <input aria-label="搜尋使用者或提問" className="form-input" style={{ maxWidth: 360 }} placeholder="搜尋姓名、Email、關鍵字或提問…" value={search} onChange={event => setSearch(event.target.value)} />
    </div>
    <div className="ai-stats-grid">
      <StatCard label="使用次數" value={filtered.length} sub="符合目前篩選條件" />
      <StatCard label="企劃定位提問" value={planningCount} sub="每次成功回覆計 1 次" />
      <StatCard label="使用人數" value={users.size} sub="已辨識帳號，不含未登入訪客" />
      <StatCard label="最近最常問的主題" value={topicRanks[0]?.[0] || '—'} sub={topicRanks[0] ? `${topicRanks[0][1]} 次提問涉及此主題` : '尚無資料'} />
    </div>
    <div className="ai-analytics-grid">
      <Ranking title="最近在問什麼 · 主題 Top 10" rows={topicRanks} />
      <Ranking title="各功能使用次數" rows={featureRanks} />
      <Ranking title="各會員方案使用次數" rows={planRanks} />
      <div className="admin-card ai-analytics-wide"><div className="admin-card-header"><span>最近使用紀錄 · 最新在前</span><span style={{ fontSize: 12 }}>共 {filtered.length} 筆</span></div>
        <div className="admin-card-body" style={{ padding: 0 }}><div style={{ overflowX: 'auto' }}><table className="admin-table">
          <thead><tr><th>時間（台灣）</th><th>使用者</th><th>功能</th><th>提問摘要／關鍵字</th><th>方案</th></tr></thead>
          <tbody>{filtered.slice(0, visibleCount).map((log, index) => <tr key={log.id || `${log.created_at}-${index}`}>
            <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>{formatTime(log.created_at)}</td>
            <td style={{ minWidth: 150 }}><strong>{log.user_name || (log.user_id ? '無姓名資料' : '訪客（未登入）')}</strong>{log.user_email && <div style={{ fontSize: 12, color: 'var(--gray-500)', overflowWrap: 'anywhere' }}>{log.user_email}</div>}</td>
            <td style={{ whiteSpace: 'nowrap' }}>{AI_FEATURE_LABELS[log.feature] || log.feature}</td>
            <td style={{ minWidth: 240, maxWidth: 480, whiteSpace: 'normal', overflowWrap: 'anywhere' }}><div style={{ color: 'var(--primary)', fontSize: 12, marginBottom: 4 }}>{log.topics?.join(' · ')}</div>{log.question_summary || '未記錄提問內容'}</td>
            <td style={{ whiteSpace: 'nowrap' }}>{PLAN_LABELS[log.plan] || log.plan}</td>
          </tr>)}{!filtered.length && <tr><td colSpan={5} className="ai-empty">{loading ? '讀取中…' : '尚無符合條件的使用紀錄'}</td></tr>}</tbody>
        </table></div></div>
        {filtered.length > visibleCount && <button className="btn btn-secondary" style={{ margin: 16 }} onClick={() => setVisibleCount(count => count + 50)}>顯示更早的 50 筆</button>}
      </div>
    </div>
  </div>
}
