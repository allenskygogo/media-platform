import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Clock3, Link2, Send, UploadCloud } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import {
  createSocialPublishJob,
  getSocialPublisherState,
  toggleSocialAccount,
} from '../../services/socialPublisher'

const PLATFORMS = [
  { id: 'youtube', name: 'YouTube', hint: 'Shorts / 長影片', color: '#ef4444' },
  { id: 'facebook', name: 'Facebook', hint: '粉專影片貼文', color: '#3b82f6' },
  { id: 'instagram', name: 'Instagram', hint: 'Reels', color: '#ec4899' },
  { id: 'tiktok', name: 'TikTok', hint: '短影音', color: '#22d3ee' },
]

const STATUS_META = {
  draft: { label: '已建立', tone: 'neutral' },
  waiting_connection: { label: '待串接', tone: 'warning' },
  ready: { label: '待發布', tone: 'blue' },
  published: { label: '已發布', tone: 'success' },
}

function fileSize(bytes = 0) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function SocialPublisher() {
  const { currentUser } = useAuth()
  const userId = currentUser?.id
  const [accounts, setAccounts] = useState([])
  const [jobs, setJobs] = useState([])
  const [form, setForm] = useState({
    title: '',
    caption: '',
    platforms: ['instagram', 'facebook'],
    videoName: '',
    videoSize: 0,
    videoType: '',
  })
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [storageMode, setStorageMode] = useState('')

  const loadState = async () => {
    if (!userId) return
    setLoading(true)
    try {
      const state = await getSocialPublisherState(userId)
      setAccounts(state.accounts)
      setJobs(state.jobs)
      setStorageMode(state.mode)
      setMessage(state.mode === 'local' ? '目前先使用本機任務紀錄，正式同步需先執行一鍵發布資料表 SQL' : '')
    } catch (error) {
      console.error(error)
      setMessage(error.message || '一鍵發布資料讀取失敗')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadState()
  }, [userId])

  const myAccounts = useMemo(
    () => accounts.filter(account => String(account.userId) === String(userId)),
    [accounts, userId],
  )
  const myJobs = useMemo(
    () => jobs.filter(job => String(job.userId) === String(userId)).sort((a, b) => b.id - a.id),
    [jobs, userId],
  )

  const isConnected = platform => myAccounts.some(account => account.platform === platform && account.status === 'connected')
  const connectedCount = PLATFORMS.filter(platform => isConnected(platform.id)).length

  const toggleAccount = async platform => {
    setSaving(true)
    try {
      const localAccounts = await toggleSocialAccount(currentUser, platform)
      if (localAccounts) {
        setAccounts(localAccounts)
      } else {
        await loadState()
      }
      setMessage(isConnected(platform) ? '已改為待串接狀態' : '已標記為可發布帳號')
    } catch (error) {
      console.error(error)
      setMessage(error.message || '平台狀態更新失敗')
    } finally {
      setSaving(false)
    }
  }

  const togglePlatform = platform => {
    setForm(prev => {
      const exists = prev.platforms.includes(platform)
      const platforms = exists ? prev.platforms.filter(item => item !== platform) : [...prev.platforms, platform]
      return { ...prev, platforms }
    })
  }

  const handleVideo = event => {
    const file = event.target.files?.[0]
    if (!file) return
    setForm(prev => ({ ...prev, videoName: file.name, videoSize: file.size, videoType: file.type }))
  }

  const createJob = async () => {
    setSaving(true)
    try {
      const localJob = await createSocialPublishJob(currentUser, form, isConnected)
      if (storageMode === 'local' && localJob) {
        setJobs(prev => [...prev, localJob])
      } else {
        await loadState()
      }
      setForm({ title: '', caption: '', platforms: ['instagram', 'facebook'], videoName: '', videoSize: 0, videoType: '' })
      setMessage('發布任務已建立，正式 API 串好後就能直接送出')
    } catch (error) {
      console.error(error)
      setMessage(error.message || '發布任務建立失敗')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="social-publisher-page">
      <div className="page-heading">
        <h1>一鍵發布</h1>
        <p>上傳影片、填好文案，選擇平台後建立發布任務。</p>
      </div>

      {message && <div className="auth-alert success" style={{ marginBottom: 16 }}>{message}</div>}

      <div className="spub-grid">
        <section className="spub-panel">
          <div className="spub-section-head">
            <div>
              <p className="spub-kicker">平台帳號</p>
              <h2>發布目的地</h2>
            </div>
            <span className="spub-counter">{connectedCount}/{PLATFORMS.length} 已連結</span>
          </div>
          <div className="spub-platform-grid">
            {PLATFORMS.map(platform => {
              const connected = isConnected(platform.id)
              return (
                <button
                  type="button"
                  key={platform.id}
                  className={`spub-platform-card${connected ? ' connected' : ''}`}
                  disabled={saving}
                  onClick={() => toggleAccount(platform.id)}
                >
                  <span className="spub-platform-dot" style={{ background: platform.color }} />
                  <span>
                    <strong>{platform.name}</strong>
                    <small>{platform.hint}</small>
                  </span>
                  <span className={`spub-status-pill ${connected ? 'success' : 'warning'}`}>
                    {connected ? '已連結' : '待串接'}
                  </span>
                </button>
              )
            })}
          </div>
          <p className="spub-note">
            現階段可先建立發布任務；正式發佈需要 YouTube、Meta、TikTok 的 OAuth 與發文權限審核完成。
          </p>
        </section>

        <section className="spub-panel">
          <div className="spub-section-head">
            <div>
              <p className="spub-kicker">建立任務</p>
              <h2>影片與文案</h2>
            </div>
            <UploadCloud size={22} />
          </div>

          <div className="spub-form">
            <label className="form-label">影片檔案</label>
            <label className="spub-upload">
              <UploadCloud size={22} />
              <span>{form.videoName || '選擇要發布的影片'}</span>
              {form.videoSize > 0 && <small>{fileSize(form.videoSize)}</small>}
              <input type="file" accept="video/*" onChange={handleVideo} />
            </label>

            <label className="form-label">發布標題</label>
            <input
              className="form-input"
              value={form.title}
              onChange={event => setForm(prev => ({ ...prev, title: event.target.value }))}
              placeholder="例：今天拍攝現場最重要的三個觀察"
            />

            <label className="form-label">貼文文案</label>
            <textarea
              className="form-input"
              rows={5}
              value={form.caption}
              onChange={event => setForm(prev => ({ ...prev, caption: event.target.value }))}
              placeholder="輸入要同步發布的貼文內容..."
            />

            <label className="form-label">選擇平台</label>
            <div className="spub-check-grid">
              {PLATFORMS.map(platform => (
                <button
                  type="button"
                  key={platform.id}
                  className={`spub-check${form.platforms.includes(platform.id) ? ' active' : ''}`}
                  onClick={() => togglePlatform(platform.id)}
                >
                  <span className="spub-platform-dot" style={{ background: platform.color }} />
                  {platform.name}
                </button>
              ))}
            </div>

            <button className="btn btn-primary btn-lg" disabled={saving || loading} onClick={createJob}>
              <Send size={18} /> {saving ? '處理中...' : '建立發布任務'}
            </button>
          </div>
        </section>
      </div>

      <section className="spub-panel">
        <div className="spub-section-head">
          <div>
            <p className="spub-kicker">發布紀錄</p>
            <h2>我的任務</h2>
          </div>
          <Clock3 size={22} />
        </div>

        {loading ? (
          <div className="empty-state">
            <h3>讀取發布任務中</h3>
            <p>正在同步你的平台帳號與發布紀錄。</p>
          </div>
        ) : myJobs.length === 0 ? (
          <div className="empty-state">
            <h3>尚未建立發布任務</h3>
            <p>上傳影片並選擇平台後，任務會出現在這裡。</p>
          </div>
        ) : (
          <div className="spub-job-list">
            {myJobs.map(job => (
              <article key={job.id} className="spub-job-card">
                <div className="spub-job-main">
                  <div className="spub-job-icon"><Link2 size={18} /></div>
                  <div>
                    <h3>{job.title}</h3>
                    <p>{job.videoName} {job.videoSize ? `· ${fileSize(job.videoSize)}` : ''}</p>
                    <small>{job.createdAt}</small>
                  </div>
                </div>
                <div className="spub-targets">
                  {job.targets.map(target => {
                    const platform = PLATFORMS.find(item => item.id === target.platform)
                    const meta = STATUS_META[target.status] || STATUS_META.draft
                    return (
                      <span key={target.platform} className={`spub-status-pill ${meta.tone}`}>
                        {target.status === 'ready' && <CheckCircle2 size={13} />}
                        {platform?.name || target.platform} · {meta.label}
                      </span>
                    )
                  })}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
