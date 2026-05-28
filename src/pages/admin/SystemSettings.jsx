import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSystemSettings, saveSystemSettings } from '../../data/mockData'
import BrandLogo from '../../components/BrandLogo'

const BG_TIERS = [
  { key: 'trial',    label: '體驗課背景圖',  color: 'rgba(0,150,255,0.4)',   desc: '體驗課會員首頁 Hero 背景' },
  { key: 'standard', label: '頂流達人背景圖', color: 'rgba(0,180,255,0.4)',   desc: '頂流達人會員首頁 Hero 背景' },
  { key: 'advanced', label: '頂流私塾背景圖', color: 'rgba(150,50,255,0.4)', desc: '頂流私塾會員首頁 Hero 背景' },
  { key: 'managed',  label: '頂流代操背景圖', color: 'rgba(200,100,60,0.4)', desc: '頂流代操會員首頁 Hero 背景' },
]

export default function SystemSettings() {
  const [settings, setSettings] = useState(getSystemSettings)
  const [msg, setMsg] = useState('')
  const logoRef = useRef(null)
  const bgRefs  = useRef({})

  const flash = (t, type = 'success') => { setMsg({ text: t, type }); setTimeout(() => setMsg(''), 3500) }
  const set   = (k, v) => setSettings(s => ({ ...s, [k]: v }))
  const setBg = (tier, url) => setSettings(s => ({
    ...s, bgImages: { ...(s.bgImages || {}), [tier]: url }
  }))

  const handleSave = () => {
    saveSystemSettings(settings)
    if (settings.siteName) document.title = settings.siteName
    flash('設定已儲存 已')
  }

  /* ── Logo upload ── */
  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    const allowed = ['image/png', 'image/svg+xml', 'image/webp', 'image/jpeg']
    if (!allowed.includes(file.type)) { flash('請上傳 PNG、SVG 或 WebP 格式', 'error'); return }
    if (file.size > 2 * 1024 * 1024) { flash('檔案大小請勿超過 2 MB', 'error'); return }
    const reader = new FileReader()
    reader.onload = ev => { set('logoUrl', ev.target.result); flash('Logo 已載入，點「儲存」生效') }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  /* ── Background image upload ── */
  const handleBgUpload = (tier) => (e) => {
    const file = e.target.files?.[0]; if (!file) return
    const allowed = ['image/png', 'image/jpeg', 'image/webp']
    if (!allowed.includes(file.type)) { flash('請上傳 JPG、PNG 或 WebP 格式', 'error'); return }
    if (file.size > 10 * 1024 * 1024) { flash('檔案大小請勿超過 10 MB', 'error'); return }
    const reader = new FileReader()
    reader.onload = ev => { setBg(tier, ev.target.result); flash(`${BG_TIERS.find(t=>t.key===tier)?.label}已載入，點「儲存」生效`) }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const bgImages = settings.bgImages || {}

  return (
    <div>
      <div className="page-heading" style={{ marginBottom: 24 }}>
        <h1>系統設定</h1>
        <p>品牌設定、Logo、背景圖管理、Facebook Pixel、第三方整合</p>
      </div>

      {msg && (
        <div className={`auth-alert ${msg.type || 'success'}`} style={{ marginBottom: 16 }}>
          {msg.text}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 720 }}>
        <div className="card">
          <div className="card-body">
            <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>網站設定入口</h3>
            <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 16 }}>
              非日常營運功能集中放在這裡，主選單保留核心管理流程。
            </p>
            <div className="admin-settings-links">
              <Link to="/admin/pricing">
                <strong>定價設定</strong>
                <span>體驗課、進階方案與代操服務價格</span>
              </Link>
              <Link to="/admin/banners">
                <strong>Banner 管理</strong>
                <span>會員首頁與方案頁視覺素材</span>
              </Link>
              <Link to="/admin/page-builder">
                <strong>頁面編輯</strong>
                <span>舊版內容頁與活動頁編輯入口</span>
              </Link>
            </div>
          </div>
        </div>

        {/* ── Logo ── */}
        <div className="card">
          <div className="card-body">
            <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Logo 管理</h3>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px',
              background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius)', marginBottom: 20,
            }}>
              <div style={{ fontSize: 12, color: 'var(--gray-400)', marginRight: 4, whiteSpace: 'nowrap' }}>目前 Logo</div>
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt="Site logo" style={{ height: 36, width: 'auto', display: 'block', objectFit: 'contain' }} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <BrandLogo size={32} />
                  <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                    <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase' }}>TOP LEVEL</span>
                    <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.18em', color: '#fff', textTransform: 'uppercase' }}>TRAFFIC</span>
                  </div>
                </div>
              )}
              {settings.logoUrl && <span style={{ marginLeft: 'auto', background: 'var(--success-light)', color: 'var(--success)', padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700 }}>自訂 Logo</span>}
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input ref={logoRef} type="file" accept="image/png,image/svg+xml,image/webp,image/jpeg" style={{ display: 'none' }} onChange={handleLogoUpload} />
              <button className="btn btn-secondary" onClick={() => logoRef.current?.click()}>上傳 Logo</button>
              {settings.logoUrl && <button className="btn btn-ghost" onClick={() => { set('logoUrl', ''); flash('已重設為預設 Logo，點「儲存」生效') }}>↩ 重設為預設</button>}
            </div>
            <p style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 10 }}>支援 PNG、SVG、WebP，建議高度 36px，最大 2 MB。</p>
          </div>
        </div>

        {/* ── 會員介面背景圖 ── */}
        <div className="card">
          <div className="card-body">
            <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>會員介面背景圖</h3>
            <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 20 }}>
              上傳後自動套用至對應方案的 Hero 背景。未上傳時顯示預設 CSS 效果。
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {BG_TIERS.map(({ key, label, color, desc }) => {
                const url = bgImages[key]
                return (
                  <div key={key} style={{
                    display: 'flex', alignItems: 'center', gap: 16,
                    padding: '14px 18px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '0.5px solid rgba(255,255,255,0.08)',
                    borderRadius: 'var(--radius)',
                  }}>
                    {/* Preview */}
                    <div style={{
                      width: 100, height: 60, borderRadius: 8, flexShrink: 0, overflow: 'hidden',
                      border: '0.5px solid rgba(255,255,255,0.12)',
                      background: url
                        ? `url(${url}) center/cover`
                        : `radial-gradient(circle at 40% 50%, ${color}, transparent 70%)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {!url && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>CSS 效果</span>}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{label}</div>
                      <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>{desc}</div>
                      {url && (
                        <div style={{ fontSize: 11, color: 'var(--success)', marginTop: 4 }}>已 已設定自訂背景圖</div>
                      )}
                    </div>

                    {/* Buttons */}
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <input
                        ref={el => { if (el) bgRefs.current[key] = el }}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        style={{ display: 'none' }}
                        onChange={handleBgUpload(key)}
                      />
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => bgRefs.current[key]?.click()}
                      >
                        {url ? '重新上傳' : '上傳圖片'}
                      </button>
                      {url && (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => { setBg(key, ''); flash(`${label}已移除，點「儲存」生效`) }}
                        >
                          移除
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            <p style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 14 }}>
              支援 JPG、PNG、WebP，建議 1920×600px 以上，最大 10 MB。圖片儲存於本機瀏覽器，清除瀏覽器資料會還原。
            </p>
          </div>
        </div>

        {/* ── Brand ── */}
        <div className="card">
          <div className="card-body">
            <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>品牌設定</h3>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label className="form-label">網站名稱</label>
              <input className="form-input" value={settings.siteName || ''} onChange={e => set('siteName', e.target.value)} placeholder="頂級流量" />
              <p style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 4 }}>顯示於瀏覽器分頁標題</p>
            </div>
            <div className="form-group">
              <label className="form-label">副標題</label>
              <input className="form-input" value={settings.siteSubtitle || ''} onChange={e => set('siteSubtitle', e.target.value)} placeholder="專屬學員系統" />
            </div>
          </div>
        </div>

        {/* ── Facebook Pixel ── */}
        <div className="card">
          <div className="card-body">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ fontSize: 28 }}>數據 </div>
              <div>
                <h3 style={{ fontWeight: 700, fontSize: 16 }}>Facebook Pixel</h3>
                <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>追蹤銷售頁訪客行為與廣告轉換</p>
              </div>
              {settings.fbPixelId && (
                <span style={{ marginLeft: 'auto', background: 'var(--success-light)', color: 'var(--success)', padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700 }}>已啟用</span>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Facebook Pixel ID</label>
              <input className="form-input" value={settings.fbPixelId || ''} onChange={e => set('fbPixelId', e.target.value)} placeholder="例：1234567890123456" style={{ fontFamily: 'ui-monospace,monospace' }} />
              <p style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 6 }}>填入後自動載入到銷售頁。留空表示不追蹤。</p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={handleSave}>儲存所有設定</button>
        </div>
      </div>
    </div>
  )
}
