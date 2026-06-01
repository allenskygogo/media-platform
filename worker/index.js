/**
 * Cloudflare Worker — Media Platform API
 *
 * Required Worker Secrets (set via `wrangler secret put` or the dashboard):
 *   CLOUDFLARE_ACCOUNT_ID       — your Cloudflare account ID
 *   CLOUDFLARE_API_TOKEN        — API token with Stream:Edit permission
 *   CLOUDFLARE_STREAM_KEY_ID    — signing key ID from Stream dashboard
 *   CLOUDFLARE_STREAM_SIGNING_KEY — PEM private key (PKCS#8, BEGIN PRIVATE KEY)
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL  — Google service account email for Calendar
 *   GOOGLE_PRIVATE_KEY            — Google service account private key
 *   GOOGLE_CALENDAR_ID            — Google Calendar ID to check availability
 *   SUPABASE_URL                  — Supabase project URL for admin verification
 *   SUPABASE_ANON_KEY             — Supabase anon key for admin verification
 *   SUPABASE_SERVICE_ROLE_KEY     — optional server-only key for private AI agent prompts
 *   OPENAI_API_KEY                — OpenAI API key for server-side AI generation
 *   OPENAI_MODEL                  — optional model override for AI generation
 */

const CF_BASE = 'https://api.cloudflare.com/client/v4/accounts'
const AI_KNOWLEDGE_BUCKET = 'ai-knowledge'
const BOOKING_TIME_SLOTS = ['12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00']
const DEFAULT_BOOKING_DURATION_MINUTES = 180
const TAIPEI_OFFSET = '+08:00'
const DEFAULT_AI_AGENTS = {
  topics: {
    feature_key: 'topics',
    name: '爆款選題 Agent',
    model: 'gpt-4.1-mini',
    temperature: 0.85,
    system_prompt: '你是 TOP LEVEL TRAFFIC 的爆款選題智能體。你專門協助自媒體創作者從產業、受眾、痛點、產品服務與流量角度中，設計可拍攝、可引發好奇心、具備短影音標題感的爆款選題。請使用繁體中文，語氣專業、具體、直接。你的輸出必須符合指定 JSON schema，不要輸出 Markdown，不要使用 emoji，不要加入 JSON 以外的文字。',
    user_prompt_template: `請根據以下輸入產生 8 個爆款短影音選題。

使用者輸入：
{{input}}

使用者方案：
{{userPlan}}

輸出要求：
- 必須回傳 JSON array
- 必須剛好 8 筆
- 8 筆元素依序為：奇葩、人群、懷舊、最差、頭牌、荷爾蒙、反差、成本
- 每一筆格式：
  {
    "element": "奇葩|人群|懷舊|最差|頭牌|荷爾蒙|反差|成本",
    "text": "不含元素括號的選題文字",
    "traffic": "high|medium|low"
  }
- 選題要有短影音標題感，可直接拿去拍
- 選題要具體，避免空泛口號
- 不要使用 emoji
- 不要輸出 JSON 以外的文字`,
  },
}

// ── CORS ──────────────────────────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

function err(msg, status = 400) {
  return json({ success: false, error: msg }, status)
}

// ── Router ────────────────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS })
    }

    const url  = new URL(request.url)
    const path = url.pathname

    try {
      // POST /api/upload/start  → get a direct-upload URL from CF Stream
      if (path === '/api/upload/start' && request.method === 'POST') {
        return await handleUploadStart(request, env)
      }

      // GET /api/videos  → list all videos in the account
      if (path === '/api/videos' && request.method === 'GET') {
        return await handleListVideos(env)
      }

      // GET /api/videos/:uid  → single video details
      if (path.startsWith('/api/videos/') && request.method === 'GET') {
        const uid = path.slice('/api/videos/'.length)
        return await handleGetVideo(uid, env)
      }

      // DELETE /api/videos/:uid  → delete video
      if (path.startsWith('/api/videos/') && request.method === 'DELETE') {
        const uid = path.slice('/api/videos/'.length)
        return await handleDeleteVideo(uid, env)
      }

      // POST /api/token/:uid  → generate signed playback token
      if (path.startsWith('/api/token/') && request.method === 'POST') {
        const uid = path.slice('/api/token/'.length)
        return await handleToken(request, uid, env)
      }

      // GET /api/calendar/availability?date=YYYY-MM-DD&type=oneonone
      if (path === '/api/calendar/availability' && request.method === 'GET') {
        return await handleCalendarAvailability(url, env)
      }

      // POST /api/ai → server-side AI generation
      if (path === '/api/ai' && request.method === 'POST') {
        return await handleAI(request, env)
      }

      // POST /api/ai/writing/evaluate → evaluate a student's writing practice against agent knowledge
      if (path === '/api/ai/writing/evaluate' && request.method === 'POST') {
        return await handleWritingEvaluation(request, env)
      }

      // POST /api/ai/knowledge/sync → attach an uploaded PDF to an agent vector store
      if (path === '/api/ai/knowledge/sync' && request.method === 'POST') {
        return await handleAIKnowledgeSync(request, env)
      }

      // POST /api/calendar/events → create a confirmed booking event
      if (path === '/api/calendar/events' && request.method === 'POST') {
        return await handleCreateCalendarEvent(request, env)
      }

      // PATCH /api/calendar/events/:eventId → update a booking event
      if (path.startsWith('/api/calendar/events/') && request.method === 'PATCH') {
        const eventId = decodeURIComponent(path.slice('/api/calendar/events/'.length))
        return await handleUpdateCalendarEvent(request, eventId, env)
      }

      // DELETE /api/calendar/events/:eventId → delete a booking event
      if (path.startsWith('/api/calendar/events/') && request.method === 'DELETE') {
        const eventId = decodeURIComponent(path.slice('/api/calendar/events/'.length))
        return await handleDeleteCalendarEvent(request, eventId, env)
      }

      return err('Not found', 404)
    } catch (e) {
      console.error(e)
      return err(e.message, 500)
    }
  },
}

// ── Handlers ──────────────────────────────────────────────────────────────

async function handleUploadStart(request, env) {
  const body = await request.json().catch(() => ({}))
  const res = await cfFetch(
    `/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/stream/direct_upload`,
    'POST', env,
    {
      maxDurationSeconds: 28800,
      requireSignedURLs: true,
      meta: { name: body.name || 'Untitled' },
    }
  )
  return json(res)
}

async function handleListVideos(env) {
  const res = await cfFetch(
    `/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/stream`,
    'GET', env
  )
  return json(res)
}

async function handleGetVideo(uid, env) {
  const res = await cfFetch(
    `/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/stream/${uid}`,
    'GET', env
  )
  return json(res)
}

async function handleDeleteVideo(uid, env) {
  const res = await cfFetch(
    `/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/stream/${uid}`,
    'DELETE', env
  )
  return json(res)
}

async function handleToken(request, videoUid, env) {
  const body           = await request.json().catch(() => ({}))
  const expiresSeconds = body.expiresInSeconds || 10800  // default 3 hours

  const token = await generateSignedToken(videoUid, expiresSeconds, env)
  return json({ success: true, token })
}

async function handleAI(request, env) {
  if (!env.OPENAI_API_KEY) {
    return err('OpenAI API key is not configured', 503)
  }

  const body = await request.json().catch(() => ({}))
  const feature = String(body.feature || '').trim()
  const input = body.input
  const userPlan = String(body.userPlan || 'free')

  if (!feature) return err('Missing AI feature', 400)

  const agent = await getAIAgent(feature, env)
  if (!agent) return err('Unsupported AI feature', 400)

  const requestBody = {
    model: env.OPENAI_MODEL || agent.model || 'gpt-4.1-mini',
    input: [
      {
        role: 'system',
        content: agent.system_prompt,
      },
      {
        role: 'user',
        content: renderPromptTemplate(agent.user_prompt_template, { input, userPlan }),
      },
    ],
    temperature: Number(agent.temperature ?? 0.85),
  }

  if (agent.vector_store_id) {
    requestBody.tools = [
      {
        type: 'file_search',
        vector_store_ids: [agent.vector_store_id],
        max_num_results: 6,
      },
    ]
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    return err(data.error?.message || 'OpenAI generation failed', response.status)
  }

  const outputText = extractOpenAIText(data)
  const result = parseAIResult(outputText)

  return json({ success: true, result, provider: 'openai', agent: agent.feature_key || feature })
}

async function handleWritingEvaluation(request, env) {
  if (!env.OPENAI_API_KEY) {
    return err('OpenAI API key is not configured', 503)
  }

  const user = await requireUser(request, env)
  const body = await request.json().catch(() => ({}))
  const feature = String(body.feature || 'topics').trim()
  const topicText = String(body.topicText || '').trim()
  const scriptType = String(body.scriptType || '').trim()
  const draftText = String(body.draftText || '').trim()
  const userPlan = String(body.userPlan || 'free')

  if (!topicText) return err('Missing topic text', 400)
  if (!scriptType) return err('Missing script type', 400)
  if (draftText.length < 50) return err('Practice draft must be at least 50 characters', 400)

  const agent = await getAIAgent(feature, env)
  if (!agent) return err('Unsupported AI feature', 400)

  const scriptTypeMap = {
    knowledge: '教知識',
    opinion: '說觀點',
    story: '說故事',
    process: '曬過程',
  }

  const requestBody = {
    model: env.OPENAI_MODEL || agent.model || 'gpt-4.1-mini',
    input: [
      {
        role: 'system',
        content: [
          agent.system_prompt,
          '',
          '你現在要擔任 TOP LEVEL TRAFFIC 的腳本練習評分老師。',
          '請優先參考可用的 PDF 知識庫與課程腳本句式規則，判斷學員寫出的開場白是否符合該腳本類型。',
          '你只能回傳 JSON，不要輸出 Markdown，不要使用 emoji。',
        ].join('\n'),
      },
      {
        role: 'user',
        content: [
          `學員 ID：${user.id}`,
          `學員方案：${userPlan}`,
          `選題：${topicText}`,
          `腳本類型：${scriptTypeMap[scriptType] || scriptType}`,
          '',
          '學員練習內容：',
          draftText,
          '',
          '請用以下 JSON 格式回覆：',
          '{',
          '  "approved": true 或 false,',
          '  "score": 0 到 100 的數字,',
          '  "summary": "一句話總評",',
          '  "strengths": ["做得好的地方"],',
          '  "improvements": ["需要修改的地方"],',
          '  "matched_patterns": ["符合的 PDF/課程句式重點"],',
          '  "required_revision": "如果未通過，給一段具體修改方向；通過則填空字串"',
          '}',
          '',
          '通過標準：',
          '- 不是只看字數，必須符合該腳本類型的開場句式與短影音鉤子。',
          '- 需要有明確受眾、痛點或反差。',
          '- 需要能讓觀眾在前三秒產生好奇。',
          '- score 75 分以上才 approved=true。',
        ].join('\n'),
      },
    ],
    temperature: 0.2,
  }

  if (agent.vector_store_id) {
    requestBody.tools = [
      {
        type: 'file_search',
        vector_store_ids: [agent.vector_store_id],
        max_num_results: 8,
      },
    ]
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    return err(data.error?.message || 'OpenAI evaluation failed', response.status)
  }

  const outputText = extractOpenAIText(data)
  const parsed = parseAIResult(outputText)
  const evaluation = typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
    ? parsed
    : {
        approved: false,
        score: 0,
        summary: String(outputText || 'AI did not return a valid evaluation'),
        strengths: [],
        improvements: ['請重新提交練習，讓 AI 產生完整判斷。'],
        matched_patterns: [],
        required_revision: '請補上更明確的前三秒鉤子、受眾痛點與句式結構。',
      }

  const score = Number(evaluation.score || 0)
  evaluation.score = Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0
  evaluation.approved = Boolean(evaluation.approved) && evaluation.score >= 75

  return json({ success: true, evaluation, provider: 'openai', agent: agent.feature_key || feature })
}

async function handleAIKnowledgeSync(request, env) {
  if (!env.OPENAI_API_KEY) return err('OpenAI API key is not configured', 503)
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return err('Supabase service key is not configured', 503)
  }

  const admin = await requireAdmin(request, env)
  const body = await request.json().catch(() => ({}))
  const featureKey = String(body.agentFeatureKey || body.feature_key || '').trim()
  const storagePath = String(body.storagePath || '').trim()
  const fileName = String(body.fileName || '').trim()
  const fileSize = Number(body.fileSize || 0) || null

  if (!featureKey) return err('Missing agent feature key', 400)
  if (!storagePath) return err('Missing storage path', 400)
  if (!fileName.toLowerCase().endsWith('.pdf')) return err('Only PDF knowledge files are supported', 400)

  const agent = await getAIAgent(featureKey, env)
  if (!agent) return err('AI agent not found', 404)

  let vectorStoreId = agent.vector_store_id || ''

  try {
    await upsertKnowledgeFile(env, {
      agent_feature_key: featureKey,
      storage_path: storagePath,
      file_name: fileName,
      mime_type: 'application/pdf',
      file_size: fileSize,
      status: 'processing',
      uploaded_by: admin.id,
      error_message: null,
    })

    if (!vectorStoreId) {
      const vectorStore = await openAIJson('/v1/vector_stores', env, {
        method: 'POST',
        body: {
          name: `TOP LEVEL TRAFFIC ${featureKey} knowledge`,
        },
      })
      vectorStoreId = vectorStore.id
      await updateAgentVectorStore(env, featureKey, vectorStoreId)
    }

    const fileBlob = await downloadSupabaseStorageFile(env, storagePath)
    const openAIFile = await uploadOpenAIFile(env, fileBlob, fileName)
    const vectorFile = await openAIJson(`/v1/vector_stores/${encodeURIComponent(vectorStoreId)}/files`, env, {
      method: 'POST',
      body: {
        file_id: openAIFile.id,
        attributes: {
          feature_key: featureKey,
          file_name: fileName,
        },
      },
    })

    const saved = await upsertKnowledgeFile(env, {
      agent_feature_key: featureKey,
      storage_path: storagePath,
      file_name: fileName,
      mime_type: 'application/pdf',
      file_size: fileSize,
      status: 'ready',
      openai_file_id: openAIFile.id,
      vector_store_id: vectorStoreId,
      vector_store_file_id: vectorFile.id || null,
      uploaded_by: admin.id,
      error_message: null,
    })

    return json({
      success: true,
      knowledgeFile: saved,
      vectorStoreId,
      openaiFileId: openAIFile.id,
    })
  } catch (syncError) {
    await upsertKnowledgeFile(env, {
      agent_feature_key: featureKey,
      storage_path: storagePath,
      file_name: fileName || storagePath.split('/').pop(),
      mime_type: 'application/pdf',
      file_size: fileSize,
      status: 'failed',
      vector_store_id: vectorStoreId || null,
      uploaded_by: admin.id,
      error_message: syncError.message,
    }).catch(() => null)

    return err(syncError.message || 'AI knowledge sync failed', 500)
  }
}

async function getAIAgent(feature, env) {
  if (!feature) return null
  const fallback = DEFAULT_AI_AGENTS[feature] || null
  const key = env.SUPABASE_SERVICE_ROLE_KEY || null

  if (!env.SUPABASE_URL || !key) return fallback

  try {
    const url = new URL(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/ai_agents`)
    url.searchParams.set('feature_key', `eq.${feature}`)
    url.searchParams.set('enabled', 'eq.true')
    url.searchParams.set('select', 'feature_key,name,system_prompt,user_prompt_template,model,temperature,vector_store_id,required_plan')
    url.searchParams.set('limit', '1')

    const response = await fetch(url.toString(), {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
      },
    })
    const data = await response.json().catch(() => [])
    if (!response.ok) return fallback
    return Array.isArray(data) && data[0] ? data[0] : fallback
  } catch (_) {
    return fallback
  }
}

async function downloadSupabaseStorageFile(env, storagePath) {
  const encodedPath = storagePath.split('/').map(encodeURIComponent).join('/')
  const response = await fetch(`${env.SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/${AI_KNOWLEDGE_BUCKET}/${encodedPath}`, {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  })

  if (!response.ok) {
    const message = await response.text().catch(() => '')
    throw new Error(message || 'Failed to read PDF from Supabase Storage')
  }

  return await response.blob()
}

async function uploadOpenAIFile(env, fileBlob, fileName) {
  const form = new FormData()
  form.append('purpose', 'assistants')
  form.append('file', fileBlob, fileName)

  const response = await fetch('https://api.openai.com/v1/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: form,
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error?.message || 'OpenAI file upload failed')
  }
  return data
}

async function openAIJson(path, env, options = {}) {
  const response = await fetch(`https://api.openai.com${path}`, {
    method: options.method || 'GET',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v2',
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error?.message || 'OpenAI request failed')
  }
  return data
}

async function updateAgentVectorStore(env, featureKey, vectorStoreId) {
  const url = new URL(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/ai_agents`)
  url.searchParams.set('feature_key', `eq.${featureKey}`)

  const response = await fetch(url.toString(), {
    method: 'PATCH',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      vector_store_id: vectorStoreId,
      updated_at: new Date().toISOString(),
    }),
  })

  if (!response.ok) {
    const message = await response.text().catch(() => '')
    throw new Error(message || 'Failed to update agent vector store')
  }
}

async function upsertKnowledgeFile(env, payload) {
  const url = new URL(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/ai_knowledge_files`)
  url.searchParams.set('on_conflict', 'storage_path')

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => [])
  if (!response.ok) {
    throw new Error(data.message || 'Failed to save knowledge file metadata')
  }
  return Array.isArray(data) ? data[0] : data
}

function renderPromptTemplate(template, vars) {
  const inputText = typeof vars.input === 'string'
    ? vars.input
    : JSON.stringify(vars.input || {}, null, 2)

  return String(template || '')
    .replaceAll('{{input}}', inputText || '健身')
    .replaceAll('{{input_json}}', JSON.stringify(vars.input || {}))
    .replaceAll('{{userPlan}}', vars.userPlan || 'free')
}

function extractOpenAIText(data) {
  if (typeof data.output_text === 'string') return data.output_text

  const parts = []
  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (typeof content.text === 'string') parts.push(content.text)
    }
  }
  return parts.join('\n').trim()
}

function parseAIResult(outputText) {
  const text = String(outputText || '').trim()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch (_) {
    const match = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/)
    if (match) {
      try {
        return JSON.parse(match[0])
      } catch (_) {
        return text
      }
    }
    return text
  }
}

async function handleCalendarAvailability(url, env) {
  const date = url.searchParams.get('date')
  const durationMinutes = getRequestedDurationMinutes(url.searchParams.get('durationMinutes'))
  const excludeEventId = url.searchParams.get('excludeEventId') || ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) {
    return err('Invalid date', 400)
  }

  if (!env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !env.GOOGLE_PRIVATE_KEY || !env.GOOGLE_CALENDAR_ID) {
    return json({ success: true, calendarConfigured: false, unavailableSlots: [] })
  }

  const token = await getGoogleAccessToken(env)
  const busy = await getGoogleBusyRanges(date, token, env, excludeEventId)
  const unavailableSlots = BOOKING_TIME_SLOTS.filter(slot => {
    const range = getSlotRange(date, slot, durationMinutes)
    return busy.some(item => rangesOverlap(range.start, range.end, new Date(item.start), new Date(item.end)))
  })

  return json({ success: true, calendarConfigured: true, unavailableSlots })
}

async function handleCreateCalendarEvent(request, env) {
  await requireAdmin(request, env)
  const body = await request.json().catch(() => ({}))
  validateCalendarEventBody(body)

  const token = await getGoogleAccessToken(env)
  const event = buildBookingCalendarEvent(body)
  const created = await googleCalendarFetch(env, token, '', 'POST', event)

  return json({
    success: true,
    eventId: created.id,
    htmlLink: created.htmlLink || null,
  })
}

async function handleUpdateCalendarEvent(request, eventId, env) {
  await requireAdmin(request, env)
  const body = await request.json().catch(() => ({}))
  validateCalendarEventBody(body)

  const token = await getGoogleAccessToken(env)
  const event = buildBookingCalendarEvent(body)
  const updated = await googleCalendarFetch(env, token, `/${encodeURIComponent(eventId)}`, 'PATCH', event)

  return json({
    success: true,
    eventId: updated.id,
    htmlLink: updated.htmlLink || null,
  })
}

async function handleDeleteCalendarEvent(request, eventId, env) {
  await requireAdmin(request, env)
  const token = await getGoogleAccessToken(env)
  await googleCalendarFetch(env, token, `/${encodeURIComponent(eventId)}`, 'DELETE')
  return json({ success: true })
}

// ── Cloudflare API helper ─────────────────────────────────────────────────

async function cfFetch(path, method, env, body) {
  // path is relative to /client/v4, e.g. "/accounts/{id}/stream"
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  return res.json()
}

async function getGoogleAccessToken(env) {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    scope: 'https://www.googleapis.com/auth/calendar',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }
  const assertion = await signJwt(header, payload, normalizePem(env.GOOGLE_PRIVATE_KEY))

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }).toString(),
  })

  const data = await response.json()
  if (!response.ok) throw new Error(data.error_description || data.error || 'Google auth failed')
  return data.access_token
}

async function requireAdmin(request, env) {
  const userData = await requireUser(request, env)

  const authHeader = request.headers.get('Authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

  const profileUrl = new URL(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/profiles`)
  profileUrl.searchParams.set('id', `eq.${userData.id}`)
  profileUrl.searchParams.set('select', 'role,status')

  const profileResponse = await fetch(profileUrl.toString(), {
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  })
  const profiles = await profileResponse.json()
  if (!profileResponse.ok) throw new Error('Admin profile verification failed')

  const profile = Array.isArray(profiles) ? profiles[0] : null
  if (profile?.role !== 'admin' || profile?.status !== 'active') {
    throw new Error('Admin permission required')
  }

  return userData
}

async function requireUser(request, env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    throw new Error('Supabase auth verification is not configured')
  }

  const authHeader = request.headers.get('Authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) throw new Error('Missing authorization token')

  const userResponse = await fetch(`${env.SUPABASE_URL.replace(/\/$/, '')}/auth/v1/user`, {
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
  })
  const userData = await userResponse.json()
  if (!userResponse.ok || !userData?.id) throw new Error('Invalid authorization token')

  return userData
}

function validateCalendarEventBody(body) {
  if (!body || typeof body !== 'object') throw new Error('Invalid event payload')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date || '')) throw new Error('Invalid event date')
  if (!BOOKING_TIME_SLOTS.includes(body.timeSlot)) throw new Error('Invalid event time')
  if (!body.topic || typeof body.topic !== 'string') throw new Error('Invalid event topic')
}

function buildBookingCalendarEvent(body) {
  const durationMinutes = getRequestedDurationMinutes(body.durationMinutes)
  const { start, end } = getSlotRange(body.date, body.timeSlot, durationMinutes)
  const typeLabel = body.type === 'shooting' ? '拍攝預約' : '一對一輔導'
  const studentName = body.studentName || '學員'
  const studentEmail = body.studentEmail || ''
  const title = `${typeLabel}｜${studentName}｜${body.topic.trim()}`
  const descriptionLines = [
    `預約類型：${typeLabel}`,
    `學員：${studentName}`,
    studentEmail ? `Email：${studentEmail}` : null,
    body.bookingId ? `Booking ID：${body.bookingId}` : null,
    body.notes ? `備註：${body.notes}` : null,
  ].filter(Boolean)

  return {
    summary: title,
    description: descriptionLines.join('\n'),
    start: { dateTime: start.toISOString(), timeZone: 'Asia/Taipei' },
    end: { dateTime: end.toISOString(), timeZone: 'Asia/Taipei' },
    transparency: 'opaque',
  }
}

async function googleCalendarFetch(env, token, path, method, body) {
  const calendarId = encodeURIComponent(env.GOOGLE_CALENDAR_ID)
  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (method === 'DELETE' && response.status === 404) return {}
  if (method === 'DELETE' && response.status === 204) return {}

  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error?.message || 'Google Calendar event sync failed')
  return data
}

async function getGoogleBusyRanges(date, token, env, excludeEventId = '') {
  if (excludeEventId) {
    return getGoogleEventRanges(date, token, env, excludeEventId)
  }

  const [freeBusyRanges, eventRanges] = await Promise.all([
    getGoogleFreeBusyRanges(date, token, env),
    getGoogleEventRanges(date, token, env),
  ])

  return [...freeBusyRanges, ...eventRanges]
}

async function getGoogleFreeBusyRanges(date, token, env) {
  const response = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      timeMin: `${date}T00:00:00${TAIPEI_OFFSET}`,
      timeMax: `${date}T23:59:59${TAIPEI_OFFSET}`,
      timeZone: 'Asia/Taipei',
      items: [{ id: env.GOOGLE_CALENDAR_ID }],
    }),
  })

  const data = await response.json()
  if (!response.ok) throw new Error(data.error?.message || 'Google Calendar freeBusy failed')
  const calendar = data.calendars?.[env.GOOGLE_CALENDAR_ID]
  if (!calendar) throw new Error('Google Calendar result missing')
  if (Array.isArray(calendar.errors) && calendar.errors.length) {
    const message = calendar.errors.map(item => item.reason || item.message).filter(Boolean).join(', ')
    throw new Error(message || 'Google Calendar access failed')
  }
  return calendar.busy || []
}

async function getGoogleEventRanges(date, token, env, excludeEventId = '') {
  const calendarId = encodeURIComponent(env.GOOGLE_CALENDAR_ID)
  const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`)
  url.searchParams.set('timeMin', `${date}T00:00:00${TAIPEI_OFFSET}`)
  url.searchParams.set('timeMax', `${date}T23:59:59${TAIPEI_OFFSET}`)
  url.searchParams.set('timeZone', 'Asia/Taipei')
  url.searchParams.set('singleEvents', 'true')
  url.searchParams.set('orderBy', 'startTime')

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  })

  const data = await response.json()
  if (!response.ok) throw new Error(data.error?.message || 'Google Calendar events failed')

  return (data.items || [])
    .filter(event => event.status !== 'cancelled')
    .filter(event => event.id !== excludeEventId)
    .map(event => {
      const start = parseGoogleEventDate(event.start, 'start')
      const end = parseGoogleEventDate(event.end, 'end')
      return start && end ? { start: start.toISOString(), end: end.toISOString() } : null
    })
    .filter(Boolean)
}

function parseGoogleEventDate(value, boundary) {
  if (!value) return null
  if (value.dateTime) return new Date(value.dateTime)
  if (value.date) return new Date(`${value.date}T00:00:00${TAIPEI_OFFSET}`)
  return boundary === 'end' ? new Date(0) : null
}

function getRequestedDurationMinutes(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_BOOKING_DURATION_MINUTES
  return Math.min(parsed, 480)
}

function getSlotRange(date, slot, durationMinutes) {
  const start = new Date(`${date}T${slot}:00${TAIPEI_OFFSET}`)
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000)
  return { start, end }
}

function rangesOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB
}

function normalizePem(value) {
  return String(value || '').replace(/\\n/g, '\n')
}

// ── Signed Token (RS256 JWT) ───────────────────────────────────────────────
/**
 * Generates a Cloudflare Stream signed token (RS256 JWT).
 * The resulting token replaces the video UID in the playback URL:
 *   https://customer-{code}.cloudflarestream.com/{TOKEN}/iframe
 *
 * env vars required:
 *   CLOUDFLARE_STREAM_KEY_ID      — key ID shown in CF Stream → Signing Keys
 *   CLOUDFLARE_STREAM_SIGNING_KEY — PKCS#8 PEM private key (BEGIN PRIVATE KEY)
 */
async function generateSignedToken(videoUid, expiresInSeconds, env) {
  const now = Math.floor(Date.now() / 1000)

  const header  = { alg: 'RS256', kid: env.CLOUDFLARE_STREAM_KEY_ID }
  const payload = {
    sub: videoUid,
    kid: env.CLOUDFLARE_STREAM_KEY_ID,
    exp: now + expiresInSeconds,
    iat: now,
    nbf: now,
  }

  return signJwt(header, payload, env.CLOUDFLARE_STREAM_SIGNING_KEY)
}

async function signJwt(header, payload, pem) {
  const b64  = s => btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  const b64u = s => b64(unescape(encodeURIComponent(s)))
  const b64b = buf => {
    let s = ''
    new Uint8Array(buf).forEach(b => (s += String.fromCharCode(b)))
    return b64(s)
  }

  const signingInput = `${b64u(JSON.stringify(header))}.${b64u(JSON.stringify(payload))}`
  const privateKey = await importPrivateKey(pem)
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(signingInput)
  )

  return `${signingInput}.${b64b(signature)}`
}

async function importPrivateKey(pem) {
  // Strip PEM header/footer and whitespace, then base64-decode
  const b64 = pem
    .replace(/-----BEGIN [A-Z ]+-----/, '')
    .replace(/-----END [A-Z ]+-----/, '')
    .replace(/\s/g, '')

  const binary = atob(b64)
  const buffer = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) buffer[i] = binary.charCodeAt(i)

  return crypto.subtle.importKey(
    'pkcs8',
    buffer.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )
}
