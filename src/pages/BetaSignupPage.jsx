import { useEffect } from 'react'

const ANALYTICS_KEY = 'resource_pack_analytics'

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback))
  } catch {
    return fallback
  }
}

function detectTrafficSource() {
  const params = new URLSearchParams(window.location.search)
  const utmSource = params.get('utm_source')?.toLowerCase()
  if (utmSource) {
    if (utmSource.includes('facebook') || utmSource.includes('meta') || utmSource.includes('fb')) return 'meta'
    if (utmSource.includes('google')) return 'google'
    if (utmSource.includes('instagram') || utmSource.includes('ig')) return 'instagram'
    if (utmSource.includes('line')) return 'line'
    return utmSource
  }
  if (params.get('fbclid')) return 'meta'
  if (params.get('gclid')) return 'google'
  const referrer = document.referrer.toLowerCase()
  if (referrer.includes('instagram.com')) return 'instagram'
  if (referrer.includes('facebook.com')) return 'meta'
  if (referrer.includes('google.')) return 'google'
  if (referrer.includes('line.me') || referrer.includes('lin.ee')) return 'line'
  return referrer ? 'referral' : 'direct'
}

function trackResourcePackEvent(type) {
  const event = {
    id: `${type}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    source: detectTrafficSource(),
    path: window.location.pathname,
    createdAt: new Date().toISOString(),
  }
  const events = readJson(ANALYTICS_KEY, [])
  localStorage.setItem(ANALYTICS_KEY, JSON.stringify([event, ...events].slice(0, 800)))
}

export default function BetaSignupPage() {
  useEffect(() => {
    trackResourcePackEvent('page_view')
  }, [])

  return (
    <iframe
      src="/resource-pack-landing.html"
      title="頂級流量著陸頁"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        border: 0,
        background: '#071426',
      }}
    />
  )
}
