import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../context/AuthContext'
import { callAI } from '../../services/aiService'
import { supabase, hasSupabase, allowLocalFallback } from '../../lib/supabase'
import {
  TrendingUp, Search, Share2, Mic,
  BarChart2, Bookmark, Flame, Target, Bot,
  RefreshCw, BookOpen, MessageSquare, BookMarked, Video,
  Camera, Eye, Users, MessageCircle, X, Download,
  Copy, Check,
  Plus, Trash2, Music2, Image, PlayCircle, Link, ChevronRight, Send,
} from 'lucide-react'

// ══════════════════════════════════════════════════════
//  Constants
// ══════════════════════════════════════════════════════

const NAV_TOOLS = [
  { id: 'topics',     label: '爆款選題腳本', Icon: TrendingUp },
  { id: 'analysis',   label: '爆款解析', Icon: Search     },
  { id: 'social',     label: '社群貼文', Icon: Share2     },
  { id: 'livestream', label: '直播話術', Icon: Mic        },
  { id: 'benchmark',  label: '對標分析', Icon: BarChart2  },
  { id: 'material',   label: '素材靈感', Icon: Bookmark   },
  { id: 'trending',   label: '流量熱點', Icon: Flame      },
  { id: 'planning',   label: '企劃定位', Icon: Target     },
  { id: 'chat',       label: '頂流助理', Icon: Bot        },
]

const SAVED_TOPICS_FALLBACK_KEY = 'mp_saved_topics'
const PRACTICE_FALLBACK_KEY = 'mp_topic_practices'
const SCRIPT_DRAFTS_FALLBACK_KEY = 'mp_script_drafts'
const AI_PRACTICE_PASS_SCORE = 75

const STATS = [
  { num: '1,200+',  label: '創作者使用'   },
  { num: '50,000+', label: '爆款選題生成' },
  { num: '2.3 萬',  label: '平均選題觀看' },
]

// ── Element tag colours ───────────────────────────────
const ELEM_STYLE = {
  '奇葩':   { bg: 'rgba(147,51,234,0.15)',  color: '#a855f7', border: 'rgba(147,51,234,0.35)' },
  '人群':   { bg: 'rgba(59,130,246,0.15)',  color: '#60a5fa', border: 'rgba(59,130,246,0.35)' },
  '懷舊':   { bg: 'rgba(249,115,22,0.15)',  color: '#fb923c', border: 'rgba(249,115,22,0.35)' },
  '最差':   { bg: 'rgba(239,68,68,0.15)',   color: '#f87171', border: 'rgba(239,68,68,0.35)'  },
  '頭牌':   { bg: 'rgba(245,158,11,0.15)',  color: '#fbbf24', border: 'rgba(245,158,11,0.35)' },
  '荷爾蒙': { bg: 'rgba(236,72,153,0.15)',  color: '#f472b6', border: 'rgba(236,72,153,0.35)' },
  '反差':   { bg: 'rgba(6,182,212,0.15)',   color: '#22d3ee', border: 'rgba(6,182,212,0.35)'  },
  '成本':   { bg: 'rgba(34,197,94,0.15)',   color: '#4ade80', border: 'rgba(34,197,94,0.35)'  },
}

// ── Traffic level colours ─────────────────────────────
const TRAFFIC_STYLE = {
  high:   { label: '高流量', bg: 'rgba(34,197,94,0.12)',   color: '#4ade80', border: 'rgba(34,197,94,0.3)'   },
  medium: { label: '中流量', bg: 'rgba(249,115,22,0.12)',  color: '#fb923c', border: 'rgba(249,115,22,0.3)'  },
  low:    { label: '低流量', bg: 'rgba(107,114,128,0.12)', color: '#9ca3af', border: 'rgba(107,114,128,0.3)' },
}

// ── Mock topic sets ───────────────────────────────────
const TOPIC_SETS = [
  [
    { element: '奇葩',   traffic: 'high',   tpl: '外行人絕對不知道的{ind}黑心操作'         },
    { element: '人群',   traffic: 'high',   tpl: '內向者做{ind}最大的優勢是什麼'           },
    { element: '懷舊',   traffic: 'medium', tpl: '沒有 AI 的年代，他們靠什麼做{ind}'       },
    { element: '最差',   traffic: 'medium', tpl: '評價最差的{ind}服務，到底差在哪'         },
    { element: '頭牌',   traffic: 'high',   tpl: '世界上最頂尖的{ind}達人，日常是什麼'     },
    { element: '荷爾蒙', traffic: 'medium', tpl: '做{ind}的人，異性緣為什麼特別好'         },
    { element: '反差',   traffic: 'low',    tpl: '窮人和富人做{ind}的差別'                 },
    { element: '成本',   traffic: 'low',    tpl: '花十分之一的錢，做到{ind}最好的效果'     },
  ],
  [
    { element: '奇葩',   traffic: 'high',   tpl: '做了{ind}才知道，原來這件事這麼荒謬'     },
    { element: '人群',   traffic: 'high',   tpl: '35 歲之後才開始學{ind}，結果怎樣了'      },
    { element: '懷舊',   traffic: 'medium', tpl: '以前的人沒有{ind}，他們是怎麼辦到的'     },
    { element: '最差',   traffic: 'medium', tpl: '我試了市面上最爛的{ind}，這是我的評價'   },
    { element: '頭牌',   traffic: 'high',   tpl: '台灣最頂尖的{ind}達人，一天怎麼過'       },
    { element: '荷爾蒙', traffic: 'medium', tpl: '因為{ind}認識了人生伴侶？真實故事'       },
    { element: '反差',   traffic: 'low',    tpl: '月薪 3 萬跟 30 萬，做{ind}的態度差在哪' },
    { element: '成本',   traffic: 'low',    tpl: '零成本開始{ind}，90 天後的真實結果'      },
  ],
]

const PROCESS_TOPIC_SETS = [
  [
    { element: '過程展示', traffic: 'high',   tpl: '紀錄我做一個{ind}專案的完整過程' },
    { element: '測評產品', traffic: 'high',   tpl: '對比五款{ind}工具，哪一款最適合新手' },
    { element: '任務挑戰', traffic: 'high',   tpl: '挑戰一天完成一個可落地的{ind}成果' },
    { element: '事件體驗', traffic: 'medium', tpl: '當一天{ind}新手，體驗從零學起的真實感受' },
    { element: '過程展示', traffic: 'medium', tpl: '公開我幫客戶規劃{ind}方案的全流程' },
    { element: '測評產品', traffic: 'medium', tpl: '實測三種{ind}方法，哪一種最快看到效果' },
    { element: '任務挑戰', traffic: 'medium', tpl: '限時三小時完成一份{ind}交付，結果會怎樣' },
    { element: '事件體驗', traffic: 'medium', tpl: '第一次跟著學員視角做{ind}，我發現最卡的是這裡' },
  ],
  [
    { element: '過程展示', traffic: 'high',   tpl: '帶你看我從接需求到交付{ind}的每一步' },
    { element: '測評產品', traffic: 'high',   tpl: '便宜和高價{ind}設備實測，差別真的有那麼大嗎' },
    { element: '任務挑戰', traffic: 'high',   tpl: '挑戰用最低成本做出一套{ind}成果' },
    { element: '事件體驗', traffic: 'medium', tpl: '我去體驗一堂{ind}課，看看新手到底會卡在哪' },
    { element: '過程展示', traffic: 'medium', tpl: '一支{ind}作品從想法到完成，我實際怎麼做' },
    { element: '測評產品', traffic: 'medium', tpl: '我把熱門{ind}工具全部試一遍，最推薦的是這個' },
    { element: '任務挑戰', traffic: 'medium', tpl: '挑戰一天幫企業完成三套可執行的{ind}方案' },
    { element: '事件體驗', traffic: 'medium', tpl: '角色互換：我當學員重新學一次{ind}，才知道哪裡最難' },
  ],
]

function buildTopics(industry, round) {
  const set = TOPIC_SETS[round % TOPIC_SETS.length]
  return set.map(t => ({
    element: t.element,
    text:    t.tpl.replace(/{ind}/g, industry),
    traffic: t.traffic,
  }))
}

function normalizeTopicResults(result, industry, round) {
  const fallback = buildTopics(industry, round)
  if (!Array.isArray(result)) return fallback

  return fallback.map((item, index) => {
    const source = result[index]
    if (typeof source === 'string') {
      const match = source.match(/^【(.+?)】(.+)$/)
      return {
        ...item,
        element: match?.[1] || item.element,
        text: (match?.[2] || source).trim(),
      }
    }

    if (source && typeof source === 'object') {
      return {
        element: source.element || item.element,
        text: source.text || source.title || item.text,
        traffic: source.traffic || item.traffic,
      }
    }

    return item
  })
}

// ── Script type & shoot format options ───────────────
const SCRIPT_TYPES = [
  { id: 'knowledge', label: '教知識', Icon: BookOpen      },
  { id: 'opinion',   label: '說觀點', Icon: MessageSquare },
  { id: 'story',     label: '說故事', Icon: BookMarked    },
  { id: 'process',   label: '曬過程', Icon: Video         },
]

const PUBLIC_AI_TOOL_IDS = new Set(['topics'])
const PUBLIC_SCRIPT_TYPE_IDS = new Set(['knowledge', 'opinion'])
const FULL_AI_TEST_EMAILS = new Set(['test-ai-pay@xgfx-tw.com'])

function hasFullAITestAccess(user) {
  return FULL_AI_TEST_EMAILS.has(String(user?.email || '').trim().toLowerCase())
}

function canUseAITool(id, user) {
  return PUBLIC_AI_TOOL_IDS.has(id) || hasFullAITestAccess(user)
}

function canUseScriptType(id, user) {
  return PUBLIC_SCRIPT_TYPE_IDS.has(id) || hasFullAITestAccess(user)
}

function ComingSoonLabel() {
  return (
    <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--gray-500)', flexShrink: 0 }}>
      即將開放
    </span>
  )
}

const KNOWLEDGE_SCRIPT_SOP = {
  title: '教知識腳本 SOP',
  topicDimensions: ['追求更好', '解決難題', '避免踩坑', '降低成本', '豐富談資'],
  scriptTypes: ['推薦型', '解題型'],
  scriptFramework: ['場景難題＋腳本類型', '低行動成本解決方案', '具體操作過程'],
  selfCheck: ['信息多', '效果快', '料夠猛'],
  commonMistakes: ['專業用詞', '排列不好', '對象模糊', '等待過久'],
  qualityRules: [
    '信息多：每段至少給 2-3 個具體資訊點，例如清單、數字、判斷標準、對比或案例。',
    '效果快：解法必須是觀眾今天就能做的小動作，不可以只給長期心法。',
    '料夠猛：至少加入一個反常識、痛點命中、踩坑提醒、真實場景或具體案例。',
    '禁止中規中矩的泛泛論點，例如「設定目標、善用工具、提升效率」這種沒有新鮮感的句子。',
  ],
}

const KNOWLEDGE_PRACTICE_FIELDS = [
  {
    key: 'scene',
    label: '場景難題',
    placeholder: '寫出觀眾正在遇到的具體場景與難題，並說明你會用推薦型或解題型切入...',
  },
  {
    key: 'solution',
    label: '低行動成本解決方案',
    placeholder: '寫出觀眾看完可以立刻做的小方法，不要讓解法太難、太貴或太抽象...',
  },
  {
    key: 'process',
    label: '具體操作過程',
    placeholder: '用步驟或流程寫清楚怎麼做，讓觀眾照著做就能開始...',
  },
]

const OPINION_SCRIPT_SOP = {
  title: '說觀點腳本 SOP',
  scriptFramework: ['開篇', '歸納論據或正反論證', '總結觀點', '金句'],
  argumentMethods: [
    '權衡利弊：做了 A 可能失去 B，做了 B 可能失去 A，強調選擇取捨。',
    '無奈之舉：不是不想做正確的事，而是現實條件不允許。',
    '顛覆認知：推翻大家原本以為正確的觀念。',
    '不同視角：用另一個身份、角色或時間點重新解釋同一件事。',
    '人身攻擊：直接批判某一類人，讓目標受眾覺得被替自己出氣；高風險，只在適合人設時使用。',
    '倒打一耙：把責任反推回去，用強情緒表達替受眾說出不敢說的話。',
    '維度升級：從現在、過去、未來、成本、風險、結構、系統、後果拉高層次分析。',
  ],
  selfCheck: ['開篇是否否定句', '論據段是否標明每段文法', '是否至少兩段論據', '是否夠白話好懂', '是否站在受眾那邊', '金句是否可轉發'],
  qualityRules: [
    '開篇：一定要用否定句或反問句開場，直接把原選題改成有立場的觀點。例如「公寓與住宅的購買解析」要改成「千萬不要買公寓」；「結婚之後過年一定要去男方家過年嗎？」要改成「憑什麼結婚之後過年必須回公婆家」。',
    '歸納論據或正反論證：論據要合在同一格，不要拆成論據1、論據2兩個欄位。',
    '歸納論據或正反論證：可用技法包含權衡利弊、無奈之舉、顛覆認知、不同視角、人身攻擊、倒打一耙、維度升級，不限於三種。',
    '歸納論證：使用三段論據，每段從七種技法中選一種，並標明「論據1（技法）」「論據2（技法）」「論據3（技法）」。',
    '正反論證：使用反面案例與正面案例，反面先寫錯誤做法造成什麼後果，正面再寫正確做法帶來什麼結果。',
    '歸納論據或正反論證：至少要有兩段論據；若選歸納論證，必須三段論據；若選正反論證，必須反面案例與正面案例各一段。',
    '歸納論據或正反論證：每一個文法都要寫成一整段，不可以只有一句話。每段至少 3 到 5 句，要像短影音口播稿。',
    '歸納論據或正反論證：每段都要放生活場景、白話比喻或觀眾日常會遇到的狀況，不能只講抽象道理。',
    '總結觀點：回扣開篇立場，說明我不是否定全部，而是提醒受眾真正該看清楚的代價或處境。',
    '金句：最後用一句可被記住、可轉發、情緒明確的金句收束。',
    '語氣：把使用者當成完全不懂的新手，句子要短、要白話、要像人在講話，不要學術、不要繞、不要難懂。每一句都要讓國中生也看得懂。',
    '觀點不是教育粉絲，也不是罵觀眾；觀點是「我理解你，所以我幫你說出來」。',
    '好的觀點要讓特定受眾感覺：你站在我這邊、你把我不敢講的話講出來了、你替我出了一口氣、我想支持你、我想轉發給某個人看。',
  ],
}

const OPINION_SCRIPT_GENERATION_INSTRUCTION = [
  '請把已上傳的知識庫 PDF 當成產生腳本的主要依據，不只是練習判斷用。若知識庫有說觀點案例、句式、框架與技法定義，必須優先依照知識庫。',
  '語氣要非常白話，像講給完全不懂的新手聽。句子要短，意思要直，不要學術，不要難懂，國中生也要看得懂。',
  '輸出順序必須只有四段：開篇、歸納論據或正反論證、總結觀點、金句。',
  '開篇一定要用否定句或反問句，將原選題改成有立場的觀點。例如「公寓與住宅的購買解析」改成「千萬不要買公寓」；「結婚之後過年一定要去男方家過年嗎？」改成「憑什麼結婚之後過年必須回公婆家」。',
  '論據全部寫在「歸納論據或正反論證」同一段裡，不要拆成兩個欄位。',
  '可用觀點型論據技法包含：權衡利弊、無奈之舉、顛覆認知、不同視角、人身攻擊、倒打一耙、維度升級。不要只固定使用不同視角、權衡利弊、倒打一耙。',
  '如果選「歸納論證」，必須寫三段論據，每段從七種技法中選一種，標明「論據1（技法）」「論據2（技法）」「論據3（技法）」。',
  '如果選「正反論證」，必須寫反面案例與正面案例。通常先反後正：反面案例寫錯誤做法造成什麼後果，正面案例寫正確做法帶來什麼結果。',
  '每一個技法都要寫成一整段，不可以只有一句話；每段至少 3 到 5 句，要有生活場景、白話比喻或觀眾日常會遇到的情境。',
  '觀點不是教育粉絲，也不是罵觀眾；觀點是分享我覺得這件事對或錯，並站在我的受眾那一邊。',
  '內容要讓特定受眾感覺：你站在我這邊、你把我不敢講的話講出來了、你替我出了一口氣、我想支持你、我想轉發給某個人看。',
  '禁止輸出只有提綱式的一句論據，禁止輸出論據1/論據2作為獨立段落，也不要輸出通用的反常識立場/錯誤認知/核心觀點/例子對比/行動收束框架。',
].join(' ')

const OPINION_PRACTICE_FIELDS = [
  {
    key: 'opening',
    label: '開篇',
    placeholder: '用否定句或反問句開場，直接把選題改成有立場的觀點，例如：千萬不要去當護士...',
  },
  {
    key: 'argument',
    label: '歸納論據或正反論證',
    placeholder: '把論據寫在同一格。每個文法都要是一整段，不要只寫一句。例如：論據1（不同視角）寫 3-5 句，論據2（權衡利弊）再寫 3-5 句。要生活化、白話、像講給新手聽...',
  },
  {
    key: 'summary',
    label: '總結觀點',
    placeholder: '回扣你的開篇立場，說清楚你不是全盤否定，而是提醒受眾真正該看懂的代價或處境...',
  },
  {
    key: 'punchline',
    label: '金句',
    placeholder: '用一句有態度、能被轉發的金句收束，讓對的人看完覺得爽...',
  },
]

const STORY_SCRIPT_SOP = {
  title: '說故事腳本 SOP',
  purpose: '故事的目的是交友破冰，用經歷換人心，拉近博主與粉絲之間的距離，建立信任。',
  storyTypes: [
    '小有成就：展示自己比過去更好的經歷，重點是昨天的你 vs 今天的你。',
    '成功案例：展示你如何幫助別人達成成果，必須同時有「你幫他的部分」與「他努力的部分」。',
    '平凡英雄：用你的價值觀和方法解決他人的困境，展示人品與正向價值觀。',
  ],
  scriptFramework: ['故事類型', '成就或衝突事件', '困境與轉機', '感悟與收束'],
  difficultyBeats: ['盲目自信', '家門不幸', '天災人禍', '惡霸欺壓', '過河拆橋', '至親背叛', '強權干涉'],
  turningBeats: ['通關密碼', '至親所託', '天賦異稟', '意外之喜', '因禍得福', '貴人相助', '破釜沈舟'],
  heroActions: ['敢做敢當', '即時回懟', '即時面對', '堅守原則', '隨手幫助', '照護弱勢'],
  qualityRules: [
    '說故事選題一定要圍繞自己達成的成就、你幫別人達成的成就，或你用價值觀解決的衝突事件。',
    '小有成就和成功案例都要先有明確成果，再補上阻礙；如果沒有阻礙，故事就不夠好看。',
    '開篇直接進入主題，不要先花大量文字介紹背景。',
    '小有成就要有已達成的成就、過程中的困境、過程中的轉機、目標帶來的感悟。',
    '成功案例要有別人的成就、對方遇到的困境、你如何介入幫助、對方自己的努力、合作感悟。',
    '平凡英雄要有衝突事件、英雄時刻、對事情的正向總結。',
    '困境與轉機最好寫兩輪，固定格式必須是「困難：橋段名」換行寫內容，再接「轉機：橋段名」換行寫內容，重複兩次。第二個困難要比第一個更難，第二個轉機要比第一個更有力。',
    '困境與轉機要層層遞進：第一輪困境比第二輪輕，第二輪轉機比第一輪更有力。',
    '困境與轉機不是寫意思、分析或總結，而是寫出故事事件。每一輪都要像編劇寫劇情：有時間點、地點、人物、事件、對話、代價、結果。',
    '困境橋段名稱只是內部判斷，不是正文。正文不能寫「這是盲目自信的困境」，而要用一整段事件讓觀眾看出盲目自信：例如公司報表虧錢、看到短視頻崛起、覺得自己有十年導演背書所以很簡單、接案後播放量只有幾百、客戶追著退款、最後借錢補洞。',
    '困境與轉機段禁止使用「第一輪困難是」「第一輪轉機是」「這是典型的」「最終他成功」這種說明句。必須改成「那天中午...」「沒想到隔天...」「客戶打電話來說...」「我坐在辦公室...」這種事件敘事。',
    '要用畫面詞代替感受詞。不要只說我很難過、我很高興、我很辛苦，要寫具體動作、場景與細節。',
    '平凡英雄不能用抱怨結尾，最後必須正向呼籲或苦中作樂。',
    '故事不能一帆風順；沒有困境起伏，就沒有讓觀眾看下去的理由。',
  ],
}

const STORY_SCRIPT_GENERATION_INSTRUCTION = [
  '請把已上傳的知識庫 PDF 當成產生說故事腳本的主要依據。若知識庫有故事腳本案例、橋段、句式或框架，必須優先依照知識庫。',
  '說故事不是主流爆款論點，而是信任建立。故事的目的，是交友破冰，用經歷換人心，拉近博主與粉絲距離。',
  '說故事選題一定要圍繞三種素材：自己達成的成就、你幫別人達成的成就、你用價值觀解決的衝突事件。不要寫成知識解析、觀點評論、技巧清單或泛泛經驗談。',
  '你必須先判斷最適合的故事類型：小有成就、成功案例、平凡英雄。',
  '小有成就：成就不是和別人比，而是昨天的你 vs 今天的你。結構是已達成的成就、過程中的困境、過程中的轉機、目標帶來的感悟。',
  '成功案例：你幫助別人達成某個成就。必須同時有你幫他的部分，也要有他自己努力的部分。結構是別人的成就、過程中的困境、過程中的轉機、目標帶來的感悟。',
  '平凡英雄：用自己的價值觀和方法解決他人的困境。結構是衝突事件、體現英雄時刻、對事情的總結。',
  '可用困境橋段：盲目自信、家門不幸、天災人禍、惡霸欺壓、過河拆橋、至親背叛、強權干涉。',
  '可用轉機橋段：通關密碼、至親所託、天賦異稟、意外之喜、因禍得福、貴人相助、破釜沈舟。',
  '家門不幸不是單純家裡有事，而是主角目前的家境、現有環境、身邊人事物或資源條件都不好：例如家裡缺錢、環境不支持、設備不足、身邊人唱衰、原本的人脈或條件都不站在主角這邊。',
  '困境橋段與轉機橋段都是可穿插使用的故事文法，請依故事邏輯選最適合的組合，不要固定只用同一組。',
  '每次生成說故事腳本時，困難與轉機橋段必須從上方清單中隨機或輪替變換。除非題目明確需要，禁止每次固定使用「盲目自信、通關密碼、過河拆橋、貴人相助」這組範例橋段。',
  '至親所託的意思是親人對主角的寄望、託付或希望，例如父母、伴侶、孩子、長輩把某個期待交到主角身上；如果是朋友、同事、客戶、老師或外人幫助主角，那是貴人相助，不是至親所託。',
  '整個【困境與轉機】都必須有爽劇感，不是只有結尾。每個困難都要有壓迫、羞辱、被看不起、資源被搶、代價升高或局勢變糟；每個轉機都要有反擊、翻身、打臉、局勢反轉或讓人覺得解氣的畫面。',
  '最後一個轉機必須寫得最多、最爽、最解氣，是整段高潮。可以讓前面欺壓、看不起、打壓主角的人，最後回頭來投靠、拜託、求合作、認錯或被現實打臉。說故事要把經典橋段寫成爽劇，不只是平淡解決問題。',
  '參考案例一：年輕村長故事的節奏是「意外之喜：年輕人意外站上權力位置」→「家門不幸：村子破敗、負債、資源荒涼」→「至親所託：看見父親驕傲或親人期待，重新接住使命」→「破釜沈舟：從最基礎建設開始硬幹」→「通關密碼：找到牆繪或新的引流方法」→「貴人相助：媒體、領導或外部資源進來，村子翻身」。',
  '參考案例二：地攤翻身故事的節奏是「盲目自信：選錯位置、欠債壓貨」→「意外之喜：發現地鐵口人流」→「通關密碼：找到布藝本子這個爆品」→「惡霸欺壓：同行眼紅搶貨、趕人」→「貴人相助：大客戶大量下單」→「爽劇高潮：靠訂單翻身，買房、打臉過去看不起的人」。最後的爽劇高潮可以寫在最後一個轉機內容裡，但不要把「最終崛起」當成橋段標籤。',
  '平凡英雄的解決方式可用：敢做敢當、即時回懟、即時面對、堅守原則、隨手幫助、照護弱勢。',
  '輸出順序必須只有四段：故事類型、成就或衝突事件、困境與轉機、感悟與收束。',
  '成就或衝突事件段落第一句要像短影音開場，例如「沒想到我一個___，靠___做到___，只不過___」、「我幫一個___，從___做到___，中間差點卡在___」、「那天我遇到___，我沒有選擇___，而是___」。',
  '開篇要直接進入主題，不要先介紹出身、入行經歷、家庭背景。第一句就說成就、案例成果或衝突事件。',
  '困境與轉機要有情緒曲線。不要一帆風順。【困境與轉機】這一段的 body 必須只用以下格式，不可改格式：困難：橋段名\\n內容...\\n\\n轉機：橋段名\\n內容...\\n\\n困難：橋段名\\n內容...\\n\\n轉機：橋段名\\n內容...。第一輪困境要比第二輪輕，第二輪轉機要比第一輪更有力。',
  '每個困境與轉機都要有畫面、人物、事件、代價或結果；不要只寫「我遇到困難，後來找到方法」。',
  '每個「困難：」與「轉機：」下面都必須寫成完整故事事件，不是框架說明。每一小段至少 4 到 7 句，要有具體時間、場景、人物動作、對話或訊息、金錢或結果代價。',
  '橋段名稱只是內部方向，不是正文內容。不要把「盲目自信、過河拆橋、貴人相助」寫成一句成語解釋，也不要順接成語；要把它翻成一整段事件。例如盲目自信不是寫「我太自信所以失敗」，而是寫：公司虧錢、宣傳片案子變少、新聞看到短視頻崛起、我以為十年導演背景做短視頻很簡單、接了客戶後播放量只有幾百、客戶打電話要退款、帳上沒錢只好借錢補洞。整段事件讓人自然感覺出「盲目自信」。',
  '禁止在困境與轉機段寫「第一輪困難是客戶因為...」「第一輪轉機是我...」「第二輪困難是...」這種摘要。要直接進入事件，例如「那天中午我正在吃飯，手機突然跳出客戶訊息...」「隔天早上他站在診間門口，手上拿著檢查報告...」。',
  '故事要像編劇寫出一場戲，不要像顧問寫重點整理。困境要讓觀眾看見事情怎麼壞掉；轉機要讓觀眾看見事情怎麼被扭回來。',
  '要用畫面詞代替感受詞。不要寫「我很難過、我很高興、我很辛苦」，要寫「那天晚上我盯著天花板到天亮」「我們輪流趴在桌上睡」這種畫面。',
  '語氣要白話、生活化、像真人口播，不要像作文、報告或雞湯。',
  '禁止抱怨式結尾。平凡英雄最後一定要正向呼籲或苦中作樂。',
].join(' ')

const STORY_PRACTICE_FIELDS = [
  {
    key: 'type',
    label: '故事類型',
    placeholder: '寫出你這支故事屬於小有成就、成功案例或平凡英雄，並簡短說明為什麼...',
  },
  {
    key: 'event',
    label: '成就或衝突事件',
    placeholder: '第一句直接進入主題：你達成了什麼、幫別人達成什麼，或遇到什麼不公平的事。最好寫出成果＋阻礙...',
  },
  {
    key: 'turning',
    label: '困境與轉機',
    placeholder: '用困難1／轉機1／困難2／轉機2寫出起伏。標明橋段，例如盲目自信、過河拆橋、意外之喜、貴人相助...',
  },
  {
    key: 'reflection',
    label: '感悟與收束',
    placeholder: '寫出這段經歷帶來的感悟。平凡英雄要正向收束，不要只抱怨...',
  },
]

const PROCESS_SCRIPT_SOP = {
  title: '曬過程腳本 SOP',
  processDirections: [
    '過程展示：把進貨、諮詢、服務、售後、接需求到交付拍成一條可看的節目線。',
    '測評產品：把產品、工具、設備、方法拿來對比、極限測試、驗證真偽。',
    '任務挑戰：設定時間、成本、地點、身份或成果限制，讓觀眾想知道能不能完成。',
    '事件體驗：用新奇體驗、奇葩規則、角色互換或當一天某身份，讓觀眾代入。',
  ],
  hookBeats: [
    '送溫暖：送禮物、資源、服務，或大量買下弱勢群體、學員、客戶、陌生人需要的東西。',
    '金錢：花大錢、花小錢辦大事、免費、賺錢、省錢、成本挑戰。',
    '驗證/解密：解秘真假、挑戰權威、揭秘隱私、創根問底、驗證身份或是否成功。',
    '賀爾蒙：黑絲、長髮、肌肉、明星臉、搭訕、變裝、跳舞、誘惑、大尺度；只用在合適題材，不要低俗。',
    '盲盒：抽到什麼穿什麼、吃什麼、做什麼、用什麼、幹什麼，或抽到驚喜禮物。',
    '對抗：下賭注、吵架、被阻止、發生意外、故意整人，製造衝突和懸念。',
  ],
  scriptFramework: ['節目企劃', '過程橋段', '反轉/看點', '結果收束'],
  qualityRules: [
    '曬過程不是流水帳，每一個橋段都必須先有一個鉤子企劃，像節目設計一樣讓過程好看。',
    '每支腳本至少使用 3 個鉤子，並在段落中標明「鉤子：送溫暖 / 金錢 / 驗證/解密 / 賀爾蒙 / 盲盒 / 對抗」。',
    '每個橋段都要寫出觀眾為什麼想繼續看：好奇結果、擔心失敗、想看反應、想看對比、想看翻車或想看解氣。',
    '過程必須有任務、規則、限制、意外、對比或結果，不可以只寫準備、執行、完成。',
    '輸出要像短影音節目企劃腳本，包含畫面、人物、動作、衝突、結果，不要像工作紀錄。',
  ],
}

const PROCESS_SCRIPT_GENERATION_INSTRUCTION = [
  '請把已上傳的知識庫 PDF 當成產生曬過程腳本的主要依據。若知識庫有曬過程案例、鉤子、句式或框架，必須優先依照知識庫。',
  '曬過程不是流水帳，也不是普通工作紀錄。曬過程要像節目一樣設計，每一個橋段都要有鉤子企劃，讓觀眾想看下一秒。',
  '曬過程有四個腳本方向：過程展示、測評產品、任務挑戰、事件體驗。請依選題判斷最適合的方向。',
  '六大鉤子可用：送溫暖、金錢、驗證/解密、賀爾蒙、盲盒、對抗。',
  '送溫暖：給養老院、孤兒院、弱勢群體、學員、客戶或陌生人送禮物、資源、服務，或大量買下對方需要的東西。',
  '金錢：花大錢、花小錢辦大事、免費、賺錢、省錢、成本挑戰、低預算完成任務。',
  '驗證/解密：解秘真假、挑戰權威、揭秘隱私、創根問底、驗證身份、驗證方法是否成功。',
  '賀爾蒙：黑絲、長髮、肌肉、明星臉、搭訕、變裝、跳舞、誘惑、大尺度；只在題材自然適合時使用，不要低俗或硬塞。',
  '盲盒：抽到什麼穿什麼、吃什麼、做什麼、用什麼、幹什麼，或抽到驚喜禮物。',
  '對抗：下賭注、吵架、被阻止、發生意外、故意整人、有人不相信、有人唱反調。',
  '每支曬過程腳本至少使用 3 個鉤子。每個主要橋段都要標明「鉤子：XXX」，再寫這個橋段怎麼拍。',
  '輸出順序必須只有四段：節目企劃、過程橋段、反轉/看點、結果收束。',
  '第一段【節目企劃】：說明這支採用哪個曬過程方向，核心任務是什麼，規則或限制是什麼，觀眾為什麼會想看。',
  '第二段【過程橋段】：用 3 到 5 個小橋段寫出拍攝流程。每個小橋段都必須包含「橋段名」「鉤子」「畫面怎麼拍」「觀眾想看的點」。',
  '第三段【反轉/看點】：安排至少 1 個意外、對抗、測試失敗、結果出乎意料、成本爆掉、時間不夠、對方反應超出預期的段落。',
  '第四段【結果收束】：交代最後成果、數字、對比或人物反應，再收一個讓觀眾想留言、想問、想看下一集的結尾。',
  '禁止只寫「準備階段、執行過程、遇到困難、結果」這種流水帳。每段都要有節目鉤子、有畫面、有懸念。',
  '語氣要白話、像短影音口播與拍攝腳本，不要像企劃書摘要。',
].join(' ')

const PROCESS_PRACTICE_FIELDS = [
  {
    key: 'concept',
    label: '節目企劃',
    placeholder: '寫出這支曬過程的方向、任務、規則或限制，並說明觀眾為什麼想看...',
  },
  {
    key: 'beats',
    label: '過程橋段',
    placeholder: '寫 3-5 個橋段。每段都標明鉤子：送溫暖、金錢、驗證/解密、賀爾蒙、盲盒、對抗，並寫畫面怎麼拍...',
  },
  {
    key: 'twist',
    label: '反轉/看點',
    placeholder: '安排意外、對抗、翻車、時間不夠、成本爆掉、對方反應超出預期等看點...',
  },
  {
    key: 'result',
    label: '結果收束',
    placeholder: '寫最後成果、數字、人物反應或對比，最後用一句話引導留言或下一集...',
  },
]

const STRUCTURED_PRACTICE_FIELDS = {
  knowledge: KNOWLEDGE_PRACTICE_FIELDS,
  opinion: OPINION_PRACTICE_FIELDS,
  story: STORY_PRACTICE_FIELDS,
  process: PROCESS_PRACTICE_FIELDS,
}

function parseKnowledgePractice(text) {
  return KNOWLEDGE_PRACTICE_FIELDS.reduce((acc, field, index) => {
    const marker = `【${field.label}】`
    const start = text.indexOf(marker)
    if (start === -1) {
      acc[field.key] = ''
      return acc
    }

    const contentStart = start + marker.length
    const nextStarts = KNOWLEDGE_PRACTICE_FIELDS
      .slice(index + 1)
      .map(next => text.indexOf(`【${next.label}】`, contentStart))
      .filter(pos => pos !== -1)
    const end = nextStarts.length ? Math.min(...nextStarts) : text.length
    acc[field.key] = text.slice(contentStart, end).trim()
    return acc
  }, {})
}

function parseStructuredPractice(scriptType, text) {
  const fields = STRUCTURED_PRACTICE_FIELDS[scriptType]
  if (!fields) return {}

  return fields.reduce((acc, field, index) => {
    const marker = `【${field.label}】`
    const start = text.indexOf(marker)
    if (start === -1) {
      acc[field.key] = ''
      return acc
    }

    const contentStart = start + marker.length
    const nextStarts = fields
      .slice(index + 1)
      .map(next => text.indexOf(`【${next.label}】`, contentStart))
      .filter(pos => pos !== -1)
    const end = nextStarts.length ? Math.min(...nextStarts) : text.length
    acc[field.key] = text.slice(contentStart, end).trim()
    return acc
  }, {})
}

function updateKnowledgePractice(text, key, value) {
  const current = parseKnowledgePractice(text)
  current[key] = value
  return KNOWLEDGE_PRACTICE_FIELDS
    .map(field => `【${field.label}】\n${current[field.key] || ''}`)
    .join('\n\n')
}

function updateStructuredPractice(scriptType, text, key, value) {
  const fields = STRUCTURED_PRACTICE_FIELDS[scriptType]
  if (!fields) return text
  const current = parseStructuredPractice(scriptType, text)
  current[key] = value
  return fields
    .map(field => `【${field.label}】\n${current[field.key] || ''}`)
    .join('\n\n')
}

function validatePracticeSubmission(scriptType, text) {
  const structuredFields = STRUCTURED_PRACTICE_FIELDS[scriptType]
  if (structuredFields) {
    const fields = parseStructuredPractice(scriptType, text)
    const missing = structuredFields
      .filter(field => !String(fields[field.key] || '').trim())
      .map(field => field.label)

    if (missing.length > 0) {
      return {
        ok: false,
        message: `請先完成：${missing.join('、')}。每一格都需要填寫內容。`,
      }
    }

    const tooShort = structuredFields
      .filter(field => String(fields[field.key] || '').trim().length < 12)
      .map(field => field.label)

    if (tooShort.length > 0) {
      return {
        ok: false,
        message: `請補強：${tooShort.join('、')}。每一格至少寫出一段完整意思。`,
      }
    }
  }

  if (String(text || '').trim().length < 50) {
    return { ok: false, message: '練習內容至少需要 50 字。' }
  }

  return { ok: true, message: '' }
}

const SHOOT_FORMATS = [
  { id: 'selfie',    label: '自拍口播', Icon: Camera        },
  { id: 'candid',    label: '偷拍視角', Icon: Eye           },
  { id: 'interview', label: '雙人訪談', Icon: Users         },
  { id: 'chat',      label: '雙人聊天', Icon: MessageCircle },
]

// ── Upgrade modal plans ───────────────────────────────
const PLANS = [
  { id: 'trial',   name: '體驗課',   note: '爆款選題 AI 3 個月', current: true  },
  { id: 'creator', name: '頂流達人', note: '系統學會自媒體獲客方法', current: false },
  { id: 'master',  name: '頂流私塾', note: '一對一陪跑與高階 AI 工具', current: false },
  { id: 'managed', name: '頂流代操', note: '帳號全權管理服務', current: false },
]

// ── Mock script generator ─────────────────────────────
const MOCK_SCRIPTS = {
  knowledge: text => [
    {
      heading: '【場景難題】',
      body:    `系統判斷這支適合用解題型切入。\n場景不是「大家工作效率不好」這種泛泛說法，而是：觀眾遇到「${text}」這個卡點時，明明很努力，卻一直卡在錯誤順序、錯誤判斷或錯誤工具上。這一段要直接點破他忽略的盲點，讓他覺得「對，我就是這樣」。`,
    },
    {
      heading: '【低行動成本解決方案】',
      body:    `先給一個今天就能做的小解法，不要丟大方法論。\n做法：用「一張清單 + 一個判斷標準 + 一個立即修改動作」處理。觀眾不需要買工具、不需要重做全部流程，只要先抓出最拖累結果的那一個錯誤，今天就能修掉一小段。這樣才有「效果快」。`,
    },
    {
      heading: '【具體操作過程】',
      body:    `第一步：列出現在最常發生的 3 個失誤，先不要找原因。\n第二步：圈出最常重複、最浪費時間、最容易被忽略的那一個。\n第三步：把它改成一句「下次遇到 X，我就先做 Y」的操作規則。\n第四步：連續測 3 天，看結果是否變快、變清楚、變少踩坑。這段要有步驟、有判斷、有結果，不可以只講概念。`,
    },
  ],
  opinion: text => [
    {
      heading: '【開篇】',
      body:    `千萬不要只照著別人的標準去做「${text}」。你以為問題只是你不夠努力？錯了，真正消耗你的，是你一直把別人的成功路徑，硬套在自己的處境上。`,
    },
    {
      heading: '【歸納論據或正反論證】',
      body:    `論據1（不同視角）：別人叫你照著做，是因為他站在他的角度看。他可能有團隊，有預算，也有很多時間可以試錯。可是你現在可能只有一個人，下班後才有一點時間做內容。你照他的做法，不一定會變快，反而可能更累。就像別人開跑車走高速公路，你騎機車硬跟，當然會追得很痛苦。\n\n論據2（權衡利弊）：照抄的好處是不用想，感覺比較安全。你會覺得，別人都成功了，我照做應該也會成功吧。但問題是，你省下思考，最後可能付出更大的代價。你會花很多時間做不適合自己的事，還以為是自己不夠努力。真正可怕的不是你做得慢，而是你很努力，卻一路努力錯方向。`,
    },
    {
      heading: '【總結觀點】',
      body:    `所以我不是說別人的經驗沒有用，我是說，千萬不要把別人的答案當成自己的答案。你真正要學的不是照抄，而是判斷什麼適合現在的你。`,
    },
    {
      heading: '【金句】',
      body:    `流量不是靠複製別人的路走出來的；流量是你終於看懂自己該站在哪裡，才開始長出來的。`,
    },
  ],
  story: text => [
    {
      heading: '【故事類型】',
      body:    `系統判斷這支適合用「小有成就」腳本。因為這個故事不是要教觀眾一套方法，而是要讓觀眾看到：你曾經也卡住過、撐過低谷，最後靠一次關鍵轉機走出來。`,
    },
    {
      heading: '【成就或衝突事件】',
      body:    `沒想到我一開始只是想把「${text}」做好，後來竟然真的靠這件事拿到第一個像樣的成果。\n但我不是一開始就很順。最前面那段時間，我其實每天都覺得自己快撐不下去。`,
    },
    {
      heading: '【困境與轉機】',
      body:    `困難：家門不幸\n那時候我想做「${text}」，但身邊沒有一個條件是站在我這邊的。家裡收入緊，設備老舊，連安靜做事的地方都沒有，旁邊的人還一直說：「你現在這樣，先顧好生活吧。」更難受的是，我每次剛有一點想法，就會被現實打回來，不是臨時多一筆支出，就是原本答應幫忙的人突然消失。那陣子我不是輸在不努力，是輸在起跑線旁邊全是反對聲。\n\n轉機：至親所託\n真正把我拉回來的，是我媽有天把一張繳費單放到桌上，沒有罵我，只說：「我知道你想翻身，你就認真做一次給我們看。」那句話不是安慰，像是一個託付。她不是給我方法，也不是給我資源，而是把全家的期待放到我手上。那天晚上我沒有再滑手機，直接把時間表寫出來，從每天二十分鐘開始，把能做的東西一個一個交出來。\n\n困難：惡霸欺壓\n可是剛開始有點成果時，最難聽的話也跟著來了。有人笑我：「你這種條件也想做起來？」有人當面說我只是裝努力，還有人把我的內容拿去群組裡開玩笑。最刺的一次，是之前看不起我的人當著大家面說：「他這套沒用啦，有用早就紅了。」那一刻我真的很想回嘴，但我忍住了，因為我知道，如果我現在吵贏，大家只會覺得我破防；我要的是讓他們之後沒話講。\n\n轉機：破釜沈舟\n後來我乾脆把退路全切掉，固定每天公開交作業，不再偷偷做，也不再怕被笑。第一週沒人理，第二週還有人酸，到了第三個月，數據突然起來，第一個合作也找上門。最爽的是，那個曾經在群組裡笑我的人，竟然私訊問我能不能幫他看帳號，還補了一句：「你現在真的做起來了。」我看著那句話笑了一下，沒有立刻回。以前他把我當笑話，現在他要排隊問我方法；這一刻我才知道，真正解氣的不是罵回去，是你站上去之後，讓當初看不起你的人不得不低頭。`,
    },
    {
      heading: '【感悟與收束】',
      body:    `所以我後來才懂，成就不是拿來跟別人比的，是拿來證明自己真的比以前更能扛事了。\n創業也好，做內容也好，都很像解題。題目來了，你先不要急著喊難。你慢慢拆，慢慢試，答案對了，事情也就開始對了。`,
    },
  ],
  process: text => [
    {
      heading: '【節目企劃】',
      body:    `這支「${text}」不能拍成流水帳，要拍成一個小節目。\n方向我會用「任務挑戰」切入：今天限時完成一個真實任務，規則是不能提前準備、不能用理想案例，只能用現場拿到的素材。觀眾會想看的是：到底能不能做出結果，中間會不會翻車。`,
    },
    {
      heading: '【過程橋段】',
      body:    `橋段一：開箱限制\n鉤子：盲盒\n畫面怎麼拍：把今天能用的素材、預算、設備全部放在桌上，用抽籤決定先處理哪一項。\n觀眾想看的點：抽到最難的項目時，我要怎麼救。\n\n橋段二：低成本硬做\n鉤子：金錢\n畫面怎麼拍：直接公布預算上限，邊做邊算花了多少錢，讓觀眾看到每一步成本。\n觀眾想看的點：少花錢到底能不能做出像樣成果。\n\n橋段三：現場驗證\n鉤子：驗證/解密\n畫面怎麼拍：把做好的版本拿給真實對象看，直接問他願不願意用、哪裡不行。\n觀眾想看的點：不是我自己說好，而是現場反應會不會打臉我。`,
    },
    {
      heading: '【反轉/看點】',
      body:    `做到一半一定要設計一個對抗點。\n例如有人質疑：「這樣太趕了，根本不可能做好。」我就直接把時間倒數放在畫面上，讓觀眾看到壓力。中間如果真的卡住，不要剪掉，要保留卡住的那一刻，因為這才是曬過程最好看的地方。`,
    },
    {
      heading: '【結果收束】',
      body:    `最後不要只說完成了，要給觀眾一個結果對比。\n例如：一開始只有零散素材，最後變成一套能直接使用的版本；一開始對方不相信，最後願意採用其中一段。結尾可以說：「如果下一集要我用更低預算挑戰一次，留言打 1。」`,
    },
  ],
}

// ── Analysis mock ─────────────────────────────────────
const ANALYSIS_MOCK = {
  elements: [
    { element: '奇葩',   desc: '前3秒用極端反差建立「這不是普通影片」的感知，大幅降低划走率' },
    { element: '人群',   desc: '精準鎖定卡關超過6個月的族群，讓目標觀眾產生即時強烈共鳴' },
    { element: '反差',   desc: '貧富視覺對比強化記憶點，激發強烈的好奇心與分享欲' },
  ],
  whyViral: [
    '開頭3秒製造強烈懸念，觀眾不看完無法解惑',
    '選題精準貼近大眾焦慮，幾乎所有人都有類似處境',
    '結尾CTA設計自然不突兀，引導評論互動拉高完播率',
    '縮圖與標題形成完整好奇心閉環，點擊率超過行業均值',
    '內容密度高但節奏輕快，適合重複觀看',
  ],
  howToReplicate: [
    '找出行業內最反直覺的觀點，用它當開場鉤子，前3秒直接丟結論',
    '把目標客群縮窄到一個具體情境，不要寬泛描述受眾',
    '結尾設計讓觀眾「有話想說」的開放式問句，引導留言互動',
  ],
}

// ── Social post mock ──────────────────────────────────
const SOCIAL_MOCK = {
  ig: `【想漲粉？先搞清楚這一件事】\n\n99%的人漲不了粉，不是沒有才華——\n而是從來沒搞懂「誰在看我的內容」。\n\n我有一個學員，三個月前粉絲不到200。\n她沒換設備、沒改風格，只做了一件事：\n把目標受眾縮窄到「28-35歲想轉職的上班族」。\n\n結果三個月後突破8,000粉。\n\n精準 > 流量。你的觀眾是誰？\n\n——\n#漲粉攻略 #內容創作 #社群經營 #短影音 #流量密碼`,
  fb: `【一個學員用3個月從0漲到8000粉的真實故事】\n\n很多人問我：「老師，我內容不差，為什麼粉絲漲不動？」\n\n我通常會反問一個問題：「你的觀眾是誰？」\n\n十次有九次，他們給我一個模糊的答案。\n\n這就是問題所在。我有個學員小雅，三個月前粉絲不到200人。\n我讓她做的第一件事，不是改腳本、不是換設備——\n而是坐下來回答：「你的理想觀眾，今天正在煩惱什麼？」\n\n她把目標鎖定在「想轉職但不知道怎麼開始的上班族」。\n三個月後，粉絲突破8,000。\n\n精準定位，比任何技巧都更根本。`,
  threads: `想漲粉，先問自己一個問題：\n\n「我的觀眾今天在煩惱什麼？」\n\n不是「喜歡我的人」，不是「25-40歲」——\n是一個具體的人，一個具體的煩惱。\n\n我一個學員把目標縮窄到「想轉職但卡關的上班族」，\n三個月從200漲到8000粉。\n\n沒換設備，沒改風格，只是搞清楚了「我在跟誰說話」。`,
  general: `【學員案例】三個月從200到8000粉，她只做了這一件事\n\n漲粉秘訣不性感，但很有效：搞清楚你的觀眾是誰。\n\n我一個學員把目標受眾縮窄到「28-35歲想轉職的上班族」。\n沒換設備、沒改腳本，三個月後粉絲突破8000。\n\n精準定位，永遠比技巧重要。你的觀眾是誰？`,
}

// ── Livestream mock ───────────────────────────────────
const LIVESTREAM_MOCK = {
  open:    `各位剛進來的朋友，先不要走，今天這場直播非常不一樣。\n\n我今天要跟你聊一件很多人不知道的事——\n做了這件事之後，成果在三個月內提升了整整三倍。\n\n不管你現在在哪個階段，有任何問題，今天全部告訴你。\n\n先幫我扣個「1」，讓我知道你聽到了！`,
  warm:    `好，我看到很多朋友扣了1，謝謝大家！\n\n在我們開始主題之前，我想先認識一下大家。\n\n你現在最大的困難是什麼？直接留言告訴我。\n\n我等一下會挑幾個留言，直接給你解答——\n今天直播就是要讓你帶著答案回家！`,
  product: `好，我們來聊今天的重點。\n\n你現在看到的這個商品，是我花了大量時間研發出來的成果。\n\n它解決的核心問題就一個：讓你不再為這件事焦慮。\n\n市面上有很多類似的東西，但我們的不同在於——\n我們不賣功能，我們賣的是結果。\n\n不用相信我說的，讓你看真實的學員成果。`,
  close:   `好，今天的特別優惠只有在這場直播才有。\n\n平常這個價格是原價，今天直播限定，前20名特別優惠。\n\n我知道你可能在猶豫，所以我說一句話：\n三個月後的你，會感謝今天做決定的你。\n\n現在扣個「我要」，助理馬上跟你確認！`,
  retain:  `好，我看到有些朋友要離開了。\n\n等一下！你先別走，因為接下來這個部分，\n是今天整場直播最重要的內容。\n\n留下來的人，都能帶走一個讓你馬上能用的方法。\n\n在直播間扣個「繼續」，我知道你在！`,
}

// ── Benchmark mock ────────────────────────────────────
const BENCHMARK_MOCK = {
  patterns: [
    { title: '前3秒必有衝突或懸念', desc: '所有爆款在開場3秒內製造強烈疑問或情緒衝突，讓觀眾無法划走', element: '奇葩' },
    { title: '鎖定單一痛點族群',   desc: '帳號沒有試圖討好所有人，每支影片的目標觀眾都非常具體且一致', element: '人群' },
    { title: '反常識標題公式',     desc: '標題普遍使用否定主流觀點的表達方式，製造強烈的點擊欲', element: '反差' },
    { title: '情感共鳴優先於資訊', desc: '最高播放的影片是讓觀眾感覺「被說中了」的，而不是乾貨最多的', element: '荷爾蒙' },
    { title: '結尾引導留言互動',   desc: '幾乎每支影片都以問句收尾，持續拉高評論數帶動演算法推廣', element: '成本' },
  ],
  directions: [
    '用「外行人絕對不知道的XX黑心操作」格式拍揭秘向影片，前3秒直接丟結論',
    '找一個行業內「月薪3萬vs30萬」的真實差距，用平行剪輯對比呈現',
    '拍一支「我試了市面上最爛的XX服務」評測影片，結尾給出你的解決方案',
  ],
}

// ── Shared option lists for new pages ─────────────────
const SOCIAL_TABS = [
  { id: 'ig',      label: 'IG 貼文'  },
  { id: 'fb',      label: 'FB 貼文'  },
  { id: 'threads', label: 'Threads'  },
  { id: 'general', label: '通用版'   },
]

const LIVESTREAM_SECTIONS = [
  { key: 'open',    label: '開場留人術' },
  { key: 'warm',    label: '互動暖場術' },
  { key: 'product', label: '產品介紹術' },
  { key: 'close',   label: '逼單成交術' },
  { key: 'retain',  label: '挽留留播術' },
]

const LIVESTREAM_DURATIONS = ['1 小時', '2 小時', '3 小時', '3 小時以上']

// ── Material library ──────────────────────────────────
const MATERIAL_FOLDERS = ['選題', '文案結構', '開篇', '拍攝呈現', '金句總結']

function getPlatformInfo(url) {
  if (url.includes('tiktok.com'))    return { Icon: Music2,        label: 'TikTok'  }
  if (url.includes('instagram.com')) return { Icon: Image,         label: 'IG'      }
  if (url.includes('youtube.com'))   return { Icon: PlayCircle,    label: 'YouTube' }
  if (url.includes('threads.net'))   return { Icon: MessageCircle, label: 'Threads' }
  return { Icon: Link, label: '連結' }
}

// ── Trending topic sets ───────────────────────────────
const TRENDING_SETS = [
  [
    { title: '35歲轉職潮',      traffic: 'high'   },
    { title: '微整型副作用',    traffic: 'high'   },
    { title: '台灣房價崩盤',    traffic: 'high'   },
    { title: 'AI取代工作趨勢',  traffic: 'high'   },
    { title: '斷食療法風潮',    traffic: 'medium' },
    { title: '親子教育衝突',    traffic: 'medium' },
    { title: '台灣出生率創低',  traffic: 'medium' },
    { title: '網紅翻車事件',    traffic: 'medium' },
    { title: '上班族副業趨勢',  traffic: 'high'   },
    { title: '無糖飲食挑戰',    traffic: 'low'    },
  ],
  [
    { title: '台灣詐騙新手法',  traffic: 'high'   },
    { title: '素人翻身爆紅',    traffic: 'high'   },
    { title: '通膨壓力加劇',    traffic: 'high'   },
    { title: '短影音創業潮',    traffic: 'high'   },
    { title: '睡眠障礙話題',    traffic: 'medium' },
    { title: '遠距工作爭議',    traffic: 'medium' },
    { title: '新台灣之光',      traffic: 'medium' },
    { title: '健保制度討論',    traffic: 'low'    },
    { title: '中年危機實況',    traffic: 'high'   },
    { title: '跨境電商熱潮',    traffic: 'medium' },
  ],
]

// ── Assistant ─────────────────────────────────────────
const ASSISTANT_QUOTA = { trial: 3, standard: 20, advanced: Infinity }

function buildAssistantReply(msg) {
  const snippet = msg.trim().slice(0, 10)
  return `針對你說的情況，我有幾個具體建議：\n\n▌ 第一步：精準定位你的內容方向\n根據你的描述，建議聚焦在「${snippet}」這個方向的具體痛點，不要什麼都想做。\n\n▌ 第二步：找到你的差異化視角\n你的行業裡一定有別人還沒說過的觀點。試著問自己：「我知道什麼，是95%的人不知道的？」\n\n▌ 第三步：從一個爆款格式開始測試\n建議先拍3-5支測試影片，主題用「外行人不知道的XX黑心操作」「XX行業不能說的秘密」這類格式，看哪個反應最好再集中火力。\n\n需要具體選題方向，可以使用爆款選題工具，輸入你的行業立即生成8個高流量方向。`
}

// ── Planning mock data ────────────────────────────────
const PLANNING_MOCK = {
  situation: [
    {
      key: 'trend',
      title: '行業趨勢',
      content: `你所在的行業目前正處於高速增長期，短影音滲透率持續提升。\n2024年台灣社群電商規模預計突破新台幣3,000億，個人品牌的商業機會窗口正在打開。\n早期進入者的競爭優勢將在未來12-18個月內建立完成，現在是最佳進場時機。\n建議在這個窗口期優先佔領1-2個垂直細分賽道，而非廣泛布局。`,
    },
    {
      key: 'pain',
      title: '市場痛點',
      content: `目前市場上90%的創作者面臨三個核心困境：\n▌ 內容同質化嚴重，缺乏差異化定位\n▌ 粉絲增長緩慢，無法有效轉化為商業收益\n▌ 創作持續性不足，3個月內停更率超過80%\n這些痛點恰恰是你建立競爭優勢的切入點，用對手的弱點打造你的護城河。`,
    },
    {
      key: 'strategy',
      title: '策略建議',
      content: `針對你的情況，建議採取「垂直深耕 + 人設強化」的雙軌策略：\n\n第一軌：在行業內選擇一個最具爭議性或反常識的子話題，建立獨特視角\n第二軌：強化個人人設，讓觀眾跟著「你這個人」，而不只是你的內容\n\n執行節奏：前30天建立內容節奏，31-60天測試爆款格式，61-90天放大複製。`,
    },
  ],
  account: [
    {
      key: 'avatar',
      title: '大頭照風格',
      content: `建議方向：專業感 + 親切感的平衡\n\n▌ 服裝：行業屬性明顯的穿著（美業穿白袍加精緻妝容，健身業穿運動服）\n▌ 表情：自信微笑，眼神望向鏡頭\n▌ 背景：乾淨純色或與行業相關的場景\n▌ 構圖：臉部佔畫面50-60%，留白感強\n▌ 色調：整體統一，與帳號主色系一致`,
    },
    {
      key: 'name',
      title: '帳號名稱 3 選',
      content: `方案 A：[你的名字] + 行業關鍵字\n例如：「陳美玲｜美業私塾」「王小明｜健身密碼」\n→ 優點：人設感強，搜尋曝光高\n\n方案 B：功能型名稱\n例如：「每天一個漲粉技巧」「台北美食踩雷王」\n→ 優點：讓觀眾一眼知道你能給他什麼\n\n方案 C：個性化品牌名\n例如：「頂流學院」「爆款工廠」\n→ 優點：品牌延展性最強，適合後期商業化`,
    },
    {
      key: 'bio',
      title: '個人簡介 3 版',
      content: `版本 A（痛點型）\n「月薪3萬 → 月入30萬，我用了18個月。現在帶你少走3年彎路。每週更新實戰乾貨，追蹤不迷路。」\n\n版本 B（社群型）\n「專注分享行業最反常識的觀點。不說廢話，只給能用的方法。加入我的創業社群↓」\n\n版本 C（成果型）\n「從0到第一個里程碑，紀錄我的真實歷程。每週3支影片，陪你一起突破瓶頸。現在追蹤，一起成長。」`,
    },
  ],
  months: [
    {
      key: 'month1',
      label: '第一個月',
      goal: '建立內容節奏 + 測試受眾反應',
      ratio: '知識型 60% ｜ 故事型 30% ｜ 互動型 10%',
      direction: '以「反常識」和「揭秘」類選題為主，每個標題必須包含強烈好奇心元素',
      publish: '每週 3 支，週二、週四、週六各一支，固定發布時間建立用戶期待',
      live: '每月 2 場互動直播，每場 45 分鐘，主要目的是認識粉絲、收集問題',
    },
    {
      key: 'month2',
      label: '第二個月',
      goal: '放大爆款格式 + 開始引導私域',
      ratio: '知識型 40% ｜ 故事型 40% ｜ 直播預告 20%',
      direction: '將第一個月反應最好的3個選題方向深度延伸，形成系列內容，建立連貫感',
      publish: '每週 4 支，加入一支「直播精華剪輯」，讓不看直播的粉絲也能接觸',
      live: '每月 4 場，開始加入輕度產品介紹，測試粉絲付費意願',
    },
    {
      key: 'month3',
      label: '第三個月',
      goal: '商業化啟動 + 建立私域社群',
      ratio: '知識型 30% ｜ 案例型 40% ｜ 產品型 30%',
      direction: '以學員成果、客戶案例為核心素材，用真實故事建立信任感，推動轉化',
      publish: '每週 4-5 支，加入 1 支「問答」形式影片直接回應粉絲留言問題',
      live: '每週 1 場定期直播，建立穩定流量來源，開始正式帶貨或招募學員',
    },
  ],
  business: [
    {
      key: 'monetize',
      title: '變現規劃',
      content: `階段一（1-3個月）：知識付費 + 諮詢服務\n▌ 1對1諮詢：先驗證需求與成交話術\n▌ 小群體工作坊：每月固定主題測試\n▌ 數位產品：電子書或工具包，建立第一個可販售產品\n\n階段二（3-6個月）：社群 + 課程\n▌ 付費社群：建立固定內容節奏\n▌ 系統課程：將方法論包裝成完整學習路徑\n\n階段三（6個月後）：品牌合作 + 代理\n▌ 業配接單 + 品牌大使 + 自有產品`,
    },
    {
      key: 'segment',
      title: '客戶分層',
      content: `▌ 觀察層（免費粉絲）\n持續輸出免費高價值內容，建立信任。目標：讓他們進入「問答」互動，了解真實需求。\n\n▌ 體驗層（低價產品用戶）\nNT$199-999門檻產品，篩選出有付費意願的核心粉絲。目標：轉化率5-10%。\n\n▌ 核心層（高客單用戶）\nNT$5,000以上的高度承諾用戶。這群人是你的口碑傳播者和最高LTV客戶。`,
    },
    {
      key: 'retention',
      title: '客戶維護',
      content: `▌ 進入即送歡迎禮\n加入社群第一天，自動推送「快速上手指南」+ 資源包，建立第一印象\n\n▌ 固定觸點計畫\n每週固定一個「社群福利日」，發布限定資源或辦限時Q&A\n每月生日問候 + 限定優惠，提升留存率\n\n▌ 成果展示系統\n鼓勵客戶分享成果截圖，在內容中曝光，形成正向循環的口碑效應`,
    },
  ],
}

const PLANNING_TOPIC_SETS = {
  knowledge: [
    ['外行人不知道的{ind}五大黑心操作', '月薪3萬到30萬，做{ind}用了什麼方法', '做{ind}的人，普遍有哪些認知誤區', '{ind}行業最反常識的三個真相', '99%的人做{ind}都在犯的錯誤', '學{ind}最快的方法，沒有之一', '{ind}領域的頂尖高手，都在做這件事', '為什麼聰明人反而在{ind}上輸給普通人', '{ind}新手最應該知道的五件事', '做{ind}三年後，我後悔沒早點知道這些'],
    ['做{ind}你必須克服的三個心理障礙', '{ind}行業的底層邏輯是什麼', '為什麼做{ind}越努力越賺不到錢', '我研究了100個{ind}成功案例，發現這個規律', '{ind}初學者最容易被騙的三件事', '花了50萬學{ind}，我得到了什麼教訓', '{ind}領域的頂流達人，他們不說的秘密', '你以為做{ind}需要天賦？其實需要這個', '做{ind}真的能賺錢嗎？用數據說話', '{ind}入行五年，這些話我後來才敢說'],
  ],
  opinion: [
    ['我對{ind}行業最不受歡迎的一個觀點', '為什麼我不相信努力在{ind}能成功', '{ind}最大的謊言，大家還在相信', '做{ind}不需要才華，需要這個', '我為什麼選擇做{ind}，不是你想的那個原因', '{ind}領域，普通人的最大優勢是什麼', '為什麼你的{ind}帳號不會爆，根本原因', '對{ind}失望過，但我還是留下來了', '做{ind}賺到錢之後，我改變了什麼想法', '{ind}行業正在死去？我的看法完全相反'],
    ['{ind}行業裡最讓我不舒服的一種現象', '關於{ind}，我和大多數人想法不一樣的地方', '做{ind}的人，為什麼容易被看不起', '我願意為{ind}放棄什麼，不願意放棄什麼', '為什麼{ind}領域的培訓大多是在浪費錢', '{ind}行業的護城河，到底是什麼', '做{ind}最大的坑，是這種思維', '沒有任何{ind}背景，我為什麼還能做到', '{ind}行業的未來，我比大多數人樂觀', '如果讓我重新開始做{ind}，我會怎麼選'],
  ],
  story: [
    ['我做{ind}第一年，最狼狽的一段時光', '一個讓我徹底改變對{ind}看法的人', '因為{ind}，我差點放棄了最重要的東西', '做{ind}的這幾年，改變我最大的一件事', '我在{ind}上犯過的最大錯誤', '那個教我{ind}的人，後來怎樣了', '做{ind}前後，我整個人變了什麼', '一個讓我在{ind}行業重新出發的故事', '做{ind}賺到第一桶金那一天，我哭了', '從討厭到熱愛，我和{ind}之間的故事'],
    ['我跟{ind}行業裡最頂尖的人吃了一頓飯', '為了做好{ind}，我做了一個很難的決定', '那段沒有收入做{ind}的日子，怎麼撐過來的', '我在{ind}領域遇過最難纏的客戶', '{ind}路上遇到貴人，改變了我的整個方向', '做{ind}讓我意識到，自己原來是這樣的人', '因為{ind}認識了一個朋友，後來成為合夥人', '我的{ind}事業幾乎崩掉的那一天', '一個陌生人的一句話，讓我在{ind}堅持下來', '做{ind}最後悔和最正確的決定，分別是什麼'],
  ],
  process: [
    ['紀錄我做一個{ind}專案的完整過程', '對比五款{ind}工具，哪一款最適合新手', '挑戰一天完成一個可落地的{ind}成果', '當一天{ind}新手，體驗從零學起的真實感受', '公開我幫客戶規劃{ind}方案的全流程', '實測三種{ind}方法，哪一種最快看到效果', '限時三小時完成一份{ind}交付，結果會怎樣', '第一次跟著學員視角做{ind}，我發現最卡的是這裡'],
    ['帶你看我從接需求到交付{ind}的每一步', '便宜和高價{ind}設備實測，差別真的有那麼大嗎', '挑戰用最低成本做出一套{ind}成果', '我去體驗一堂{ind}課，看看新手到底會卡在哪', '一支{ind}作品從想法到完成，我實際怎麼做', '我把熱門{ind}工具全部試一遍，最推薦的是這個', '挑戰一天幫企業完成三套可執行的{ind}方案', '角色互換：我當學員重新學一次{ind}，才知道哪裡最難'],
  ],
}

// ── Livestream v2 mock ────────────────────────────────
const LIVESTREAM_MOCK_V2 = {
  open:    { main: `各位剛進來的朋友，先不要走！\n今天這場直播我準備了一個大家從來沒聽過的內容。\n先扣個「1」讓我知道你在！`, backup: `補救話術：「剛才有點小狀況，重新來過！大家好，今天主題是——」` },
  warm:    { main: `先來個互動，留言告訴我你今天從哪來！\n台北扣1，台中扣2，其他地方扣3！\n趁大家留言，我說一下今天的重點……`, backup: `冷場備用：「我知道大家可能在趕時間，但今天的內容真的很值得，先給你們看一個數字……」` },
  product: { main: `好，來說今天的主角。\n這個商品解決的問題就一個：讓你不再為這件事焦慮。\n市面上同類產品我研究了超過20個，大部分的問題在於……\n但我們的不同在這裡——（展示產品）`, backup: `對比話術：「跟XX的差別在三點：第一……第二……第三……這就是我們CP值更高的原因。」` },
  close:   { main: `今天的特別價只有這場直播才有。\n前20名下單的朋友，我親自幫你確認加贈一個……\n現在扣「我要」，助理馬上私訊你！`, backup: `猶豫客戶：「三個月後的你，會感謝今天做決定的你。你現在猶豫的，正是90%成功者當初也猶豫過的。」` },
  retain:  { main: `等等不要走！接下來這個才是今天最值錢的內容。\n我要說一個讓很多人改變想法的案例……\n留下來的人今天一定帶得走能馬上用的東西。`, backup: `留不住備用：「沒關係，追蹤我，下次直播還會繼續說這個話題！」` },
  closing: { main: `好，今天到這裡。\n下一場直播時間是……追蹤我，開啟通知，我們下次見！\n你的改變，從今天這個決定開始。`, backup: `超時備用：「時間到了，剩下的部分下次繼續！追蹤我，不要錯過！」` },
}
const LIVESTREAM_SECTIONS_V2 = [
  { key: 'open',    label: '開場留人術', mainLabel: '主話術',   backupLabel: '備用話術' },
  { key: 'warm',    label: '互動暖場術', mainLabel: '互動設計', backupLabel: '冷場備用' },
  { key: 'product', label: '產品介紹術', mainLabel: '主介紹詞', backupLabel: '對比話術' },
  { key: 'close',   label: '逼單成交術', mainLabel: '逼單話術', backupLabel: '猶豫客戶話術' },
  { key: 'retain',  label: '挽留留播術', mainLabel: '挽留話術', backupLabel: '備用話術' },
  { key: 'closing', label: '下播預告術', mainLabel: '下播話術', backupLabel: '超時備用' },
]

// ── Benchmark industry mock ───────────────────────────
const BENCHMARK_INDUSTRY_MOCK = {
  types: [
    { title: '揭秘爆料型', desc: '曝光行業內幕、黑心操作、不為人知的真相，點擊率最高', element: '奇葩' },
    { title: '對比反差型', desc: '貧富差距、before/after、普通人vs頂尖達人的真實對比', element: '反差' },
    { title: '情感共鳴型', desc: '說出目標族群的心聲，讓觀眾瞬間感覺「被說中了」', element: '荷爾蒙' },
    { title: '知識乾貨型', desc: '系統化教學，用「X個方法」「X個步驟」格式呈現實用知識', element: '人群' },
    { title: '真實記錄型', desc: '第一視角記錄真實過程，透明感建立極強信任度', element: '成本' },
  ],
  rules: [
    '前3秒必須製造懸念或情緒衝突，讓觀眾無法划走',
    '標題用「反常識」角度切入，打破觀眾預設認知',
    '選題永遠圍繞目標族群最深層的焦慮或慾望',
    '結尾設計開放式問句，引導留言互動拉高演算法推薦',
    '縮圖與標題形成「好奇心閉環」，缺一不可',
  ],
  directions: [
    '聚焦「最反常識的一個觀點」：找出行業內90%的人都相信但其實是錯的事，用它當內容核心',
    '打造「陪伴感人設」：不要只輸出乾貨，把自己的真實困境、失敗、掙扎一起說出來',
    '建立「系列化內容」：一個大主題拆成5-10支系列，讓觀眾追著看，完播率遠高於單集',
  ],
}

function buildOpinionTopics(idea, round) {
  const keyword = idea.slice(0, 12) || '你的主題'
  const sets = [
    [
      `如果你是${keyword}，千萬不要再忍這種不公平`,
      `真正懂${keyword}的人，不會一直替別人的問題買單`,
      `${keyword}最容易吃虧的，就是把委屈當成懂事`,
      `很多人以為${keyword}只要忍一下就好，但其實問題會越拖越大`,
      `建議你不要再用「為了大家好」委屈自己`,
    ],
    [
      `千萬不要把${keyword}裡的衝突，都怪到自己身上`,
      `如果你是${keyword}，一定不要忽略這種關係壓力`,
      `真正成熟的人，不會要求${keyword}一直退讓`,
      `${keyword}最容易被消耗的，就是不敢把話說清楚`,
      `很多人以為退一步就沒事，但其實只會讓對方更得寸進尺`,
    ],
  ]
  const source = sets[round % sets.length]
  const elements = ['奇葩', '人群', '懷舊', '最差', '頭牌']
  return source.map((text, index) => ({
    element: elements[index] || '人群',
    text,
    traffic: index < 3 ? 'high' : 'medium',
  }))
}

function buildStoryTopics(idea, round) {
  const keyword = idea.slice(0, 12) || '你的主題'
  const sets = [
    [
      `沒想到我一個普通人，靠${keyword}做到了一個以前不敢想的成果，只不過中間差點被盲目自信搞垮`,
      `我幫一個卡在${keyword}的人，從完全沒方向做到第一個成果，但中間最難的不是方法`,
      `那天我在${keyword}遇到一件很不公平的事，我沒有忍下去，而是做了一個很多人不敢做的決定`,
      `我第一次靠${keyword}拿到成果那天，其實不是開心，而是終於鬆了一口氣`,
      `一個客戶靠${keyword}翻身之前，曾經差點因為一個錯誤決定放棄`,
    ],
    [
      `做${keyword}最狼狽的那一年，我以為自己快撐不下去了，結果反而找到轉機`,
      `我幫一個${keyword}新手做出成果前，他最先卡住的不是技術，而是這個現實問題`,
      `我曾經因為${keyword}被身邊的人質疑，後來才知道那是我最重要的一次考驗`,
      `一個看起來很小的${keyword}改變，後來救了我整個方向`,
      `我在${keyword}上被人拆台過一次，才真的學會什麼叫重新站起來`,
    ],
  ]
  const source = sets[round % sets.length]
  const elements = ['奇葩', '人群', '懷舊', '最差', '頭牌']
  return source.map((text, index) => ({
    element: elements[index] || '人群',
    text,
    traffic: index < 3 ? 'high' : 'medium',
  }))
}

function buildCopyTopics(idea, round, scriptType) {
  if (scriptType === 'opinion') return buildOpinionTopics(idea, round)
  if (scriptType === 'story') return buildStoryTopics(idea, round)
  if (scriptType === 'process') {
    const keyword = idea.slice(0, 12) || '你的主題'
    return PROCESS_TOPIC_SETS[round % PROCESS_TOPIC_SETS.length].map(t => ({
      element: t.element,
      text:    t.tpl.replace(/{ind}/g, keyword),
      traffic: t.traffic,
    }))
  }
  const set = TOPIC_SETS[round % TOPIC_SETS.length].slice(0, 5)
  const keyword = idea.slice(0, 8) || '你的主題'
  return set.map(t => ({
    element: t.element,
    text:    t.tpl.replace(/{ind}/g, keyword),
    traffic: t.traffic,
  }))
}

function normalizeGeneratedTopics(result, input, round, scriptType) {
  const fallback = buildCopyTopics(input, round, scriptType)
  if (!Array.isArray(result)) return fallback

  return fallback.map((item, index) => {
    const source = result[index]
    if (typeof source === 'string') {
      const match = source.match(/^【(.+?)】(.+)$/)
      return {
        ...item,
        element: match?.[1] || item.element,
        text: (match?.[2] || source).trim(),
      }
    }

    if (source && typeof source === 'object') {
      return {
        element: source.element || item.element,
        text: source.text || source.title || item.text,
        traffic: source.traffic || item.traffic,
      }
    }

    return item
  })
}

function normalizeScriptResult(result, topicText, scriptType) {
  const fallback = (MOCK_SCRIPTS[scriptType] || MOCK_SCRIPTS.knowledge)(topicText)
  const normalizeKnowledgeSections = sections => {
    const allowed = ['【場景難題】', '【低行動成本解決方案】', '【具體操作過程】']
    const normalized = sections
      .map(section => {
        const heading = String(section.heading || '').trim()
        if (heading.includes('教知識影片腳本')) return null
        if (heading.includes('場景難題')) return { ...section, heading: '【場景難題】' }
        if (heading.includes('低行動成本')) return { ...section, heading: '【低行動成本解決方案】' }
        if (heading.includes('具體操作')) return { ...section, heading: '【具體操作過程】' }
        return section
      })
      .filter(section => section?.body && allowed.includes(section.heading))

    const unique = []
    allowed.forEach(heading => {
      const match = normalized.find(section => section.heading === heading)
      if (match) unique.push(match)
    })
    return unique.length ? unique : fallback
  }
  const normalizeOpinionSections = sections => {
    const allowed = ['【開篇】', '【歸納論據或正反論證】', '【總結觀點】', '【金句】']
    const normalized = sections
      .map(section => {
        const heading = String(section.heading || '').trim()
        if (heading.includes('開篇') || heading.includes('開場') || heading.includes('表明觀點') || heading.includes('反常識') || heading.includes('核心觀點') || heading.includes('觀點陳述') || heading.includes('破題')) {
          return { ...section, heading: '【開篇】' }
        }
        if (heading.includes('論據') || heading.includes('正反') || heading.includes('論證') || heading.includes('錯誤認知') || heading.includes('例子') || heading.includes('對比') || heading.includes('歸納')) {
          return { ...section, heading: '【歸納論據或正反論證】' }
        }
        if (heading.includes('金句')) {
          return { ...section, heading: '【金句】' }
        }
        if (heading.includes('總結觀點') || heading.includes('總結') || heading.includes('收束') || heading.includes('行動')) {
          return { ...section, heading: '【總結觀點】' }
        }
        return section
      })
      .filter(section => section?.body && allowed.includes(section.heading))

    const unique = []
    allowed.forEach(heading => {
      const matches = normalized.filter(section => section.heading === heading)
      if (!matches.length) return
      unique.push({
        heading,
        body: matches.map(section => section.body).join('\n\n'),
      })
    })
    return unique.length ? unique : fallback
  }
  const normalizeStorySections = sections => {
    const allowed = ['【故事類型】', '【成就或衝突事件】', '【困境與轉機】', '【感悟與收束】']
    const formatStoryBeats = body => String(body || '')
      .replace(/(?:^|\n)\s*困難\s*\d*\s*[（(]([^）)]+)[）)]\s*[:：]\s*/g, '\n\n困難：$1\n')
      .replace(/(?:^|\n)\s*轉機\s*\d*\s*[（(]([^）)]+)[）)]\s*[:：]\s*/g, '\n\n轉機：$1\n')
      .replace(/(?:^|\n)\s*第一輪困難\s*[:：]\s*/g, '\n\n困難：')
      .replace(/(?:^|\n)\s*第一輪轉機\s*[:：]\s*/g, '\n\n轉機：')
      .replace(/(?:^|\n)\s*第二輪困難\s*[:：]\s*/g, '\n\n困難：')
      .replace(/(?:^|\n)\s*第二輪轉機\s*[:：]\s*/g, '\n\n轉機：')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
    const normalized = sections
      .map(section => {
        const heading = String(section.heading || '').trim()
        if (heading.includes('故事類型') || heading.includes('類型') || heading.includes('定位')) {
          return { ...section, heading: '【故事類型】' }
        }
        if (heading.includes('成就') || heading.includes('衝突') || heading.includes('事件') || heading.includes('開場') || heading.includes('開篇')) {
          return { ...section, heading: '【成就或衝突事件】' }
        }
        if (heading.includes('困境') || heading.includes('轉機') || heading.includes('轉折') || heading.includes('低谷') || heading.includes('橋段') || heading.includes('英雄時刻')) {
          return { ...section, heading: '【困境與轉機】' }
        }
        if (heading.includes('感悟') || heading.includes('總結') || heading.includes('收束') || heading.includes('反思') || heading.includes('呼籲') || heading.includes('給你的話')) {
          return { ...section, heading: '【感悟與收束】' }
        }
        return section
      })
      .filter(section => section?.body && allowed.includes(section.heading))

    const unique = []
    allowed.forEach(heading => {
      const matches = normalized.filter(section => section.heading === heading)
      if (!matches.length) return
      unique.push({
        heading,
        body: heading === '【困境與轉機】'
          ? formatStoryBeats(matches.map(section => section.body).join('\n\n'))
          : matches.map(section => section.body).join('\n\n'),
      })
    })
    return unique.length ? unique : fallback
  }

  const normalizeProcessSections = sections => {
    const allowed = ['【節目企劃】', '【過程橋段】', '【反轉/看點】', '【結果收束】']
    const normalized = sections
      .map(section => {
        const heading = String(section.heading || '').trim()
        if (heading.includes('節目') || heading.includes('企劃') || heading.includes('任務') || heading.includes('規則')) {
          return { ...section, heading: '【節目企劃】' }
        }
        if (heading.includes('過程') || heading.includes('橋段') || heading.includes('流程') || heading.includes('拍攝')) {
          return { ...section, heading: '【過程橋段】' }
        }
        if (heading.includes('反轉') || heading.includes('看點') || heading.includes('意外') || heading.includes('對抗') || heading.includes('懸念')) {
          return { ...section, heading: '【反轉/看點】' }
        }
        if (heading.includes('結果') || heading.includes('收束') || heading.includes('結尾') || heading.includes('CTA')) {
          return { ...section, heading: '【結果收束】' }
        }
        return section
      })
      .filter(section => section?.body && allowed.includes(section.heading))

    const unique = []
    allowed.forEach(heading => {
      const matches = normalized.filter(section => section.heading === heading)
      if (!matches.length) return
      unique.push({
        heading,
        body: matches.map(section => section.body).join('\n\n'),
      })
    })
    return unique.length ? unique : fallback
  }

  const normalizeSection = (section, index) => {
    if (typeof section === 'string') {
      return {
        heading: index === 0 ? '【AI 生成腳本】' : `【段落 ${index + 1}】`,
        body: section.trim(),
      }
    }

    if (section && typeof section === 'object') {
      return {
        heading: String(section.heading || section.title || section.label || `【段落 ${index + 1}】`).trim(),
        body: String(section.body || section.content || section.text || '').trim(),
      }
    }

    return null
  }

  const sectionSource = Array.isArray(result)
    ? result
    : Array.isArray(result?.sections)
      ? result.sections
      : Array.isArray(result?.script)
        ? result.script
        : Array.isArray(result?.items)
          ? result.items
          : null

  if (sectionSource) {
    const sections = sectionSource.map(normalizeSection).filter(section => section?.body)
    if (scriptType === 'knowledge') return normalizeKnowledgeSections(sections)
    if (scriptType === 'opinion') return normalizeOpinionSections(sections)
    if (scriptType === 'story') return normalizeStorySections(sections)
    if (scriptType === 'process') return normalizeProcessSections(sections)
    return sections.length ? sections : fallback
  }

    if (result && typeof result === 'object') {
      const objectSections = [
      ['scene', '【場景難題】'],
      ['scenario', '【場景難題】'],
      ['difficulty', '【場景難題】'],
      ['script_type_reason', '【場景難題】'],
      ['solution', '【低行動成本解決方案】'],
      ['low_cost_solution', '【低行動成本解決方案】'],
      ['process', '【具體操作過程】'],
      ['operation_process', '【具體操作過程】'],
      ['hook', '【鉤子 · 前 3 秒】'],
      ['concept', '【節目企劃】'],
      ['program_concept', '【節目企劃】'],
      ['show_plan', '【節目企劃】'],
      ['process_beats', '【過程橋段】'],
      ['beats', '【過程橋段】'],
      ['segments', '【過程橋段】'],
      ['twist', '【反轉/看點】'],
      ['highlight', '【反轉/看點】'],
      ['surprise', '【反轉/看點】'],
      ['result', '【結果收束】'],
      ['ending', '【結果收束】'],
      ['cta', '【結果收束】'],
      ['viewpoint', '【開篇】'],
      ['point_of_view', '【開篇】'],
      ['stance', '【開篇】'],
      ['argument_one', '【歸納論據或正反論證】'],
      ['argumentOne', '【歸納論據或正反論證】'],
      ['argument_1', '【歸納論據或正反論證】'],
      ['argument_two', '【歸納論據或正反論證】'],
      ['argumentTwo', '【歸納論據或正反論證】'],
      ['argument_2', '【歸納論據或正反論證】'],
      ['argument', '【歸納論據或正反論證】'],
      ['argumentation', '【歸納論據或正反論證】'],
      ['evidence', '【歸納論據或正反論證】'],
      ['pros_cons', '【歸納論據或正反論證】'],
      ['summary', '【總結觀點】'],
      ['viewpoint_summary', '【總結觀點】'],
      ['punchline', '【金句】'],
      ['golden_sentence', '【金句】'],
      ['summary_quote', '【金句】'],
      ['story_type', '【故事類型】'],
      ['type', '【故事類型】'],
      ['achievement', '【成就或衝突事件】'],
      ['event', '【成就或衝突事件】'],
      ['conflict', '【成就或衝突事件】'],
      ['difficulty', '【困境與轉機】'],
      ['turning_point', '【困境與轉機】'],
      ['turning', '【困境與轉機】'],
      ['reflection', '【感悟與收束】'],
      ['lesson', '【感悟與收束】'],
      ['opening', '【開場】'],
      ['problem', '【問題引入】'],
      ['main', '【主體內容】'],
      ['body', '【主體內容】'],
      ['cta', '【結尾 CTA】'],
      ['closing', '【結尾 CTA】'],
    ].map(([key, heading]) => {
      const body = String(result[key] || '').trim()
      return body ? { heading, body } : null
    }).filter(Boolean)

    if (scriptType === 'knowledge') return normalizeKnowledgeSections(objectSections)
    if (scriptType === 'opinion') return normalizeOpinionSections(objectSections)
    if (scriptType === 'story') return normalizeStorySections(objectSections)
    if (scriptType === 'process') return normalizeProcessSections(objectSections)
    return objectSections.length ? objectSections : fallback
  }

  if (typeof result === 'string' && result.trim()) {
    return [{ heading: '【AI 生成腳本】', body: result.trim() }]
  }

  return fallback
}

function getFallbackSavedTopics(userId) {
  if (!allowLocalFallback) return []
  try {
    const all = JSON.parse(localStorage.getItem(SAVED_TOPICS_FALLBACK_KEY) || '[]')
    return all.filter(item => String(item.user_id) === String(userId))
  } catch (_) {
    return []
  }
}

function saveFallbackTopic(topic) {
  if (!allowLocalFallback) return topic
  const all = JSON.parse(localStorage.getItem(SAVED_TOPICS_FALLBACK_KEY) || '[]')
  const saved = {
    ...topic,
    id: `local-${Date.now()}`,
    created_at: new Date().toISOString(),
  }
  localStorage.setItem(SAVED_TOPICS_FALLBACK_KEY, JSON.stringify([saved, ...all]))
  return saved
}

function saveFallbackPractice(practice) {
  if (!allowLocalFallback) return practice
  const all = JSON.parse(localStorage.getItem(PRACTICE_FALLBACK_KEY) || '[]')
  const saved = {
    ...practice,
    id: `local-${Date.now()}`,
    created_at: new Date().toISOString(),
  }
  localStorage.setItem(PRACTICE_FALLBACK_KEY, JSON.stringify([saved, ...all]))
  return saved
}

async function getSupabaseSessionToken() {
  if (!hasSupabase || !supabase) return ''
  const { data } = await supabase.auth.getSession()
  return data?.session?.access_token || ''
}

// ── Tier helper ───────────────────────────────────────
function deriveAITier(user) {
  if (hasFullAITestAccess(user)) return 'advanced'
  const tier = user?.tier || 'basic'
  if (tier === 'advanced' || tier === 'managed') return 'advanced'
  if (tier === 'standard') return 'standard'
  return 'trial'
}

// ══════════════════════════════════════════════════════
//  Shared atoms
// ══════════════════════════════════════════════════════

function Spinner() {
  return (
    <span className="ait-spinner">
      <span /><span /><span />
    </span>
  )
}

function splitScriptPreview(body, maxSentences = 2) {
  const text = String(body || '').trim()
  if (!text) return { preview: '', hidden: '' }

  const sentenceEnd = /[。！？!?]\s*/g
  let match
  let count = 0
  let splitAt = -1
  while ((match = sentenceEnd.exec(text)) !== null) {
    count += 1
    if (count >= maxSentences) {
      splitAt = sentenceEnd.lastIndex
      break
    }
  }

  if (splitAt < 0) {
    const lines = text.split(/\n+/).map(line => line.trim()).filter(Boolean)
    if (lines.length > maxSentences) {
      return {
        preview: lines.slice(0, maxSentences).join('\n'),
        hidden: lines.slice(maxSentences).join('\n'),
      }
    }
    return { preview: text, hidden: '' }
  }

  return {
    preview: text.slice(0, splitAt).trim(),
    hidden: text.slice(splitAt).trim(),
  }
}

function ScriptSection({ section, index }) {
  if (!section) return null
  return (
    <div key={index} className="ait-sc-sec">
      <div className="ait-sc-heading">{section.heading}</div>
      <div className="ait-sc-body">{section.body}</div>
    </div>
  )
}

function ScriptPreviewGate({ script, canSeeAll, onUpgrade, upgradeText }) {
  const sections = Array.isArray(script) ? script : []
  if (canSeeAll) {
    return sections.map((sec, i) => <ScriptSection key={i} section={sec} index={i} />)
  }

  const first = sections[0] || null
  const second = sections[1] || null
  const secondPreview = second ? splitScriptPreview(second.body, 2) : null
  const blurredSections = [
    ...(secondPreview?.hidden ? [{ ...second, body: secondPreview.hidden }] : []),
    ...sections.slice(2),
  ]

  return (
    <>
      {first && <ScriptSection section={first} index="first" />}
      {second && secondPreview?.preview && (
        <ScriptSection section={{ ...second, body: secondPreview.preview }} index="second-preview" />
      )}
      {blurredSections.length > 0 && (
        <div className="ait-blur-zone">
          <div className="ait-blur-inner">
            {blurredSections.map((sec, i) => (
              <ScriptSection key={i} section={sec} index={`blur-${i}`} />
            ))}
          </div>
          <div className="ait-upgrade-wall">
            <p className="ait-upgrade-wall-text">{upgradeText}</p>
            <button className="ait-upgrade-wall-btn" disabled>即將開放</button>
          </div>
        </div>
      )}
    </>
  )
}

// ══════════════════════════════════════════════════════
//  TopBar
// ══════════════════════════════════════════════════════

function TopBar() {
  return (
    <div className="ait-topbar">
      {STATS.map((s, i) => (
        <div key={s.num} className="ait-topbar-inner">
          <div className="ait-topbar-stat">
            <span className="ait-topbar-num">{s.num}</span>
            <span className="ait-topbar-label">{s.label}</span>
          </div>
          {i < STATS.length - 1 && <div className="ait-topbar-sep" />}
        </div>
      ))}
    </div>
  )
}

// ══════════════════════════════════════════════════════
//  Upgrade Modal
// ══════════════════════════════════════════════════════

function UpgradeModal({ onClose }) {
  return createPortal(
    <div className="ait-modal-backdrop" onClick={onClose}>
      <div className="ait-modal" onClick={e => e.stopPropagation()}>
        <button className="ait-modal-close" onClick={onClose} aria-label="關閉">
          <X size={15} strokeWidth={2} />
        </button>
        <h2 className="ait-modal-title">選擇你的方案</h2>
        <p className="ait-modal-sub">升級解鎖完整 AI 創作功能</p>

        <div className="ait-plan-grid">
          {PLANS.map(plan => (
            <div key={plan.id} className={`ait-plan-card${plan.current ? ' current' : ''}`}>
              {plan.current && (
                <span className="ait-plan-badge">目前方案</span>
              )}
              <div className="ait-plan-name">{plan.name}</div>
              <div className="ait-plan-period">{plan.note}</div>
              {!plan.current && (
                <button className="ait-plan-cta" disabled>即將開放</button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  )
}

// ══════════════════════════════════════════════════════
//  爆款選題 page
// ══════════════════════════════════════════════════════

function TopicsPage() {
  const { currentUser } = useAuth()
  const canSeeAll = deriveAITier(currentUser) !== 'trial'

  const [input,            setInput]            = useState('')
  const [topics,           setTopics]           = useState(null)
  const [generating,       setGenerating]       = useState(false)
  const [round,            setRound]            = useState(0)
  const [selected,         setSelected]         = useState([])
  const [alertMax,         setAlertMax]         = useState(false)
  const [scriptType,       setScriptType]       = useState(null)
  const [shootFormat,      setShootFormat]      = useState(null)
  const [script,           setScript]           = useState(null)
  const [generatingScript, setGeneratingScript] = useState(false)
  const [showModal,        setShowModal]        = useState(false)

  async function doGenerate(r) {
    setGenerating(true); setSelected([]); setAlertMax(false)
    setScriptType(null); setShootFormat(null); setScript(null)
    const industry = input.trim()
    try {
      const result = await callAI('topics', industry, deriveAITier(currentUser), currentUser?.id)
      setTopics(normalizeTopicResults(result, industry, r))
    } catch (_) {
      setTopics(buildTopics(industry, r))
    }
    setRound(r); setGenerating(false)
  }

  const handleGenerate = () => { if (!input.trim() || generating) return; doGenerate(round) }
  const handleRefresh  = () => { if (generating || !input.trim()) return; doGenerate(round + 1) }

  function toggleSelect(i) {
    if (selected.includes(i)) { setSelected(p => p.filter(x => x !== i)); setAlertMax(false) }
    else if (selected.length >= 3) { setAlertMax(true); setTimeout(() => setAlertMax(false), 2500) }
    else setSelected(p => [...p, i])
  }

  const handleGenerateScript = async () => {
    if (!scriptType || !shootFormat || selected.length === 0) return
    if (!canUseScriptType(scriptType, currentUser)) return
    setGeneratingScript(true); setScript(null)
    await new Promise(r => setTimeout(r, 1100))
    const firstTopic = topics[selected[0]]
    setScript(MOCK_SCRIPTS[scriptType](firstTopic.text))
    setGeneratingScript(false)
  }

  const showStep2 = topics !== null && selected.length > 0
  const showStep3 = showStep2 && scriptType !== null
  const showGenBtn = showStep3 && shootFormat !== null

  const typeLabel   = SCRIPT_TYPES.find(s => s.id === scriptType)?.label  || ''
  const formatLabel = SHOOT_FORMATS.find(f => f.id === shootFormat)?.label || ''

  return (
    <>
      <div>
        <h1 className="ait-tool-title">爆款選題</h1>
        <p className="ait-tool-desc">輸入你的行業或主題，生成 8 個高流量選題方向</p>
      </div>

      <div className="ait-card">
        <div className="ait-row">
          <input
            className="ait-text-input"
            placeholder="輸入行業主題，例如：美容、健身、投資..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleGenerate()}
          />
          <button className="ait-btn-primary" onClick={handleGenerate} disabled={!input.trim() || generating}>
            {generating ? <Spinner /> : '生成'}
          </button>
        </div>
      </div>

      {topics && (
        <div className="ait-topics-wrap">
          <div className="ait-topics-toolbar">
            <span className="ait-topics-hint">已選 <strong>{selected.length}</strong> / 3 個選題</span>
            {alertMax && <span className="ait-warn-pill">最多選 3 個選題</span>}
            <button className="ait-ghost-btn" onClick={handleRefresh} disabled={generating}>
              <RefreshCw size={13} strokeWidth={1.8} />換一批
            </button>
          </div>
          <div className="ait-topic-list">
            {topics.map((t, i) => {
              const es = ELEM_STYLE[t.element] || {}; const ts = TRAFFIC_STYLE[t.traffic] || TRAFFIC_STYLE.low; const sel = selected.includes(i)
              return (
                <div key={i} className={`ait-topic-card${sel ? ' selected' : ''}`} onClick={() => toggleSelect(i)}>
                  <input type="checkbox" className="ait-check" checked={sel} readOnly onClick={e => { e.stopPropagation(); toggleSelect(i) }} />
                  <span className="ait-elem-tag" style={{ background: es.bg, color: es.color, borderColor: es.border }}>{t.element}</span>
                  <span className="ait-topic-text">{t.text}</span>
                  <span className="ait-traffic-tag" style={{ background: ts.bg, color: ts.color, borderColor: ts.border }}>{ts.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {showStep2 && (
        <div className="ait-step-card">
          <div className="ait-step-hd"><span className="ait-step-badge">2</span><span className="ait-step-title">選擇腳本類型</span></div>
          <div className="ait-option-grid">
            {SCRIPT_TYPES.map(({ id, label, Icon }) => {
              const locked = !canUseScriptType(id, currentUser)
              return (
              <button key={id} className={`ait-option-btn${scriptType === id ? ' selected' : ''}`}
                disabled={locked}
                onClick={() => { if (locked) return; setScriptType(id); setShootFormat(null); setScript(null) }}>
                <Icon size={22} strokeWidth={1.5} /><span>{label}</span>{locked && <ComingSoonLabel />}
              </button>
              )
            })}
          </div>
        </div>
      )}

      {showStep3 && (
        <div className="ait-step-card">
          <div className="ait-step-hd"><span className="ait-step-badge">3</span><span className="ait-step-title">選擇拍攝形式</span></div>
          <div className="ait-option-grid">
            {SHOOT_FORMATS.map(({ id, label, Icon }) => (
              <button key={id} className={`ait-option-btn${shootFormat === id ? ' selected' : ''}`}
                onClick={() => { setShootFormat(id); setScript(null) }}>
                <Icon size={22} strokeWidth={1.5} /><span>{label}</span>
              </button>
            ))}
          </div>
          {showGenBtn && !script && !generatingScript && (
            <button className="ait-btn-primary ait-go-btn" onClick={handleGenerateScript}>
              生成腳本
            </button>
          )}
        </div>
      )}

      {(generatingScript || script) && (
        <div className="ait-script-card">
          <div className="ait-script-card-hd">
            <span className="ait-script-card-label">腳本內容</span>
            {script && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className="ait-script-type-chip">{typeLabel}</span>
                <span className="ait-script-type-chip" style={{ background: 'rgba(6,182,212,0.1)', color: '#22d3ee', borderColor: 'rgba(6,182,212,0.3)' }}>{formatLabel}</span>
              </div>
            )}
          </div>

          {generatingScript ? (
            <div className="ait-script-loading"><Spinner /> 生成中…</div>
          ) : (
            <div className="ait-script-scroll-box">
              {/* Summary row */}
              <div className="ait-topics-script-summary">
                {selected.map(i => (
                  <span key={i}><strong>{topics[i].text}</strong></span>
                ))}
              </div>

              <ScriptPreviewGate
                script={script}
                canSeeAll={canSeeAll}
                onUpgrade={() => setShowModal(true)}
                upgradeText="頂流達人學員專屬｜掌握四大腳本公式，完整架構不再對著鏡頭不知道說什麼"
              />
            </div>
          )}

          {script && (
            <button className="ait-ghost-btn" style={{ marginTop: 8, alignSelf: 'flex-start' }}
              onClick={() => { setScript(null); setShootFormat(null) }}>
              <RefreshCw size={13} strokeWidth={1.8} />重新選擇
            </button>
          )}
        </div>
      )}

      {showModal && <UpgradeModal onClose={() => setShowModal(false)} />}
    </>
  )
}

// ══════════════════════════════════════════════════════
//  爆款文案 page
// ══════════════════════════════════════════════════════

function CopyPage() {
  const { currentUser } = useAuth()
  const canSeeAll = deriveAITier(currentUser) !== 'trial'
  const skipAutoGenerateRef = useRef(false)
  const copyStateCacheRef = useRef({})
  const scriptCacheRef = useRef({})
  const activeScriptRequestRef = useRef('')

  // Step 1 — idea
  const [idea, setIdea] = useState('')
  // Step 2 — script type
  const [scriptType, setScriptType] = useState(null)
  // Step 3 — topics
  const [copyTopics,      setCopyTopics]      = useState(null)
  const [topicRound,      setTopicRound]      = useState(0)
  const [generatingTopics,setGeneratingTopics]= useState(false)
  const [selectedTopicIdx,setSelectedTopicIdx]= useState(null)
  // Step 4 — script
  const [script,           setScript]           = useState(null)
  const [generatingScript, setGeneratingScript] = useState(false)
  const [scriptError,      setScriptError]      = useState('')
  // Step 5 — practice
  const [practice,          setPractice]          = useState('')
  const [practiceSubmitted, setPracticeSubmitted] = useState(false)
  const [practiceEvaluation,setPracticeEvaluation]= useState(null)
  const [evaluatingPractice,setEvaluatingPractice]= useState(false)
  const [practiceError,     setPracticeError]     = useState('')
  // Step 6 — shoot format + download
  const [shootFormat, setShootFormat] = useState(null)
  const [showModal,   setShowModal]   = useState(false)
  const [savedTopics, setSavedTopics] = useState([])
  const [savingTopic, setSavingTopic] = useState('')
  const [topicLibraryError, setTopicLibraryError] = useState('')
  const [scriptDrafts, setScriptDrafts] = useState([])

  const getTopicStateKey = (type = scriptType, round = topicRound, ideaText = idea.trim()) =>
    [currentUser?.id || 'guest', ideaText, type || '', round].join('::')

  const getScriptCacheKey = (topic, type = scriptType, ideaText = idea.trim()) =>
    [currentUser?.id || 'guest', ideaText, type || '', topic?.text || ''].join('::')

  const saveCurrentWorkspaceState = () => {
    if (!scriptType || !idea.trim()) return
    const key = getTopicStateKey()
    copyStateCacheRef.current[key] = {
      copyTopics,
      selectedTopicIdx,
      script,
      scriptError,
      practice,
      practiceSubmitted,
      practiceEvaluation,
      practiceError,
      shootFormat,
    }
  }

  const hasUnfinishedScript = () => Boolean(script || practice.trim() || generatingScript)

  const saveScriptDraft = (reason = 'abandoned') => {
    if (!hasUnfinishedScript()) return
    try {
      const selectedTopic = selectedTopicIdx !== null ? copyTopics?.[selectedTopicIdx] : null
      const all = JSON.parse(localStorage.getItem(SCRIPT_DRAFTS_FALLBACK_KEY) || '[]')
      const draft = {
        id: `draft-${Date.now()}`,
        user_id: currentUser?.id || 'guest',
        idea: idea.trim(),
        script_type: scriptType,
        script_type_label: SCRIPT_TYPES.find(s => s.id === scriptType)?.label || scriptType,
        topic_text: selectedTopic?.text || '',
        element: selectedTopic?.element || '',
        traffic: selectedTopic?.traffic || '',
        script,
        practice,
        shoot_format: shootFormat,
        reason,
        created_at: new Date().toISOString(),
      }
      const nextDrafts = [draft, ...all].slice(0, 50)
      localStorage.setItem(SCRIPT_DRAFTS_FALLBACK_KEY, JSON.stringify(nextDrafts))
      setScriptDrafts(nextDrafts.filter(item => String(item.user_id || 'guest') === String(currentUser?.id || 'guest')).slice(0, 4))
    } catch (_) {
      // Draft persistence should never block navigation.
    }
  }

  const confirmAbandonCurrentScript = () => {
    if (!hasUnfinishedScript()) return true
    const ok = window.confirm('內容還未完成，確定要放棄嗎？\n\n確認退出後未完成的創作腳本將自動放入草稿箱')
    if (ok) saveScriptDraft('abandoned')
    return ok
  }

  useEffect(() => {
    let cancelled = false

    async function loadSavedTopics() {
      if (!currentUser?.id) {
        setSavedTopics([])
        return
      }

      setTopicLibraryError('')

      if (hasSupabase && supabase && currentUser.source === 'supabase') {
        const { data, error } = await supabase
          .from('saved_topics')
          .select('id, industry, script_type, element, topic_text, traffic, created_at')
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false })
          .limit(20)

        if (error) throw error
        if (!cancelled) setSavedTopics(data || [])
        return
      }

      if (!cancelled) setSavedTopics(getFallbackSavedTopics(currentUser.id))
    }

    loadSavedTopics().catch(error => {
      if (!cancelled) setTopicLibraryError(error.message || '選題庫讀取失敗')
    })

    return () => { cancelled = true }
  }, [currentUser?.id, currentUser?.source])

  useEffect(() => {
    try {
      const all = JSON.parse(localStorage.getItem(SCRIPT_DRAFTS_FALLBACK_KEY) || '[]')
      const userKey = String(currentUser?.id || 'guest')
      setScriptDrafts(all.filter(item => String(item.user_id || 'guest') === userKey).slice(0, 4))
    } catch (_) {
      setScriptDrafts([])
    }
  }, [currentUser?.id])

  // Generate topics when scriptType is selected
  useEffect(() => {
    if (!scriptType || !idea.trim()) { setCopyTopics(null); return }
    if (!canUseScriptType(scriptType, currentUser)) { setCopyTopics(null); return }
    if (skipAutoGenerateRef.current) {
      skipAutoGenerateRef.current = false
      return
    }
    const cachedState = copyStateCacheRef.current[getTopicStateKey(scriptType, topicRound, idea.trim())]
    if (cachedState) {
      setCopyTopics(cachedState.copyTopics)
      setSelectedTopicIdx(cachedState.selectedTopicIdx)
      setScript(cachedState.script)
      setScriptError(cachedState.scriptError || '')
      setPractice(cachedState.practice || '')
      setPracticeSubmitted(Boolean(cachedState.practiceSubmitted))
      setPracticeEvaluation(cachedState.practiceEvaluation || null)
      setPracticeError(cachedState.practiceError || '')
      setShootFormat(cachedState.shootFormat || null)
      return
    }
    let cancelled = false
    setGeneratingTopics(true); setCopyTopics(null); setSelectedTopicIdx(null); setScript(null); setScriptError('')
    setPractice(''); setPracticeSubmitted(false); setPracticeEvaluation(null); setPracticeError(''); setShootFormat(null)

    async function generateTopics() {
      try {
        const payload = {
          idea: idea.trim(),
          scriptType,
          instruction: scriptType === 'opinion'
            ? '請先依照說觀點選題邏輯產生可拍攝選題：先確認寫作對象 TA，再找 TA 最常衝突的人物關係，再找具體衝突事件，最後輸出明確觀點句。觀點句要優先使用否定句或強立場句，例如「千萬不要 + 行為」、「建議你不要 + 行為」、「真正懂的人，不會 + 行為」、「如果你是【身份】，一定不要 + 行為」、「【身份】最容易吃虧的，就是 + 錯誤行為」、「很多人以為【常識】，但其實【反常識觀點】」。不要做成知識解析題，不要牽強硬套，人物關係與衝突事件必須自然合理。'
            : scriptType === 'story'
              ? '請先依照說故事選題邏輯產生可拍攝選題。每一題都必須圍繞三種素材之一：自己達成的成就、你幫別人達成的成就、你用價值觀解決的衝突事件。選題要能自然接出困境與轉機，不能是知識解析、技巧清單、觀點評論或泛泛經驗談。優先使用「沒想到我一個【身份】，靠【事情】做到【成果】，只不過【阻礙】」、「我幫一個【對象】，從【低點】做到【成果】，中間差點卡在【困境】」、「那天我遇到【不公平事件】，我沒有選擇【常見反應】，而是【行動】」這種故事開場。'
              : scriptType === 'process'
                ? '請先依照曬過程選題邏輯產生可拍攝選題。曬過程只有四個腳本方向：過程展示、測評產品、任務挑戰、事件體驗。8 個選題必須四種方向各至少 2 題，元素欄位請直接填「過程展示」「測評產品」「任務挑戰」「事件體驗」。過程展示要拍進貨、諮詢、服務、售後、接需求到交付等完整流程；測評產品要做對比測評、極限測評、化驗測評或工具設備比較；任務挑戰要有高/低成本、限時間/地點、一天內、三小時內等限制；事件體驗要有新奇體驗、奇葩規則、角色互換或當一天某身份。以短影音教學為例：紀錄我給學員訂製進階客腳本全過程；對比五款拍攝設備，哪款最適合新手；挑戰一天幫企業打造三套可落地的短影音；當一天短影音新手，體驗學員從零學起的真實感受。'
                : '請先產生可拍攝的爆款選題，再讓學員進入腳本練習流程。',
        }
        const result = await callAI('topics', payload, deriveAITier(currentUser), currentUser?.id)
        if (!cancelled) setCopyTopics(normalizeGeneratedTopics(result, idea.trim(), topicRound, scriptType))
      } catch (_) {
        if (!cancelled) setCopyTopics(buildCopyTopics(idea.trim(), topicRound, scriptType))
      } finally {
        if (!cancelled) setGeneratingTopics(false)
      }
    }

    generateTopics()
    return () => { cancelled = true }
  }, [scriptType, topicRound, idea, currentUser])

  useEffect(() => {
    if (!scriptType || !idea.trim() || !copyTopics) return
    saveCurrentWorkspaceState()
  }, [
    scriptType,
    topicRound,
    idea,
    copyTopics,
    selectedTopicIdx,
    script,
    scriptError,
    practice,
    practiceSubmitted,
    practiceEvaluation,
    practiceError,
    shootFormat,
  ])

  const handleRefreshTopics = () => {
    saveCurrentWorkspaceState()
    if (!confirmAbandonCurrentScript()) return
    setTopicRound(r => r + 1)
    setSelectedTopicIdx(null)
    setScript(null)
    setScriptError('')
    setPractice('')
    setPracticeSubmitted(false)
    setPracticeEvaluation(null)
    setPracticeError('')
    setShootFormat(null)
  }

  const handleIdeaChange = event => {
    const nextIdea = event.target.value
    if (nextIdea === idea) return
    if (hasUnfinishedScript()) {
      saveCurrentWorkspaceState()
      if (!confirmAbandonCurrentScript()) return
    }
    setIdea(nextIdea)
  }

  const generateScriptForTopic = async (topic, nextScriptType = scriptType, sourceIdea = idea.trim()) => {
    if (!topic?.text || !nextScriptType) return
    if (!canUseScriptType(nextScriptType, currentUser)) return

    const cacheKey = getScriptCacheKey(topic, nextScriptType, sourceIdea)
    const cachedScript = scriptCacheRef.current[cacheKey]
    if (cachedScript) {
      setScript(cachedScript.script)
      setScriptError(cachedScript.scriptError || '')
      setGeneratingScript(false)
      return
    }

    activeScriptRequestRef.current = cacheKey
    setGeneratingScript(true)
    setScriptError('')

    try {
      const payload = {
        task: 'generate_script',
        idea: sourceIdea,
        topicText: topic.text,
        element: topic.element,
        traffic: topic.traffic,
        scriptType: nextScriptType,
        scriptTypeLabel: SCRIPT_TYPES.find(s => s.id === nextScriptType)?.label || nextScriptType,
        requiredFramework: nextScriptType === 'knowledge'
          ? KNOWLEDGE_SCRIPT_SOP
          : nextScriptType === 'opinion'
            ? OPINION_SCRIPT_SOP
            : nextScriptType === 'story'
              ? STORY_SCRIPT_SOP
              : nextScriptType === 'process'
                ? PROCESS_SCRIPT_SOP
                : null,
        instruction: nextScriptType === 'knowledge'
          ? '請優先依照已上傳的知識庫與教知識腳本 SOP。輸出順序必須只有三段：場景難題、低行動成本解決方案、具體操作過程。腳本類型由系統在推薦型或解題型中擇一，寫在場景難題段落裡，不要出現在標題。三段都必須通過自檢：信息多、效果快、料夠猛。禁止中規中矩的泛泛論點，例如只說設定目標、善用工具、提升效率。不要輸出教知識影片腳本第四段，也不要輸出通用的鉤子/問題引入/主體/CTA 框架。'
          : nextScriptType === 'opinion'
            ? OPINION_SCRIPT_GENERATION_INSTRUCTION
            : nextScriptType === 'story'
              ? STORY_SCRIPT_GENERATION_INSTRUCTION
              : nextScriptType === 'process'
                ? PROCESS_SCRIPT_GENERATION_INSTRUCTION
            : '請優先依照已上傳的腳本知識庫，生成符合 TOP LEVEL TRAFFIC 腳本句式的爆款文案。這不是批改作業，而是依選題產出可練習的腳本。',
      }
      const result = await callAI('script', payload, deriveAITier(currentUser), currentUser?.id)
      const normalizedScript = normalizeScriptResult(result, topic.text, nextScriptType)
      scriptCacheRef.current[cacheKey] = { script: normalizedScript, scriptError: '' }
      if (activeScriptRequestRef.current === cacheKey) {
        setScript(normalizedScript)
      }
    } catch (error) {
      const fallbackScript = (MOCK_SCRIPTS[nextScriptType] || MOCK_SCRIPTS.knowledge)(topic.text)
      const fallbackError = error.message || 'AI 腳本生成暫時失敗，已先顯示本機備援腳本。'
      scriptCacheRef.current[cacheKey] = { script: fallbackScript, scriptError: fallbackError }
      if (activeScriptRequestRef.current === cacheKey) {
        setScript(fallbackScript)
        setScriptError(fallbackError)
      }
    } finally {
      if (activeScriptRequestRef.current === cacheKey) setGeneratingScript(false)
    }
  }

  const handleSelectTopic = idx => {
    const topic = copyTopics?.[idx]
    if (!topic) return
    if (selectedTopicIdx === idx && (script || generatingScript)) return
    saveCurrentWorkspaceState()
    if (!confirmAbandonCurrentScript()) return
    setSelectedTopicIdx(idx); setScript(null); setPractice(''); setPracticeSubmitted(false); setPracticeEvaluation(null); setPracticeError(''); setScriptError(''); setShootFormat(null)
    generateScriptForTopic(topic)
  }

  const handleSelectSavedTopic = item => {
    const nextScriptType = item.script_type || scriptType || 'knowledge'
    if (!canUseScriptType(nextScriptType, currentUser)) return
    saveCurrentWorkspaceState()
    if (!confirmAbandonCurrentScript()) return
    const topic = {
      element: item.element || '人群',
      text: item.topic_text,
      traffic: item.traffic || 'medium',
      savedTopicId: item.id,
    }
    skipAutoGenerateRef.current = true
    setIdea(item.industry || item.topic_text)
    setScriptType(nextScriptType)
    setCopyTopics([topic])
    setSelectedTopicIdx(0)
    setPractice('')
    setPracticeSubmitted(false)
    setPracticeEvaluation(null)
    setPracticeError('')
    setScriptError('')
    setShootFormat(null)
    generateScriptForTopic(topic, nextScriptType, item.industry || item.topic_text)
  }

  const handleSelectDraft = draft => {
    saveCurrentWorkspaceState()
    if (!confirmAbandonCurrentScript()) return
    const nextScriptType = draft.script_type || 'knowledge'
    const topic = {
      element: draft.element || '草稿',
      text: draft.topic_text || draft.idea || '未命名草稿',
      traffic: draft.traffic || 'medium',
      draftId: draft.id,
    }
    const nextIdea = draft.idea || draft.topic_text || ''
    const cacheKey = getScriptCacheKey(topic, nextScriptType, nextIdea)
    if (draft.script) {
      scriptCacheRef.current[cacheKey] = { script: draft.script, scriptError: '' }
    }
    skipAutoGenerateRef.current = true
    setIdea(nextIdea)
    setScriptType(nextScriptType)
    setCopyTopics([topic])
    setSelectedTopicIdx(0)
    setScript(draft.script || null)
    setPractice(draft.practice || '')
    setPracticeSubmitted(false)
    setPracticeEvaluation(null)
    setPracticeError('')
    setScriptError('')
    setShootFormat(draft.shoot_format || null)
  }

  const isTopicSaved = topicText => savedTopics.some(item => item.topic_text === topicText)

  const handleSaveTopic = async topic => {
    if (!currentUser?.id || !topic?.text || savingTopic) return
    setSavingTopic(topic.text)
    setTopicLibraryError('')

    const payload = {
      user_id: currentUser.id,
      feature_key: 'topic_script',
      industry: idea.trim(),
      script_type: scriptType,
      element: topic.element,
      topic_text: topic.text,
      traffic: topic.traffic,
      source_payload: {
        idea: idea.trim(),
        scriptType,
        generatedAt: new Date().toISOString(),
      },
    }

    try {
      let saved
      if (hasSupabase && supabase && currentUser.source === 'supabase') {
        const { data, error } = await supabase
          .from('saved_topics')
          .insert(payload)
          .select('id, industry, script_type, element, topic_text, traffic, created_at')
          .single()
        if (error) throw error
        saved = data
      } else if (allowLocalFallback) {
        saved = saveFallbackTopic(payload)
      } else {
        throw new Error('選題庫尚未連接，請重新登入後再試')
      }

      setSavedTopics(prev => [saved, ...prev.filter(item => item.topic_text !== saved.topic_text)])
    } catch (error) {
      setTopicLibraryError(error.message || '保存選題失敗')
    } finally {
      setSavingTopic('')
    }
  }

  const handleSubmitPractice = async () => {
    const validation = validatePracticeSubmission(scriptType, practice)
    if (evaluatingPractice || selectedTopicIdx === null) return
    if (!validation.ok) {
      setPracticeError(validation.message)
      return
    }

    const selectedTopic = copyTopics?.[selectedTopicIdx]
    setEvaluatingPractice(true)
    setPracticeError('')
    setPracticeEvaluation(null)

    try {
      let evaluation
      const token = await getSupabaseSessionToken()
      const workerUrl = import.meta.env.VITE_WORKER_URL || ''

      if (workerUrl && token) {
        const response = await fetch(`${workerUrl.replace(/\/$/, '')}/api/ai/writing/evaluate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            feature: 'script',
            topicText: selectedTopic.text,
            scriptType,
            practiceFramework: scriptType === 'knowledge'
              ? KNOWLEDGE_SCRIPT_SOP.scriptFramework
              : scriptType === 'opinion'
                ? OPINION_SCRIPT_SOP.scriptFramework
                : scriptType === 'story'
                  ? STORY_SCRIPT_SOP.scriptFramework
                  : null,
            draftText: practice,
            userPlan: deriveAITier(currentUser),
          }),
        })

        const data = await response.json().catch(() => ({}))
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'AI 練習判斷失敗')
        }
        evaluation = data.evaluation
      } else if (allowLocalFallback) {
        evaluation = {
          approved: practice.length >= 80,
          score: practice.length >= 80 ? 82 : 68,
          summary: practice.length >= 80
            ? '本機測試判斷：內容長度與三段框架已達練習門檻。'
            : '本機測試判斷：內容仍偏短，請補上場景難題、低行動成本解法與具體操作過程。',
          strengths: ['已有明確主題方向'],
          improvements: ['補強場景難題', '加入低行動成本解決方案', '寫出更具體的操作步驟'],
        }
      } else if (scriptType === 'knowledge') {
        evaluation = {
          approved: true,
          score: AI_PRACTICE_PASS_SCORE,
          summary: '已完成三段練習。正式 AI 判斷服務尚未設定時，系統先依照三格必填與最低字數規則解鎖下載。',
          strengths: ['三段練習皆已填寫'],
          improvements: [],
        }
      } else {
        evaluation = {
          approved: true,
          score: AI_PRACTICE_PASS_SCORE,
          summary: '已完成練習。正式 AI 判斷服務尚未設定時，系統先依照最低字數規則解鎖下載。',
          strengths: ['練習內容已完成'],
          improvements: [],
        }
      }

      const approved = Boolean(evaluation?.approved) || Number(evaluation?.score || 0) >= AI_PRACTICE_PASS_SCORE
      const normalized = {
        ...evaluation,
        approved,
        score: Number(evaluation?.score || 0),
      }

      if (hasSupabase && supabase && currentUser.source === 'supabase') {
        const { error } = await supabase.from('topic_writing_practices').insert({
          saved_topic_id: selectedTopic.savedTopicId || savedTopics.find(item => item.topic_text === selectedTopic.text)?.id || null,
          user_id: currentUser.id,
          topic_text: selectedTopic.text,
          script_type: scriptType,
          draft_text: practice,
          ai_result: normalized,
          score: normalized.score,
          status: approved ? 'approved' : 'rejected',
          download_unlocked: approved,
        })
        if (error) throw error
      } else if (allowLocalFallback) {
        saveFallbackPractice({
          user_id: currentUser?.id,
          topic_text: selectedTopic.text,
          script_type: scriptType,
          draft_text: practice,
          ai_result: normalized,
          score: normalized.score,
          status: approved ? 'approved' : 'rejected',
          download_unlocked: approved,
        })
      }

      setPracticeEvaluation(normalized)
      setPracticeSubmitted(true)
    } catch (error) {
      setPracticeError(error.message || '練習判斷失敗，請稍後再試')
    } finally {
      setEvaluatingPractice(false)
    }
  }

  const handleDownload = () => {
    const typeLabel   = SCRIPT_TYPES.find(s => s.id === scriptType)?.label  || ''
    const formatLabel = SHOOT_FORMATS.find(f => f.id === shootFormat)?.label || '尚未選擇'
    const content = [
      `想法：${idea}`, `腳本類型：${typeLabel}`,
      `選題：${selectedTopicIdx !== null ? copyTopics[selectedTopicIdx].text : ''}`,
      `拍攝形式：${formatLabel}`, '', '== 我的腳本練習 ==', practice,
    ].join('\n')
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url
    a.download = `爆款文案練習_${new Date().toLocaleDateString('zh-TW')}.txt`; a.click()
    URL.revokeObjectURL(url)
  }

  const practiceValidation = validatePracticeSubmission(scriptType, practice)

  return (
    <>
      <div>
        <h1 className="ait-tool-title">爆款選題腳本</h1>
        <p className="ait-tool-desc">先產出爆款選題，再完成腳本練習；AI 判斷符合課程句式後才可下載</p>
      </div>

      {/* Step 1: idea input */}
      <div className="ait-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="ait-step-hd" style={{ marginBottom: 2 }}>
          <span className="ait-step-badge">1</span>
          <span className="ait-step-title">輸入你的產業或創作想法</span>
        </div>
        <textarea
          className="ait-practice-ta"
          rows={5}
          placeholder="例如：健身教練想吸引上班族，主題是三個月養成運動習慣；或輸入餐飲、美業、親子教育..."
          value={idea}
          onChange={handleIdeaChange}
        />
        <p style={{ fontSize: 12, color: 'var(--gray-500)', margin: 0 }}>系統會先產生選題，再引導你完成腳本練習</p>
      </div>

      {savedTopics.length > 0 && (
        <div className="ait-card ait-topic-library">
          <div className="ait-topic-library-hd">
            <span>我的選題庫</span>
            <small>保存後可回來練習；下載仍需完成 AI 寫作判斷</small>
          </div>
          <div className="ait-topic-library-list">
            {savedTopics.slice(0, 4).map(item => (
              <button key={item.id} className="ait-topic-library-item" onClick={() => handleSelectSavedTopic(item)}>
                <span className="ait-topic-library-title">{item.topic_text}</span>
                <span className="ait-topic-library-meta">{item.script_type ? SCRIPT_TYPES.find(s => s.id === item.script_type)?.label : '未選腳本'}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {scriptDrafts.length > 0 && (
        <div className="ait-card ait-topic-library">
          <div className="ait-topic-library-hd">
            <span>草稿箱</span>
            <small>確認退出後，未完成腳本會先保存在這裡</small>
          </div>
          <div className="ait-topic-library-list">
            {scriptDrafts.map(item => (
              <button key={item.id} className="ait-topic-library-item" onClick={() => handleSelectDraft(item)}>
                <span className="ait-topic-library-title">{item.topic_text || item.idea || '未命名草稿'}</span>
                <span className="ait-topic-library-meta">{item.script_type_label || SCRIPT_TYPES.find(s => s.id === item.script_type)?.label || '未選腳本'}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {topicLibraryError && <div className="ait-inline-error">{topicLibraryError}</div>}

      {/* Step 2: script type */}
      {idea.trim() && (
        <div className="ait-step-card">
          <div className="ait-step-hd">
            <span className="ait-step-badge">2</span>
            <span className="ait-step-title">選擇腳本類型</span>
          </div>
          <div className="ait-option-grid">
            {SCRIPT_TYPES.map(({ id, label, Icon }) => {
              const locked = !canUseScriptType(id, currentUser)
              return (
              <button key={id} className={`ait-option-btn${scriptType === id ? ' selected' : ''}`}
                disabled={locked}
                onClick={() => {
                  if (locked) return
                  if (id === scriptType) return
                  saveCurrentWorkspaceState()
                  if (!confirmAbandonCurrentScript()) return
                  setScriptType(id); setSelectedTopicIdx(null); setScript(null); setScriptError('')
                }}>
                <Icon size={22} strokeWidth={1.5} /><span>{label}</span>{locked && <ComingSoonLabel />}
              </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Step 3: generated topics */}
      {(generatingTopics || copyTopics) && (
        <div className="ait-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="ait-step-hd" style={{ margin: 0 }}>
              <span className="ait-step-badge">3</span>
              <span className="ait-step-title">選擇一個選題</span>
            </div>
            {copyTopics && !generatingTopics && (
              <button className="ait-ghost-btn" onClick={handleRefreshTopics}>
                <RefreshCw size={13} strokeWidth={1.8} />換一批
              </button>
            )}
          </div>
          {generatingTopics ? (
            <div className="ait-script-loading"><Spinner /> 生成中…</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {copyTopics.map((t, i) => {
                const es = ELEM_STYLE[t.element] || {}; const ts = TRAFFIC_STYLE[t.traffic] || TRAFFIC_STYLE.low
                const saved = isTopicSaved(t.text)
                return (
                  <div key={i} className={`ait-copy-topic-card${selectedTopicIdx === i ? ' selected' : ''}`}>
                    <span className="ait-elem-tag" style={{ background: es.bg, color: es.color, borderColor: es.border, flexShrink: 0 }}>{t.element}</span>
                    <span className="ait-copy-topic-text">{t.text}</span>
                    <span className="ait-traffic-tag" style={{ background: ts.bg, color: ts.color, borderColor: ts.border, flexShrink: 0 }}>{ts.label}</span>
                    <button
                      className={`ait-copy-topic-save-btn${saved ? ' saved' : ''}`}
                      disabled={saved || savingTopic === t.text}
                      onClick={() => handleSaveTopic(t)}
                    >
                      <Bookmark size={13} strokeWidth={1.8} />
                      {saved ? '已保存' : savingTopic === t.text ? '保存中' : '保存'}
                    </button>
                    <button className="ait-copy-topic-select-btn" onClick={() => handleSelectTopic(i)}>選這個</button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Step 4: script */}
      {(generatingScript || script) && (
        <div className="ait-script-card">
          <div className="ait-script-card-hd">
            <span className="ait-script-card-label">腳本內容</span>
            {scriptType && <span className="ait-script-type-chip">{SCRIPT_TYPES.find(s => s.id === scriptType)?.label}</span>}
          </div>
          {generatingScript ? (
            <div className="ait-script-loading"><Spinner /> 生成中…</div>
          ) : (
            <div className="ait-script-scroll-box-500">
              <ScriptPreviewGate
                script={script}
                canSeeAll={canSeeAll}
                onUpgrade={() => setShowModal(true)}
                upgradeText="頂流達人學員專屬｜掌握四大腳本公式，每支影片都有完整架構，不再對著鏡頭不知道說什麼"
              />
            </div>
          )}
          {scriptError && <div className="ait-inline-error" style={{ margin: '12px 20px 0' }}>{scriptError}</div>}
        </div>
      )}

      {/* Step 5: practice (non-trial) */}
      {script && !generatingScript && canSeeAll && (
        <div className="ait-step-card">
          <div className="ait-step-hd">
            <span className="ait-step-badge">5</span>
            <span className="ait-step-title">練習寫作</span>
          </div>
          <p className="ait-practice-hint">用自己的版本完成這支影片的腳本練習，系統會依照課程框架與句式判斷是否符合。</p>
          {!practiceSubmitted ? (
            <>
              {STRUCTURED_PRACTICE_FIELDS[scriptType] ? (
                <div className="ait-practice-wrap">
                  {STRUCTURED_PRACTICE_FIELDS[scriptType].map(field => (
                    <label key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <span className="ait-sc-heading">【{field.label}】</span>
                      <textarea
                        className="ait-practice-ta"
                        rows={3}
                        placeholder={field.placeholder}
                        value={parseStructuredPractice(scriptType, practice)[field.key] || ''}
                        onChange={e => setPractice(prev => updateStructuredPractice(scriptType, prev, field.key, e.target.value))}
                      />
                    </label>
                  ))}
                  <span className="ait-char-count">{practice.length} / 50+ 字</span>
                  <span className="ait-practice-hint">判斷標準：每個框都要填寫，完成後只能下載自己的練習內容。</span>
                </div>
              ) : (
                <div className="ait-practice-wrap">
                  <textarea className="ait-practice-ta" rows={6} placeholder="用自己的版本寫出這支影片的腳本練習…"
                    value={practice} onChange={e => setPractice(e.target.value)} />
                  <span className="ait-char-count">{practice.length} / 50+ 字</span>
                </div>
              )}
              {practiceError && <div className="ait-inline-error">{practiceError}</div>}
              <button className="ait-btn-primary" disabled={!practiceValidation.ok || evaluatingPractice}
                onClick={handleSubmitPractice}>
                {evaluatingPractice ? <Spinner /> : '提交練習給系統判斷'}
              </button>
            </>
          ) : practiceEvaluation?.approved ? (
            <div className="ait-practice-ok">
              AI 判斷通過，分數 {practiceEvaluation.score || AI_PRACTICE_PASS_SCORE}。可以進入下一步並下載練習內容。
              {practiceEvaluation.summary && <p>{practiceEvaluation.summary}</p>}
            </div>
          ) : (
            <div className="ait-practice-review">
              <strong>AI 判斷尚未通過</strong>
              <span>分數 {practiceEvaluation?.score || 0}，請依照建議修改後再提交。</span>
              {practiceEvaluation?.summary && <p>{practiceEvaluation.summary}</p>}
              {Array.isArray(practiceEvaluation?.improvements) && practiceEvaluation.improvements.length > 0 && (
                <ul>
                  {practiceEvaluation.improvements.map((item, index) => <li key={index}>{item}</li>)}
                </ul>
              )}
              <button className="ait-ghost-btn" onClick={() => setPracticeSubmitted(false)}>重新修改練習</button>
            </div>
          )}
        </div>
      )}

      {/* Step 6: shoot format + download */}
      {practiceSubmitted && practiceEvaluation?.approved && (
        <div className="ait-step-card">
          <div className="ait-step-hd">
            <span className="ait-step-badge">6</span>
            <span className="ait-step-title">選擇拍攝呈現</span>
          </div>
          <div className="ait-option-grid">
            {SHOOT_FORMATS.map(({ id, label, Icon }) => (
              <button key={id} className={`ait-option-btn${shootFormat === id ? ' selected' : ''}`}
                onClick={() => setShootFormat(id)}>
                <Icon size={22} strokeWidth={1.5} /><span>{label}</span>
              </button>
            ))}
          </div>
          <button className="ait-btn-primary ait-go-btn" onClick={handleDownload}>
            <Download size={16} strokeWidth={1.8} />下載我的練習內容
          </button>
        </div>
      )}

      {showModal && <UpgradeModal onClose={() => setShowModal(false)} />}
    </>
  )
}

// ══════════════════════════════════════════════════════
//  爆款解析 page
// ══════════════════════════════════════════════════════

function AnalysisPage() {
  const { currentUser } = useAuth()
  const canSeeAll = deriveAITier(currentUser) !== 'trial'

  const [url,        setUrl]        = useState('')
  const [result,     setResult]     = useState(null)
  const [generating, setGenerating] = useState(false)
  const [showModal,  setShowModal]  = useState(false)

  // "用我的行業複製這個爆款" section
  const [copyInd,     setCopyInd]     = useState('')
  const [copyTopics,  setCopyTopics]  = useState(null)
  const [copyGenning, setCopyGenning] = useState(false)
  const [copyCopied,  setCopyCopied]  = useState({})

  const handleAnalyze = async () => {
    if (!url.trim() || generating) return
    setGenerating(true); setResult(null)
    await new Promise(r => setTimeout(r, 1200))
    setResult(ANALYSIS_MOCK)
    setGenerating(false)
  }

  const handleCopyGen = async () => {
    if (!copyInd.trim() || copyGenning) return
    setCopyGenning(true); setCopyTopics(null); setCopyCopied({})
    await new Promise(r => setTimeout(r, 2000))
    setCopyTopics(buildTopics(copyInd.trim(), 0))
    setCopyGenning(false)
  }

  const handleCopyItem = (i, text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopyCopied(p => ({ ...p, [i]: true }))
      setTimeout(() => setCopyCopied(p => ({ ...p, [i]: false })), 2000)
    })
  }

  return (
    <>
      <div>
        <h1 className="ait-tool-title">爆款解析</h1>
        <p className="ait-tool-desc">貼上 TikTok 或 IG 影片連結，AI 幫你拆解爆款邏輯</p>
      </div>

      <div className="ait-card">
        <div className="ait-row">
          <input
            className="ait-text-input"
            placeholder="貼上 TikTok 或 IG 影片連結"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
          />
          <button className="ait-btn-primary" onClick={handleAnalyze} disabled={!url.trim() || generating}>
            {generating ? <Spinner /> : '開始解析'}
          </button>
        </div>
      </div>

      {result && (
        <>
          {/* Block 1: Elements — always visible */}
          <div className="ait-card ait-analysis-block">
            <div className="ait-analysis-block-title">使用了哪些爆款元素</div>
            <div className="ait-analysis-elem-list">
              {result.elements.map((e, i) => {
                const es = ELEM_STYLE[e.element] || {}
                return (
                  <div key={i} className="ait-analysis-elem-row">
                    <span className="ait-elem-tag" style={{ background: es.bg, color: es.color, borderColor: es.border }}>
                      {e.element}
                    </span>
                    <span className="ait-analysis-elem-desc">{e.desc}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Blocks 2+3 — blurred for trial */}
          {canSeeAll ? (
            <>
              <div className="ait-card ait-analysis-block">
                <div className="ait-analysis-block-title">為什麼這個選題會爆</div>
                <ul className="ait-analysis-list">
                  {result.whyViral.map((item, i) => <li key={i} className="ait-analysis-item">{item}</li>)}
                </ul>
              </div>
              <div className="ait-card ait-analysis-block">
                <div className="ait-analysis-block-title">怎麼用課程邏輯複製這個成功</div>
                <ol className="ait-analysis-list ait-analysis-ol">
                  {result.howToReplicate.map((item, i) => <li key={i} className="ait-analysis-item">{item}</li>)}
                </ol>
              </div>
            </>
          ) : (
            <div className="ait-blur-zone">
              <div className="ait-blur-inner">
                <div className="ait-card ait-analysis-block">
                  <div className="ait-analysis-block-title">為什麼這個選題會爆</div>
                  <ul className="ait-analysis-list">
                    {result.whyViral.map((item, i) => <li key={i} className="ait-analysis-item">{item}</li>)}
                  </ul>
                </div>
                <div className="ait-card ait-analysis-block" style={{ marginTop: 12 }}>
                  <div className="ait-analysis-block-title">怎麼用課程邏輯複製這個成功</div>
                  <ol className="ait-analysis-list ait-analysis-ol">
                    {result.howToReplicate.map((item, i) => <li key={i} className="ait-analysis-item">{item}</li>)}
                  </ol>
                </div>
              </div>
              <div className="ait-upgrade-wall">
                <p className="ait-upgrade-wall-text">
                  頂流達人學員專屬｜完整拆解爆款邏輯，複製成功公式到你的帳號
                </p>
                <button className="ait-upgrade-wall-btn" disabled>
                  即將開放
                </button>
              </div>
            </div>
          )}

          {/* 用我的行業複製這個爆款 */}
          <div className="ait-card ait-analysis-copy-section">
            <div className="ait-analysis-block-title">用我的行業複製這個爆款</div>
            <div className="ait-row" style={{ marginTop: 10 }}>
              <input
                className="ait-text-input"
                placeholder="輸入你的行業，例如：健身、美業、寵物..."
                value={copyInd}
                onChange={e => setCopyInd(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCopyGen()}
              />
              <button className="ait-btn-primary" onClick={handleCopyGen} disabled={!copyInd.trim() || copyGenning}>
                {copyGenning ? <Spinner /> : '生成對應選題'}
              </button>
            </div>
            {copyGenning && (
              <div className="ait-script-loading" style={{ marginTop: 12 }}><Spinner /> 生成中…</div>
            )}
            {copyTopics && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                {copyTopics.map((t, i) => {
                  const es = ELEM_STYLE[t.element] || {}
                  const ts = TRAFFIC_STYLE[t.traffic] || TRAFFIC_STYLE.low
                  return (
                    <div key={i} className="ait-analysis-copy-item">
                      <span className="ait-elem-tag" style={{ background: es.bg, color: es.color, borderColor: es.border, flexShrink: 0 }}>{t.element}</span>
                      <span className="ait-analysis-copy-text">{t.text}</span>
                      <span className="ait-traffic-tag" style={{ background: ts.bg, color: ts.color, borderColor: ts.border, flexShrink: 0 }}>{ts.label}</span>
                      <button className="ait-ghost-btn" style={{ flexShrink: 0 }} onClick={() => handleCopyItem(i, t.text)}>
                        {copyCopied[i] ? <Check size={13} strokeWidth={2} /> : <Copy size={13} strokeWidth={1.8} />}
                        {copyCopied[i] ? '已複製' : '複製'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}

      {showModal && <UpgradeModal onClose={() => setShowModal(false)} />}
    </>
  )
}

// ══════════════════════════════════════════════════════
//  社群貼文 page
// ══════════════════════════════════════════════════════

function SocialPage() {
  const { currentUser } = useAuth()
  const canSeeAll = deriveAITier(currentUser) !== 'trial'

  const [input,      setInput]      = useState('')
  const [result,     setResult]     = useState(null)
  const [generating, setGenerating] = useState(false)
  const [activeTab,  setActiveTab]  = useState('ig')
  const [copied,     setCopied]     = useState(false)
  const [showModal,  setShowModal]  = useState(false)

  const handleGenerate = async () => {
    if (!input.trim() || generating) return
    setGenerating(true); setResult(null); setCopied(false)
    await new Promise(r => setTimeout(r, 1100))
    setResult(SOCIAL_MOCK); setActiveTab('ig')
    setGenerating(false)
  }

  const activeContent = result?.[activeTab] || ''
  const lines         = activeContent.split('\n')
  const visiblePart   = lines.slice(0, 2).join('\n')
  const blurredPart   = lines.slice(2).join('\n')

  const handleCopy = () => {
    navigator.clipboard.writeText(activeContent).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <>
      <div>
        <h1 className="ait-tool-title">社群貼文</h1>
        <p className="ait-tool-desc">輸入你的想法或參考資料，AI 整理成各平台貼文</p>
      </div>

      <div className="ait-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <textarea
          className="ait-practice-ta"
          rows={5}
          placeholder="例如：我今天分享了一個客人從0到1漲粉的故事，想做成貼文..."
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <button
          className="ait-btn-primary"
          style={{ alignSelf: 'flex-start' }}
          onClick={handleGenerate}
          disabled={!input.trim() || generating}
        >
          {generating ? <Spinner /> : '生成貼文'}
        </button>
      </div>

      {result && (
        <div className="ait-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="ait-social-hd">
            <div className="ait-tab-bar" style={{ margin: 0 }}>
              {SOCIAL_TABS.map(t => (
                <button
                  key={t.id}
                  className={`ait-tab${activeTab === t.id ? ' active' : ''}`}
                  onClick={() => { setActiveTab(t.id); setCopied(false) }}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {canSeeAll && (
              <button className="ait-ghost-btn" onClick={handleCopy}>
                {copied ? <Check size={13} strokeWidth={2} /> : <Copy size={13} strokeWidth={1.8} />}
                {copied ? '已複製' : '複製'}
              </button>
            )}
          </div>

          <div className="ait-social-content">
            <div className="ait-social-body">{visiblePart}</div>
            {blurredPart && !canSeeAll ? (
              <div className="ait-blur-zone" style={{ borderRadius: 0 }}>
                <div className="ait-blur-inner">
                  <div className="ait-social-body">{blurredPart}</div>
                </div>
                <div className="ait-upgrade-wall">
                  <p className="ait-upgrade-wall-text">
                    頂流達人學員專屬｜一鍵生成 IG、FB、Threads 完整貼文，附 hashtag 策略
                  </p>
                  <button className="ait-upgrade-wall-btn" disabled>
                    即將開放
                  </button>
                </div>
              </div>
            ) : (
              blurredPart && <div className="ait-social-body">{blurredPart}</div>
            )}
          </div>
        </div>
      )}

      {showModal && <UpgradeModal onClose={() => setShowModal(false)} />}
    </>
  )
}

// ══════════════════════════════════════════════════════
//  直播話術 page
// ══════════════════════════════════════════════════════

const LS_STYLES    = ['帶貨型', '知識分享型', '互動娛樂型', '品牌形象型']
const LS_VIEWERS   = ['100人以下', '100-500人', '500-1000人', '1000人以上']
const LS_COHOST    = ['無助播', '有1位助播', '有2位以上助播']
const LS_PLATFORMS = ['TikTok', 'Instagram', 'YouTube', 'Facebook', '其他']

function LivestreamPage() {
  const { currentUser } = useAuth()
  const canSeeAll = deriveAITier(currentUser) === 'advanced'

  const [form, setForm] = useState({
    topic: '', product: '', duration: '', style: '',
    targetSales: '', expectedViewers: '', hasCohost: '', platforms: [],
  })
  const [result,     setResult]     = useState(null)
  const [generating, setGenerating] = useState(false)
  const [copied,     setCopied]     = useState({})
  const [showModal,  setShowModal]  = useState(false)

  const setField       = (key, val) => setForm(p => ({ ...p, [key]: val }))
  const togglePlatform = p => setForm(prev => ({
    ...prev,
    platforms: prev.platforms.includes(p)
      ? prev.platforms.filter(x => x !== p)
      : [...prev.platforms, p],
  }))

  const canSubmit = form.topic.trim() && form.product.trim() && form.duration &&
    form.style && form.targetSales.trim() && form.expectedViewers &&
    form.hasCohost && form.platforms.length > 0 && !generating

  const handleGenerate = async () => {
    if (!canSubmit) return
    setGenerating(true); setResult(null); setCopied({})
    await new Promise(r => setTimeout(r, 1200))
    setResult(LIVESTREAM_MOCK_V2)
    setGenerating(false)
  }

  const handleCopy = (key, text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(p => ({ ...p, [key]: true }))
      setTimeout(() => setCopied(p => ({ ...p, [key]: false })), 2000)
    })
  }

  const visibleSections = canSeeAll ? LIVESTREAM_SECTIONS_V2 : LIVESTREAM_SECTIONS_V2.slice(0, 2)
  const hiddenSections  = canSeeAll ? [] : LIVESTREAM_SECTIONS_V2.slice(2)

  return (
    <>
      <div>
        <h1 className="ait-tool-title">直播話術</h1>
        <p className="ait-tool-desc">填寫直播資訊，生成完整六大話術腳本（含備用話術）</p>
      </div>

      <div className="ait-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          className="ait-text-input"
          style={{ width: '100%', boxSizing: 'border-box' }}
          placeholder="直播主題（必填）"
          value={form.topic}
          onChange={e => setField('topic', e.target.value)}
        />
        <input
          className="ait-text-input"
          style={{ width: '100%', boxSizing: 'border-box' }}
          placeholder="賣的商品或服務（必填）"
          value={form.product}
          onChange={e => setField('product', e.target.value)}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <select className="ait-text-input ait-select" value={form.duration} onChange={e => setField('duration', e.target.value)}>
            <option value="">直播時長（必選）</option>
            {LIVESTREAM_DURATIONS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select className="ait-text-input ait-select" value={form.style} onChange={e => setField('style', e.target.value)}>
            <option value="">直播風格（必選）</option>
            {LS_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input
            className="ait-text-input"
            placeholder="目標業績（必填）"
            value={form.targetSales}
            onChange={e => setField('targetSales', e.target.value)}
          />
          <select className="ait-text-input ait-select" value={form.expectedViewers} onChange={e => setField('expectedViewers', e.target.value)}>
            <option value="">預計觀看人數（必選）</option>
            {LS_VIEWERS.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>

        {/* Cohost radio */}
        <div>
          <div style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 6 }}>助播狀況（必選）</div>
          <div className="ait-ls-radio-group">
            {LS_COHOST.map(opt => (
              <button
                key={opt}
                className={`ait-ls-radio-btn${form.hasCohost === opt ? ' selected' : ''}`}
                onClick={() => setField('hasCohost', opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Platforms multi-select */}
        <div>
          <div style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 6 }}>直播平台（必選，可多選）</div>
          <div className="ait-ls-platform-group">
            {LS_PLATFORMS.map(p => (
              <button
                key={p}
                className={`ait-ls-platform-btn${form.platforms.includes(p) ? ' selected' : ''}`}
                onClick={() => togglePlatform(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <button
          className="ait-btn-primary"
          style={{ alignSelf: 'flex-start' }}
          disabled={!canSubmit}
          onClick={handleGenerate}
        >
          {generating ? <Spinner /> : '生成完整話術'}
        </button>
      </div>

      {result && (
        <>
          {visibleSections.map(sec => {
            const data = result[sec.key] || {}
            return (
              <div key={sec.key} className="ait-card ait-ls-v2-card">
                <div className="ait-ls-v2-hd">
                  <span className="ait-ls-label">{sec.label}</span>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span className="ait-ls-v2-label">{sec.mainLabel}</span>
                    <button className="ait-ghost-btn" onClick={() => handleCopy(`${sec.key}-main`, data.main || '')}>
                      {copied[`${sec.key}-main`] ? <Check size={13} strokeWidth={2} /> : <Copy size={13} strokeWidth={1.8} />}
                      {copied[`${sec.key}-main`] ? '已複製' : '複製'}
                    </button>
                  </div>
                  <div className="ait-ls-v2-text">{data.main}</div>
                </div>
                <div className="ait-ls-v2-divider" />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span className="ait-ls-v2-sub">{sec.backupLabel}</span>
                    <button className="ait-ghost-btn" onClick={() => handleCopy(`${sec.key}-backup`, data.backup || '')}>
                      {copied[`${sec.key}-backup`] ? <Check size={13} strokeWidth={2} /> : <Copy size={13} strokeWidth={1.8} />}
                      {copied[`${sec.key}-backup`] ? '已複製' : '複製'}
                    </button>
                  </div>
                  <div className="ait-ls-v2-text" style={{ color: 'var(--gray-500)' }}>{data.backup}</div>
                </div>
              </div>
            )
          })}

          {hiddenSections.length > 0 && (
            <div className="ait-blur-zone">
              <div className="ait-blur-inner">
                {hiddenSections.map(sec => {
                  const data = result[sec.key] || {}
                  return (
                    <div key={sec.key} className="ait-card ait-ls-v2-card" style={{ marginBottom: 12 }}>
                      <div className="ait-ls-v2-hd">
                        <span className="ait-ls-label">{sec.label}</span>
                      </div>
                      <div className="ait-ls-v2-text">{data.main}</div>
                      <div className="ait-ls-v2-divider" />
                      <div className="ait-ls-v2-text" style={{ color: 'var(--gray-500)' }}>{data.backup}</div>
                    </div>
                  )
                })}
              </div>
              <div className="ait-upgrade-wall">
                <p className="ait-upgrade-wall-text">
                  頂流私塾學員專屬｜完整六大話術腳本，逼單、挽留、下播全套腳本一次到位
                </p>
                <button className="ait-upgrade-wall-btn" disabled>
                  即將開放
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {showModal && <UpgradeModal onClose={() => setShowModal(false)} />}
    </>
  )
}

// ══════════════════════════════════════════════════════
//  對標分析 page
// ══════════════════════════════════════════════════════

function BenchmarkPage() {
  const { currentUser } = useAuth()
  const canSeeAll = deriveAITier(currentUser) === 'advanced'

  const [url,        setUrl]        = useState('')
  const [result,     setResult]     = useState(null)
  const [generating, setGenerating] = useState(false)
  const [showModal,  setShowModal]  = useState(false)

  // Industry keyword section
  const [kwInput,   setKwInput]   = useState('')
  const [kwResult,  setKwResult]  = useState(null)
  const [kwGenning, setKwGenning] = useState(false)
  const [kwCopied,  setKwCopied]  = useState({})

  const handleAnalyze = async () => {
    if (!url.trim() || generating) return
    setGenerating(true); setResult(null)
    await new Promise(r => setTimeout(r, 1300))
    setResult(BENCHMARK_MOCK)
    setGenerating(false)
  }

  const handleKwAnalyze = async () => {
    if (!kwInput.trim() || kwGenning) return
    setKwGenning(true); setKwResult(null); setKwCopied({})
    await new Promise(r => setTimeout(r, 1200))
    setKwResult(BENCHMARK_INDUSTRY_MOCK)
    setKwGenning(false)
  }

  const handleKwCopy = (key, text) => {
    navigator.clipboard.writeText(text).then(() => {
      setKwCopied(p => ({ ...p, [key]: true }))
      setTimeout(() => setKwCopied(p => ({ ...p, [key]: false })), 2000)
    })
  }

  return (
    <>
      <div>
        <h1 className="ait-tool-title">對標分析</h1>
        <p className="ait-tool-desc">貼上 TikTok 或 IG 帳號連結，AI 分析爆款規律</p>
      </div>

      <div className="ait-card">
        <div className="ait-row">
          <input
            className="ait-text-input"
            placeholder="貼上 TikTok 或 IG 帳號連結"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
          />
          <button className="ait-btn-primary" onClick={handleAnalyze} disabled={!url.trim() || generating}>
            {generating ? <Spinner /> : '開始分析'}
          </button>
        </div>
      </div>

      {result && (
        <>
          <div className="ait-card ait-analysis-block">
            <div className="ait-analysis-block-title">爆款規律分析</div>

            {/* Always-visible first 2 patterns */}
            <div className="ait-benchmark-list">
              {result.patterns.slice(0, 2).map((p, i) => {
                const es = ELEM_STYLE[p.element] || {}
                return (
                  <div key={i} className="ait-benchmark-item">
                    <div className="ait-benchmark-item-hd">
                      <span className="ait-benchmark-item-title">{p.title}</span>
                      <span className="ait-elem-tag" style={{ background: es.bg, color: es.color, borderColor: es.border }}>
                        {p.element}
                      </span>
                    </div>
                    <p className="ait-benchmark-item-desc">{p.desc}</p>
                  </div>
                )
              })}
            </div>

            {/* Patterns 3-5 + directions — blurred for non-advanced */}
            {canSeeAll ? (
              <div className="ait-benchmark-list" style={{ marginTop: 0 }}>
                {result.patterns.slice(2).map((p, i) => {
                  const es = ELEM_STYLE[p.element] || {}
                  return (
                    <div key={i} className="ait-benchmark-item">
                      <div className="ait-benchmark-item-hd">
                        <span className="ait-benchmark-item-title">{p.title}</span>
                        <span className="ait-elem-tag" style={{ background: es.bg, color: es.color, borderColor: es.border }}>
                          {p.element}
                        </span>
                      </div>
                      <p className="ait-benchmark-item-desc">{p.desc}</p>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="ait-blur-zone" style={{ marginTop: 12 }}>
                <div className="ait-blur-inner">
                  <div className="ait-benchmark-list">
                    {result.patterns.slice(2).map((p, i) => {
                      const es = ELEM_STYLE[p.element] || {}
                      return (
                        <div key={i} className="ait-benchmark-item">
                          <div className="ait-benchmark-item-hd">
                            <span className="ait-benchmark-item-title">{p.title}</span>
                            <span className="ait-elem-tag" style={{ background: es.bg, color: es.color, borderColor: es.border }}>
                              {p.element}
                            </span>
                          </div>
                          <p className="ait-benchmark-item-desc">{p.desc}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div className="ait-upgrade-wall">
                  <p className="ait-upgrade-wall-text">
                    頂流私塾學員專屬｜完整5大爆款規律分析加拍攝方向建議
                  </p>
                  <button className="ait-upgrade-wall-btn" disabled>
                    即將開放
                  </button>
                </div>
              </div>
            )}
          </div>

          {canSeeAll && (
            <div className="ait-card ait-analysis-block">
              <div className="ait-analysis-block-title">建議拍攝方向</div>
              <ol className="ait-analysis-list ait-analysis-ol">
                {result.directions.map((d, i) => <li key={i} className="ait-analysis-item">{d}</li>)}
              </ol>
            </div>
          )}
        </>
      )}

      {/* 用行業關鍵字分析 — always visible */}
      <div className="ait-card ait-benchmark-industry-result">
        <div className="ait-analysis-block-title">用行業關鍵字分析</div>
        <div className="ait-row" style={{ marginTop: 10 }}>
          <input
            className="ait-text-input"
            placeholder="輸入行業關鍵字，例如：美容、健身、親子教育..."
            value={kwInput}
            onChange={e => setKwInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleKwAnalyze()}
          />
          <button className="ait-btn-primary" onClick={handleKwAnalyze} disabled={!kwInput.trim() || kwGenning}>
            {kwGenning ? <Spinner /> : '開始分析'}
          </button>
        </div>

        {kwGenning && (
          <div className="ait-script-loading" style={{ marginTop: 12 }}><Spinner /> 分析中…</div>
        )}

        {kwResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
            {/* Card 1: 爆款影片類型 */}
            <div className="ait-benchmark-industry-card">
              <div className="ait-benchmark-industry-hd">
                <span className="ait-benchmark-industry-title">該行業爆款影片類型</span>
                <button className="ait-ghost-btn" onClick={() => handleKwCopy('types', kwResult.types.map(t => `${t.title}：${t.desc}`).join('\n'))}>
                  {kwCopied['types'] ? <Check size={13} strokeWidth={2} /> : <Copy size={13} strokeWidth={1.8} />}
                  {kwCopied['types'] ? '已複製' : '複製'}
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {kwResult.types.map((t, i) => {
                  const es = ELEM_STYLE[t.element] || {}
                  return (
                    <div key={i} className="ait-benchmark-item">
                      <div className="ait-benchmark-item-hd">
                        <span className="ait-benchmark-item-title">{t.title}</span>
                        <span className="ait-elem-tag" style={{ background: es.bg, color: es.color, borderColor: es.border }}>{t.element}</span>
                      </div>
                      <p className="ait-benchmark-item-desc">{t.desc}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Card 2: 爆款共同規律 */}
            <div className="ait-benchmark-industry-card">
              <div className="ait-benchmark-industry-hd">
                <span className="ait-benchmark-industry-title">爆款共同規律</span>
                <button className="ait-ghost-btn" onClick={() => handleKwCopy('rules', kwResult.rules.join('\n'))}>
                  {kwCopied['rules'] ? <Check size={13} strokeWidth={2} /> : <Copy size={13} strokeWidth={1.8} />}
                  {kwCopied['rules'] ? '已複製' : '複製'}
                </button>
              </div>
              <ul className="ait-analysis-list">
                {kwResult.rules.map((r, i) => <li key={i} className="ait-analysis-item">{r}</li>)}
              </ul>
            </div>

            {/* Card 3: 建議差異化方向 */}
            <div className="ait-benchmark-industry-card">
              <div className="ait-benchmark-industry-hd">
                <span className="ait-benchmark-industry-title">建議差異化方向</span>
                <button className="ait-ghost-btn" onClick={() => handleKwCopy('directions', kwResult.directions.map((d, i) => `${i + 1}. ${d}`).join('\n'))}>
                  {kwCopied['directions'] ? <Check size={13} strokeWidth={2} /> : <Copy size={13} strokeWidth={1.8} />}
                  {kwCopied['directions'] ? '已複製' : '複製'}
                </button>
              </div>
              <ol className="ait-analysis-list ait-analysis-ol">
                {kwResult.directions.map((d, i) => <li key={i} className="ait-analysis-item">{d}</li>)}
              </ol>
            </div>
          </div>
        )}
      </div>

      {showModal && <UpgradeModal onClose={() => setShowModal(false)} />}
    </>
  )
}

// ══════════════════════════════════════════════════════
//  素材靈感 page
// ══════════════════════════════════════════════════════

function MaterialCard({ item, onDelete }) {
  const { Icon, label } = getPlatformInfo(item.url)
  return (
    <div className="ait-material-card">
      <div className="ait-material-card-hd">
        <div className="ait-material-platform">
          <Icon size={13} strokeWidth={1.8} />
          <span>{label}</span>
        </div>
        <button className="ait-material-del" onClick={onDelete} title="刪除">
          <Trash2 size={13} strokeWidth={1.8} />
        </button>
      </div>
      <a className="ait-material-url" href={item.url} target="_blank" rel="noopener noreferrer">
        {item.url}
      </a>
      {item.note && <p className="ait-material-note">{item.note}</p>}
      <span className="ait-material-time">{item.time}</span>
    </div>
  )
}

function MaterialPage() {
  const { currentUser } = useAuth()
  const canSeeAll = deriveAITier(currentUser) === 'advanced'

  const [folders, setFolders] = useState(() => {
    try {
      const saved = localStorage.getItem('tlt_material_folders')
      return saved ? JSON.parse(saved) : [...MATERIAL_FOLDERS]
    } catch { return [...MATERIAL_FOLDERS] }
  })
  const [folder,        setFolder]        = useState(() => {
    try {
      const saved = localStorage.getItem('tlt_material_folders')
      return saved ? JSON.parse(saved)[0] : MATERIAL_FOLDERS[0]
    } catch { return MATERIAL_FOLDERS[0] }
  })
  const [urlInput,      setUrlInput]      = useState('')
  const [noteInput,     setNoteInput]     = useState('')
  const [folderSelect,  setFolderSelect]  = useState('')
  const [addingFolder,  setAddingFolder]  = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [showModal,     setShowModal]     = useState(false)
  const [items,         setItems]         = useState(() => {
    try {
      const saved = localStorage.getItem('tlt_material_folders')
      const fls = saved ? JSON.parse(saved) : [...MATERIAL_FOLDERS]
      return JSON.parse(localStorage.getItem(`tlt_materials_${fls[0]}`) || '[]')
    } catch { return [] }
  })

  useEffect(() => {
    try { setItems(JSON.parse(localStorage.getItem(`tlt_materials_${folder}`) || '[]')) } catch { setItems([]) }
    setUrlInput(''); setNoteInput(''); setFolderSelect('')
  }, [folder])

  function handleAddFolder() {
    const name = newFolderName.trim()
    if (!name || folders.includes(name)) { setAddingFolder(false); setNewFolderName(''); return }
    const next = [...folders, name]
    setFolders(next)
    localStorage.setItem('tlt_material_folders', JSON.stringify(next))
    setNewFolderName('')
    setAddingFolder(false)
  }

  function handleDeleteFolder(f) {
    if (MATERIAL_FOLDERS.includes(f)) return
    const next = folders.filter(x => x !== f)
    setFolders(next)
    localStorage.setItem('tlt_material_folders', JSON.stringify(next))
    localStorage.removeItem(`tlt_materials_${f}`)
    if (folder === f) setFolder(next[0])
  }

  function handleAdd() {
    if (!urlInput.trim() || !noteInput.trim() || !folderSelect) return
    const now = new Date()
    const pad = n => String(n).padStart(2, '0')
    const timeStr = `${now.getFullYear()}/${pad(now.getMonth()+1)}/${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`
    const newItem = { id: Date.now(), url: urlInput.trim(), note: noteInput.trim(), time: timeStr }
    const key = `tlt_materials_${folderSelect}`
    let existing = []
    try { existing = JSON.parse(localStorage.getItem(key) || '[]') } catch {}
    const next = [newItem, ...existing]
    localStorage.setItem(key, JSON.stringify(next))
    if (folderSelect === folder) setItems(next)
    setUrlInput(''); setNoteInput(''); setFolderSelect('')
  }

  function handleDelete(id) {
    const next = items.filter(it => it.id !== id)
    setItems(next)
    localStorage.setItem(`tlt_materials_${folder}`, JSON.stringify(next))
  }

  const canAdd = urlInput.trim() && noteInput.trim() && folderSelect

  return (
    <>
      <div>
        <h1 className="ait-tool-title">素材靈感</h1>
        <p className="ait-tool-desc">保存你喜歡的影片連結，建立專屬爆款靈感庫</p>
      </div>

      {/* Folder tabs + add button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div className="ait-tab-bar" style={{ flex: 1, flexWrap: 'wrap', margin: 0 }}>
          {folders.map(f => {
            const isDefault = MATERIAL_FOLDERS.includes(f)
            const isActive  = folder === f
            if (isDefault) {
              return (
                <button key={f} className={`ait-tab${isActive ? ' active' : ''}`} onClick={() => setFolder(f)}>
                  {f}
                </button>
              )
            }
            return (
              <div key={f} className={`ait-tab${isActive ? ' active' : ''} ait-tab-with-x`}>
                <button
                  style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, font: 'inherit', fontSize: 'inherit' }}
                  onClick={() => setFolder(f)}
                >
                  {f}
                </button>
                <button className="ait-tab-x-btn" onClick={e => { e.stopPropagation(); handleDeleteFolder(f) }}>
                  <X size={10} strokeWidth={2} />
                </button>
              </div>
            )
          })}
        </div>
        {addingFolder ? (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              className="ait-text-input"
              style={{ width: 120 }}
              placeholder="分類名稱"
              value={newFolderName}
              autoFocus
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAddFolder()
                if (e.key === 'Escape') { setAddingFolder(false); setNewFolderName('') }
              }}
            />
            <button className="ait-btn-primary" style={{ height: 32, fontSize: 12, padding: '0 12px' }} onClick={handleAddFolder}>確認</button>
            <button className="ait-ghost-btn" onClick={() => { setAddingFolder(false); setNewFolderName('') }}>取消</button>
          </div>
        ) : (
          <button className="ait-ghost-btn ait-material-add-folder" onClick={() => setAddingFolder(true)}>
            <Plus size={13} strokeWidth={2} />新增分類
          </button>
        )}
      </div>

      {/* Add form */}
      <div className="ait-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input
          className="ait-text-input"
          style={{ width: '100%', boxSizing: 'border-box' }}
          placeholder="貼上影片連結（必填）"
          value={urlInput}
          onChange={e => setUrlInput(e.target.value)}
        />
        <input
          className="ait-text-input"
          style={{ width: '100%', boxSizing: 'border-box' }}
          placeholder="說明這個素材的亮點或用途（必填）"
          value={noteInput}
          onChange={e => setNoteInput(e.target.value)}
        />
        <div className="ait-row">
          <select
            className="ait-text-input ait-select"
            style={{ flex: 1 }}
            value={folderSelect}
            onChange={e => setFolderSelect(e.target.value)}
          >
            <option value="">選擇分類（必選）</option>
            {folders.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <button
            className="ait-btn-primary"
            onClick={handleAdd}
            disabled={!canAdd}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
          >
            <Plus size={15} strokeWidth={2} />
            新增
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="ait-empty-state">
          <Bookmark size={36} strokeWidth={1.2} style={{ color: 'var(--gray-500)' }} />
          <p className="ait-empty-text">這個資料夾還沒有素材，快來新增吧</p>
        </div>
      ) : canSeeAll ? (
        <div className="ait-material-list">
          {items.map(it => <MaterialCard key={it.id} item={it} onDelete={() => handleDelete(it.id)} />)}
        </div>
      ) : (
        <div className="ait-blur-zone">
          <div className="ait-blur-inner">
            <div className="ait-material-list">
              {items.map(it => <MaterialCard key={it.id} item={it} onDelete={() => handleDelete(it.id)} />)}
            </div>
          </div>
          <div className="ait-upgrade-wall">
            <p className="ait-upgrade-wall-text">
              頂流私塾學員專屬｜建立專屬靈感庫，隨時查看並管理你的爆款素材
            </p>
            <button className="ait-upgrade-wall-btn" disabled>
              即將開放
            </button>
          </div>
        </div>
      )}

      {showModal && <UpgradeModal onClose={() => setShowModal(false)} />}
    </>
  )
}

// ══════════════════════════════════════════════════════
//  流量熱點 page
// ══════════════════════════════════════════════════════

function TrendingPage() {
  const { currentUser } = useAuth()
  const canSeeAll = deriveAITier(currentUser) === 'advanced'

  const [trendSet,    setTrendSet]    = useState(0)
  const [selectedIdx, setSelectedIdx] = useState(null)
  const [industries,  setIndustries]  = useState({})
  const [scripts,     setScripts]     = useState({})
  const [generating,  setGenerating]  = useState({})
  const [showModal,   setShowModal]   = useState(false)

  const topics = TRENDING_SETS[trendSet % TRENDING_SETS.length]

  const handleRefresh = () => {
    setTrendSet(p => p + 1); setSelectedIdx(null)
    setIndustries({}); setScripts({}); setGenerating({})
  }

  const handleSelect = i => setSelectedIdx(prev => prev === i ? null : i)

  const handleGenerate = async i => {
    const ind = (industries[i] || '').trim()
    if (!ind) return
    setGenerating(p => ({ ...p, [i]: true })); setScripts(p => ({ ...p, [i]: null }))
    await new Promise(r => setTimeout(r, 1100))
    setScripts(p => ({ ...p, [i]: MOCK_SCRIPTS.knowledge(`${topics[i].title} × ${ind}`) }))
    setGenerating(p => ({ ...p, [i]: false }))
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 className="ait-tool-title">流量熱點</h1>
          <p className="ait-tool-desc">今日台灣熱搜話題，結合你的行業生成爆款腳本</p>
        </div>
        <button className="ait-ghost-btn" onClick={handleRefresh} style={{ flexShrink: 0, marginTop: 4 }}>
          <RefreshCw size={13} strokeWidth={1.8} />
          重新整理
        </button>
      </div>

      <div className="ait-trending-list">
        {topics.map((topic, i) => {
          const ts       = TRAFFIC_STYLE[topic.traffic] || TRAFFIC_STYLE.low
          const expanded = selectedIdx === i
          const script   = scripts[i]
          const gen      = generating[i]

          return (
            <div key={`${trendSet}-${i}`} className="ait-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="ait-trending-hd">
                <div className="ait-trending-info">
                  <span className="ait-trending-title">{topic.title}</span>
                  <span className="ait-traffic-tag" style={{ background: ts.bg, color: ts.color, borderColor: ts.border }}>
                    {ts.label}
                  </span>
                </div>
                <button className="ait-ghost-btn" onClick={() => handleSelect(i)}>
                  <ChevronRight size={13} strokeWidth={2}
                    style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                  選擇這個話題
                </button>
              </div>

              {expanded && (
                <div className="ait-trending-expand">
                  {!script && !gen && (
                    <div className="ait-row">
                      <input
                        className="ait-text-input"
                        placeholder="例如：美食、健身、親子育兒..."
                        value={industries[i] || ''}
                        onChange={e => setIndustries(p => ({ ...p, [i]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && handleGenerate(i)}
                      />
                      <button className="ait-btn-primary" onClick={() => handleGenerate(i)}
                        disabled={!(industries[i] || '').trim()}>
                        結合生成腳本
                      </button>
                    </div>
                  )}

                  {gen && (
                    <div className="ait-script-loading"><Spinner /> 生成中…</div>
                  )}

                  {script && !gen && (
                    <div className="ait-trending-script">
                      <ScriptPreviewGate
                        script={script}
                        canSeeAll={canSeeAll}
                        onUpgrade={() => setShowModal(true)}
                        upgradeText="頂流私塾學員專屬｜完整腳本架構，結合熱點生成你的爆款內容"
                      />

                      <button className="ait-ghost-btn" style={{ marginTop: 8 }}
                        onClick={() => { setScripts(p => ({ ...p, [i]: null })); setIndustries(p => ({ ...p, [i]: '' })) }}>
                        <RefreshCw size={13} strokeWidth={1.8} />
                        重新輸入
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showModal && <UpgradeModal onClose={() => setShowModal(false)} />}
    </>
  )
}

// ══════════════════════════════════════════════════════
//  頂流助理 page
// ══════════════════════════════════════════════════════

function ChatPage({ onGoToTopics }) {
  const { currentUser } = useAuth()
  const aiTier  = deriveAITier(currentUser)
  const quota   = ASSISTANT_QUOTA[aiTier] ?? 3

  const today      = new Date().toISOString().slice(0, 10)
  const storageKey = `tlt_assistant_${today}`

  const [usedCount,  setUsedCount]  = useState(() => { try { return parseInt(localStorage.getItem(storageKey) || '0', 10) } catch { return 0 } })
  const [messages,   setMessages]   = useState([])
  const [input,      setInput]      = useState('')
  const [generating, setGenerating] = useState(false)
  const [showModal,  setShowModal]  = useState(false)
  const endRef = useRef(null)

  const remaining = quota === Infinity ? Infinity : Math.max(0, quota - usedCount)
  const exhausted  = quota !== Infinity && remaining <= 0

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, generating])

  const handleSend = async () => {
    if (!input.trim() || generating || exhausted) return
    const userMsg = input.trim()
    setInput('')
    setMessages(p => [...p, { role: 'user', content: userMsg }])
    setGenerating(true)
    const next = usedCount + 1
    setUsedCount(next)
    localStorage.setItem(storageKey, String(next))
    await new Promise(r => setTimeout(r, 1000))
    setMessages(p => [...p, { role: 'ai', content: buildAssistantReply(userMsg) }])
    setGenerating(false)
  }

  const quotaLabel = quota === Infinity
    ? '無限制'
    : `今日剩餘 ${remaining} / ${quota} 次`

  return (
    <div className="ait-chat-wrap">
      <div className="ait-chat-hd">
        <div>
          <h1 className="ait-tool-title" style={{ marginBottom: 2 }}>頂流助理</h1>
          <p className="ait-tool-desc" style={{ margin: 0 }}>解決你90%的創作問題</p>
        </div>
        <span className="ait-chat-remaining">
          <Bot size={13} strokeWidth={1.8} />
          {quotaLabel}
        </span>
      </div>

      <div className="ait-chat-messages">
        {messages.length === 0 && !generating && (
          <div className="ait-empty-state" style={{ minHeight: 160 }}>
            <Bot size={36} strokeWidth={1.2} style={{ color: 'var(--gray-500)' }} />
            <p className="ait-empty-text">輸入你的創作問題，頂流助理為你解答</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`ait-chat-msg ait-chat-msg-${msg.role}`}>
            <div className="ait-chat-msg-body">{msg.content}</div>
            {msg.role === 'ai' && (
              <div className="ait-chat-msg-actions">
                <button className="ait-ghost-btn" onClick={onGoToTopics}>
                  <TrendingUp size={13} strokeWidth={1.8} />
                  套用到爆款選題
                </button>
                <button className="ait-ghost-btn" onClick={() => window.location.href = '/dashboard/courses'}>
                  <BookOpen size={13} strokeWidth={1.8} />
                  去看對應課程
                </button>
              </div>
            )}
          </div>
        ))}

        {generating && (
          <div className="ait-chat-msg ait-chat-msg-ai">
            <div className="ait-chat-msg-body ait-chat-typing"><Spinner /></div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      <div className="ait-chat-input-bar">
        {exhausted && (
          <div className="ait-chat-limit-bar">
            <span>今日次數已用完，升級解鎖更多次數</span>
            <button className="ait-upgrade-wall-btn"
              style={{ padding: '0 16px', height: 32, fontSize: 12 }}
              disabled>
              即將開放
            </button>
          </div>
        )}
        <div className="ait-chat-input-row">
          <textarea
            className="ait-chat-textarea"
            rows={3}
            placeholder={exhausted ? '' : '例如：我想做美業秘密相關內容，我在台北做美容，不知道從哪個角度切入...'}
            value={input}
            disabled={exhausted || generating}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          />
          <button className="ait-chat-send" onClick={handleSend}
            disabled={!input.trim() || generating || exhausted}>
            <Send size={16} strokeWidth={1.8} />
          </button>
        </div>
      </div>

      {showModal && <UpgradeModal onClose={() => setShowModal(false)} />}
    </div>
  )
}

// ══════════════════════════════════════════════════════
//  企劃定位 page
// ══════════════════════════════════════════════════════

const PLAN_TOPIC_TABS = [
  { id: 'knowledge', label: '教知識', Icon: BookOpen      },
  { id: 'opinion',   label: '說觀點', Icon: MessageSquare },
  { id: 'story',     label: '說故事', Icon: BookMarked    },
  { id: 'process',   label: '曬過程', Icon: Video         },
]

function PlanningPage() {
  const { currentUser } = useAuth()
  const aiTier    = deriveAITier(currentUser)
  const canSeeAll = aiTier === 'advanced'

  // ── Form ──────────────────────────────────────────────
  const [form, setForm] = useState({ name: '', industry: '', goal: '', region: '', accountStatus: '' })
  const setField    = (key, val) => setForm(p => ({ ...p, [key]: val }))
  const formFilled  = Object.values(form).every(v => v.trim())

  // ── Generation state ──────────────────────────────────
  const [generated,  setGenerated]  = useState(false)
  const [generating, setGenerating] = useState(false)

  // ── Correction / re-generate state ───────────────────
  const [corrections, setCorrections] = useState({})
  const [regenerating, setRegenerating] = useState({})
  const [corrected,   setCorrected]   = useState({})

  // ── Topic tabs ────────────────────────────────────────
  const [topicTab,   setTopicTab]   = useState('knowledge')
  const [topicRound, setTopicRound] = useState({ knowledge: 0, opinion: 0, story: 0, process: 0 })

  // ── Inline topic → script flow ────────────────────────
  const [selectedTopic,        setSelectedTopic]        = useState(null)
  const [planScriptType,       setPlanScriptType]       = useState(null)
  const [planScript,           setPlanScript]           = useState(null)
  const [generatingPlanScript, setGeneratingPlanScript] = useState(false)
  const [planPractice,         setPlanPractice]         = useState('')
  const [planPracticeOk,       setPlanPracticeOk]       = useState(false)
  const [planShootFormat,      setPlanShootFormat]      = useState(null)

  const [showModal, setShowModal] = useState(false)

  // ── Initial analysis ──────────────────────────────────
  const handleGenerate = async () => {
    if (!formFilled || generating) return
    setGenerating(true)
    await new Promise(r => setTimeout(r, 1300))
    setGenerated(true)
    setGenerating(false)
  }

  // ── Correction re-generate ────────────────────────────
  const handleRegenerate = async (key, originalContent) => {
    const cor = (corrections[key] || '').trim()
    if (!cor || regenerating[key]) return
    setRegenerating(p => ({ ...p, [key]: true }))
    await new Promise(r => setTimeout(r, 900))
    setCorrected(p => ({
      ...p,
      [key]: `[已根據你的修正重新生成]\n\n${originalContent.split('\n').slice(0, 2).join('\n')}\n\n（根據「${cor}」補充）：\n本版本已針對你在${form.industry}行業的情況做個性化調整，重點強化了符合${form.region}市場特性的執行策略與差異化定位。`,
    }))
    setRegenerating(p => ({ ...p, [key]: false }))
    setCorrections(p => ({ ...p, [key]: '' }))
  }

  // ── Topic helpers ─────────────────────────────────────
  const getTopics = (tab, round) => {
    const sets = PLANNING_TOPIC_SETS[tab]
    return sets[round % sets.length].map(t => t.replace(/{ind}/g, form.industry || '你的行業'))
  }

  const handleTopicClick = topic => {
    setSelectedTopic(topic)
    setPlanScriptType(null)
    setPlanScript(null)
    setPlanPractice('')
    setPlanPracticeOk(false)
    setPlanShootFormat(null)
  }

  // ── Script generation ─────────────────────────────────
  useEffect(() => {
    if (!selectedTopic || !planScriptType) { setPlanScript(null); return }
    let cancelled = false
    setGeneratingPlanScript(true)
    setPlanScript(null)
    const t = setTimeout(() => {
      if (cancelled) return
      const gen = MOCK_SCRIPTS[planScriptType]
      setPlanScript(gen ? gen(selectedTopic) : null)
      setGeneratingPlanScript(false)
    }, 900)
    return () => { cancelled = true; clearTimeout(t) }
  }, [selectedTopic, planScriptType])

  // ── Download individual topic ─────────────────────────
  const handleTopicDownload = () => {
    if (!planPractice || !planShootFormat) return
    const typeLabel   = SCRIPT_TYPES.find(s => s.id === planScriptType)?.label  || ''
    const formatLabel = SHOOT_FORMATS.find(f => f.id === planShootFormat)?.label || ''
    const content = [`選題：${selectedTopic}`, `腳本類型：${typeLabel}`, `拍攝形式：${formatLabel}`, '', '== 我的開場白練習 ==', planPractice].join('\n')
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `選題方向練習_${new Date().toLocaleDateString('zh-TW')}.txt`; a.click()
    URL.revokeObjectURL(url)
  }

  // ── Download full plan ────────────────────────────────
  const handleFullDownload = () => {
    const lines = []
    lines.push('【企劃定位完整規劃書】', `姓名：${form.name}　行業：${form.industry}　地區：${form.region}`, `商業目的：${form.goal}`, `帳號狀況：${form.accountStatus}`, '', '== 現況分析 ==')
    PLANNING_MOCK.situation.forEach(b => { lines.push(`\n【${b.title}】`); lines.push(corrected[b.key] || b.content) })
    lines.push('', '== 帳號搭建建議 ==')
    PLANNING_MOCK.account.forEach(b => { lines.push(`\n【${b.title}】`); lines.push(corrected[b.key] || b.content) })
    lines.push('', '== 三個月更新策略 ==')
    PLANNING_MOCK.months.forEach(m => {
      lines.push(`\n【${m.label}】`)
      const c = corrected[m.key]
      if (c) { lines.push(c) } else { lines.push(`目標：${m.goal}`, `內容配比：${m.ratio}`, `選題方向：${m.direction}`, `發布節奏：${m.publish}`, `直播規劃：${m.live}`) }
    })
    lines.push('', '== 商業策劃 ==')
    PLANNING_MOCK.business.forEach(b => { lines.push(`\n【${b.title}】`); lines.push(corrected[b.key] || b.content) })
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `企劃定位規劃書_${form.name}_${new Date().toLocaleDateString('zh-TW')}.txt`; a.click()
    URL.revokeObjectURL(url)
  }

  // ── Render helpers (functions, not components, to avoid unmount) ──
  const renderTextBlock = (blockKey, content) => {
    const lines   = content.split('\n')
    const visible = lines.slice(0, 2).join('\n')
    const blurred = lines.slice(2).join('\n')
    if (canSeeAll) return <div className="ait-plan-text">{content}</div>
    return (
      <>
        <div className="ait-plan-text">{visible}</div>
        {blurred && (
          <div className="ait-blur-zone" style={{ marginTop: 6 }}>
            <div className="ait-blur-inner">
              <div className="ait-plan-text">{blurred}</div>
            </div>
            <div className="ait-upgrade-wall">
              <p className="ait-upgrade-wall-text">頂流私塾專屬｜從帳號定位到三個月策略，完整規劃你的自媒體成長路徑</p>
              <button className="ait-upgrade-wall-btn" disabled>即將開放</button>
            </div>
          </div>
        )}
      </>
    )
  }

  const renderCorrectionRow = (blockKey, originalContent) => (
    <div className="ait-plan-correction">
      <input
        className="ait-text-input"
        placeholder="輸入修正方向，例如：請著重台灣市場..."
        value={corrections[blockKey] || ''}
        onChange={e => setCorrections(p => ({ ...p, [blockKey]: e.target.value }))}
        onKeyDown={e => e.key === 'Enter' && handleRegenerate(blockKey, originalContent)}
      />
      <button
        className="ait-ghost-btn"
        onClick={() => handleRegenerate(blockKey, originalContent)}
        disabled={!(corrections[blockKey] || '').trim() || !!regenerating[blockKey]}
        style={{ flexShrink: 0, whiteSpace: 'nowrap' }}
      >
        {regenerating[blockKey]
          ? <Spinner />
          : <><RefreshCw size={12} strokeWidth={1.8} />送出修正</>
        }
      </button>
    </div>
  )

  return (
    <>
      <div>
        <h1 className="ait-tool-title">企劃定位</h1>
        <p className="ait-tool-desc">從帳號定位到三個月策略，AI 為你規劃完整自媒體藍圖</p>
      </div>

      {/* ── Step 1: Form ── */}
      <div className="ait-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="ait-step-hd" style={{ marginBottom: 2 }}>
          <span className="ait-step-badge">1</span>
          <span className="ait-step-title">填寫基本資訊</span>
        </div>
        <div className="ait-plan-form-grid">
          <input className="ait-text-input" placeholder="姓名" value={form.name} onChange={e => setField('name', e.target.value)} />
          <input className="ait-text-input" placeholder="行業（例如：美業、健身、餐飲）" value={form.industry} onChange={e => setField('industry', e.target.value)} />
          <input className="ait-text-input" placeholder="商業目的（例如：招募學員、品牌推廣）" value={form.goal} onChange={e => setField('goal', e.target.value)} />
          <input className="ait-text-input" placeholder="地區（例如：台北、台灣全島）" value={form.region} onChange={e => setField('region', e.target.value)} />
          <input
            className="ait-text-input"
            style={{ gridColumn: '1 / -1' }}
            placeholder="帳號狀況（例如：剛起步、已有500粉絲但流量不穩定）"
            value={form.accountStatus}
            onChange={e => setField('accountStatus', e.target.value)}
          />
        </div>
        <button
          className="ait-btn-primary"
          style={{ alignSelf: 'flex-start' }}
          disabled={!formFilled || generating}
          onClick={handleGenerate}
        >
          {generating ? <Spinner /> : '開始分析'}
        </button>
      </div>

      {generated && (
        <>
          {/* ── Step 2: 現況分析 ── */}
          <div className="ait-plan-section">
            <div className="ait-plan-section-hd">
              <span className="ait-step-badge">2</span>
              <span className="ait-step-title">現況分析</span>
            </div>
            {PLANNING_MOCK.situation.map(block => {
              const content = corrected[block.key] || block.content
              return (
                <div key={block.key} className="ait-card ait-plan-block">
                  <div className="ait-plan-block-title">{block.title}</div>
                  {renderTextBlock(block.key, content)}
                  {canSeeAll && renderCorrectionRow(block.key, block.content)}
                </div>
              )
            })}
          </div>

          {/* ── Step 3: 帳號搭建建議 ── */}
          <div className="ait-plan-section">
            <div className="ait-plan-section-hd">
              <span className="ait-step-badge">3</span>
              <span className="ait-step-title">帳號搭建建議</span>
            </div>
            {PLANNING_MOCK.account.map(block => {
              const content = corrected[block.key] || block.content
              return (
                <div key={block.key} className="ait-card ait-plan-block">
                  <div className="ait-plan-block-title">{block.title}</div>
                  {renderTextBlock(block.key, content)}
                  {canSeeAll && renderCorrectionRow(block.key, block.content)}
                </div>
              )
            })}
          </div>

          {/* ── Step 4: 三個月更新策略 ── */}
          <div className="ait-plan-section">
            <div className="ait-plan-section-hd">
              <span className="ait-step-badge">4</span>
              <span className="ait-step-title">三個月更新策略</span>
            </div>
            <div className="ait-plan-months-grid">
              {PLANNING_MOCK.months.map(month => {
                const cor = corrected[month.key]
                const orig = `目標：${month.goal}\n配比：${month.ratio}\n方向：${month.direction}\n發布：${month.publish}\n直播：${month.live}`
                return (
                  <div key={month.key} className="ait-card ait-plan-month-card">
                    <div className="ait-plan-month-label">{month.label}</div>
                    {cor ? (
                      renderTextBlock(month.key, cor)
                    ) : (
                      <>
                        <div className="ait-plan-month-field">
                          <span className="ait-plan-month-key">目標</span>
                          <span className="ait-plan-month-val">{month.goal}</span>
                        </div>
                        <div className="ait-plan-month-field">
                          <span className="ait-plan-month-key">配比</span>
                          <span className="ait-plan-month-val">{month.ratio}</span>
                        </div>
                        {canSeeAll ? (
                          <>
                            <div className="ait-plan-month-field">
                              <span className="ait-plan-month-key">方向</span>
                              <span className="ait-plan-month-val">{month.direction}</span>
                            </div>
                            <div className="ait-plan-month-field">
                              <span className="ait-plan-month-key">發布</span>
                              <span className="ait-plan-month-val">{month.publish}</span>
                            </div>
                            <div className="ait-plan-month-field">
                              <span className="ait-plan-month-key">直播</span>
                              <span className="ait-plan-month-val">{month.live}</span>
                            </div>
                          </>
                        ) : (
                          <div className="ait-blur-zone" style={{ marginTop: 6 }}>
                            <div className="ait-blur-inner">
                              <div className="ait-plan-month-field">
                                <span className="ait-plan-month-key">方向</span>
                                <span className="ait-plan-month-val">{month.direction}</span>
                              </div>
                              <div className="ait-plan-month-field">
                                <span className="ait-plan-month-key">發布</span>
                                <span className="ait-plan-month-val">{month.publish}</span>
                              </div>
                              <div className="ait-plan-month-field">
                                <span className="ait-plan-month-key">直播</span>
                                <span className="ait-plan-month-val">{month.live}</span>
                              </div>
                            </div>
                            <div className="ait-upgrade-wall">
                              <p className="ait-upgrade-wall-text">頂流私塾專屬｜從帳號定位到三個月策略，完整規劃你的自媒體成長路徑</p>
                              <button className="ait-upgrade-wall-btn" disabled>即將開放</button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    {canSeeAll && renderCorrectionRow(month.key, orig)}
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Step 5: 商業策劃 ── */}
          <div className="ait-plan-section">
            <div className="ait-plan-section-hd">
              <span className="ait-step-badge">5</span>
              <span className="ait-step-title">商業策劃</span>
            </div>
            {PLANNING_MOCK.business.map(block => {
              const content = corrected[block.key] || block.content
              return (
                <div key={block.key} className="ait-card ait-plan-block">
                  <div className="ait-plan-block-title">{block.title}</div>
                  {renderTextBlock(block.key, content)}
                  {canSeeAll && renderCorrectionRow(block.key, block.content)}
                </div>
              )
            })}
          </div>

          {/* ── Step 6: 選題方向 ── */}
          <div className="ait-plan-section">
            <div className="ait-plan-section-hd">
              <span className="ait-step-badge">6</span>
              <span className="ait-step-title">選題方向</span>
            </div>

            <div className="ait-tab-bar">
              {PLAN_TOPIC_TABS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  className={`ait-tab${topicTab === id ? ' active' : ''}`}
                  onClick={() => { setTopicTab(id); setSelectedTopic(null); setPlanScript(null); setPlanScriptType(null) }}
                >
                  <Icon size={13} strokeWidth={1.7} style={{ marginRight: 4 }} />
                  {label}
                </button>
              ))}
            </div>

            <div className="ait-plan-topic-list">
              {getTopics(topicTab, topicRound[topicTab]).map((topic, i) => (
                <div
                  key={`${topicTab}-${topicRound[topicTab]}-${i}`}
                  className={`ait-plan-topic-item${selectedTopic === topic ? ' selected' : ''}`}
                  onClick={() => handleTopicClick(topic)}
                >
                  <span className="ait-plan-topic-num">{i + 1}</span>
                  <span className="ait-plan-topic-text">{topic}</span>
                  <ChevronRight size={14} strokeWidth={1.8} style={{ color: 'var(--gray-500)', flexShrink: 0 }} />
                </div>
              ))}
            </div>

            <button
              className="ait-ghost-btn"
              style={{ alignSelf: 'flex-start' }}
              onClick={() => {
                setTopicRound(p => ({ ...p, [topicTab]: p[topicTab] + 1 }))
                setSelectedTopic(null); setPlanScript(null); setPlanScriptType(null)
              }}
            >
              <RefreshCw size={13} strokeWidth={1.8} />
              換一輪
            </button>

            {selectedTopic && (
              <>
                {/* Script type selection */}
                <div className="ait-step-card">
                  <div className="ait-step-hd">
                    <span className="ait-step-badge" style={{ background: 'rgba(124,58,237,0.2)', color: '#a78bfa', fontSize: 11 }}>腳本</span>
                    <span className="ait-step-title" style={{ fontSize: 12.5, color: 'var(--gray-600)' }}>{selectedTopic}</span>
                  </div>
                  <div className="ait-option-grid">
                    {SCRIPT_TYPES.map(({ id, label, Icon }) => (
                      <button
                        key={id}
                        className={`ait-option-btn${planScriptType === id ? ' selected' : ''}`}
                        onClick={() => { setPlanScriptType(id); setPlanPractice(''); setPlanPracticeOk(false); setPlanShootFormat(null) }}
                      >
                        <Icon size={22} strokeWidth={1.5} />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Script content */}
                {(generatingPlanScript || planScript) && (
                  <div className="ait-script-card">
                    <div className="ait-script-card-hd">
                      <span className="ait-script-card-label">腳本內容</span>
                      {planScriptType && (
                        <span className="ait-script-type-chip">{SCRIPT_TYPES.find(s => s.id === planScriptType)?.label}</span>
                      )}
                    </div>
                    {generatingPlanScript ? (
                      <div className="ait-script-loading"><Spinner /> 生成中…</div>
                    ) : (
                      <>
                        {planScript.slice(0, 2).map((sec, i) => (
                          <div key={i} className="ait-sc-sec">
                            <div className="ait-sc-heading">{sec.heading}</div>
                            <div className="ait-sc-body">{sec.body}</div>
                          </div>
                        ))}
                        {planScript.length > 2 && (
                          canSeeAll ? (
                            planScript.slice(2).map((sec, i) => (
                              <div key={i} className="ait-sc-sec">
                                <div className="ait-sc-heading">{sec.heading}</div>
                                <div className="ait-sc-body">{sec.body}</div>
                              </div>
                            ))
                          ) : (
                            <div className="ait-blur-zone">
                              <div className="ait-blur-inner">
                                {planScript.slice(2).map((sec, i) => (
                                  <div key={i} className="ait-sc-sec">
                                    <div className="ait-sc-heading">{sec.heading}</div>
                                    <div className="ait-sc-body">{sec.body}</div>
                                  </div>
                                ))}
                              </div>
                              <div className="ait-upgrade-wall">
                                <p className="ait-upgrade-wall-text">頂流私塾專屬｜從帳號定位到三個月策略，完整規劃你的自媒體成長路徑</p>
                                <button className="ait-upgrade-wall-btn" disabled>即將開放</button>
                              </div>
                            </div>
                          )
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Practice (advanced only) */}
                {planScript && !generatingPlanScript && canSeeAll && (
                  <div className="ait-step-card">
                    <div className="ait-step-hd">
                      <span className="ait-step-badge">練習</span>
                      <span className="ait-step-title">練習寫作</span>
                    </div>
                    <p className="ait-practice-hint">用自己的話寫出這支影片的開場白（至少 50 字），完成後進入下一步</p>
                    {!planPracticeOk ? (
                      <>
                        <div className="ait-practice-wrap">
                          <textarea
                            className="ait-practice-ta"
                            rows={5}
                            placeholder="寫下你的開場白…"
                            value={planPractice}
                            onChange={e => setPlanPractice(e.target.value)}
                          />
                          <span className="ait-char-count">{planPractice.length} / 50+ 字</span>
                        </div>
                        <button
                          className="ait-btn-primary"
                          disabled={planPractice.length < 50}
                          onClick={() => setPlanPracticeOk(true)}
                        >
                          提交練習
                        </button>
                      </>
                    ) : (
                      <div className="ait-practice-ok">練習已提交，可以進入下一步</div>
                    )}
                  </div>
                )}

                {/* Shoot format + download */}
                {planPracticeOk && (
                  <div className="ait-step-card">
                    <div className="ait-step-hd">
                      <span className="ait-step-badge">格式</span>
                      <span className="ait-step-title">選擇拍攝呈現</span>
                    </div>
                    <div className="ait-option-grid">
                      {SHOOT_FORMATS.map(({ id, label, Icon }) => (
                        <button
                          key={id}
                          className={`ait-option-btn${planShootFormat === id ? ' selected' : ''}`}
                          onClick={() => setPlanShootFormat(id)}
                        >
                          <Icon size={22} strokeWidth={1.5} />
                          <span>{label}</span>
                        </button>
                      ))}
                    </div>
                    {planShootFormat && (
                      <button className="ait-btn-primary ait-go-btn" onClick={handleTopicDownload}>
                        <Download size={16} strokeWidth={1.8} />
                        下載我的練習內容
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Bottom: download full plan ── */}
          <div style={{ paddingBottom: 40 }}>
            <button
              className="ait-btn-primary ait-go-btn"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
              onClick={canSeeAll ? handleFullDownload : () => setShowModal(true)}
            >
              <Download size={16} strokeWidth={1.8} />
              一鍵下載完整企劃書
            </button>
          </div>
        </>
      )}

      {showModal && <UpgradeModal onClose={() => setShowModal(false)} />}
    </>
  )
}

// ══════════════════════════════════════════════════════
//  Main component
// ══════════════════════════════════════════════════════

export default function AITools() {
  const { currentUser } = useAuth()
  const [activeId, setActiveId] = useState('topics')

  return (
    <div className="ait-page">
      <TopBar />

      <div className="ait-root">
        {/* ── Left nav ── */}
        <nav className="ait-nav">
          <div className="ait-nav-header">AI 工具箱</div>
          <div className="ait-nav-list">
            {NAV_TOOLS.map(({ id, label, Icon }) => {
              const locked = !canUseAITool(id, currentUser)
              return (
              <button
                key={id}
                className={`ait-nav-flat-item${activeId === id ? ' active' : ''}`}
                disabled={locked}
                onClick={() => { if (!locked) setActiveId(id) }}
              >
                <Icon size={15} strokeWidth={1.7} style={{ flexShrink: 0 }} />
                <span className="ait-nav-flat-label">{label}</span>
                {locked && <ComingSoonLabel />}
              </button>
              )
            })}
          </div>
        </nav>

        {/* ── Right content ── */}
        <main className="ait-main">
          <div className="ait-content">
            {activeId === 'topics'     && <CopyPage />}
            {activeId === 'analysis'   && <AnalysisPage />}
            {activeId === 'social'     && <SocialPage />}
            {activeId === 'livestream' && <LivestreamPage />}
            {activeId === 'benchmark'  && <BenchmarkPage />}
            {activeId === 'material'   && <MaterialPage />}
            {activeId === 'trending'   && <TrendingPage />}
            {activeId === 'planning'   && <PlanningPage />}
            {activeId === 'chat'       && <ChatPage onGoToTopics={() => setActiveId('topics')} />}
          </div>
        </main>
      </div>
    </div>
  )
}
