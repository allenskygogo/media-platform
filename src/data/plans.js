export const plans = [
  {
    id: 'trial',
    name: '體驗課',
    level: 1,
    positioning: '線上三個月體驗課',
    coreValue: '先體驗 AI 選題，掌握內容起步方法',
    bestFor: '剛開始進行內容測試',
    learningMode: '線上體驗',
    physicalCourse: '無',
    physicalOneOnOne: '無',
    courseAccess: '體驗課內容',
    aiTools: '爆款選題 AI 3 個月',
    accountPositioning: '基礎內容方向認識',
    topicAbility: '透過 AI 產出初步選題',
    scriptAbility: '無完整腳本訓練',
    filmingAbility: '無實體拍攝訓練',
    dataAbility: '基礎數據概念',
    personalIP: '基礎個人定位概念',
    privateTrafficSales: '無',
    communitySupport: '無',
    practiceOpportunity: '無',
    serviceDepth: '工具體驗',
    coreOutcome: '理解自身產業的內容切入角度',
  },
  {
    id: 'creator',
    name: '頂流達人',
    level: 2,
    positioning: '自媒體獲客系統課',
    coreValue: '系統建立自媒體獲客方法',
    bestFor: '準備系統建立自媒體獲客能力',
    learningMode: '線上一對多系統學習',
    physicalCourse: '兩天一夜實體課',
    physicalOneOnOne: '無',
    courseAccess: '頂流達人系統課程',
    aiTools: '爆款選題 AI、爆款文案 AI、社群貼文 AI',
    accountPositioning: '系統建立帳號定位方法',
    topicAbility: '建立選題判斷與設計能力',
    scriptAbility: '建立腳本架構與內容表達能力',
    filmingAbility: '兩天一夜實體課學習拍攝與口播',
    dataAbility: '建立影片表現判斷能力',
    personalIP: '建立個人 IP 定位',
    privateTrafficSales: '課程學習概念',
    communitySupport: '課程學習社群',
    practiceOpportunity: '課程練習',
    serviceDepth: '系統學習',
    coreOutcome: '系統掌握自媒體獲客方法與內容設計流程',
  },
  {
    id: 'master',
    name: '頂流私塾',
    level: 3,
    positioning: '高階一對一實戰陪跑',
    coreValue: '專屬一對一策略陪跑，協助帳號方向、內容主軸與拍攝執行優化',
    bestFor: '需要策略陪跑與執行品質優化',
    learningMode: '線上一對一陪跑',
    physicalCourse: '三天兩夜實體課程',
    physicalOneOnOne: '每月可預約實體一對一手把手代練拍攝',
    courseAccess: '全部課程開放',
    aiTools: '高階 AI 工具全開，享第一更新使用權',
    accountPositioning: '一對一協助修正帳號方向',
    topicAbility: '一對一協助優化選題，提升內容命中率',
    scriptAbility: '一對一協助修改腳本、開場、觀點與 CTA',
    filmingAbility: '每月實體一對一手把手代練拍攝',
    dataAbility: '每月成果覆盤，規劃下一步調整方向',
    personalIP: '一對一優化人設、記憶點與內容主軸',
    privateTrafficSales: '一對一協助設計導流誘因、私訊話術與成交流程',
    communitySupport: '高階陪跑專屬群',
    practiceOpportunity: '開放接案機會',
    serviceDepth: '一對一陪跑＋實體代練＋實戰資源',
    coreOutcome: '透過策略陪跑、內容修正與拍攝訓練，累積可複製的實戰經驗',
  },
  {
    id: 'managed',
    name: '頂流代操',
    level: 4,
    positioning: '帳號全權管理服務',
    coreValue: '團隊協助帳號營運、拍攝統籌、內容安排與數據更新',
    bestFor: '適合需要團隊協助帳號營運、內容交付與數據追蹤的進階需求',
    learningMode: '服務型代操',
    physicalCourse: '依服務需求安排',
    physicalOneOnOne: '依服務需求安排',
    courseAccess: '依方案開放',
    aiTools: '依服務需求使用',
    accountPositioning: '團隊協助規劃帳號方向',
    topicAbility: '團隊協助選題與內容規劃',
    scriptAbility: '團隊協助腳本與內容交付',
    filmingAbility: '拍攝統籌安排',
    dataAbility: '數據每日更新與定期回報',
    personalIP: '團隊協助建立人設與內容主軸',
    privateTrafficSales: '可依服務協助優化導流與成交',
    communitySupport: '服務溝通群',
    practiceOpportunity: '依帳號需求安排',
    serviceDepth: '帳號全權管理＋內容交付＋數據回報',
    coreOutcome: '透過團隊營運執行、內容交付與數據回報，提升帳號成長效率',
  },
]

export const PLAN_NAME_MAP = {
  trial: '體驗課',
  basic: '體驗課',
  creator: '頂流達人',
  standard: '頂流達人',
  pro: '頂流達人',
  advanced: '頂流達人',
  master: '頂流私塾',
  premium: '頂流私塾',
  private: '頂流私塾',
  managed: '頂流代操',
  agency: '頂流代操',
  'done-for-you': '頂流代操',
}

export const LEGACY_TIER_TO_PLAN_ID = {
  basic: 'trial',
  trial: 'trial',
  standard: 'creator',
  creator: 'creator',
  pro: 'creator',
  advanced: 'master',
  premium: 'master',
  master: 'master',
  private: 'master',
  managed: 'managed',
  agency: 'managed',
  'done-for-you': 'managed',
}

export const PLAN_ORDER = ['trial', 'creator', 'master', 'managed']

export function getPlanName(key) {
  return PLAN_NAME_MAP[key] || key || ''
}

export function getPlanById(id) {
  return plans.find(plan => plan.id === id) || null
}

export function getPlanByTier(tier) {
  return getPlanById(LEGACY_TIER_TO_PLAN_ID[tier] || tier)
}

export function getNextPlanByTier(tier) {
  const current = getPlanByTier(tier)
  if (!current) return null
  return plans.find(plan => plan.level === current.level + 1) || null
}

export const planComparisonRows = [
  { key: 'positioning', label: '方案定位' },
  { key: 'coreValue', label: '核心價值' },
  { key: 'bestFor', label: '適合階段' },
  { key: 'learningMode', label: '學習方式' },
  { key: 'physicalCourse', label: '實體課程' },
  { key: 'physicalOneOnOne', label: '實體一對一' },
  { key: 'courseAccess', label: '課程資源' },
  { key: 'aiTools', label: 'AI 工具' },
  { key: 'accountPositioning', label: '帳號定位' },
  { key: 'topicAbility', label: '選題能力' },
  { key: 'scriptAbility', label: '腳本能力' },
  { key: 'filmingAbility', label: '拍攝能力' },
  { key: 'dataAbility', label: '數據判斷' },
  { key: 'personalIP', label: '個人 IP' },
  { key: 'privateTrafficSales', label: '私域成交' },
  { key: 'communitySupport', label: '社群支援' },
  { key: 'practiceOpportunity', label: '實戰機會' },
  { key: 'serviceDepth', label: '服務深度' },
  { key: 'coreOutcome', label: '核心成果' },
]
