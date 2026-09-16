import { useEffect, useRef, useState } from 'react'
import { Send, Target } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'https://media-platform-api.allen-a76.workers.dev'
const STARTERS = [
  '我是台北健身教練，想用 IG 招募一對一學生，幫我做完整企劃',
  '我是高雄美業老闆，目前 500 粉，想做短影音獲客',
  '我是餐飲品牌，想提高來店與外送訂單，請幫我規劃',
  '幫我只重寫帳號名稱跟個人簡介',
  '把第一個月策略改成以台中市場為主',
]

function readSavedChat(key) {
  try {
    const value = JSON.parse(sessionStorage.getItem(key) || '{}')
    return {
      messages: Array.isArray(value.messages) ? value.messages.filter(item => item && ['user', 'assistant'].includes(item.role) && typeof item.content === 'string') : [],
      draft: typeof value.draft === 'string' ? value.draft : '',
    }
  } catch { return { messages: [], draft: '' } }
}

function ReplyText({ content }) {
  const bold = text => text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => part.startsWith('**') && part.endsWith('**')
    ? <strong key={index}>{part.slice(2, -2)}</strong> : part)
  return <div className="ait-chat-text" style={{ overflowWrap: 'anywhere' }}>{content.split('\n').map((line, index) => {
    const heading = line.match(/^#{1,6}\s+(.+)/)
    if (heading) return <h3 key={index} style={{ fontSize: 16, margin: '18px 0 8px' }}>{bold(heading[1])}</h3>
    if (/^\s*([-*]\s+|\d+[.)]\s+)/.test(line)) return <div key={index} style={{ paddingLeft: 12 }}>{bold(line.replace(/^\s*[-*]\s+/, '• '))}</div>
    return <div key={index} style={{ minHeight: line ? undefined : 10 }}>{bold(line)}</div>
  })}</div>
}

export default function PlanningAgentChat() {
  const { currentUser } = useAuth()
  const storageKey = `tlt_planning_conversation_${currentUser.id}`
  const [saved] = useState(() => readSavedChat(storageKey))
  const [messages, setMessages] = useState(saved.messages)
  const [draft, setDraft] = useState(saved.draft)
  const [pending, setPending] = useState('')
  const [error, setError] = useState('')
  const requestRef = useRef(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => () => requestRef.current?.abort(), [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ block: 'nearest' }) }, [messages, pending, error])
  useEffect(() => {
    try { sessionStorage.setItem(storageKey, JSON.stringify({ messages, draft })) } catch { /* Chat still works without storage. */ }
  }, [storageKey, messages, draft])

  async function send(event) {
    event.preventDefault()
    const text = draft.trim()
    if (!text || requestRef.current) return
    const controller = new AbortController()
    requestRef.current = controller
    setPending(text)
    setError('')
    try {
      const { data } = await supabase.auth.getSession()
      const token = data?.session?.access_token
      if (!token) throw new Error('請重新登入後再使用企劃定位。')
      const next = [...messages, { role: 'user', content: text }]
      const response = await fetch(`${WORKER_URL.replace(/\/$/, '')}/api/ai/planning/conversation`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messages: next }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result.reply) throw new Error(result.error || '暫時無法取得回覆，請再試一次。')
      if (controller.signal.aborted) return
      setMessages([...next, { role: 'assistant', content: result.reply }])
      setDraft('')
    } catch (err) {
      if (!controller.signal.aborted) setError(err.message || '連線失敗，請再試一次。')
    } finally {
      if (!controller.signal.aborted) setPending('')
      if (requestRef.current === controller) requestRef.current = null
    }
  }

  return (
    <section>
      <h1 className="ait-tool-title">企劃定位</h1>
      <p className="ait-tool-desc">自媒體獲客企劃師｜直接在這裡討論你的定位、內容與獲客計畫。</p>
      {messages.length > 0 && <button type="button" className="btn btn-secondary btn-sm" disabled={Boolean(pending)} onClick={() => { setMessages([]); setDraft(''); setError('') }}>開始新對話</button>}
      <div className="ait-chat-container" style={{ marginTop: 20, height: 'min(650px, 75dvh)', minHeight: 360 }}>
        <div className="ait-chat-messages" role="log" aria-label="企劃定位對話" aria-live="polite">
          {!messages.length && !pending && (
            <div className="ait-chat-empty">
              <Target size={32} aria-hidden="true" />
              <p className="ait-chat-empty-text">先說說你的行業、目標客群，以及目前想解決的問題。</p>
              <div style={{ display: 'grid', gap: 8, width: '100%', maxWidth: 580 }}>
                {STARTERS.map(text => <button type="button" key={text} className="ait-chat-action" style={{ textAlign: 'left', whiteSpace: 'normal' }} onClick={() => { setDraft(text); inputRef.current?.focus() }}>{text}</button>)}
              </div>
            </div>
          )}
          {[...messages, ...(pending ? [{ role: 'user', content: pending }] : [])].map((message, index) => (
            <div className={`ait-chat-msg ait-chat-msg-${message.role}`} key={index}>
              <div className={`ait-chat-avatar ${message.role === 'user' ? 'user' : 'ai'}`} aria-hidden="true">
                {message.role === 'user' ? '你' : <Target size={16} />}
              </div>
              <div className="ait-chat-bubble-wrap">
                <span className="form-hint">{message.role === 'user' ? '你' : '自媒體獲客企劃師'}</span>
                <div className={`ait-chat-bubble ${message.role}`}>
                  <ReplyText content={message.content} />
                </div>
              </div>
            </div>
          ))}
          {pending && <p role="status" className="form-hint">企劃師正在回覆…</p>}
          {error && <p role="alert" className="auth-alert error">{error} 你的輸入已保留。</p>}
          <div ref={bottomRef} />
        </div>
        <form className="ait-chat-input-area" onSubmit={send}>
          <textarea
            ref={inputRef}
            className="ait-chat-input"
            aria-label="傳送給企劃師的訊息"
            placeholder="輸入你的行業、目標或想追問的內容…"
            rows={3}
            maxLength={12000}
            value={draft}
            disabled={Boolean(pending)}
            onChange={event => setDraft(event.target.value)}
          />
          <button className="btn btn-primary ait-chat-send" disabled={!draft.trim() || Boolean(pending)}>
            <Send size={16} aria-hidden="true" />{pending ? '回覆中' : '送出'}
          </button>
        </form>
      </div>
    </section>
  )
}
