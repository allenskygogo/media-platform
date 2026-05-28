import { useNavigate } from 'react-router-dom'
import BrandLogo from '../components/BrandLogo'
import { plans, planComparisonRows } from '../data/plans'

const visibleRows = planComparisonRows.filter(row =>
  ['positioning', 'coreValue', 'bestFor', 'learningMode', 'physicalCourse', 'physicalOneOnOne', 'courseAccess', 'aiTools', 'serviceDepth', 'coreOutcome'].includes(row.key)
)

export default function Pricing() {
  const navigate = useNavigate()

  return (
    <div className="plan-page">
      <div className="plan-page-glow" aria-hidden="true" />
      <header className="plan-page-nav">
        <button className="plan-page-brand" onClick={() => navigate('/')}>
          <BrandLogo size={34} />
          <span>
            <strong>TOP LEVEL TRAFFIC</strong>
            <small>只有頂級，沒有套路</small>
          </span>
        </button>
        <button className="sp2-btn sp2-btn-outline" onClick={() => navigate('/')}>回到首頁</button>
      </header>

      <main className="plan-page-main">
        <section className="plan-page-hero">
          <p className="sp2-eyebrow">PLAN SYSTEM</p>
          <h1>選擇你的成長路徑</h1>
          <p>
            從體驗課開始，逐步升級到系統學習、一對一陪跑與代操服務。
            目前方案內容仍在測試整理中，正式價格與金流會在後續階段上線。
          </p>
        </section>

        <section className="plan-path-grid" aria-label="方案路徑">
          {plans.map(plan => (
            <article key={plan.id} className={`plan-path-card level-${plan.level}`}>
              <div className="plan-level">LEVEL {plan.level}</div>
              <h2>{plan.name}</h2>
              <p className="plan-positioning">{plan.positioning}</p>
              <p className="plan-core">{plan.coreValue}</p>
              <div className="plan-meta-list">
                <span>適合：{plan.bestFor}</span>
                <span>模式：{plan.learningMode}</span>
                <span>成果：{plan.coreOutcome}</span>
              </div>
            </article>
          ))}
        </section>

        <section className="plan-compare-card">
          <div className="plan-compare-head">
            <div>
              <p className="sp2-eyebrow">COMPARE</p>
              <h2>方案能力比較</h2>
            </div>
            <button className="sp2-btn sp2-btn-primary" onClick={() => navigate('/register')}>
              申請學員帳號
            </button>
          </div>

          <div className="plan-compare-scroll">
            <table className="plan-compare-table">
              <thead>
                <tr>
                  <th>比較項目</th>
                  {plans.map(plan => <th key={plan.id}>{plan.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map(row => (
                  <tr key={row.key}>
                    <td>{row.label}</td>
                    {plans.map(plan => <td key={plan.id}>{plan[row.key]}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <p className="plan-page-note">
          這個頁面目前只用於測試版方案內容確認，尚未接正式金流與會員升級流程。
        </p>
      </main>
    </div>
  )
}
