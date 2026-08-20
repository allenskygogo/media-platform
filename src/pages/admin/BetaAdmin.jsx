import { useMemo, useState } from 'react'
import { getSystemSettings, saveSystemSettings } from '../../data/mockData'

const PAGE_URL = '/beta'
const LINE_ID = '@tt_01'
const ANALYTICS_KEY = 'resource_pack_analytics'
const LEADS_KEY = 'resource_pack_leads'
const PERFORMANCE_KEY = 'resource_pack_performance_tracker'

const STATUS_OPTIONS = ['新名單', '已點 LINE', '已私訊', '已領取', '待追蹤', '已排除']
const DEFAULT_PERFORMANCE = {
  targetRevenue: 10000000,
  averageOrderValue: 39800,
  leadBatchSize: 100,
  attendancePerBatch: 20,
  dealsPerBatch: 1,
  startDate: '2026-08-20',
  weekCount: 13,
  weekly: [],
}

const SAMPLE_LEADS = [
  {
    id: 'sample-1',
    source: 'Meta Ads',
    status: '待追蹤',
    note: '廣告正式投放後，點擊 LINE 的名單會在這裡整理。',
    createdAt: '2026-08-20T09:00:00.000Z',
  },
  {
    id: 'sample-2',
    source: 'Instagram',
    status: '已點 LINE',
    note: '可用備註標記是否已在 LINE 回覆。',
    createdAt: '2026-08-20T09:15:00.000Z',
  },
]

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback))
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

function isToday(iso) {
  const date = new Date(iso)
  const now = new Date()
  return date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate()
}

function formatDateTime(iso) {
  if (!iso) return '-'
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

function formatShortDate(date) {
  return new Intl.DateTimeFormat('zh-TW', {
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function formatCurrency(value) {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)
}

function formatNumber(value, digits = 0) {
  return new Intl.NumberFormat('zh-TW', {
    maximumFractionDigits: digits,
  }).format(Number(value) || 0)
}

function formatPercent(value) {
  return `${Math.round((Number(value) || 0) * 1000) / 10}%`
}

function addDays(date, days) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function sourceLabel(source = 'direct') {
  const map = {
    meta: 'Meta Ads',
    google: 'Google Ads / 搜尋',
    instagram: 'Instagram',
    line: 'LINE',
    direct: '直接進站',
    referral: '外部推薦',
  }
  return map[source] || source
}

function groupSourcePerformance(events) {
  const grouped = {}
  events.forEach(event => {
    const key = sourceLabel(event.source)
    if (!grouped[key]) grouped[key] = { source: key, views: 0, lineClicks: 0 }
    if (event.type === 'page_view') grouped[key].views += 1
    if (event.type === 'line_click') grouped[key].lineClicks += 1
  })

  const rows = Object.values(grouped)
    .map(row => ({
      ...row,
      conversionRate: row.views > 0 ? `${Math.round((row.lineClicks / row.views) * 1000) / 10}%` : '0%',
    }))
    .sort((a, b) => (b.views + b.lineClicks) - (a.views + a.lineClicks))

  return rows.length > 0 ? rows : [
    { source: 'Meta Ads', views: 0, lineClicks: 0, conversionRate: '0%' },
    { source: 'Google Ads / 搜尋', views: 0, lineClicks: 0, conversionRate: '0%' },
    { source: 'Instagram', views: 0, lineClicks: 0, conversionRate: '0%' },
    { source: '直接進站', views: 0, lineClicks: 0, conversionRate: '0%' },
  ]
}

function StatCard({ label, value, sub }) {
  return (
    <div className="stat-card">
      <div className="stat-value" style={{ fontSize: 30 }}>{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div style={{ color: 'var(--gray-400)', fontSize: 12, marginTop: 8 }}>{sub}</div>}
    </div>
  )
}

function SectionCard({ title, subtitle, children, action }) {
  return (
    <section className="card" style={{ padding: 24 }}>
      <div className="page-actions" style={{ marginBottom: 18, alignItems: 'flex-start' }}>
        <div className="page-heading" style={{ margin: 0 }}>
          <h2 style={{ fontSize: 20, margin: 0 }}>{title}</h2>
          {subtitle && <p style={{ margin: '6px 0 0', fontSize: 13 }}>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function copyText(text, onDone) {
  const finish = () => {
    onDone?.()
    setTimeout(() => onDone?.(''), 1800)
  }
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(finish).catch(finish)
    return
  }
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
  finish()
}

function makeCsv(leads) {
  const header = ['來源', '狀態', '備註', '建立時間']
  const rows = leads.map(lead => [
    lead.source,
    lead.status,
    lead.note,
    formatDateTime(lead.createdAt),
  ])
  return [header, ...rows]
    .map(row => row.map(cell => `"${String(cell || '').replaceAll('"', '""')}"`).join(','))
    .join('\n')
}

function normalizePerformance(raw) {
  const merged = { ...DEFAULT_PERFORMANCE, ...(raw || {}) }
  return {
    ...merged,
    targetRevenue: Number(merged.targetRevenue) || DEFAULT_PERFORMANCE.targetRevenue,
    averageOrderValue: Number(merged.averageOrderValue) || DEFAULT_PERFORMANCE.averageOrderValue,
    leadBatchSize: Number(merged.leadBatchSize) || DEFAULT_PERFORMANCE.leadBatchSize,
    attendancePerBatch: Number(merged.attendancePerBatch) || DEFAULT_PERFORMANCE.attendancePerBatch,
    dealsPerBatch: Number(merged.dealsPerBatch) || DEFAULT_PERFORMANCE.dealsPerBatch,
    weekCount: Math.max(1, Math.min(26, Number(merged.weekCount) || DEFAULT_PERFORMANCE.weekCount)),
    weekly: Array.isArray(merged.weekly) ? merged.weekly : [],
  }
}

function buildPerformanceRows(performance) {
  const dealsNeeded = Math.ceil(performance.targetRevenue / performance.averageOrderValue)
  const attendanceNeeded = Math.ceil((dealsNeeded * performance.attendancePerBatch) / performance.dealsPerBatch)
  const leadsNeeded = Math.ceil((dealsNeeded * performance.leadBatchSize) / performance.dealsPerBatch)
  const weeklyDealTarget = dealsNeeded / performance.weekCount
  const weeklyAttendanceTarget = attendanceNeeded / performance.weekCount
  const weeklyLeadTarget = leadsNeeded / performance.weekCount
  const startDate = new Date(`${performance.startDate}T00:00:00`)

  let cumulativeTargetDeals = 0
  let cumulativeActualDeals = 0

  const rows = Array.from({ length: performance.weekCount }, (_, index) => {
    const actual = performance.weekly[index] || {}
    const actualLeads = Number(actual.actualLeads) || 0
    const actualAttendance = Number(actual.actualAttendance) || 0
    const actualDeals = Number(actual.actualDeals) || 0
    cumulativeTargetDeals += weeklyDealTarget
    cumulativeActualDeals += actualDeals

    return {
      week: index + 1,
      start: formatShortDate(addDays(startDate, index * 7)),
      end: formatShortDate(addDays(startDate, index * 7 + 6)),
      targetLeads: weeklyLeadTarget,
      actualLeads,
      targetAttendance: weeklyAttendanceTarget,
      actualAttendance,
      targetDeals: weeklyDealTarget,
      actualDeals,
      cumulativeTargetDeals,
      cumulativeActualDeals,
      cumulativeRevenue: cumulativeActualDeals * performance.averageOrderValue,
      achievementRate: performance.targetRevenue > 0 ? (cumulativeActualDeals * performance.averageOrderValue) / performance.targetRevenue : 0,
      dealGap: cumulativeTargetDeals - cumulativeActualDeals,
    }
  })

  return {
    dealsNeeded,
    attendanceNeeded,
    leadsNeeded,
    weeklyDealTarget,
    weeklyAttendanceTarget,
    weeklyLeadTarget,
    rows,
  }
}

export default function BetaAdmin() {
  const [flash, setFlash] = useState('')
  const [events] = useState(() => readJson(ANALYTICS_KEY, []))
  const [leads, setLeads] = useState(() => {
    const stored = readJson(LEADS_KEY, [])
    return stored.length > 0 ? stored : SAMPLE_LEADS
  })
  const [settings, setSettings] = useState(() => {
    const current = getSystemSettings()
    return {
      fbPixelId: current.fbPixelId || '',
      ga4MeasurementId: current.ga4MeasurementId || '',
      gtmContainerId: current.gtmContainerId || '',
      metaCapiDatasetId: current.metaCapiDatasetId || '',
    }
  })
  const [performance, setPerformance] = useState(() => normalizePerformance(readJson(PERFORMANCE_KEY, DEFAULT_PERFORMANCE)))

  const todayEvents = useMemo(() => events.filter(event => isToday(event.createdAt)), [events])
  const todayViews = todayEvents.filter(event => event.type === 'page_view').length
  const lineClicks = todayEvents.filter(event => event.type === 'line_click').length
  const conversionRate = todayViews > 0 ? `${Math.round((lineClicks / todayViews) * 1000) / 10}%` : '0%'
  const sourcePerformance = useMemo(() => groupSourcePerformance(events), [events])
  const bestSource = sourcePerformance.find(row => row.views || row.lineClicks)?.source || '尚未累積'
  const funnel = useMemo(() => buildPerformanceRows(performance), [performance])
  const performanceTotals = useMemo(() => {
    const actualLeads = funnel.rows.reduce((sum, row) => sum + row.actualLeads, 0)
    const actualAttendance = funnel.rows.reduce((sum, row) => sum + row.actualAttendance, 0)
    const actualDeals = funnel.rows.reduce((sum, row) => sum + row.actualDeals, 0)
    const actualRevenue = actualDeals * performance.averageOrderValue
    return {
      actualLeads,
      actualAttendance,
      actualDeals,
      actualRevenue,
      achievementRate: performance.targetRevenue > 0 ? actualRevenue / performance.targetRevenue : 0,
    }
  }, [funnel.rows, performance.averageOrderValue, performance.targetRevenue])

  const handleCopy = (text, message) => {
    copyText(text, (value) => setFlash(value === '' ? '' : message))
  }

  const updateLead = (id, patch) => {
    const updated = leads.map(lead => lead.id === id ? { ...lead, ...patch } : lead)
    setLeads(updated)
    writeJson(LEADS_KEY, updated)
  }

  const exportCsv = () => {
    const blob = new Blob([`\uFEFF${makeCsv(leads)}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `resource-pack-leads-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const saveTrackingSettings = () => {
    saveSystemSettings({ ...getSystemSettings(), ...settings })
    setFlash('追蹤串接欄位已儲存')
    setTimeout(() => setFlash(''), 1800)
  }

  const savePerformance = (next) => {
    const normalized = normalizePerformance(next)
    setPerformance(normalized)
    writeJson(PERFORMANCE_KEY, normalized)
  }

  const updatePerformanceField = (field, value) => {
    savePerformance({ ...performance, [field]: field === 'startDate' ? value : Number(value) })
  }

  const updateWeeklyActual = (weekIndex, field, value) => {
    const weekly = [...performance.weekly]
    weekly[weekIndex] = {
      ...(weekly[weekIndex] || {}),
      [field]: Math.max(0, Number(value) || 0),
    }
    savePerformance({ ...performance, weekly })
  }

  return (
    <div>
      <div className="page-actions" style={{ marginBottom: 24, alignItems: 'flex-start' }}>
        <div className="page-heading" style={{ margin: 0 }}>
          <h1>資料包管理</h1>
          <p>追蹤資料包頁瀏覽、LINE 點擊、轉換率、來源成效與名單狀態。</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <a href={PAGE_URL} target="_blank" rel="noreferrer" className="btn btn-secondary">
            查看資料包頁
          </a>
          <button className="btn btn-secondary" onClick={() => handleCopy(`${window.location.origin}${PAGE_URL}`, '已複製資料包頁連結')}>
            複製頁面連結
          </button>
          <button className="btn btn-primary" onClick={exportCsv}>
            匯出名單 CSV
          </button>
        </div>
      </div>

      {flash && <div className="auth-alert success" style={{ marginBottom: 16 }}>{flash}</div>}

      <SectionCard title="數據總覽" subtitle="目前先顯示前台本機測試紀錄；正式投放後可接 Meta Pixel、GA4、GTM 與 Conversion API。">
        <div className="stats-grid">
          <StatCard label="今日瀏覽" value={todayViews} sub="資料包頁 page_view" />
          <StatCard label="LINE 點擊" value={lineClicks} sub={`加入官方 LINE ${LINE_ID}`} />
          <StatCard label="轉換率" value={conversionRate} sub="LINE 點擊 / 今日瀏覽" />
          <StatCard label="來源成效" value={bestSource} sub="目前最高互動來源" />
        </div>
      </SectionCard>

      <SectionCard
        title="三個月千萬漏斗追蹤"
        subtitle="只需要手動 key 每週實際數字，目標、營收、達成率和缺口會自動計算。"
        action={(
          <button className="btn btn-secondary btn-sm" onClick={() => savePerformance(DEFAULT_PERFORMANCE)}>
            重設表格
          </button>
        )}
      >
        <div className="stats-grid" style={{ marginBottom: 18 }}>
          <StatCard label="目標營收" value={formatCurrency(performance.targetRevenue)} sub={`${performance.weekCount} 週追蹤`} />
          <StatCard label="需要成交" value={`${funnel.dealsNeeded} 單`} sub={`客單 ${formatCurrency(performance.averageOrderValue)}`} />
          <StatCard label="需要領資料包" value={`${formatNumber(funnel.leadsNeeded)} 人`} sub={`${performance.leadBatchSize} 領包 → ${performance.dealsPerBatch} 成交`} />
          <StatCard label="目前達成率" value={formatPercent(performanceTotals.achievementRate)} sub={formatCurrency(performanceTotals.actualRevenue)} />
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 12,
          marginBottom: 18,
        }}>
          {[
            ['targetRevenue', '目標營收', 'number'],
            ['averageOrderValue', '客單價', 'number'],
            ['leadBatchSize', '每 N 人領資料包', 'number'],
            ['attendancePerBatch', '其中 Y 人參加分享會', 'number'],
            ['dealsPerBatch', '其中 Z 人成交', 'number'],
            ['weekCount', '執行週數', 'number'],
            ['startDate', '起始日期', 'date'],
          ].map(([field, label, type]) => (
            <label className="form-group" key={field} style={{ margin: 0 }}>
              <span>{label}</span>
              <input
                className="form-input"
                type={type}
                value={performance[field]}
                onChange={(event) => updatePerformanceField(field, event.target.value)}
                min={type === 'number' ? 1 : undefined}
              />
            </label>
          ))}
        </div>

        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>週次</th>
                <th>日期</th>
                <th>目標領包</th>
                <th>實際領包</th>
                <th>目標出席</th>
                <th>實際出席</th>
                <th>目標成交</th>
                <th>實際成交</th>
                <th>累計營收</th>
                <th>達成率</th>
                <th>缺口</th>
              </tr>
            </thead>
            <tbody>
              {funnel.rows.map((row, index) => (
                <tr key={row.week}>
                  <td><strong>第 {row.week} 週</strong></td>
                  <td>{row.start} - {row.end}</td>
                  <td>{formatNumber(row.targetLeads, 1)}</td>
                  <td>
                    <input
                      className="form-input"
                      type="number"
                      value={row.actualLeads}
                      min="0"
                      onChange={(event) => updateWeeklyActual(index, 'actualLeads', event.target.value)}
                      style={{ width: 86, padding: '8px 10px' }}
                    />
                  </td>
                  <td>{formatNumber(row.targetAttendance, 1)}</td>
                  <td>
                    <input
                      className="form-input"
                      type="number"
                      value={row.actualAttendance}
                      min="0"
                      onChange={(event) => updateWeeklyActual(index, 'actualAttendance', event.target.value)}
                      style={{ width: 86, padding: '8px 10px' }}
                    />
                  </td>
                  <td>{formatNumber(row.targetDeals, 1)}</td>
                  <td>
                    <input
                      className="form-input"
                      type="number"
                      value={row.actualDeals}
                      min="0"
                      onChange={(event) => updateWeeklyActual(index, 'actualDeals', event.target.value)}
                      style={{ width: 86, padding: '8px 10px' }}
                    />
                  </td>
                  <td>{formatCurrency(row.cumulativeRevenue)}</td>
                  <td>{formatPercent(row.achievementRate)}</td>
                  <td style={{ color: row.dealGap > 0 ? '#fbbf24' : '#4ade80', fontWeight: 900 }}>
                    {formatNumber(row.dealGap, 1)} 單
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.15fr) minmax(340px, 0.85fr)', gap: 20, marginTop: 20 }}>
        <div style={{ display: 'grid', gap: 20 }}>
          <SectionCard title="來源成效" subtitle="用來判斷 Meta、Google、Instagram 或自然流量哪一邊最有效。">
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>來源</th>
                    <th>瀏覽</th>
                    <th>LINE 點擊</th>
                    <th>轉換率</th>
                  </tr>
                </thead>
                <tbody>
                  {sourcePerformance.map(row => (
                    <tr key={row.source}>
                      <td><strong>{row.source}</strong></td>
                      <td>{row.views}</td>
                      <td>{row.lineClicks}</td>
                      <td>{row.conversionRate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard title="名單管理" subtitle="廣告導流後用這裡整理來源、狀態、備註與建立時間。">
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>來源</th>
                    <th>狀態</th>
                    <th>備註</th>
                    <th>建立時間</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map(lead => (
                    <tr key={lead.id}>
                      <td><strong>{lead.source}</strong></td>
                      <td>
                        <select
                          className="form-input"
                          value={lead.status}
                          onChange={(event) => updateLead(lead.id, { status: event.target.value })}
                          style={{ minWidth: 118, padding: '8px 10px' }}
                        >
                          {STATUS_OPTIONS.map(status => <option value={status} key={status}>{status}</option>)}
                        </select>
                      </td>
                      <td style={{ minWidth: 260 }}>
                        <input
                          className="form-input"
                          value={lead.note}
                          onChange={(event) => updateLead(lead.id, { note: event.target.value })}
                          placeholder="輸入追蹤備註"
                          style={{ padding: '8px 10px' }}
                        />
                      </td>
                      <td>{formatDateTime(lead.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>

        <div style={{ display: 'grid', gap: 20, alignContent: 'start' }}>
          <SectionCard title="追蹤串接設定" subtitle="之後投廣告時，這些欄位用來接外部廣告與分析工具。">
            <div style={{ display: 'grid', gap: 14 }}>
              <label className="form-group" style={{ margin: 0 }}>
                <span>Meta Pixel</span>
                <input
                  className="form-input"
                  value={settings.fbPixelId}
                  onChange={(event) => setSettings(prev => ({ ...prev, fbPixelId: event.target.value }))}
                  placeholder="例如：1234567890"
                />
              </label>
              <label className="form-group" style={{ margin: 0 }}>
                <span>Google Analytics 4</span>
                <input
                  className="form-input"
                  value={settings.ga4MeasurementId}
                  onChange={(event) => setSettings(prev => ({ ...prev, ga4MeasurementId: event.target.value }))}
                  placeholder="例如：G-XXXXXXXXXX"
                />
              </label>
              <label className="form-group" style={{ margin: 0 }}>
                <span>Google Tag Manager</span>
                <input
                  className="form-input"
                  value={settings.gtmContainerId}
                  onChange={(event) => setSettings(prev => ({ ...prev, gtmContainerId: event.target.value }))}
                  placeholder="例如：GTM-XXXXXXX"
                />
              </label>
              <label className="form-group" style={{ margin: 0 }}>
                <span>Meta Conversion API</span>
                <input
                  className="form-input"
                  value={settings.metaCapiDatasetId}
                  onChange={(event) => setSettings(prev => ({ ...prev, metaCapiDatasetId: event.target.value }))}
                  placeholder="Dataset / Pixel ID，Access Token 放後端環境變數"
                />
              </label>
              <div style={{
                padding: 14,
                borderRadius: 12,
                border: '0.5px solid rgba(251,191,36,0.28)',
                background: 'rgba(251,191,36,0.08)',
                color: '#facc15',
                lineHeight: 1.7,
                fontSize: 13,
                fontWeight: 700,
              }}>
                CAPI Token 不會存在前端頁面，正式串接時要放在 Vercel / Worker 後端環境變數。
              </div>
              <button className="btn btn-primary" onClick={saveTrackingSettings}>
                儲存追蹤設定
              </button>
            </div>
          </SectionCard>

          <SectionCard title="目前接入狀態">
            <div style={{ display: 'grid', gap: 10 }}>
              {[
                ['Meta Pixel', settings.fbPixelId ? '已填寫' : '待填寫'],
                ['Google Analytics 4', settings.ga4MeasurementId ? '已填寫' : '待填寫'],
                ['Google Tag Manager', settings.gtmContainerId ? '已填寫' : '待填寫'],
                ['Meta Conversion API', settings.metaCapiDatasetId ? '待後端串接' : '待填寫'],
              ].map(([label, status]) => (
                <div key={label} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: 14,
                  borderRadius: 12,
                  border: '0.5px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.025)',
                  color: 'var(--gray-700)',
                  fontSize: 13,
                  fontWeight: 800,
                }}>
                  <span>{label}</span>
                  <span style={{ color: status.includes('已') ? '#4ade80' : '#fbbf24' }}>{status}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
