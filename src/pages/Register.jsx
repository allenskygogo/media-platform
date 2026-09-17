import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { memberHome } from '../../shared/memberAccess'
import { PublicEntryHeader } from './EntryPages'
import { LINE_OFFICIAL_URL } from '../utils/manualPayment'

export default function Register() {
  const { currentUser } = useAuth()
  return <div className="entry-page">
    <PublicEntryHeader />
    <main className="entry-main">
      <section className="entry-intro">
        <p className="entry-eyebrow">帳號開通</p>
        <h1>申請 AI 使用</h1>
        <p>AI 可獨立申請，目前開放免費使用。由客服協助建立 AI 會員帳號，不需要先購買課程。</p>
      </section>
      <section className="entry-card" aria-label="AI 申請方式">
        <h2>透過官方 LINE 申請</h2>
        <ol style={{ paddingLeft: 24, margin: '20px 0' }}>
          <li>加入官方 LINE，告訴客服「我要申請 AI 使用」。</li>
          <li>提供姓名與要使用的 Email；已有會員帳號請提供原本的 Email。</li>
          <li>收到開通通知後，回到網站登入使用。</li>
        </ol>
        <p>送出 LINE 訊息後，需由客服確認開通。</p>
        <div className="entry-actions">
          <a className="sp2-btn sp2-btn-primary" href={LINE_OFFICIAL_URL} target="_blank" rel="noopener noreferrer">前往官方 LINE 申請</a>
          <Link className="sp2-btn sp2-btn-outline" to={currentUser ? memberHome(currentUser) : '/login?next=%2Fdashboard%2Fai-tools'}>已有帳號，登入使用</Link>
        </div>
      </section>
      <aside className="entry-crosslink"><div><h2>想購買課程？</h2><p>先查看課程內容，再選擇適合的學習方案。AI 與課程共用同一個帳號。</p></div><Link to="/courses">查看線上課程 →</Link></aside>
    </main>
  </div>
}
