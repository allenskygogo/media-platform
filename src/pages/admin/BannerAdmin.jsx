import { useState, useEffect, useRef } from 'react'
import { supabase, hasSupabase, allowLocalFallback, BANNER_BUCKET } from '../../lib/supabase'

// ── Development-only localStorage fallback (when Supabase is not configured) ──
const LS_KEY = 'banner_images'

function localLoad() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') }
  catch { return [] }
}
function localSave(arr) {
  localStorage.setItem(LS_KEY, JSON.stringify(arr))
}

// ── Default mock banners ──────────────────────────────────
const DEFAULT_BANNERS = [
  { id: 'mock-1', name: 'banner-01.jpg', url: null, color: 'linear-gradient(135deg,#0f172a 0%,#1e1b4b 50%,#312e81 100%)', uploadedAt: '2026-01-01T00:00:00Z' },
  { id: 'mock-2', name: 'banner-02.jpg', url: null, color: 'linear-gradient(135deg,#0f2027 0%,#203a43 50%,#2c5364 100%)', uploadedAt: '2026-01-02T00:00:00Z' },
  { id: 'mock-3', name: 'banner-03.jpg', url: null, color: 'linear-gradient(135deg,#1a0535 0%,#2d0f5e 50%,#1e3a8a 100%)', uploadedAt: '2026-01-03T00:00:00Z' },
]

export default function BannerAdmin() {
  const [banners, setBanners]   = useState([])
  const [uploading, setUploading] = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const fileRef = useRef(null)

  // ── Load banners ──────────────────────────────────────
  useEffect(() => { loadBanners() }, [])

  async function loadBanners() {
    if (hasSupabase && supabase) {
      const { data, error: err } = await supabase.storage
        .from(BANNER_BUCKET)
        .list('', { sortBy: { column: 'name', order: 'asc' } })

      if (err) {
        setError('無法讀取 Supabase Storage：' + err.message)
        setBanners(allowLocalFallback ? (localLoad().length ? localLoad() : DEFAULT_BANNERS) : [])
        return
      }

      const items = (data || [])
        .filter(f => /\.(jpe?g|png|webp)$/i.test(f.name))
        .map(f => {
          const { data: { publicUrl } } = supabase.storage
            .from(BANNER_BUCKET).getPublicUrl(f.name)
          return {
            id: f.id || f.name,
            name: f.name,
            url: publicUrl,
            color: null,
            uploadedAt: f.created_at || new Date().toISOString(),
          }
        })
      setBanners(items.length ? items : DEFAULT_BANNERS)
    } else if (allowLocalFallback) {
      const saved = localLoad()
      setBanners(saved.length ? saved : DEFAULT_BANNERS)
    } else {
      setBanners([])
      setError('正式環境尚未設定 Supabase Storage，無法讀取 Banner。')
    }
  }

  // ── Upload ────────────────────────────────────────────
  async function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(''); setSuccess('')
    setUploading(true)

    if (hasSupabase && supabase) {
      const filename = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`
      const { error: upErr } = await supabase.storage
        .from(BANNER_BUCKET).upload(filename, file, { upsert: false })

      if (upErr) {
        setError('上傳失敗：' + upErr.message)
      } else {
        setSuccess('上傳成功！')
        await loadBanners()
      }
    } else if (allowLocalFallback) {
      // localStorage fallback — store as data URL
      const reader = new FileReader()
      reader.onload = () => {
        const newBanner = {
          id: Date.now().toString(),
          name: file.name,
          url: reader.result,
          color: null,
          uploadedAt: new Date().toISOString(),
        }
        const updated = [...banners.filter(b => !b.id.startsWith('mock-')), newBanner]
        localSave(updated)
        setBanners(updated)
        setSuccess('圖片已儲存（本地模式）')
        setUploading(false)
      }
      reader.onerror = () => {
        setError('讀取圖片失敗，請重新選擇檔案。')
        setUploading(false)
      }
      reader.readAsDataURL(file)
      if (fileRef.current) fileRef.current.value = ''
      return
    } else {
      setError('正式環境尚未設定 Supabase Storage，無法上傳 Banner。')
    }

    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  // ── Delete ────────────────────────────────────────────
  async function handleDelete(banner) {
    if (banners.length <= 1) { setError('至少保留 1 張 Banner'); return }
    setError('')

    if (hasSupabase && supabase && banner.url && !banner.id.startsWith('mock-')) {
      const { error: delErr } = await supabase.storage
        .from(BANNER_BUCKET).remove([banner.name])
      if (delErr) { setError('刪除失敗：' + delErr.message); return }
      await loadBanners()
    } else if (allowLocalFallback) {
      const updated = banners.filter(b => b.id !== banner.id)
      if (!updated.length) { setError('至少保留 1 張 Banner'); return }
      localSave(updated.filter(b => !b.id.startsWith('mock-')))
      setBanners(updated)
    } else {
      setError('正式環境尚未設定 Supabase Storage，無法刪除 Banner。')
    }
  }

  // ── Reorder ───────────────────────────────────────────
  function move(idx, dir) {
    const next = [...banners]
    const swapIdx = idx + dir
    if (swapIdx < 0 || swapIdx >= next.length) return
    ;[next[idx], next[swapIdx]] = [next[swapIdx], next[idx]]
    setBanners(next)
    if (allowLocalFallback) {
      localSave(next.filter(b => !b.id.startsWith('mock-')))
    } else if (!hasSupabase) {
      setError('正式環境尚未設定 Supabase Storage，無法儲存 Banner 順序。')
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">Banner 管理</h1>
        <p className="admin-page-desc">管理首頁輪播 Banner 圖片（建議尺寸：1920 × 560px，支援 JPG、PNG、WebP）</p>
      </div>

      {/* Status */}
      <div className="ba-status-bar">
        <span className={`ba-status-dot ${hasSupabase ? 'connected' : 'local'}`} />
        <span className="ba-status-label">
          {hasSupabase
            ? 'Supabase Storage 已連接'
            : allowLocalFallback
              ? '本地開發模式（設定 VITE_SUPABASE_URL 啟用雲端）'
              : '正式環境未連接 Supabase Storage'}
        </span>
      </div>

      {error   && <div className="admin-alert admin-alert-error">{error}</div>}
      {success && <div className="admin-alert admin-alert-success">{success}</div>}

      {/* Upload area */}
      <div className="ba-upload-area" onClick={() => fileRef.current?.click()}>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: 'none' }}
          onChange={handleUpload}
        />
        <div className="ba-upload-icon">
          {uploading ? '上傳中' : '上傳'}
        </div>
        <p className="ba-upload-label">
          {uploading ? '上傳中…' : '點擊上傳 Banner 圖片'}
        </p>
        <p className="ba-upload-hint">建議尺寸：1920 × 560px · JPG / PNG / WebP</p>
      </div>

      {/* Banner list */}
      <div className="ba-list">
        {banners.map((banner, idx) => (
          <div key={banner.id} className="ba-item">
            {/* Thumbnail */}
            <div className="ba-thumb">
              {banner.url
                ? <img src={banner.url} alt={banner.name} className="ba-thumb-img" />
                : <div className="ba-thumb-mock" style={{ background: banner.color || '#1a1a2e' }} />
              }
            </div>

            {/* Info */}
            <div className="ba-info">
              <span className="ba-filename">{banner.name}</span>
              <span className="ba-date">
                {new Date(banner.uploadedAt).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* Actions */}
            <div className="ba-actions">
              <button
                className="ba-btn ba-btn-icon"
                onClick={() => move(idx, -1)}
                disabled={idx === 0}
                title="上移"
              >↑</button>
              <button
                className="ba-btn ba-btn-icon"
                onClick={() => move(idx, 1)}
                disabled={idx === banners.length - 1}
                title="下移"
              >↓</button>
              <button
                className="ba-btn ba-btn-danger"
                onClick={() => handleDelete(banner)}
                disabled={banners.length <= 1}
              >刪除</button>
            </div>
          </div>
        ))}
      </div>

      {/* Preview note */}
      <div className="ba-note">
        <p>儲存順序後前往首頁即可看到最新輪播效果。更新後可能需要重新整理頁面。</p>
      </div>
    </div>
  )
}
