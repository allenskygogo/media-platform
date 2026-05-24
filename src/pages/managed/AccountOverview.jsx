import { useAuth } from '../../context/AuthContext'
import { getUsers } from '../../data/mockData'

function fmt(n) { return n >= 10000 ? `${(n/10000).toFixed(1)}萬` : n.toLocaleString() }

const REMINDERS = [
  '本月發文計劃：預計發布 8 篇 IG 貼文 + 4 支 Reels',
  '上月粉絲成長率：+12.4%，高於同類帳號平均',
  '影片製作中：請至「影片進度」查看最新狀態',
  '本月一對一回顧會議：請至「預約拍攝」確認時段',
]

const DATA_CARDS = (social) => [
  { label:'觀看次數', val: '1.24M', growth: '↑12.4%' },
  { label:'互動數',   val: fmt(social?.instagram?.avgLikes || 85700), growth: '↑18.7%' },
  { label:'粉絲成長', val: '+12.3K', growth: '↑9.8%' },
  { label:'發文數',   val: ((social?.instagram?.recentPosts || 0) + (social?.tiktok?.recentVideos || 0)) || 48, growth: '↑14.3%' },
]

export default function AccountOverview() {
  const { currentUser } = useAuth()
  const fullUser = getUsers().find(u => u.id === currentUser.id)
  const social   = fullUser?.socialAccounts
  const cards    = DATA_CARDS(social)

  return (
    <div className="mg2-overview">
      {/* Hero card */}
      <div className="mg2-hero-card">
        <div className="mg2-hero-text">
          <span className="mg2-hero-badge">頂流代操會員</span>
          <h1 className="mg2-hero-title">帳號總覽</h1>
          <p className="mg2-hero-sub">你的社群媒體帳號數據一覽</p>
          <p className="mg2-hero-meta">合約效期：<strong>{fullUser?.contractExpiry || '待設定'}</strong> · 如需延續請聯絡業務</p>
        </div>
      </div>

      {/* 4 data cards */}
      <div className="mg2-data-grid">
        {cards.map(({ label, val, growth }) => (
          <div key={label} className="mg2-data-card">
            <p className="mg2-data-label">{label}</p>
            <p className="mg2-data-val">{val}</p>
            <span className="mg2-data-growth">{growth}</span>
          </div>
        ))}
      </div>

      {/* Reminders */}
      <div className="mg2-card">
        <div className="mg2-card-header">近期重點提醒</div>
        <div className="mg2-card-body">
          {REMINDERS.map(text => (
            <div key={text} className="mg2-reminder">
              <div className="mg2-reminder-dot"/>
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
