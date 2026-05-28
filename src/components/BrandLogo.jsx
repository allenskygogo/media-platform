/**
 * TOP LEVEL TRAFFIC brand mark
 * TT geometric: shared gradient crossbar + blue stem (left) + purple stem (right)
 */
export default function BrandLogo({ size = 36 }) {
  const h = size
  const w    = Math.round(size * 1.25)  // 5:4 ratio
  const barH = Math.round(h * 0.18)   // crossbar height
  const stemW = Math.round(w * 0.14)  // stem width
  const lStemX = Math.round(w * 0.20) // left stem x
  const rStemX = Math.round(w * 0.66) // right stem x

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" aria-label="TOP LEVEL TRAFFIC logo">
      <defs>
        <linearGradient id="ttBar" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#4F9FFF" />
          <stop offset="100%" stopColor="#A855F7" />
        </linearGradient>
      </defs>
      {/* Shared gradient crossbar */}
      <rect x="0" y="0" width={w} height={barH} rx="1.5" fill="url(#ttBar)" />
      {/* Left T stem — blue */}
      <rect x={lStemX} y={barH} width={stemW} height={h - barH} rx="1.5" fill="#4F9FFF" />
      {/* Right T stem — purple */}
      <rect x={rStemX} y={barH} width={stemW} height={h - barH} rx="1.5" fill="#A855F7" />
    </svg>
  )
}
