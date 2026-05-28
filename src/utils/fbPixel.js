/**
 * Facebook Pixel utility — loads Pixel only on the public sales page.
 * Reads Pixel ID from: admin system settings (localStorage) → VITE_FB_PIXEL_ID env → empty (disabled)
 */

import { getSystemSettings } from '../data/mockData'

function getPixelId() {
  try { return getSystemSettings().fbPixelId || import.meta.env.VITE_FB_PIXEL_ID || '' }
  catch { return import.meta.env.VITE_FB_PIXEL_ID || '' }
}

/** Inject FB Pixel script into <head> if not already loaded. */
export function initPixel() {
  const pixelId = getPixelId()
  if (!pixelId || window._fbPixelLoaded) return
  window._fbPixelLoaded = true

  /* eslint-disable */
  ;(function(f,b,e,v,n,t,s){
    if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)
  })(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */

  window.fbq('init', pixelId)
  window.fbq('track', 'PageView')
  console.log(`[FB Pixel] ✅ Pixel ${pixelId} 已載入，PageView 已觸發`)
}

function track(event, params = {}) {
  if (!window.fbq) return
  window.fbq('track', event, params)
  console.log(`[FB Pixel] 📊 ${event}`, params)
}

export const fbq = {
  pageView:        ()              => track('PageView'),
  viewContent:     ()              => track('ViewContent', { content_name: '銷售頁' }),
  addToCart:       ()              => track('AddToCart',   { value: 980, currency: 'TWD', content_name: '體驗課時段選擇' }),
  initiateCheckout:()              => track('InitiateCheckout', { value: 980, currency: 'TWD' }),
  purchase:        (amount, name)  => track('Purchase', { value: amount, currency: 'TWD', content_name: name }),
}
