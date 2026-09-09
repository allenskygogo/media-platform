import { useEffect } from 'react'
import { trackResourcePackEvent } from '../utils/resourcePackTracking'

export default function BetaSignupPage() {
  useEffect(() => {
    trackResourcePackEvent('page_view')
    trackResourcePackEvent('view_content')

    const handleMessage = (event) => {
      if (event.origin !== window.location.origin) return
      if (event.data?.type !== 'resource_pack_event') return
      trackResourcePackEvent(event.data.event, event.data.metadata || {})
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
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
