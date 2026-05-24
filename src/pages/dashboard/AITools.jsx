import { useState } from 'react'

const NICHES = ['生活風格', '美食料理', '旅遊探店', '教育學習', '商業理財', '健身運動', '科技 3C', '美妝保養', '親子育兒', '寵物日常']
const PLATFORMS = ['YouTube', 'Instagram Reels', 'TikTok', 'Podcast']

const generateTitles = (topic, niche, platform) => [
  `【${niche}必看】${topic}的 7 個關鍵秘訣，90% 的人都不知道`,
  `我試過 30 種方法，這才是最有效的${topic}策略`,
  `從 0 到 10 萬粉絲：我靠${topic}做到的真實故事`,
  `${topic}完全攻略：新手也能在 ${platform} 快速成長`,
  `為什麼你的${topic}內容沒人看？3 個致命錯誤揭密`,
]

const generateScript = (topic, niche, audience) => `【鉤子（前 3 秒）】
如果你也在為「${topic}」煩惱，這支影片你一定要看完！

【問題引入（30 秒）】
很多 ${audience} 都在問同一個問題：為什麼我的 ${niche} 內容怎麼做都沒流量？
今天我要用最直接的方式告訴你答案。

【核心內容（主體）】
第一點：了解你的受眾痛點
- ${audience} 最在意的是「${topic}」的實際成效
- 用數據說話，不要只講感受

第二點：內容結構化呈現
- 用「問題 → 原因 → 解法」三段式架構
- 每個重點控制在 60 秒內

第三點：CTA 設計
- 明確告訴觀眾下一步要做什麼
- 限時感或稀缺感提升行動率

【結尾 CTA】
如果這個方法對你有幫助，記得按讚收藏！
留言告訴我你目前最大的 ${topic} 挑戰，
我會在下一支影片一一回覆！`

const generateTags = (topic, niche) => [
  `#${niche}`, `#${topic.replace(/\s/g, '')}`, '#自媒體', '#內容創作',
  '#流量成長', '#社群媒體', '#YouTuber', '#創作者',
  `#${niche}教學`, '#乾貨分享',
]

export default function AITools() {
  const [form, setForm] = useState({ topic: '', niche: '生活風格', platform: 'YouTube', audience: '新手創作者' })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState('')

  const update = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const generate = () => {
    if (!form.topic.trim()) return
    setLoading(true)
    setResult(null)
    setTimeout(() => {
      setResult({
        titles: generateTitles(form.topic, form.niche, form.platform),
        script: generateScript(form.topic, form.niche, form.audience),
        tags: generateTags(form.topic, form.niche),
      })
      setLoading(false)
    }, 1400)
  }

  const copy = (text, key) => {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(key)
    setTimeout(() => setCopied(''), 2000)
  }

  return (
    <div className="page-content">
      <div className="page-heading">
        <h1>✨ AI 選題腳本工具</h1>
        <p>輸入主題，AI 幫你生成標題、腳本架構與標籤</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: result ? 'clamp(300px,360px,40%) 1fr' : 'min(560px,100%)', gap: 24, justifyContent: result ? 'stretch' : 'center' }}>
        {/* Input */}
        <div className="card" style={{ alignSelf: 'start', position: result ? 'sticky' : undefined, top: result ? 80 : undefined }}>
          <div className="card-header"><h2 className="card-title">輸入設定</h2></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">影片主題 *</label>
              <input className="form-input" placeholder="例：如何在 YouTube 快速漲粉" value={form.topic} onChange={update('topic')} />
            </div>
            <div className="form-group">
              <label className="form-label">內容領域</label>
              <select className="form-select" value={form.niche} onChange={update('niche')}>
                {NICHES.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">目標平台</label>
              <select className="form-select" value={form.platform} onChange={update('platform')}>
                {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">目標受眾</label>
              <input className="form-input" placeholder="例：25-35 歲上班族" value={form.audience} onChange={update('audience')} />
            </div>
            <button className="btn btn-primary btn-lg btn-block" onClick={generate} disabled={loading || !form.topic.trim()}>
              {loading ? '✨ AI 生成中…' : '✨ 一鍵生成'}
            </button>
          </div>
        </div>

        {/* Output */}
        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Titles */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">🎯 推薦標題</h2>
                <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>點擊複製</span>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {result.titles.map((t, i) => (
                  <div key={i} className="ai-title-item" onClick={() => copy(t, `t${i}`)}>
                    <span style={{ color: 'var(--primary)', fontWeight: 700, flexShrink: 0 }}>T{i + 1}</span>
                    <span style={{ flex: 1 }}>{t}</span>
                    <span style={{ fontSize: 12, color: copied === `t${i}` ? 'var(--success)' : 'var(--gray-400)', flexShrink: 0 }}>
                      {copied === `t${i}` ? '✓ 已複製' : '複製'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Script */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">📝 腳本架構</h2>
                <button className="btn btn-secondary btn-sm" onClick={() => copy(result.script, 'script')}>
                  {copied === 'script' ? '✓ 已複製' : '複製全文'}
                </button>
              </div>
              <div className="card-body">
                <pre className="ai-script-block">{result.script}</pre>
              </div>
            </div>

            {/* Tags */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">🏷️ 建議標籤</h2>
                <button className="btn btn-secondary btn-sm" onClick={() => copy(result.tags.join(' '), 'tags')}>
                  {copied === 'tags' ? '✓ 已複製' : '複製標籤'}
                </button>
              </div>
              <div className="card-body">
                <div className="ai-tags">
                  {result.tags.map(t => <span key={t} className="ai-tag">{t}</span>)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
