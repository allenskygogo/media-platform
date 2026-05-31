import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../context/AuthContext'
import { callAI } from '../../services/aiService'
import {
  TrendingUp, FileText, Search, Share2, Mic,
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
  { id: 'topics',     label: '爆款選題', Icon: TrendingUp },
  { id: 'copy',       label: '爆款文案', Icon: FileText   },
  { id: 'analysis',   label: '爆款解析', Icon: Search     },
  { id: 'social',     label: '社群貼文', Icon: Share2     },
  { id: 'livestream', label: '直播話術', Icon: Mic        },
  { id: 'benchmark',  label: '對標分析', Icon: BarChart2  },
  { id: 'material',   label: '素材靈感', Icon: Bookmark   },
  { id: 'trending',   label: '流量熱點', Icon: Flame      },
  { id: 'planning',   label: '企劃定位', Icon: Target     },
  { id: 'chat',       label: '頂流助理', Icon: Bot        },
]

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
      heading: '【鉤子 · 前 3 秒】',
      body:    `你知道做${text.slice(0, 10)}…最關鍵的一步是什麼嗎？\n90% 的人都搞錯了——今天讓你少走三年彎路。`,
    },
    {
      heading: '【問題引入 · 30 秒】',
      body:    `很多人在做這件事的時候，犯了同一個錯誤：\n只知道努力，卻不知道方向。\n今天我要告訴你真正的核心是什麼。`,
    },
    {
      heading: '【第一個重點】',
      body:    `▌ 關鍵一：差異化定位\n同質化競爭是最大的陷阱。\n你需要找到別人沒有講過的視角，用「反常識」的方式切入。`,
    },
    {
      heading: '【第二個重點】',
      body:    `▌ 關鍵二：結構化你的內容\n每支影片只解決一個問題。\n用「問題 → 原因 → 解法 → 行動」四段架構，讓觀眾跟著你的邏輯走。`,
    },
    {
      heading: '【結尾 CTA】',
      body:    `如果你覺得有用，幫我按個讚，讓更多人看到！\n留言告訴我你目前最卡的問題是什麼，下支影片直接針對你的問題來拍！`,
    },
  ],
  opinion: text => [
    {
      heading: '【破題鉤子】',
      body:    `關於這件事，我有一個觀點可能跟你聽過的都不一樣——\n大多數人把「努力」和「正確」搞混了。`,
    },
    {
      heading: '【觀點陳述】',
      body:    `我認為，${text.slice(0, 8)}…最重要的不是技術，而是認知。\n技術可以學，但認知決定了你的上限在哪裡。`,
    },
    {
      heading: '【論據一】',
      body:    `先來說第一個理由。\n我觀察了身邊做這件事成功的人，他們都有一個共同點：\n在別人看到問題的地方，他們看到的是機會。`,
    },
    {
      heading: '【論據二】',
      body:    `第二個理由更有趣。\n研究顯示，在這個領域，決策速度比決策品質更重要。\n大多數人輸，不是輸在能力，而是輸在猶豫。`,
    },
    {
      heading: '【總結呼籲】',
      body:    `所以我的觀點是：\n想把這件事做好，先改變你看問題的角度。\n你覺得呢？留言告訴我你的想法。`,
    },
  ],
  story: text => [
    {
      heading: '【故事開場】',
      body:    `三年前，我剛接觸這件事的時候，\n窮到連吃飯都要精打細算。\n但我沒有放棄，因為我知道我只差一個關鍵。`,
    },
    {
      heading: '【衝突發生】',
      body:    `那時候每天工作 16 小時，卻始終看不到結果。\n身邊的人開始質疑我，說我在浪費時間。`,
    },
    {
      heading: '【轉折點】',
      body:    `直到有一天，一個前輩跟我說了一句話：\n「你的問題不是不夠努力，是方向錯了。」\n我當時沉默了很久，因為他說中了。`,
    },
    {
      heading: '【成果與反思】',
      body:    `改變方向後的三個月，一切完全不一樣。\n不是因為我突然變聰明了，\n而是我終於找到了適合自己的路。`,
    },
    {
      heading: '【給你的話】',
      body:    `如果你也遇到瓶頸了，\n別急著懷疑自己的能力，\n先問問自己：方向對嗎？\n留言說說你現在的狀況，我們一起來看看。`,
    },
  ],
  process: text => [
    {
      heading: '【今天要做什麼】',
      body:    `今天帶大家看看我的完整過程，\n從準備到完成，一步一步全部公開。`,
    },
    {
      heading: '【準備階段】',
      body:    `首先，開始之前一定要先確認三件事：\n第一，你的目標是什麼？\n第二，你有哪些資源？\n第三，最大的風險是什麼？`,
    },
    {
      heading: '【執行過程】',
      body:    `我習慣把執行分成三個階段：\n▌ 第一階段：打基礎（1-2 週）\n▌ 第二階段：測試優化（3-4 週）\n▌ 第三階段：放大複製（持續進行）`,
    },
    {
      heading: '【遇到的困難】',
      body:    `過程中最大的挑戰是……\n老實說，沒有想像中那麼容易，\n但每一個困難都讓我學到很多。`,
    },
    {
      heading: '【結果 + CTA】',
      body:    `最後的結果大家已經看到了。\n如果你也想開始，先從最小的一步行動，不要等到「準備好」了才動。\n點個關注，我會繼續更新這個系列！`,
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
    ['我的{ind}一天是怎麼過的，全程記錄', '從想法到成品，我做{ind}的完整流程', '我準備一場{ind}直播需要多少工作量', '{ind}訂單成交的全過程，真實拍攝', '我如何在{ind}做選題，完整流程公開', '從0到第一個{ind}客戶，我做了什麼', '我如何在{ind}管理我的時間和精力', '一個{ind}爆款的誕生，完整紀錄過程', '月收入翻倍的那個月，我在{ind}做了什麼', '我的{ind}工作空間，怎麼設計的'],
    ['新手做{ind}的第一週，全程記錄', '{ind}直播前一小時，我在準備什麼', '我是怎麼在{ind}找到第一批核心粉絲的', '做{ind}最忙的一天，是什麼感覺', '我如何同時管理{ind}帳號和正職工作', '一個{ind}項目失敗的全程記錄', '拿到{ind}大客戶那一天，我做了什麼', '我的{ind}月結算，每一分錢怎麼來的', '做{ind}賺到人生第一個10萬的過程', '{ind}從副業到主業的轉型全記錄'],
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

function buildCopyTopics(idea, round) {
  const set = TOPIC_SETS[round % TOPIC_SETS.length].slice(0, 5)
  const keyword = idea.slice(0, 8) || '你的主題'
  return set.map(t => ({
    element: t.element,
    text:    t.tpl.replace(/{ind}/g, keyword),
    traffic: t.traffic,
  }))
}

// ── Tier helper ───────────────────────────────────────
function deriveAITier(user) {
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
                <button className="ait-plan-cta">查看方案</button>
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
            {SCRIPT_TYPES.map(({ id, label, Icon }) => (
              <button key={id} className={`ait-option-btn${scriptType === id ? ' selected' : ''}`}
                onClick={() => { setScriptType(id); setShootFormat(null); setScript(null) }}>
                <Icon size={22} strokeWidth={1.5} /><span>{label}</span>
              </button>
            ))}
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

              {script.slice(0, 2).map((sec, i) => (
                <div key={i} className="ait-sc-sec">
                  <div className="ait-sc-heading">{sec.heading}</div>
                  <div className="ait-sc-body">{sec.body}</div>
                </div>
              ))}

              {script.length > 2 && (
                canSeeAll ? (
                  script.slice(2).map((sec, i) => (
                    <div key={i} className="ait-sc-sec">
                      <div className="ait-sc-heading">{sec.heading}</div>
                      <div className="ait-sc-body">{sec.body}</div>
                    </div>
                  ))
                ) : (
                  <div className="ait-blur-zone">
                    <div className="ait-blur-inner">
                      {script.slice(2).map((sec, i) => (
                        <div key={i} className="ait-sc-sec">
                          <div className="ait-sc-heading">{sec.heading}</div>
                          <div className="ait-sc-body">{sec.body}</div>
                        </div>
                      ))}
                    </div>
                    <div className="ait-upgrade-wall">
                      <p className="ait-upgrade-wall-text">頂流達人學員專屬｜掌握四大腳本公式，完整架構不再對著鏡頭不知道說什麼</p>
                      <button className="ait-upgrade-wall-btn" onClick={() => setShowModal(true)}>立即升級解鎖</button>
                    </div>
                  </div>
                )
              )}
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
  // Step 5 — practice
  const [practice,          setPractice]          = useState('')
  const [practiceSubmitted, setPracticeSubmitted] = useState(false)
  // Step 6 — shoot format + download
  const [shootFormat, setShootFormat] = useState(null)
  const [showModal,   setShowModal]   = useState(false)

  // Generate topics when scriptType is selected
  useEffect(() => {
    if (!scriptType || !idea.trim()) { setCopyTopics(null); return }
    let cancelled = false
    setGeneratingTopics(true); setCopyTopics(null); setSelectedTopicIdx(null); setScript(null)
    const t = setTimeout(() => {
      if (cancelled) return
      setCopyTopics(buildCopyTopics(idea, topicRound)); setGeneratingTopics(false)
    }, 900)
    return () => { cancelled = true; clearTimeout(t) }
  }, [scriptType, topicRound])

  const handleRefreshTopics = () => { setTopicRound(r => r + 1); setSelectedTopicIdx(null); setScript(null) }

  const handleSelectTopic = idx => {
    setSelectedTopicIdx(idx); setScript(null); setPractice(''); setPracticeSubmitted(false); setShootFormat(null)
    setGeneratingScript(true)
    setTimeout(() => {
      setScript(MOCK_SCRIPTS[scriptType](copyTopics[idx].text)); setGeneratingScript(false)
    }, 900)
  }

  const handleDownload = () => {
    const typeLabel   = SCRIPT_TYPES.find(s => s.id === scriptType)?.label  || ''
    const formatLabel = SHOOT_FORMATS.find(f => f.id === shootFormat)?.label || ''
    const content = [
      `想法：${idea}`, `腳本類型：${typeLabel}`,
      `選題：${selectedTopicIdx !== null ? copyTopics[selectedTopicIdx].text : ''}`,
      `拍攝形式：${formatLabel}`, '', '== 我的開場白練習 ==', practice,
    ].join('\n')
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url
    a.download = `爆款文案練習_${new Date().toLocaleDateString('zh-TW')}.txt`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <div>
        <h1 className="ait-tool-title">爆款文案</h1>
        <p className="ait-tool-desc">輸入你的想法，AI 幫你套入爆款腳本結構</p>
      </div>

      {/* Step 1: idea input */}
      <div className="ait-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="ait-step-hd" style={{ marginBottom: 2 }}>
          <span className="ait-step-badge">1</span>
          <span className="ait-step-title">輸入你的創作想法</span>
        </div>
        <textarea
          className="ait-practice-ta"
          rows={5}
          placeholder="輸入你的創作想法，例如：我想分享健身三個月的心路歷程，重點是從完全不運動到養成習慣的過程..."
          value={idea}
          onChange={e => setIdea(e.target.value)}
        />
        <p style={{ fontSize: 12, color: 'var(--gray-500)', margin: 0 }}>輸入你的想法，AI 幫你套入爆款腳本結構</p>
      </div>

      {/* Step 2: script type */}
      {idea.trim() && (
        <div className="ait-step-card">
          <div className="ait-step-hd">
            <span className="ait-step-badge">2</span>
            <span className="ait-step-title">選擇腳本類型</span>
          </div>
          <div className="ait-option-grid">
            {SCRIPT_TYPES.map(({ id, label, Icon }) => (
              <button key={id} className={`ait-option-btn${scriptType === id ? ' selected' : ''}`}
                onClick={() => { setScriptType(id); setSelectedTopicIdx(null); setScript(null) }}>
                <Icon size={22} strokeWidth={1.5} /><span>{label}</span>
              </button>
            ))}
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
                return (
                  <div key={i} className={`ait-copy-topic-card${selectedTopicIdx === i ? ' selected' : ''}`}>
                    <span className="ait-elem-tag" style={{ background: es.bg, color: es.color, borderColor: es.border, flexShrink: 0 }}>{t.element}</span>
                    <span className="ait-copy-topic-text">{t.text}</span>
                    <span className="ait-traffic-tag" style={{ background: ts.bg, color: ts.color, borderColor: ts.border, flexShrink: 0 }}>{ts.label}</span>
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
              {script.slice(0, 2).map((sec, i) => (
                <div key={i} className="ait-sc-sec">
                  <div className="ait-sc-heading">{sec.heading}</div>
                  <div className="ait-sc-body">{sec.body}</div>
                </div>
              ))}
              {script.length > 2 && (
                canSeeAll ? (
                  script.slice(2).map((sec, i) => (
                    <div key={i} className="ait-sc-sec">
                      <div className="ait-sc-heading">{sec.heading}</div>
                      <div className="ait-sc-body">{sec.body}</div>
                    </div>
                  ))
                ) : (
                  <div className="ait-blur-zone">
                    <div className="ait-blur-inner">
                      {script.slice(2).map((sec, i) => (
                        <div key={i} className="ait-sc-sec">
                          <div className="ait-sc-heading">{sec.heading}</div>
                          <div className="ait-sc-body">{sec.body}</div>
                        </div>
                      ))}
                    </div>
                    <div className="ait-upgrade-wall">
                      <p className="ait-upgrade-wall-text">頂流達人學員專屬｜掌握四大腳本公式，每支影片都有完整架構，不再對著鏡頭不知道說什麼</p>
                      <button className="ait-upgrade-wall-btn" onClick={() => setShowModal(true)}>立即升級解鎖</button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}

      {/* Step 5: practice (non-trial) */}
      {script && !generatingScript && canSeeAll && (
        <div className="ait-step-card">
          <div className="ait-step-hd">
            <span className="ait-step-badge">5</span>
            <span className="ait-step-title">練習寫作</span>
          </div>
          <p className="ait-practice-hint">用自己的話寫出這支影片的開場白（至少 50 字），完成後進入下一步</p>
          {!practiceSubmitted ? (
            <>
              <div className="ait-practice-wrap">
                <textarea className="ait-practice-ta" rows={6} placeholder="寫下你的開場白…"
                  value={practice} onChange={e => setPractice(e.target.value)} />
                <span className="ait-char-count">{practice.length} / 50+ 字</span>
              </div>
              <button className="ait-btn-primary" disabled={practice.length < 50}
                onClick={() => setPracticeSubmitted(true)}>提交練習</button>
            </>
          ) : (
            <div className="ait-practice-ok">練習已提交，可以進入下一步</div>
          )}
        </div>
      )}

      {/* Step 6: shoot format + download */}
      {practiceSubmitted && (
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
          {shootFormat && (
            <button className="ait-btn-primary ait-go-btn" onClick={handleDownload}>
              <Download size={16} strokeWidth={1.8} />下載我的練習內容
            </button>
          )}
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
                <button className="ait-upgrade-wall-btn" onClick={() => setShowModal(true)}>
                  立即升級解鎖
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
                  <button className="ait-upgrade-wall-btn" onClick={() => setShowModal(true)}>
                    立即升級解鎖
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
                <button className="ait-upgrade-wall-btn" onClick={() => setShowModal(true)}>
                  立即升級解鎖
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
                  <button className="ait-upgrade-wall-btn" onClick={() => setShowModal(true)}>
                    立即升級解鎖
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
            <button className="ait-upgrade-wall-btn" onClick={() => setShowModal(true)}>
              立即升級解鎖
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
                      {script.slice(0, 2).map((sec, si) => (
                        <div key={si} className="ait-sc-sec">
                          <div className="ait-sc-heading">{sec.heading}</div>
                          <div className="ait-sc-body">{sec.body}</div>
                        </div>
                      ))}

                      {script.length > 2 && (
                        canSeeAll ? (
                          script.slice(2).map((sec, si) => (
                            <div key={si} className="ait-sc-sec">
                              <div className="ait-sc-heading">{sec.heading}</div>
                              <div className="ait-sc-body">{sec.body}</div>
                            </div>
                          ))
                        ) : (
                          <div className="ait-blur-zone">
                            <div className="ait-blur-inner">
                              {script.slice(2).map((sec, si) => (
                                <div key={si} className="ait-sc-sec">
                                  <div className="ait-sc-heading">{sec.heading}</div>
                                  <div className="ait-sc-body">{sec.body}</div>
                                </div>
                              ))}
                            </div>
                            <div className="ait-upgrade-wall">
                              <p className="ait-upgrade-wall-text">
                                頂流私塾學員專屬｜完整腳本架構，結合熱點生成你的爆款內容
                              </p>
                              <button className="ait-upgrade-wall-btn" onClick={() => setShowModal(true)}>
                                立即升級解鎖
                              </button>
                            </div>
                          </div>
                        )
                      )}

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
              onClick={() => setShowModal(true)}>
              升級
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
              <button className="ait-upgrade-wall-btn" onClick={() => setShowModal(true)}>立即升級解鎖</button>
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
                              <button className="ait-upgrade-wall-btn" onClick={() => setShowModal(true)}>立即升級解鎖</button>
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
                                <button className="ait-upgrade-wall-btn" onClick={() => setShowModal(true)}>立即升級解鎖</button>
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
  const [activeId, setActiveId] = useState('topics')

  return (
    <div className="ait-page">
      <TopBar />

      <div className="ait-root">
        {/* ── Left nav ── */}
        <nav className="ait-nav">
          <div className="ait-nav-header">AI 工具箱</div>
          <div className="ait-nav-list">
            {NAV_TOOLS.map(({ id, label, Icon }) => (
              <button
                key={id}
                className={`ait-nav-flat-item${activeId === id ? ' active' : ''}`}
                onClick={() => setActiveId(id)}
              >
                <Icon size={15} strokeWidth={1.7} style={{ flexShrink: 0 }} />
                <span className="ait-nav-flat-label">{label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* ── Right content ── */}
        <main className="ait-main">
          <div className="ait-content">
            {activeId === 'topics'     && <TopicsPage />}
            {activeId === 'copy'       && <CopyPage />}
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
