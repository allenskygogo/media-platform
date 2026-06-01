import { useEffect, useMemo, useRef, useState } from 'react'
import { hasSupabase, supabase } from '../../lib/supabase'

const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'https://media-platform-api.allen-a76.workers.dev'
const KNOWLEDGE_BUCKET = 'ai-knowledge'

const FEATURE_OPTIONS = [
  { key: 'topics', label: '爆款選題' },
  { key: 'script', label: '腳本全文' },
  { key: 'shooting', label: '拍攝形式' },
  { key: 'planning', label: '三個月策劃' },
  { key: 'marketing', label: '行銷文案' },
  { key: 'livestream', label: '直播話術' },
  { key: 'account', label: '帳號定位' },
  { key: 'analysis', label: '爆款解析' },
  { key: 'social', label: '社群貼文' },
  { key: 'benchmark', label: '對標分析' },
  { key: 'material', label: '素材靈感' },
  { key: 'trending', label: '流量熱點' },
  { key: 'chat', label: '頂流助理' },
]

const PLAN_OPTIONS = [
  { key: 'trial', label: '體驗課' },
  { key: 'creator', label: '頂流達人' },
  { key: 'master', label: '頂流私塾' },
  { key: 'managed', label: '頂流代操' },
]

const EMPTY_AGENT = {
  feature_key: 'topics',
  name: '',
  description: '',
  system_prompt: '',
  user_prompt_template: '使用者輸入：\n{{input}}\n\n使用者方案：\n{{userPlan}}',
  output_schema: {},
  model: 'gpt-4.1-mini',
  temperature: 0.85,
  required_plan: 'trial',
  enabled: true,
  notes: '',
}

function stringifySchema(value) {
  try {
    return JSON.stringify(value || {}, null, 2)
  } catch {
    return '{}'
  }
}

function toForm(agent) {
  return {
    ...EMPTY_AGENT,
    ...agent,
    output_schema_text: stringifySchema(agent?.output_schema),
    temperature: String(agent?.temperature ?? EMPTY_AGENT.temperature),
  }
}

export default function AIAgentsAdmin() {
  const fileInputRef = useRef(null)
  const [agents, setAgents] = useState([])
  const [knowledgeFiles, setKnowledgeFiles] = useState([])
  const [selectedKey, setSelectedKey] = useState('topics')
  const [form, setForm] = useState(() => toForm(EMPTY_AGENT))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [testInput, setTestInput] = useState('健身教練')
  const [testResult, setTestResult] = useState('')

  const selectedAgent = useMemo(
    () => agents.find(agent => agent.feature_key === selectedKey) || null,
    [agents, selectedKey],
  )

  useEffect(() => {
    loadAgents()
  }, [])

  useEffect(() => {
    if (selectedAgent) {
      setForm(toForm(selectedAgent))
    } else {
      const opt = FEATURE_OPTIONS.find(item => item.key === selectedKey)
      setForm(toForm({
        ...EMPTY_AGENT,
        feature_key: selectedKey,
        name: opt ? `${opt.label} Agent` : '',
      }))
    }
    setTestResult('')
    setError('')
    setMessage('')
  }, [selectedAgent, selectedKey])

  useEffect(() => {
    loadKnowledgeFiles(selectedKey)
  }, [selectedKey])

  const flash = (text, type = 'success') => {
    if (type === 'error') {
      setError(text)
      setMessage('')
    } else {
      setMessage(text)
      setError('')
    }
  }

  async function loadAgents() {
    setLoading(true)
    setError('')

    if (!hasSupabase || !supabase) {
      setAgents([])
      setLoading(false)
      flash('Supabase 尚未設定，無法從後台管理 AI Agent。', 'error')
      return
    }

    const { data, error: readError } = await supabase
      .from('ai_agents')
      .select('id,feature_key,name,description,system_prompt,user_prompt_template,output_schema,model,temperature,vector_store_id,required_plan,enabled,notes,updated_at')
      .order('feature_key', { ascending: true })

    if (readError) {
      setAgents([])
      flash(`讀取 AI Agent 失敗：${readError.message}`, 'error')
    } else {
      setAgents(data || [])
    }
    setLoading(false)
  }

  async function loadKnowledgeFiles(featureKey = selectedKey) {
    if (!hasSupabase || !supabase) {
      setKnowledgeFiles([])
      return
    }

    const { data, error: filesError } = await supabase
      .from('ai_knowledge_files')
      .select('id,agent_feature_key,storage_path,file_name,mime_type,file_size,status,openai_file_id,vector_store_id,vector_store_file_id,error_message,notes,created_at,updated_at')
      .eq('agent_feature_key', featureKey)
      .order('created_at', { ascending: false })

    if (filesError) {
      setKnowledgeFiles([])
      if (filesError.code !== '42P01') {
        flash(`讀取知識庫檔案失敗：${filesError.message}`, 'error')
      }
      return
    }
    setKnowledgeFiles(data || [])
  }

  const updateForm = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function saveAgent() {
    setSaving(true)
    setError('')
    setMessage('')

    if (!hasSupabase || !supabase) {
      flash('Supabase 尚未設定，無法儲存 AI Agent。', 'error')
      setSaving(false)
      return
    }

    let parsedSchema
    try {
      parsedSchema = JSON.parse(form.output_schema_text || '{}')
    } catch {
      flash('輸出格式 JSON 無法解析，請檢查括號與逗號。', 'error')
      setSaving(false)
      return
    }

    const payload = {
      feature_key: form.feature_key,
      name: form.name.trim(),
      description: form.description?.trim() || null,
      system_prompt: form.system_prompt.trim(),
      user_prompt_template: form.user_prompt_template.trim(),
      output_schema: parsedSchema,
      model: form.model.trim() || 'gpt-4.1-mini',
      temperature: Number(form.temperature),
      vector_store_id: form.vector_store_id?.trim() || null,
      required_plan: form.required_plan,
      enabled: Boolean(form.enabled),
      notes: form.notes?.trim() || null,
    }

    if (!payload.name || !payload.system_prompt || !payload.user_prompt_template) {
      flash('名稱、系統指令、使用者模板都是必填。', 'error')
      setSaving(false)
      return
    }

    if (Number.isNaN(payload.temperature) || payload.temperature < 0 || payload.temperature > 2) {
      flash('temperature 必須介於 0 到 2。', 'error')
      setSaving(false)
      return
    }

    const { error: saveError } = await supabase
      .from('ai_agents')
      .upsert(payload, { onConflict: 'feature_key' })

    if (saveError) {
      flash(`儲存失敗：${saveError.message}`, 'error')
    } else {
      flash('AI Agent 已儲存。下一次前台呼叫會使用新版設定。')
      await loadAgents()
    }

    setSaving(false)
  }

  async function testAgent() {
    setTesting(true)
    setTestResult('')
    setError('')

    try {
      const response = await fetch(`${WORKER_URL.replace(/\/$/, '')}/api/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feature: form.feature_key,
          input: testInput,
          userPlan: form.required_plan,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || data.success === false) {
        throw new Error(data.error || 'AI 測試失敗')
      }
      setTestResult(JSON.stringify(data.result, null, 2))
    } catch (err) {
      flash(`測試失敗：${err.message}`, 'error')
    } finally {
      setTesting(false)
    }
  }

  async function uploadKnowledgeFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setUploading(true)
    setError('')
    setMessage('')

    try {
      if (!hasSupabase || !supabase) throw new Error('Supabase 尚未設定，無法上傳知識庫 PDF。')
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        throw new Error('目前只支援 PDF 檔案。')
      }
      if (file.size > 25 * 1024 * 1024) {
        throw new Error('PDF 檔案請先控制在 25 MB 以內。')
      }

      const ext = file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'pdf'
      const randomId = Math.random().toString(36).slice(2, 10)
      const storagePath = `${selectedKey}/${Date.now()}-${randomId}.${ext}`

      const upload = await supabase.storage
        .from(KNOWLEDGE_BUCKET)
        .upload(storagePath, file, {
          cacheControl: '3600',
          contentType: 'application/pdf',
          upsert: false,
        })

      if (upload.error) throw upload.error

      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      if (!token) throw new Error('找不到登入 token，請重新登入管理員帳號。')

      const syncResponse = await fetch(`${WORKER_URL.replace(/\/$/, '')}/api/ai/knowledge/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          agentFeatureKey: selectedKey,
          storagePath,
          fileName: file.name,
          fileSize: file.size,
        }),
      })

      const syncData = await syncResponse.json().catch(() => ({}))
      if (!syncResponse.ok || syncData.success === false) {
        throw new Error(syncData.error || 'PDF 同步到 OpenAI 知識庫失敗')
      }

      flash('PDF 已上傳並同步到 AI 知識庫。')
      await Promise.all([loadAgents(), loadKnowledgeFiles(selectedKey)])
    } catch (err) {
      flash(`上傳失敗：${err.message}`, 'error')
    } finally {
      setUploading(false)
    }
  }

  function formatBytes(value) {
    const n = Number(value || 0)
    if (!n) return '-'
    if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
    return `${(n / 1024 / 1024).toFixed(1)} MB`
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">AI Agent 管理</h1>
          <p className="admin-page-desc">
            管理網站 AI 的課程規則、輸入模板與模型設定。這裡不是直接連 ChatGPT GPTs，請將 GPTs Instructions 貼到系統指令。
          </p>
        </div>
        <button className="btn btn-secondary" onClick={loadAgents} disabled={loading}>
          重新整理
        </button>
      </div>

      {message && <div className="auth-alert success" style={{ marginBottom: 16 }}>{message}</div>}
      {error && <div className="auth-alert error" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="ai-agent-layout">
        <aside className="admin-card ai-agent-list">
          <div className="admin-card-header">AI 功能</div>
          <div className="admin-card-body">
            {FEATURE_OPTIONS.map(item => {
              const agent = agents.find(a => a.feature_key === item.key)
              const active = selectedKey === item.key
              return (
                <button
                  key={item.key}
                  className={`ai-agent-item ${active ? 'active' : ''}`}
                  onClick={() => setSelectedKey(item.key)}
                >
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.key}</small>
                  </span>
                  <em className={agent?.enabled ? 'on' : ''}>{agent ? (agent.enabled ? '啟用' : '停用') : '未建立'}</em>
                </button>
              )
            })}
          </div>
        </aside>

        <section className="admin-card ai-agent-editor">
          <div className="admin-card-header">
            <span>{form.name || '新增 AI Agent'}</span>
            <span style={{ fontSize: 12, color: 'var(--gray-500)', fontWeight: 400 }}>
              {selectedAgent?.updated_at ? `更新：${new Date(selectedAgent.updated_at).toLocaleString('zh-TW')}` : '尚未建立'}
            </span>
          </div>

          <div className="admin-card-body">
            {loading ? (
              <p className="ai-empty">讀取中...</p>
            ) : (
              <>
                <div className="ai-agent-grid">
                  <label className="form-group">
                    <span className="form-label">功能 key</span>
                    <select className="form-select" value={form.feature_key} onChange={e => { setSelectedKey(e.target.value); updateForm('feature_key', e.target.value) }}>
                      {FEATURE_OPTIONS.map(item => <option key={item.key} value={item.key}>{item.key} - {item.label}</option>)}
                    </select>
                  </label>

                  <label className="form-group">
                    <span className="form-label">名稱</span>
                    <input className="form-input" value={form.name} onChange={e => updateForm('name', e.target.value)} placeholder="例：爆款選題 Agent" />
                  </label>

                  <label className="form-group">
                    <span className="form-label">模型</span>
                    <input className="form-input" value={form.model} onChange={e => updateForm('model', e.target.value)} placeholder="gpt-4.1-mini" />
                  </label>

                  <label className="form-group">
                    <span className="form-label">Temperature</span>
                    <input className="form-input" type="number" min="0" max="2" step="0.05" value={form.temperature} onChange={e => updateForm('temperature', e.target.value)} />
                  </label>

                  <label className="form-group">
                    <span className="form-label">方案限制</span>
                    <select className="form-select" value={form.required_plan} onChange={e => updateForm('required_plan', e.target.value)}>
                      {PLAN_OPTIONS.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}
                    </select>
                  </label>

                  <label className="form-group ai-agent-switch">
                    <span className="form-label">啟用狀態</span>
                    <button
                      type="button"
                      className={`btn btn-sm ${form.enabled ? 'btn-success' : 'btn-secondary'}`}
                      onClick={() => updateForm('enabled', !form.enabled)}
                    >
                      {form.enabled ? '已啟用' : '已停用'}
                    </button>
                  </label>
                </div>

                <label className="form-group">
                  <span className="form-label">描述</span>
                  <input className="form-input" value={form.description || ''} onChange={e => updateForm('description', e.target.value)} placeholder="這個 AI 的用途與適用情境" />
                </label>

                <label className="form-group">
                  <span className="form-label">系統指令 system_prompt</span>
                  <textarea
                    className="form-input ai-agent-textarea xl"
                    value={form.system_prompt}
                    onChange={e => updateForm('system_prompt', e.target.value)}
                    placeholder="貼上你在 ChatGPT GPTs 裡設定的 Instructions。"
                  />
                  <span className="form-hint">這裡是 AI 的核心課程規則與限制條件。</span>
                </label>

                <label className="form-group">
                  <span className="form-label">使用者輸入模板 user_prompt_template</span>
                  <textarea
                    className="form-input ai-agent-textarea"
                    value={form.user_prompt_template}
                    onChange={e => updateForm('user_prompt_template', e.target.value)}
                  />
                  <span className="form-hint">可使用 {'{{input}}'}、{'{{userPlan}}'}、{'{{input_json}}'}。</span>
                </label>

                <label className="form-group">
                  <span className="form-label">輸出格式 JSON Schema</span>
                  <textarea
                    className="form-input ai-agent-textarea code"
                    value={form.output_schema_text}
                    onChange={e => updateForm('output_schema_text', e.target.value)}
                  />
                </label>

                <div className="ai-agent-grid">
                  <label className="form-group">
                    <span className="form-label">Vector Store ID</span>
                    <input className="form-input" value={form.vector_store_id || ''} onChange={e => updateForm('vector_store_id', e.target.value)} placeholder="未串知識庫可留空" />
                  </label>

                  <label className="form-group">
                    <span className="form-label">內部備註</span>
                    <input className="form-input" value={form.notes || ''} onChange={e => updateForm('notes', e.target.value)} placeholder="例：已同步爆款選題 GPTs 2026-06-01 版本" />
                  </label>
                </div>

                <div className="ai-agent-knowledge">
                  <div className="ai-agent-knowledge-head">
                    <div>
                      <h3>PDF 知識庫</h3>
                      <p>上傳課程講義、案例 PDF 或 SOP。系統會存到 Supabase Storage，並同步到 OpenAI Vector Store 供這個 Agent 搜尋。</p>
                    </div>
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/pdf,.pdf"
                        style={{ display: 'none' }}
                        onChange={uploadKnowledgeFile}
                      />
                      <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                        {uploading ? '同步中...' : '上傳 PDF'}
                      </button>
                    </div>
                  </div>

                  {knowledgeFiles.length === 0 ? (
                    <div className="ai-agent-knowledge-empty">
                      目前沒有 PDF。先上傳爆款選題課程講義或案例庫，AI 之後就能用同一套課程內容回答。
                    </div>
                  ) : (
                    <div className="ai-agent-file-list">
                      {knowledgeFiles.map(file => (
                        <div key={file.id} className="ai-agent-file-row">
                          <div>
                            <strong>{file.file_name}</strong>
                            <span>{file.storage_path}</span>
                            {file.error_message && <em>{file.error_message}</em>}
                          </div>
                          <div className="ai-agent-file-meta">
                            <span className={`ai-agent-file-status ${file.status}`}>{file.status}</span>
                            <span>{formatBytes(file.file_size)}</span>
                            <span>{file.created_at ? new Date(file.created_at).toLocaleDateString('zh-TW') : '-'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="ai-agent-actions">
                  <button className="btn btn-primary" onClick={saveAgent} disabled={saving}>
                    {saving ? '儲存中...' : '儲存 AI Agent'}
                  </button>
                </div>

                <div className="ai-agent-test">
                  <div>
                    <h3>測試輸出</h3>
                    <p>儲存後可用這裡確認 Worker 是否使用新版設定。</p>
                  </div>
                  <div className="ai-agent-test-row">
                    <input className="form-input" value={testInput} onChange={e => setTestInput(e.target.value)} placeholder="例：健身教練" />
                    <button className="btn btn-secondary" onClick={testAgent} disabled={testing || !testInput.trim()}>
                      {testing ? '測試中...' : '測試'}
                    </button>
                  </div>
                  {testResult && <pre className="ai-agent-result">{testResult}</pre>}
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
