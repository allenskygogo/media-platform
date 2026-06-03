export const USERS_KEY          = 'mp_users'
export const COURSES_KEY        = 'mp_courses'
export const PROJECTS_KEY       = 'mp_projects'
export const BOOKINGS_KEY       = 'mp_bookings'
export const PRICING_KEY        = 'mp_pricing'
export const HOMEWORK_SPEC_KEY  = 'mp_homework_specs'
export const CF_VIDEOS_KEY      = 'mp_cf_videos'
export const VIDEO_ASSIGN_KEY   = 'mp_video_assignments' // { lessonId|'trial': cfVideoUid }

export const DEFAULT_PRICING = {
  trialPrice:            980,
  advancedPrice:         0,
  advancedDiscountPrice: 0,
  managedPrice:          0,
  trialOfferHours:       24,
  completionOfferHours:  24,
  tokenExpiryHours:      3,    // Cloudflare Stream signed token TTL (hours)
}

// accessLevel: 'trial' = basic+, 'standard' = standard+, 'advanced' = advanced only
const defaultCourses = [
  {
    id: 1,
    title: 'YouTube 頻道從零開始',
    description: '從頻道設定、內容規劃、縮圖製作到 SEO 優化，全面掌握 YouTube 成長秘訣。適合完全沒有經驗的新手入門。',
    tier: 'basic', accessLevel: 'trial',
    category: '影音創作', instructor: '王志明老師',
    duration: '4小時30分', students: 1248, rating: 4.8, ratingCount: 324,
    published: true, createdAt: '2024-01-15',
    lessons: [
      { id: 101, title: '頻道定位與受眾分析', duration: '25分鐘', free: true },
      { id: 102, title: 'YouTube Studio 完整介紹', duration: '32分鐘', free: true },
      { id: 103, title: '內容腳本撰寫技巧', duration: '40分鐘', free: false },
      { id: 104, title: '縮圖設計吸睛秘訣', duration: '28分鐘', free: false },
      { id: 105, title: 'SEO 關鍵字研究與應用', duration: '35分鐘', free: false },
      { id: 106, title: '上傳最佳化與排程發布', duration: '20分鐘', free: false },
    ],
  },
  {
    id: 2,
    title: '短影音爆紅公式：IG Reels & TikTok',
    description: '解析爆款短影音的共同規律，學習鉤子腳本、節奏剪輯與演算法操作，讓你的每支影片都有機會成為爆款。',
    tier: 'basic', accessLevel: 'trial',
    category: '社群媒體', instructor: '陳曉琳老師',
    duration: '3小時15分', students: 986, rating: 4.7, ratingCount: 211,
    published: true, createdAt: '2024-02-01',
    lessons: [
      { id: 201, title: '短影音平台生態解析', duration: '18分鐘', free: true },
      { id: 202, title: '黃金前三秒鉤子公式', duration: '30分鐘', free: false },
      { id: 203, title: '爆款腳本結構拆解', duration: '35分鐘', free: false },
      { id: 204, title: '剪輯節奏與音樂搭配', duration: '42分鐘', free: false },
      { id: 205, title: '演算法加速推廣技巧', duration: '28分鐘', free: false },
    ],
  },
  {
    id: 3,
    title: 'Podcast 製作與品牌建立',
    description: '從設備挑選、錄音技巧、後製剪輯到上架各大平台，打造專業 Podcast 頻道。',
    tier: 'basic', accessLevel: 'standard',
    category: '音頻創作', instructor: '林建宏老師',
    duration: '2小時50分', students: 543, rating: 4.6, ratingCount: 98,
    published: true, createdAt: '2024-02-20',
    lessons: [
      { id: 301, title: '設備選購與預算規劃', duration: '22分鐘', free: true },
      { id: 302, title: '錄音環境與收音技巧', duration: '30分鐘', free: false },
      { id: 303, title: 'Audacity 後製剪輯', duration: '38分鐘', free: false },
      { id: 304, title: '上架 Spotify、Apple Podcast', duration: '25分鐘', free: false },
    ],
  },
  {
    id: 4,
    title: '自媒體商業變現完全攻略',
    description: '深入解析業配合作、會員制度、數位商品、線上課程等多元變現模式，打造穩定的自媒體收入來源。',
    tier: 'advanced', accessLevel: 'advanced',
    category: '商業變現', instructor: '王志明老師',
    duration: '5小時20分', students: 421, rating: 4.9, ratingCount: 187,
    published: true, createdAt: '2024-03-01',
    lessons: [
      { id: 401, title: '自媒體收入模式全覽', duration: '30分鐘', free: false },
      { id: 402, title: '業配合作談判技巧', duration: '45分鐘', free: false },
      { id: 403, title: '建立會員訂閱制度', duration: '50分鐘', free: false },
      { id: 404, title: '數位商品設計與銷售', duration: '55分鐘', free: false },
      { id: 405, title: '線上課程製作與定價', duration: '60分鐘', free: false },
      { id: 406, title: '聯盟行銷與授權合作', duration: '40分鐘', free: false },
    ],
  },
  {
    id: 5,
    title: '數據分析驅動內容成長',
    description: '運用 YouTube Analytics、IG Insights、Google Analytics 等工具深度分析數據，制定精準的成長策略。',
    tier: 'advanced', accessLevel: 'advanced',
    category: '數據分析', instructor: '黃思齊老師',
    duration: '4小時10分', students: 312, rating: 4.8, ratingCount: 134,
    published: true, createdAt: '2024-03-15',
    lessons: [
      { id: 501, title: '關鍵指標 KPI 解讀', duration: '35分鐘', free: false },
      { id: 502, title: 'YouTube Analytics 深度解析', duration: '48分鐘', free: false },
      { id: 503, title: '受眾洞察與內容優化', duration: '42分鐘', free: false },
      { id: 504, title: 'A/B 測試縮圖與標題', duration: '38分鐘', free: false },
      { id: 505, title: '競品分析與市場定位', duration: '45分鐘', free: false },
    ],
  },
  {
    id: 6,
    title: 'AI 工具加速自媒體工作流',
    description: '整合 ChatGPT、Midjourney、Runway 等 AI 工具，大幅提升內容創作效率，同時維持高品質輸出。',
    tier: 'advanced', accessLevel: 'advanced',
    category: 'AI 應用', instructor: '陳曉琳老師',
    duration: '3小時45分', students: 589, rating: 4.9, ratingCount: 256,
    published: true, createdAt: '2024-04-01',
    lessons: [
      { id: 601, title: 'AI 工具生態系概覽', duration: '20分鐘', free: false },
      { id: 602, title: 'ChatGPT 腳本與文案生成', duration: '45分鐘', free: false },
      { id: 603, title: 'Midjourney 縮圖與視覺設計', duration: '40分鐘', free: false },
      { id: 604, title: 'AI 影片生成與剪輯輔助', duration: '50分鐘', free: false },
      { id: 605, title: '打造 AI 自動化工作流', duration: '55分鐘', free: false },
    ],
  },
]

const defaultUsers = [
  {
    id: 1, name: '平台管理員', email: 'local-admin@example.invalid', password: 'local-only',
    role: 'admin', tier: null, avatar: 'A', createdAt: '2024-01-01', status: 'active', expiresAt: null,
  },
  {
    id: 2, name: '張小明', email: 'local-basic@example.invalid', password: 'local-only',
    role: 'student', tier: 'basic', avatar: '張', createdAt: '2026-02-21', status: 'active',
    expiresAt: '2026-08-20', // 已完成體驗，使用期限進行中
  },
  {
    id: 7, name: '陳大文', email: 'local-trial@example.invalid', password: 'local-only',
    role: 'student', tier: 'basic', avatar: '陳', createdAt: '2026-05-22', status: 'active',
    expiresAt: null, // 尚未完成體驗，期限未起算
  },
  {
    id: 3, name: '李雅婷', email: 'local-standard@example.invalid', password: 'local-only',
    role: 'student', tier: 'standard', avatar: '李', createdAt: '2025-05-21', status: 'active',
    expiresAt: '2026-05-21',
  },
  {
    id: 4, name: '陳美玲', email: 'local-advanced@example.invalid', password: 'local-only',
    role: 'student', tier: 'advanced', avatar: '陳', createdAt: '2025-05-21', status: 'active',
    expiresAt: '2026-05-21', advancedPaidAmount: 0,
  },
  {
    id: 5, name: '王建偉', email: 'local-managed-1@example.invalid', password: 'local-only',
    role: 'student', tier: 'managed', avatar: '王', createdAt: '2025-04-01', status: 'active',
    expiresAt: null, contractExpiry: '2026-04-01',
    socialAccounts: {
      instagram: { username: '@wangbuildofficial', followers: 12400, recentPosts: 18, avgLikes: 342 },
      tiktok: { username: '@wangbuild_tt', followers: 28600, recentVideos: 12, avgViews: 15600 },
    },
  },
  {
    id: 6, name: '林佳慧', email: 'local-managed-2@example.invalid', password: 'local-only',
    role: 'student', tier: 'managed', avatar: '林', createdAt: '2025-09-15', status: 'active',
    expiresAt: null, contractExpiry: '2026-09-15',
    socialAccounts: {
      instagram: { username: '@linjiahui_life', followers: 5600, recentPosts: 8, avgLikes: 178 },
      tiktok: { username: '@linjiahui_tt', followers: 9200, recentVideos: 6, avgViews: 4300 },
    },
  },
]

const defaultProjects = [
  { id: 1, clientId: 5, title: '2025 Q2 品牌形象影片', status: 'completed', createdAt: '2025-04-05', updatedAt: '2025-04-20', notes: '已完成，客戶確認通過' },
  { id: 2, clientId: 5, title: 'YouTube 頻道開箱介紹', status: 'editing', createdAt: '2025-04-25', updatedAt: '2025-05-10', notes: '剪輯中，預計 5/30 完成' },
  { id: 3, clientId: 5, title: '產品測評系列 EP1', status: 'filming', createdAt: '2025-05-01', updatedAt: '2025-05-15', notes: '拍攝日期已確認：5/22' },
  { id: 4, clientId: 5, title: 'IG Reels 夏日系列 x5', status: 'planning', createdAt: '2025-05-18', updatedAt: '2025-05-18', notes: '腳本規劃中' },
  { id: 5, clientId: 6, title: '美妝教學系列 EP1', status: 'completed', createdAt: '2025-04-20', updatedAt: '2025-04-28', notes: '已上線，表現良好' },
  { id: 6, clientId: 6, title: '穿搭 Lookbook 春夏款', status: 'planning', createdAt: '2025-05-10', updatedAt: '2025-05-10', notes: '場景和服裝確認中' },
]

const defaultBookings = [
  { id: 1, userId: 4, type: 'oneonone', date: '2026-06-05', timeSlot: '14:00', topic: 'YouTube 成長策略討論', notes: '想聊頻道優化和變現計劃', status: 'confirmed', createdAt: '2026-05-20' },
  { id: 2, userId: 4, type: 'oneonone', date: '2026-07-10', timeSlot: '12:00', topic: 'IG 互動率提升策略', notes: '', status: 'pending', createdAt: '2026-05-21' },
  { id: 3, userId: 5, type: 'shooting', date: '2026-06-03', timeSlot: '13:00', topic: '產品開箱拍攝', notes: '需要準備 3 個產品，白色背景', status: 'confirmed', createdAt: '2026-05-15' },
  { id: 4, userId: 5, type: 'shooting', date: '2026-07-15', timeSlot: '15:00', topic: 'IG Reels 拍攝 x3', notes: '戶外場景為主', status: 'pending', createdAt: '2026-05-20' },
  { id: 5, userId: 6, type: 'shooting', date: '2026-06-20', timeSlot: '18:00', topic: '美妝教學影片', notes: '需要專業打光設備', status: 'pending', createdAt: '2026-05-21' },
]

export function initMockData() {
  // Users: merge — add any default user whose email isn't in localStorage yet
  const storedUsers = JSON.parse(localStorage.getItem(USERS_KEY) || '[]')
  const mergedUsers = [...storedUsers]
  for (const def of defaultUsers) {
    if (!mergedUsers.find(u => u.email === def.email)) mergedUsers.push(def)
  }
  // Migration: strip any legacy trial suffix from user names
  const cleanedUsers = mergedUsers.map(u => ({
    ...u,
    name: u.name.replace(/（未體驗）$/, '').trim(),
  }))
  localStorage.setItem(USERS_KEY, JSON.stringify(cleanedUsers))
  // Also patch mp_current_user if it contains the old suffix
  const cur = JSON.parse(localStorage.getItem('mp_current_user') || 'null')
  if (cur?.name) {
    cur.name = cur.name.replace(/（未體驗）$/, '').trim()
    localStorage.setItem('mp_current_user', JSON.stringify(cur))
  }

  if (!localStorage.getItem(COURSES_KEY))  localStorage.setItem(COURSES_KEY,  JSON.stringify(defaultCourses))
  if (!localStorage.getItem(PROJECTS_KEY)) localStorage.setItem(PROJECTS_KEY, JSON.stringify(defaultProjects))
  if (!localStorage.getItem(BOOKINGS_KEY)) localStorage.setItem(BOOKINGS_KEY, JSON.stringify(defaultBookings))
  const storedPricing = JSON.parse(localStorage.getItem(PRICING_KEY) || 'null')
  if (!storedPricing) {
    localStorage.setItem(PRICING_KEY, JSON.stringify(DEFAULT_PRICING))
  } else {
    const migratedPricing = {
      ...storedPricing,
      trialPrice: storedPricing.trialPrice && storedPricing.trialPrice !== DEFAULT_PRICING.trialPrice ? DEFAULT_PRICING.trialPrice : storedPricing.trialPrice,
      advancedPrice: DEFAULT_PRICING.advancedPrice,
      advancedDiscountPrice: DEFAULT_PRICING.advancedDiscountPrice,
      managedPrice: DEFAULT_PRICING.managedPrice,
    }
    localStorage.setItem(PRICING_KEY, JSON.stringify(migratedPricing))
  }
  if (!localStorage.getItem(HOMEWORK_SPEC_KEY)) {
    localStorage.setItem(HOMEWORK_SPEC_KEY, JSON.stringify(DEFAULT_HOMEWORK_SPECS))
  }
  // Always refresh demo session times so they stay relative to now
  initLiveSessions()
}

export function getUsers() { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]') }
export function getCourses() { return JSON.parse(localStorage.getItem(COURSES_KEY) || '[]') }
export function getProjects() { return JSON.parse(localStorage.getItem(PROJECTS_KEY) || '[]') }
export function getBookings() { return JSON.parse(localStorage.getItem(BOOKINGS_KEY) || '[]') }
export function saveUsers(u) { localStorage.setItem(USERS_KEY, JSON.stringify(u)) }
export function saveCourses(c) { localStorage.setItem(COURSES_KEY, JSON.stringify(c)) }
export function saveProjects(p) { localStorage.setItem(PROJECTS_KEY, JSON.stringify(p)) }
export function saveBookings(b) { localStorage.setItem(BOOKINGS_KEY, JSON.stringify(b)) }

// Access control helpers
const TIER_ORDER = { basic: 1, standard: 2, advanced: 3, managed: 0 }
const ACCESS_ORDER = { trial: 1, standard: 2, advanced: 3 }

export function canAccessCourse(userTier, courseAccessLevel) {
  return (TIER_ORDER[userTier] || 0) >= (ACCESS_ORDER[courseAccessLevel] || 2)
}

export function canAccessAI(userTier) { return userTier === 'advanced' }
export function canAccessOneOnOne(userTier) { return userTier === 'advanced' }

export function addDays(dateStr, days) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export const TIER_META = {
  basic:    { label: '體驗課',    emoji: '', color: 'basic',    duration: '3 個月',  days: 90  },
  standard: { label: '頂流達人',  emoji: '', color: 'standard', duration: '1 年',    days: 365 },
  advanced: { label: '頂流私塾',  emoji: '', color: 'advanced', duration: '1 年',    days: 365 },
  managed:  { label: '頂流代操',  emoji: '', color: 'managed',  duration: '依合約',  days: null },
}

// ── Live Class System ──────────────────────────────────────────────────────
export const SESSIONS_KEY         = 'mp_live_sessions'
export const SESSION_BOOKINGS_KEY = 'mp_session_bookings'
export const WATCH_PROGRESS_KEY   = 'mp_watch_progress'

export function getSessions()              { return JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]') }
export function saveSessions(s)            { localStorage.setItem(SESSIONS_KEY, JSON.stringify(s)) }
export function getSessionBookings()       { return JSON.parse(localStorage.getItem(SESSION_BOOKINGS_KEY) || '[]') }
export function saveSessionBookings(b)     { localStorage.setItem(SESSION_BOOKINGS_KEY, JSON.stringify(b)) }

/** Always recalculates demo session times so they stay relative to "now".
 *  Admin-created sessions (isDemo: false) are preserved unchanged. */
export function initLiveSessions() {
  const now = Date.now()
  const t   = (ms) => new Date(now + ms).toISOString()
  const demos = [
    {
      id: 101, isDemo: true,
      title: '自媒體入門直播課 EP1：頻道定位策略',
      videoId: 1, scheduledAt: t(-20 * 60 * 1000), durationSec: 2700,
      recurrenceDisplay: '每週二 20:00', published: true,
    },
    {
      id: 102, isDemo: true,
      title: '自媒體入門直播課 EP2：內容企劃實戰',
      videoId: 2, scheduledAt: t(25 * 3600 * 1000), durationSec: 2700,
      recurrenceDisplay: '每週三 20:00', published: true,
    },
    {
      id: 103, isDemo: true,
      title: '自媒體入門直播課 EP3：演算法破解秘訣',
      videoId: 1, scheduledAt: t(-(2700 + 30 * 60) * 1000), durationSec: 2700,
      recurrenceDisplay: '每週一 20:00', published: true,
    },
  ]
  const existing     = getSessions()
  const adminCreated = existing.filter(s => !s.isDemo)
  saveSessions([...demos, ...adminCreated])
}

/** Returns 'upcoming' | 'live' | 'ended' */
export function getSessionState(session) {
  const now   = Date.now()
  const start = new Date(session.scheduledAt).getTime()
  const end   = start + session.durationSec * 1000
  if (now < start) return 'upcoming'
  if (now < end)   return 'live'
  return 'ended'
}

/** Seconds elapsed since session started (clamped to 0). */
export function getElapsedSec(session) {
  return Math.max(0, Math.floor((Date.now() - new Date(session.scheduledAt).getTime()) / 1000))
}

export function getWatchProgress(userId, sessionId) {
  const all = JSON.parse(localStorage.getItem(WATCH_PROGRESS_KEY) || '[]')
  return all.find(w => w.userId === userId && String(w.sessionId) === String(sessionId)) || null
}

export function saveWatchProgress(userId, sessionId, currentSecond, completed = false) {
  const all = JSON.parse(localStorage.getItem(WATCH_PROGRESS_KEY) || '[]')
  const idx = all.findIndex(w => w.userId === userId && String(w.sessionId) === String(sessionId))
  const record = { userId, sessionId: String(sessionId), currentSecond, completed, updatedAt: new Date().toISOString() }
  if (idx >= 0) all[idx] = record
  else all.push(record)
  localStorage.setItem(WATCH_PROGRESS_KEY, JSON.stringify(all))
}

export function isUserBooked(userId, sessionId) {
  return getSessionBookings().some(
    b => b.userId === userId && String(b.sessionId) === String(sessionId)
  )
}

export function bookSession(userId, sessionId) {
  if (isUserBooked(userId, sessionId)) return
  const bookings = getSessionBookings()
  bookings.push({
    id: Date.now(), userId, sessionId: String(sessionId),
    type: 'fixed', createdAt: new Date().toISOString(),
  })
  saveSessionBookings(bookings)
}

/** Creates a private live session at the given ISO scheduledAt and auto-books the user. */
export function createPrivateSession(userId, scheduledAt) {
  const sessions = getSessions()
  const id = Date.now()
  sessions.push({
    id, isDemo: false, isPrivate: true, userId,
    title: '私人直播課：自媒體入門完整版',
    videoId: 1, scheduledAt, durationSec: 2700,
    recurrenceDisplay: '私人場次', published: true,
  })
  saveSessions(sessions)
  const bookings = getSessionBookings()
  bookings.push({
    id: id + 1, userId, sessionId: String(id),
    type: 'private', createdAt: new Date().toISOString(),
  })
  saveSessionBookings(bookings)
  return id
}

// ── Trial Session System ───────────────────────────────────────────────────
export const TRIAL_KEY          = 'mp_trial_sessions'
export const TRIAL_PROGRESS_KEY = 'mp_trial_progress'
export const TRIAL_DURATION_SEC = 10800 // 3 hours

export function getTrialSession(userId) {
  const all = JSON.parse(localStorage.getItem(TRIAL_KEY) || '[]')
  return all.find(s => s.userId === userId) || null
}

export function saveTrialSession(userId, scheduledAt) {
  const all     = JSON.parse(localStorage.getItem(TRIAL_KEY) || '[]')
  const others  = all.filter(s => s.userId !== userId)
  others.push({ userId, scheduledAt, createdAt: new Date().toISOString() })
  localStorage.setItem(TRIAL_KEY, JSON.stringify(others))
}

export function getTrialProgress(userId) {
  const all = JSON.parse(localStorage.getItem(TRIAL_PROGRESS_KEY) || '[]')
  return all.find(p => p.userId === userId) || null
}

export function saveTrialProgress(userId, currentSecond, completed = false) {
  const all = JSON.parse(localStorage.getItem(TRIAL_PROGRESS_KEY) || '[]')
  const idx = all.findIndex(p => p.userId === userId)
  const record = {
    userId, currentSecond, completed,
    completedAt: completed ? new Date().toISOString() : (all[idx]?.completedAt || null),
    updatedAt: new Date().toISOString(),
  }
  if (idx >= 0) all[idx] = record
  else all.push(record)
  localStorage.setItem(TRIAL_PROGRESS_KEY, JSON.stringify(all))
}

/** Mark trial as complete AND set expiresAt = today + 90 days in users array. */
export function completeTrialInStorage(userId) {
  saveTrialProgress(userId, TRIAL_DURATION_SEC, true)
  const users = getUsers()
  const idx   = users.findIndex(u => u.id === userId)
  if (idx >= 0 && !users[idx].expiresAt) {
    const today = new Date().toISOString().split('T')[0]
    users[idx].expiresAt = addDays(today, 90)
    if (!users[idx].trialCompletedAt) users[idx].trialCompletedAt = new Date().toISOString()
    saveUsers(users)
    return users[idx].expiresAt
  }
  return users[idx]?.expiresAt || null
}

// ── Reminder Email System ──────────────────────────────────────────────────
export const REMINDER_KEY = 'mp_reminder_log'

// Templates A / B / C
export const REMINDER_TEMPLATES = {
  A: {
    key: 'A',
    subject: '{{姓名}}，你的自媒體之路從這裡開始 🎬',
    body: `嗨 {{姓名}}，

你已經踏出了第一步，購買了體驗課。

很多人就卡在這裡——買了，但還沒開始。

其實只要找一個你有空的下午，三個小時，你就會對自媒體有完全不同的理解。

現在去選一個你的專屬時段吧 👇

{{按鈕：立即預約觀看時段}}

期待在課堂上見到你，
頂級流量`,
  },
  B: {
    key: 'B',
    subject: '{{姓名}}，三小時可以改變什麼？',
    body: `嗨 {{姓名}}，

你知道嗎，很多頂流達人的同學，看完體驗課的當天就決定要認真做自媒體了。

不是因為課程有多神奇，而是因為他們終於搞清楚「方向」在哪裡。

你的體驗課還在等你，現在選個時間吧 👇

{{按鈕：立即預約觀看時段}}

頂級流量`,
  },
  C: {
    key: 'C',
    subject: '{{姓名}}，我幫你留著這堂課 🙌',
    body: `嗨 {{姓名}}，

沒關係，每個人開始的時間點都不一樣。

我只是想讓你知道，這堂體驗課一直在這裡等你，隨時都可以開始。

找一個你真的有三小時的時間，泡杯咖啡，把手機放旁邊，認真看一次。

你會慶幸自己開始了。👇

{{按鈕：立即預約觀看時段}}

頂級流量`,
  },
}

/** Returns the reminder log entry for a user, or a default empty record. */
export function getReminderLog(userId) {
  const all = JSON.parse(localStorage.getItem(REMINDER_KEY) || '[]')
  return all.find(r => r.userId === userId) || { userId, count: 0, log: [] }
}

/** Records a reminder send event and increments the count. */
export function recordReminder(userId, templateKey) {
  const all = JSON.parse(localStorage.getItem(REMINDER_KEY) || '[]')
  const idx = all.findIndex(r => r.userId === userId)
  const existing = idx >= 0 ? all[idx] : { userId, count: 0, log: [] }
  const updated = {
    ...existing,
    count: existing.count + 1,
    log: [...existing.log, { template: templateKey, sentAt: new Date().toISOString() }],
  }
  if (idx >= 0) all[idx] = updated
  else all.push(updated)
  localStorage.setItem(REMINDER_KEY, JSON.stringify(all))
  return updated
}

/** Returns which template (A/B/C) should be sent next based on count. */
export function nextReminderTemplate(userId) {
  const { count } = getReminderLog(userId)
  const keys = ['A', 'B', 'C']
  return keys[count % 3]
}

/** Generates an auto-login token for email links. */
export function makeAutoLoginToken(userId, email) {
  return btoa(`${userId}:${email}`)
}

/** Verifies and decodes an auto-login token. Returns user or null. */
export function verifyAutoLoginToken(uid, token) {
  const users = getUsers()
  const user  = users.find(u => u.id === Number(uid) || u.id === uid)
  if (!user) return null
  const expected = btoa(`${user.id}:${user.email}`)
  return token === expected ? user : null
}

/** Auto-check on app load: send trial reminders to all eligible basic students. */
export function checkAndSendTrialReminders() {
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000
  for (const user of getUsers()) {
    if (user.role !== 'student' || user.tier !== 'basic' || user.expiresAt) continue
    const log = getReminderLog(user.id)
    const lastSentMs = log.log.length > 0
      ? new Date(log.log[log.log.length - 1].sentAt).getTime()
      : null
    if (!lastSentMs || Date.now() - lastSentMs >= TWENTY_FOUR_HOURS) {
      recordReminder(user.id, nextReminderTemplate(user.id))
    }
  }
}

// ── Pricing System ─────────────────────────────────────────────────────────
export function getPricing() {
  return { ...DEFAULT_PRICING, ...JSON.parse(localStorage.getItem(PRICING_KEY) || '{}') }
}
export function savePricing(p) { localStorage.setItem(PRICING_KEY, JSON.stringify(p)) }

/** Returns advanced-offer status for a user (post-trial 24h discount). */
export function getAdvancedOfferStatus(user) {
  if (!user?.trialCompletedAt) return { active: false }
  const pricing = getPricing()
  const deadline = new Date(user.trialCompletedAt).getTime() + pricing.trialOfferHours * 3600000
  const remaining = deadline - Date.now()
  if (remaining <= 0) return { active: false }
  return { active: true, remainingMs: remaining,
    discountPrice: pricing.advancedDiscountPrice, normalPrice: pricing.advancedPrice }
}

/** Returns managed-offer status for a user (post-completion 24h discount). */
export function getManagedOfferStatus(user) {
  if (!user?.courseCompletedAt) return { active: false }
  const pricing = getPricing()
  const deadline = new Date(user.courseCompletedAt).getTime() + pricing.completionOfferHours * 3600000
  const remaining = deadline - Date.now()
  if (remaining <= 0) return { active: false }
  const paid = user.advancedPaidAmount || pricing.advancedPrice
  return { active: true, remainingMs: remaining,
    discountPrice: Math.max(pricing.managedPrice - paid, 0),
    normalPrice: pricing.managedPrice, deduction: paid }
}

// ── Lesson Progress (for standard/advanced courses) ────────────────────────
export const LESSON_PROGRESS_KEY = 'mp_lesson_progress'
export const LESSON_DEMO_SPEED   = 60 // each real second advances this many lesson-seconds

/** Parse "25分鐘", "3小時45分" → total seconds */
export function parseDurationToSec(str = '') {
  let s = 0
  const h = str.match(/(\d+)小時/)
  const m = str.match(/(\d+)分/)
  if (h) s += parseInt(h[1]) * 3600
  if (m) s += parseInt(m[1]) * 60
  return s || 1800
}

export function getLessonProgress(userId, courseId, lessonId) {
  const all = JSON.parse(localStorage.getItem(LESSON_PROGRESS_KEY) || '[]')
  return all.find(p => p.userId === userId && p.courseId === courseId && p.lessonId === lessonId) || null
}

export function saveLessonProgress(userId, courseId, lessonId, currentSecond, completed = false) {
  const all = JSON.parse(localStorage.getItem(LESSON_PROGRESS_KEY) || '[]')
  const idx = all.findIndex(p => p.userId === userId && p.courseId === courseId && p.lessonId === lessonId)
  const existing = idx >= 0 ? all[idx] : null
  const wasCompleted = existing?.completed || false
  const record = {
    userId, courseId, lessonId, currentSecond, completed: completed || wasCompleted,
    watchCount: (existing?.watchCount || 0) + (completed && !wasCompleted ? 1 : 0),
    completedAt: completed && !wasCompleted ? new Date().toISOString() : (existing?.completedAt || null),
    updatedAt: new Date().toISOString(),
  }
  if (idx >= 0) all[idx] = record
  else all.push(record)
  localStorage.setItem(LESSON_PROGRESS_KEY, JSON.stringify(all))
  return record
}

// ── Homework Specs (admin-set per lesson) ──────────────────────────────────
// Default homework specs for all lessons (can be overridden by admin)
export const DEFAULT_HOMEWORK_SPECS = [
  { lessonId: 101, spec: '請拍攝一支 60–90 秒的自我介紹影片，說明你的頻道定位與目標受眾，上傳至 YouTube 或 IG Reels 後提交連結。' },
  { lessonId: 102, spec: '截圖你的 YouTube Studio 主頁，並在說明欄位填寫：你設定的三個頻道 KPI 是什麼？目標值各是多少？' },
  { lessonId: 103, spec: '使用本堂課所學，撰寫一支影片的完整腳本（300–500 字），內容需包含鉤子、主體段落、行動呼籲，貼在說明欄位。' },
  { lessonId: 104, spec: '設計兩款不同風格的縮圖並上傳至 Canva 或任何平台，提交公開連結，並說明兩款設計的差異與選擇理由。' },
  { lessonId: 105, spec: '找出你頻道主題的三個高潛力 SEO 關鍵字，列出搜尋量來源與選擇原因，貼在說明欄位（可截圖輔助）。' },
  { lessonId: 106, spec: '上傳一支完整影片至 YouTube，設定最佳化標題、描述、標籤，提交影片連結，並附上你選擇各設定的原因。' },
  { lessonId: 201, spec: '選擇一個你想深耕的短影音平台，分析三個你認為適合的帳號，整理出它們的共同策略，填寫在說明欄位。' },
  { lessonId: 202, spec: '拍攝一支 30 秒內的短影音，前 3 秒必須使用本堂課學到的鉤子公式，上傳至 TikTok 或 IG Reels 後提交。' },
  { lessonId: 203, spec: '依照爆款腳本結構，撰寫一支短影音完整腳本，填寫在說明欄位（含鉤子、轉折、結尾行動呼籲）。' },
  { lessonId: 204, spec: '剪輯一支 30–60 秒的影片，必須包含至少 3 個節奏切換點，上傳至任何平台並提交連結。' },
  { lessonId: 205, spec: '發布一支短影音並觀察前 24 小時的數據，截圖並填寫分析：觀看數、完播率、觸及方式，提交在說明欄位。' },
  { lessonId: 301, spec: '列出你計劃採購的 Podcast 設備清單（含型號與預算），並說明你的選擇理由，填寫在說明欄位。' },
  { lessonId: 302, spec: '錄製一段 3–5 分鐘的 Podcast 試錄（任何主題），注意收音環境，上傳至任何平台後提交連結。' },
  { lessonId: 303, spec: '使用 Audacity 剪輯一段錄音（去除雜音、加入片頭片尾），上傳後提交連結，並說明你的後製步驟。' },
  { lessonId: 304, spec: '將你的 Podcast 上架至 Spotify 或 Apple Podcast，提交節目連結，並截圖後台的「已上架」狀態。' },
  { lessonId: 401, spec: '選擇你最感興趣的兩種變現模式，分析其優缺點和適用條件，填寫在說明欄位（300 字以上）。' },
  { lessonId: 402, spec: '模擬一封業配合作提案信，針對你頻道所在的一個假設品牌，撰寫合作邀約（含報價），填寫在說明欄位。' },
  { lessonId: 403, spec: '設計你的會員訂閱方案（含層級、定價、福利），製作成一頁 A4 方案說明，上傳截圖或 PDF 連結。' },
  { lessonId: 404, spec: '構思一個你可以製作的數位商品（e-book、模板、工具包等），撰寫產品描述與定價理由，填寫在說明欄位。' },
  { lessonId: 405, spec: '規劃一門你的線上課程大綱（含課程名稱、章節架構、目標學員、定價），填寫在說明欄位。' },
  { lessonId: 406, spec: '找出你頻道主題相關的 3 個聯盟行銷計畫，說明你的推廣策略，填寫在說明欄位。' },
  { lessonId: 501, spec: '截圖你 YouTube 頻道的 Analytics 主頁，標出三個你認為最重要的 KPI，並說明為什麼選擇這三個，填寫在說明欄位。' },
  { lessonId: 502, spec: '分析你最近三支影片的 Analytics 數據，找出一個共同問題並提出改善方案，填寫在說明欄位。' },
  { lessonId: 503, spec: '根據受眾洞察報告，調整你的下一支影片主題和呈現方式，說明你的決策邏輯，填寫在說明欄位。' },
  { lessonId: 504, spec: '針對同一支影片，設計兩款不同縮圖和標題，說明你的假設，上傳截圖連結並填寫預期測試方法。' },
  { lessonId: 505, spec: '分析一個競品頻道的策略（選題、發布頻率、互動方式），整理成報告填寫在說明欄位（300 字以上）。' },
  { lessonId: 601, spec: '列出你目前或計劃使用的 3 個 AI 工具，說明每個工具的具體應用場景與優缺點，填寫在說明欄位。' },
  { lessonId: 602, spec: '用 ChatGPT 生成一支影片的完整腳本（主題自訂），貼出你的提示詞（Prompt）和生成結果，填寫在說明欄位。' },
  { lessonId: 603, spec: '使用 Midjourney 或 Canva AI 生成三款縮圖候選，上傳截圖連結，並說明你最終選擇哪款及原因。' },
  { lessonId: 604, spec: '使用任一 AI 影片工具生成或輔助剪輯一段 30 秒影片，上傳連結並說明你使用了哪些 AI 功能。' },
  { lessonId: 605, spec: '設計你的自媒體 AI 工作流，繪製流程圖（截圖或連結），說明每個步驟使用哪個 AI 工具及效益。' },
]

export function getHomeworkSpecs() {
  return JSON.parse(localStorage.getItem(HOMEWORK_SPEC_KEY) || '[]')
}
export function getHomeworkSpec(lessonId) {
  return getHomeworkSpecs().find(s => s.lessonId === lessonId) || null
}
export function saveHomeworkSpec(lessonId, spec) {
  const all = getHomeworkSpecs()
  const idx = all.findIndex(s => s.lessonId === lessonId)
  const record = { lessonId, spec, updatedAt: new Date().toISOString() }
  if (idx >= 0) all[idx] = record; else all.push(record)
  localStorage.setItem(HOMEWORK_SPEC_KEY, JSON.stringify(all))
}

// ── Homework Submissions ───────────────────────────────────────────────────
export const HOMEWORK_KEY = 'mp_homework'

export function getAllHomework() {
  return JSON.parse(localStorage.getItem(HOMEWORK_KEY) || '[]')
}
export function saveAllHomework(arr) {
  localStorage.setItem(HOMEWORK_KEY, JSON.stringify(arr))
}
export function getLatestHomework(userId, courseId, lessonId) {
  const matching = getAllHomework()
    .filter(h => h.userId === userId && h.courseId === courseId && h.lessonId === lessonId)
  if (!matching.length) return null
  return matching.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))[0]
}
export function submitHomework(userId, courseId, lessonId, videoUrl, note) {
  const all = getAllHomework()
  const id = Date.now()
  all.push({ id, userId, courseId, lessonId, videoUrl, note,
    status: 'pending', submittedAt: new Date().toISOString(),
    reviewedAt: null, rejectionReason: null })
  saveAllHomework(all)
  return id
}
export function approveHomework(submissionId) {
  const all = getAllHomework()
  const idx = all.findIndex(h => h.id === submissionId)
  if (idx < 0) return
  all[idx].status = 'approved'
  all[idx].reviewedAt = new Date().toISOString()
  saveAllHomework(all)
  checkAllCoursesCompleted(all[idx].userId)
}
export function rejectHomework(submissionId, reason) {
  const all = getAllHomework()
  const idx = all.findIndex(h => h.id === submissionId)
  if (idx < 0) return
  all[idx].status = 'rejected'
  all[idx].reviewedAt = new Date().toISOString()
  all[idx].rejectionReason = reason
  saveAllHomework(all)
}

// ── Lesson & Course Completion ─────────────────────────────────────────────

/** Is lesson at `lessonIndex` unlocked for this user? */
export function isLessonUnlocked(userId, courseId, lessons, lessonIndex) {
  if (lessonIndex === 0) return true
  const prev = lessons[lessonIndex - 1]
  const prog = getLessonProgress(userId, courseId, prev.id)
  if (!prog?.completed) return false
  const spec = getHomeworkSpec(prev.id)
  if (!spec) return true  // no spec = no homework required, auto-unlock
  const hw = getLatestHomework(userId, courseId, prev.id)
  return hw?.status === 'approved'
}

/** All lessons in a course completed AND homework approved (where spec exists). */
export function isCourseCompleted(userId, courseId) {
  const course = getCourses().find(c => c.id === courseId)
  if (!course) return false
  return course.lessons.every(lesson => {
    const prog = getLessonProgress(userId, courseId, lesson.id)
    if (!prog?.completed) return false
    const spec = getHomeworkSpec(lesson.id)
    if (!spec) return true
    return getLatestHomework(userId, courseId, lesson.id)?.status === 'approved'
  })
}

/** Called after each homework approval — checks if all accessible courses done. */
export function checkAllCoursesCompleted(userId) {
  const users = getUsers()
  const user = users.find(u => u.id === userId)
  if (!user || user.courseCompletedAt) return
  const accessible = getCourses().filter(c =>
    c.published && canAccessCourse(user.tier, c.accessLevel))
  if (!accessible.length) return
  if (accessible.every(c => isCourseCompleted(userId, c.id))) {
    const idx = users.findIndex(u => u.id === userId)
    users[idx].courseCompletedAt = new Date().toISOString()
    saveUsers(users)
  }
}

// ── Expiry Reminder System ────────────────────────────────────────────────
export const EXPIRY_REMINDER_KEY = 'mp_expiry_reminders'
const EXPIRY_DAYS = [14, 7, 3]

export function getExpiryReminderLog(userId) {
  const all = JSON.parse(localStorage.getItem(EXPIRY_REMINDER_KEY) || '[]')
  return all.find(r => r.userId === userId) || { userId, sentDays: [], log: [] }
}

export function recordExpiryReminder(userId, daysLeft) {
  const all = JSON.parse(localStorage.getItem(EXPIRY_REMINDER_KEY) || '[]')
  const idx = all.findIndex(r => r.userId === userId)
  const existing = idx >= 0 ? all[idx] : { userId, sentDays: [], log: [] }
  const updated = {
    ...existing,
    sentDays: [...existing.sentDays, daysLeft],
    log: [...existing.log, { daysLeft, sentAt: new Date().toISOString() }],
  }
  if (idx >= 0) all[idx] = updated; else all.push(updated)
  localStorage.setItem(EXPIRY_REMINDER_KEY, JSON.stringify(all))
}

/** Called on app load — simulate sending expiry reminders to all eligible users. */
export function checkAndSendExpiryReminders() {
  for (const user of getUsers()) {
    if (!user.expiresAt) continue
    const daysLeft = Math.ceil(
      (new Date(user.expiresAt).getTime() - Date.now()) / 86400000)
    const log = getExpiryReminderLog(user.id)
    for (const threshold of EXPIRY_DAYS) {
      if (daysLeft <= threshold && !log.sentDays.includes(threshold)) {
        recordExpiryReminder(user.id, threshold)
      }
    }
  }
}

// ── Cloudflare Stream video library ───────────────────────────────────────
/**
 * Each CF video record stored locally:
 * {
 *   uid: string,             // Cloudflare Stream UID
 *   name: string,            // display name
 *   status: string,          // 'ready' | 'queued' | 'inprogress' | 'error'
 *   duration: number,        // seconds (from CF API)
 *   customerSubdomain: string, // e.g. "customer-abc123" (extracted from HLS URL)
 *   preview: string,         // thumbnail URL
 *   size: number,            // bytes
 *   uploadedAt: string,      // ISO timestamp
 * }
 */
export function getCFVideos() {
  return JSON.parse(localStorage.getItem(CF_VIDEOS_KEY) || '[]')
}

export function saveCFVideo(video) {
  const all = getCFVideos()
  const idx = all.findIndex(v => v.uid === video.uid)
  if (idx >= 0) all[idx] = { ...all[idx], ...video }
  else all.push(video)
  localStorage.setItem(CF_VIDEOS_KEY, JSON.stringify(all))
}

export function deleteCFVideoLocal(uid) {
  localStorage.setItem(CF_VIDEOS_KEY, JSON.stringify(
    getCFVideos().filter(v => v.uid !== uid)
  ))
  // Remove all assignments pointing to this uid
  const a = getVideoAssignments()
  Object.keys(a).forEach(k => { if (a[k] === uid) delete a[k] })
  localStorage.setItem(VIDEO_ASSIGN_KEY, JSON.stringify(a))
}

// ── Video → lesson/trial assignments ──────────────────────────────────────
// Key is lessonId (number as string) or the special string "trial"

export function getVideoAssignments() {
  return JSON.parse(localStorage.getItem(VIDEO_ASSIGN_KEY) || '{}')
}

/** Returns the Cloudflare video UID assigned to this lesson, or null. */
export function getVideoForLesson(lessonId) {
  return getVideoAssignments()[String(lessonId)] || null
}

export function assignVideoToLesson(lessonId, videoUid) {
  const a = getVideoAssignments()
  if (videoUid) a[String(lessonId)] = videoUid
  else delete a[String(lessonId)]
  localStorage.setItem(VIDEO_ASSIGN_KEY, JSON.stringify(a))
}

/** The special 'trial' slot for the 3-hour trial video. */
export function getTrialVideoUid() {
  return getVideoAssignments()['trial'] || null
}

export function setTrialVideoUid(videoUid) {
  assignVideoToLesson('trial', videoUid)
}

// ── System Settings (admin-editable) ─────────────────────────────────────────
export const SYSTEM_SETTINGS_KEY = 'mp_system_settings'
export const DEFAULT_SYSTEM_SETTINGS = {
  siteName:      '頂級流量',
  siteSubtitle:  '專屬學員系統',
  fbPixelId:     '',           // Facebook Pixel ID
  logoUrl:       '',           // base64 or URL; empty = use TT SVG mark
  bgImages: {
    trial:    '',              // 體驗課 hero background image URL
    standard: '',              // 頂流達人 hero background image URL
    advanced: '',              // 頂流私塾 hero background image URL
    managed:  '',              // 頂流代操 hero background image URL
  },
}
export function getSystemSettings() {
  return { ...DEFAULT_SYSTEM_SETTINGS, ...JSON.parse(localStorage.getItem(SYSTEM_SETTINGS_KEY) || '{}') }
}
export function saveSystemSettings(s) {
  localStorage.setItem(SYSTEM_SETTINGS_KEY, JSON.stringify(s))
  window.dispatchEvent(new Event('settingsChanged'))
}

// ── Sales Page Blocks ─────────────────────────────────────────────────────────
export const SALES_BLOCKS_KEY = 'mp_sales_blocks'
export const DEFAULT_SALES_BLOCKS = [
  {
    id: 'hero', type: 'hero', visible: true,
    title: '頂級流量，沒有套路',
    subtitle: '從體驗課開始，學真正能爆的自媒體方法論',
    buttonText: '立即預約體驗課 $980', buttonLink: '#schedule',
    imageUrl: '',
  },
  {
    id: 'pain', type: 'pain-points', visible: true,
    title: '你是不是也有這些困擾？',
    points: [
      '學了很多，還是不知道怎麼開始',
      '拍了影片，沒有流量沒有人看',
      '想做自媒體，但不知道方向在哪',
    ],
  },
  {
    id: 'trial-intro', type: 'trial-intro', visible: true,
    title: '三小時體驗課，改變你對自媒體的認知',
    content: '自選時段、看完才開始計時。體驗後可再評估是否升級頂流達人。',
    imageUrl: '',
  },
  {
    id: 'pricing', type: 'plan-comparison', visible: true,
    title: '方案比較',
  },
  {
    id: 'schedule', type: 'schedule', visible: true, fixed: true,
    title: '選擇你的體驗時段',
  },
  {
    id: 'faq', type: 'faq', visible: true,
    title: '常見問題',
    faqs: [
      { q: '體驗課可以重複看嗎？', a: '不行，體驗課只能完整觀看一次，看完後才會開始計算三個月使用期限。' },
      { q: '期限什麼時候開始算？', a: '體驗課完整看完後，三個月使用期限才正式開始，不是從購買當下。' },
      { q: '看到一半可以暫停嗎？', a: '可以關閉並保留進度，下次從斷點繼續。但播放中無法暫停或快轉。' },
      { q: '看完之後可以升級嗎？', a: '可以。體驗完成後，可以再評估是否升級頂流達人，正式升級流程會在後續開放。' },
    ],
  },
]
export function getSalesBlocks() {
  const saved = localStorage.getItem(SALES_BLOCKS_KEY)
  return saved ? JSON.parse(saved) : DEFAULT_SALES_BLOCKS
}
export function saveSalesBlocks(blocks) { localStorage.setItem(SALES_BLOCKS_KEY, JSON.stringify(blocks)) }
