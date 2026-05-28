/**
 * Thin-line SVG icon library
 * All icons: stroke="currentColor", fill="none", strokeLinecap="round", strokeLinejoin="round"
 */

const base = (size, stroke, strokeWidth, className, children) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={stroke} strokeWidth={strokeWidth}
    strokeLinecap="round" strokeLinejoin="round"
    className={className}
  >
    {children}
  </svg>
)

export const IconHome = ({ size = 20, stroke = 'currentColor', strokeWidth = 1.5, className = '' }) =>
  base(size, stroke, strokeWidth, className, <>
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
    <polyline points="9,22 9,12 15,12 15,22"/>
  </>)

export const IconBook = ({ size = 20, stroke = 'currentColor', strokeWidth = 1.5, className = '' }) =>
  base(size, stroke, strokeWidth, className, <>
    <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
    <line x1="9" y1="7" x2="15" y2="7"/>
    <line x1="9" y1="11" x2="13" y2="11"/>
  </>)

export const IconPlay = ({ size = 20, stroke = 'currentColor', strokeWidth = 1.5, className = '' }) =>
  base(size, stroke, strokeWidth, className, <>
    <circle cx="12" cy="12" r="10"/>
    <polygon points="10,8 16,12 10,16" fill={stroke} stroke="none"/>
  </>)

export const IconStar = ({ size = 20, stroke = 'currentColor', strokeWidth = 1.5, className = '' }) =>
  base(size, stroke, strokeWidth, className, <>
    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
  </>)

export const IconAI = ({ size = 20, stroke = 'currentColor', strokeWidth = 1.5, className = '' }) =>
  base(size, stroke, strokeWidth, className, <>
    <path d="M12 2l1.5 4h4l-3.2 2.3 1.2 3.7L12 10l-3.5 2 1.2-3.7L6.5 6h4z"/>
    <path d="M5 17l1.5-2.5M19 17l-1.5-2.5"/>
    <path d="M8.5 20h7"/>
    <path d="M12 14.5V20"/>
    <circle cx="5" cy="18" r="1.5"/>
    <circle cx="19" cy="18" r="1.5"/>
  </>)

export const IconCalendar = ({ size = 20, stroke = 'currentColor', strokeWidth = 1.5, className = '' }) =>
  base(size, stroke, strokeWidth, className, <>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
    <line x1="8" y1="14" x2="10" y2="14"/>
    <line x1="14" y1="14" x2="16" y2="14"/>
  </>)

export const IconUser = ({ size = 20, stroke = 'currentColor', strokeWidth = 1.5, className = '' }) =>
  base(size, stroke, strokeWidth, className, <>
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </>)

export const IconTrophy = ({ size = 20, stroke = 'currentColor', strokeWidth = 1.5, className = '' }) =>
  base(size, stroke, strokeWidth, className, <>
    <polyline points="8,21 12,17 16,21"/>
    <line x1="12" y1="17" x2="12" y2="11"/>
    <path d="M6.5 4h11L16 11H8z"/>
    <path d="M8 4c0 0-2 0-2 2.5S8 11 8 11"/>
    <path d="M16 4c0 0 2 0 2 2.5S16 11 16 11"/>
  </>)

export const IconClock = ({ size = 20, stroke = 'currentColor', strokeWidth = 1.5, className = '' }) =>
  base(size, stroke, strokeWidth, className, <>
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12,6 12,12 16,14"/>
  </>)

export const IconCheck = ({ size = 20, stroke = 'currentColor', strokeWidth = 2, className = '' }) =>
  base(size, stroke, strokeWidth, className, <>
    <polyline points="20,6 9,17 4,12"/>
  </>)

export const IconArrow = ({ size = 20, stroke = 'currentColor', strokeWidth = 1.5, className = '' }) =>
  base(size, stroke, strokeWidth, className, <>
    <line x1="5" y1="12" x2="19" y2="12"/>
    <polyline points="12,5 19,12 12,19"/>
  </>)

export const IconCrown = ({ size = 20, stroke = 'currentColor', strokeWidth = 1.5, className = '' }) =>
  base(size, stroke, strokeWidth, className, <>
    <path d="M2 19h20"/>
    <path d="M2 19l3-11 5 6 2-8 2 8 5-6 3 11"/>
    <circle cx="7" cy="8" r="1" fill={stroke} stroke="none"/>
    <circle cx="12" cy="4" r="1" fill={stroke} stroke="none"/>
    <circle cx="17" cy="8" r="1" fill={stroke} stroke="none"/>
  </>)

export const IconGrid = ({ size = 20, stroke = 'currentColor', strokeWidth = 1.5, className = '' }) =>
  base(size, stroke, strokeWidth, className, <>
    <rect x="3" y="3" width="7" height="7" rx="1"/>
    <rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="14" y="14" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/>
  </>)

export const IconWave = ({ size = 20, stroke = 'currentColor', strokeWidth = 1.5, className = '' }) =>
  base(size, stroke, strokeWidth, className, <>
    <rect x="3" y="9" width="3" height="13" rx="1"/>
    <rect x="9" y="4" width="3" height="18" rx="1"/>
    <rect x="15" y="7" width="3" height="14" rx="1"/>
    <rect x="21" y="11" width="3" height="9" rx="1"/>
  </>)

export const IconDollar = ({ size = 20, stroke = 'currentColor', strokeWidth = 1.5, className = '' }) =>
  base(size, stroke, strokeWidth, className, <>
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 6v12"/>
    <path d="M15 9H10.5a2.5 2.5 0 000 5H13a2.5 2.5 0 010 5H8.5"/>
  </>)

export const IconChart = ({ size = 20, stroke = 'currentColor', strokeWidth = 1.5, className = '' }) =>
  base(size, stroke, strokeWidth, className, <>
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/>
    <line x1="2" y1="20" x2="22" y2="20"/>
  </>)

export const IconZap = ({ size = 20, stroke = 'currentColor', strokeWidth = 1.5, className = '' }) =>
  base(size, stroke, strokeWidth, className, <>
    <polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/>
  </>)

export const IconTimer = ({ size = 20, stroke = 'currentColor', strokeWidth = 1.5, className = '' }) =>
  base(size, stroke, strokeWidth, className, <>
    <circle cx="12" cy="13" r="9"/>
    <polyline points="12,9 12,13 15,15"/>
    <path d="M9 2h6"/>
    <path d="M12 2v2"/>
  </>)

export const IconTrendingUp = ({ size = 20, stroke = 'currentColor', strokeWidth = 1.5, className = '' }) =>
  base(size, stroke, strokeWidth, className, <>
    <polyline points="23,6 13.5,15.5 8.5,10.5 1,18"/>
    <polyline points="17,6 23,6 23,12"/>
  </>)

export const IconFileText = ({ size = 20, stroke = 'currentColor', strokeWidth = 1.5, className = '' }) =>
  base(size, stroke, strokeWidth, className, <>
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
    <polyline points="14,2 14,8 20,8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <line x1="10" y1="9" x2="8" y2="9"/>
  </>)

export const IconShare2 = ({ size = 20, stroke = 'currentColor', strokeWidth = 1.5, className = '' }) =>
  base(size, stroke, strokeWidth, className, <>
    <circle cx="18" cy="5" r="3"/>
    <circle cx="6" cy="12" r="3"/>
    <circle cx="18" cy="19" r="3"/>
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
  </>)

export const IconTarget = ({ size = 20, stroke = 'currentColor', strokeWidth = 1.5, className = '' }) =>
  base(size, stroke, strokeWidth, className, <>
    <circle cx="12" cy="12" r="10"/>
    <circle cx="12" cy="12" r="6"/>
    <circle cx="12" cy="12" r="2"/>
  </>)

export const IconMic = ({ size = 20, stroke = 'currentColor', strokeWidth = 1.5, className = '' }) =>
  base(size, stroke, strokeWidth, className, <>
    <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
    <path d="M19 10v2a7 7 0 01-14 0v-2"/>
    <line x1="12" y1="19" x2="12" y2="23"/>
    <line x1="8" y1="23" x2="16" y2="23"/>
  </>)

export const IconLock = ({ size = 16, stroke = 'currentColor', strokeWidth = 1.5, className = '' }) =>
  base(size, stroke, strokeWidth, className, <>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0110 0v4"/>
  </>)

export const IconEye = ({ size = 20, stroke = 'currentColor', strokeWidth = 1.5, className = '' }) =>
  base(size, stroke, strokeWidth, className, <>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </>)

export const IconUsers = ({ size = 20, stroke = 'currentColor', strokeWidth = 1.5, className = '' }) =>
  base(size, stroke, strokeWidth, className, <>
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87"/>
    <path d="M16 3.13a4 4 0 010 7.75"/>
  </>)

export const IconBookmark = ({ size = 20, stroke = 'currentColor', strokeWidth = 1.5, className = '' }) =>
  base(size, stroke, strokeWidth, className, <>
    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
  </>)

// ── Course category config ───────────────────────────────────────────────────
export const COURSE_CAT_CONFIG = {
  '影音創作': { bg: 'linear-gradient(135deg, #08152a 0%, #0f2040 100%)', color: '#4F9FFF',  Icon: IconPlay   },
  '社群媒體': { bg: 'linear-gradient(135deg, #0d0820 0%, #1a0f38 100%)', color: '#A855F7',  Icon: IconGrid   },
  '音頻創作': { bg: 'linear-gradient(135deg, #061520 0%, #092030 100%)', color: '#06b6d4',  Icon: IconWave   },
  '商業變現': { bg: 'linear-gradient(135deg, #071508 0%, #0f2010 100%)', color: '#22c55e',  Icon: IconDollar },
  '數據分析': { bg: 'linear-gradient(135deg, #160e04 0%, #241800 100%)', color: '#f59e0b',  Icon: IconChart  },
  'AI 應用':  { bg: 'linear-gradient(135deg, #100616 0%, #1c0828 100%)', color: '#c084fc',  Icon: IconZap    },
}

export const DEFAULT_CAT_CONFIG = {
  bg: 'linear-gradient(135deg, #0D1117 0%, #1A1F2E 100%)', color: '#4F9FFF', Icon: IconBook
}
