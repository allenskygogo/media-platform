import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { isAIOnly, memberHome } from '../../shared/memberAccess'
import { plans } from '../data/plans'
import { LINE_OFFICIAL_URL } from '../utils/manualPayment'
import BrandLogo from '../components/BrandLogo'
import './entry-pages.css'

export function PublicEntryHeader() {
  useEffect(() => { window.scrollTo(0, 0) }, [])
  const { currentUser } = useAuth()
  return <header className="entry-header">
    <Link to="/" className="entry-brand"><BrandLogo size={30} /><span>TOP LEVEL TRAFFIC</span></Link>
    <nav aria-label="入口導覽">
      <Link to="/ai">AI 工具</Link>
      <Link to="/courses">線上課程</Link>
      <Link to={currentUser ? memberHome(currentUser) : '/login'}>{currentUser ? '會員中心' : '會員登入'}</Link>
    </nav>
  </header>
}

const AI_TOOLS = [
  ['企劃定位', '整理品牌定位、90 天內容策略與獲客方向。'],
  ['爆款腳本', '從選題發想開始，完成你的短影音腳本。'],
  ['素材靈感', '整理創作素材，找到下一支影片的切角。'],
  ['社群貼文', '把想法轉成適合社群發布的內容。'],
]

export function AIEntryPage() {
  const { currentUser } = useAuth()
  const aiDestination = currentUser ? (['/admin', '/managed'].includes(memberHome(currentUser)) ? memberHome(currentUser) : '/dashboard/ai-tools') : '/login?next=%2Fdashboard%2Fai-tools'
  return <div className="entry-page">
    <PublicEntryHeader />
    <main className="entry-main">
      <section className="entry-intro">
        <p className="entry-eyebrow">AI 工具</p>
        <h1>把想法變成企劃與內容</h1>
        <p>做企劃、寫腳本、找靈感、產生社群貼文。只想使用 AI，也可以獨立申請，不必先購買課程。</p>
        <div className="entry-actions">
          <Link className="sp2-btn sp2-btn-primary sp2-btn-lg" to={aiDestination}>{currentUser ? '進入 AI 工具' : '登入使用 AI'}</Link>
          {!currentUser && <Link className="sp2-btn sp2-btn-outline sp2-btn-lg" to="/register?intent=ai">申請 AI 使用</Link>}
        </div>
        <p className="entry-note">已有課程帳號？使用同一組帳號登入，依原方案使用 AI。</p>
      </section>
      <section className="entry-grid" aria-label="目前提供的 AI 工具">
        {AI_TOOLS.map(([name, description], index) => <article className="entry-card" key={name}>
          <span className="entry-number">0{index + 1}</span><h2>{name}</h2><p>{description}</p>
        </article>)}
      </section>
      <aside className="entry-crosslink"><div><h2>想系統學會自媒體經營？</h2><p>到線上課程查看學習內容，再選擇適合的方案。</p></div><Link to="/courses">查看線上課程 →</Link></aside>
    </main>
  </div>
}

export function CourseEntryPage() {
  const { currentUser } = useAuth()
  const isStudent = currentUser && currentUser.role !== 'admin' && currentUser.tier !== 'managed'
  const courses = plans.filter(plan => ['creator', 'master'].includes(plan.id))
  return <div className="entry-page">
    <PublicEntryHeader />
    <main className="entry-main">
      <section className="entry-intro">
        <p className="entry-eyebrow">線上課程</p>
        <h1>系統學習自媒體經營與獲客</h1>
        <p>從定位、選題到腳本與實作，選擇適合你的學習方式。課程購買與 AI 使用分開選擇，帳號可以共用。</p>
        <div className="entry-actions">
          <a className="sp2-btn sp2-btn-primary sp2-btn-lg" href="#course-options">查看課程方案</a>
          {(!currentUser || (isStudent && !isAIOnly(currentUser))) && <Link className="sp2-btn sp2-btn-outline sp2-btn-lg" to={currentUser ? '/dashboard/courses' : '/login?next=%2Fdashboard%2Fcourses'}>已購課程，前往上課</Link>}
        </div>
      </section>
      <section id="course-options" className="entry-grid entry-course-grid" aria-label="線上課程方案">
        {courses.map(plan => <article className="entry-card" key={plan.id}>
          <p className="entry-eyebrow">{plan.positioning}</p><h2>{plan.name}</h2><p>{plan.coreValue}</p>
          <ul><li>適合：{plan.bestFor}</li><li>學習方式：{plan.learningMode}</li><li>課程內容：{plan.courseAccess}</li></ul>
          {isStudent ? <Link className="sp2-btn sp2-btn-primary" to={`/dashboard/profile?upgrade=${plan.id}`}>查看價格與購買</Link> : <a className="sp2-btn sp2-btn-primary" href={LINE_OFFICIAL_URL} target="_blank" rel="noopener noreferrer">洽詢購買 {plan.name}</a>}
        </article>)}
      </section>
      <p className="entry-note">已有 AI 帳號，購課時請沿用原本的 Email；確認開通後，課程會加入同一個帳號。新學員可透過官方 LINE 洽詢課程與開通方式。</p>
      <aside className="entry-crosslink"><div><h2>想先使用 AI 工具？</h2><p>可以獨立申請 AI 使用，之後再決定是否購課。</p></div><Link to="/ai">使用 AI 工具 →</Link></aside>
    </main>
  </div>
}
