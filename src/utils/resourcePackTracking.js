import { hasSupabase, supabase } from '../lib/supabase'
import { getSystemSettings } from '../data/mockData'

const ANALYTICS_KEY = 'resource_pack_analytics'
const SYSTEM_SETTINGS_KEY = 'mp_system_settings'

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback))
  } catch {
    return fallback
  }
}

function readSystemSettings() {
  try {
    return { ...getSystemSettings(), ...readJson(SYSTEM_SETTINGS_KEY, {}) }
  } catch {
    return readJson(SYSTEM_SETTINGS_KEY, {})
  }
}

export function getResourcePackTrackingSettings() {
  const settings = readSystemSettings()
  return {
    fbPixelId: settings.fbPixelId || import.meta.env.VITE_FB_PIXEL_ID || import.meta.env.VITE_META_PIXEL_ID || '',
    ga4MeasurementId: settings.ga4MeasurementId || import.meta.env.VITE_GA4_MEASUREMENT_ID || '',
    gtmContainerId: settings.gtmContainerId || import.meta.env.VITE_GTM_CONTAINER_ID || '',
  }
}

export function detectTrafficSource() {
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

function saveLocalEvent(event) {
  const events = readJson(ANALYTICS_KEY, [])
  localStorage.setItem(ANALYTICS_KEY, JSON.stringify([event, ...events].slice(0, 800)))
}

function initMetaPixel(pixelId) {
  if (!pixelId || window._resourcePackFbPixelId === pixelId) return
  window._resourcePackFbPixelId = pixelId
  window.fbq = window.fbq || function fbq() {
    window.fbq.callMethod
      ? window.fbq.callMethod.apply(window.fbq, arguments)
      : window.fbq.queue.push(arguments)
  }
  if (!window._fbq) window._fbq = window.fbq
  window.fbq.push = window.fbq
  window.fbq.loaded = true
  window.fbq.version = '2.0'
  window.fbq.queue = window.fbq.queue || []
  if (!document.querySelector('script[data-resource-pack-fb-pixel]')) {
    const script = document.createElement('script')
    script.async = true
    script.dataset.resourcePackFbPixel = 'true'
    script.src = 'https://connect.facebook.net/en_US/fbevents.js'
    document.head.appendChild(script)
  }
  window.fbq('init', pixelId)
}

function initGa4(measurementId) {
  if (!measurementId || window._resourcePackGa4Id === measurementId) return
  window._resourcePackGa4Id = measurementId
  window.dataLayer = window.dataLayer || []
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments)
  }
  if (!document.querySelector(`script[data-resource-pack-ga4="${measurementId}"]`)) {
    const script = document.createElement('script')
    script.async = true
    script.dataset.resourcePackGa4 = measurementId
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`
    document.head.appendChild(script)
  }
  window.gtag('js', new Date())
  window.gtag('config', measurementId, { send_page_view: false })
}

function initGtm(containerId) {
  if (!containerId || window._resourcePackGtmId === containerId) return
  window._resourcePackGtmId = containerId
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' })
  if (!document.querySelector(`script[data-resource-pack-gtm="${containerId}"]`)) {
    const script = document.createElement('script')
    script.async = true
    script.dataset.resourcePackGtm = containerId
    script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(containerId)}`
    document.head.appendChild(script)
  }
}

function sendAdEvents(type, event) {
  const { fbPixelId, ga4MeasurementId, gtmContainerId } = getResourcePackTrackingSettings()
  if (fbPixelId) initMetaPixel(fbPixelId)
  if (ga4MeasurementId) initGa4(ga4MeasurementId)
  if (gtmContainerId) initGtm(gtmContainerId)

  if (window.fbq) {
    if (type === 'page_view') window.fbq('track', 'PageView')
    if (type === 'view_content') window.fbq('track', 'ViewContent', { content_name: '資料包著陸頁' })
    if (type === 'line_click') window.fbq('track', 'Lead', { content_name: 'LINE 報名資料包' })
    if (type === 'line_open') window.fbq('track', 'Contact', { content_name: '開啟 LINE 官方帳號' })
    if (type === 'line_copy') window.fbq('trackCustom', 'LineIdCopy', { content_name: '複製 LINE ID' })
  }

  if (window.gtag) {
    window.gtag('event', type, {
      event_category: 'resource_pack',
      event_label: event.source,
      page_path: event.path,
    })
  }

  if (window.dataLayer) {
    window.dataLayer.push({
      event: `resource_pack_${type}`,
      resource_pack_source: event.source,
      resource_pack_path: event.path,
    })
  }
}

async function saveRemoteEvent(event) {
  if (!hasSupabase) return
  try {
    await supabase.from('resource_pack_events').insert({
      event_type: event.type,
      source: event.source,
      path: event.path,
      referrer: event.referrer,
      user_agent: event.userAgent,
      metadata: event.metadata,
    })
  } catch (error) {
    console.warn('[ResourcePackTracking] remote event failed', error)
  }
}

export function trackResourcePackEvent(type, metadata = {}) {
  const event = {
    id: `${type}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    source: detectTrafficSource(),
    path: window.location.pathname,
    referrer: document.referrer || '',
    userAgent: navigator.userAgent || '',
    metadata,
    createdAt: new Date().toISOString(),
  }
  saveLocalEvent(event)
  sendAdEvents(type, event)
  saveRemoteEvent(event)
  return event
}

export async function fetchResourcePackEvents() {
  const localEvents = readJson(ANALYTICS_KEY, [])
  if (!hasSupabase) return localEvents
  try {
    const { data, error } = await supabase
      .from('resource_pack_events')
      .select('id,event_type,source,path,metadata,created_at')
      .order('created_at', { ascending: false })
      .limit(1000)
    if (error) throw error
    return (data || []).map(event => ({
      id: event.id,
      type: event.event_type,
      source: event.source,
      path: event.path,
      metadata: event.metadata || {},
      createdAt: event.created_at,
    }))
  } catch (error) {
    console.warn('[ResourcePackTracking] fetch remote events failed', error)
    return localEvents
  }
}
