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
 *   OPENAI_API_KEY                — OpenAI API key for server-side AI generation
 *   OPENAI_MODEL                  — optional model override for AI generation
 */

const CF_BASE = 'https://api.cloudflare.com/client/v4/accounts'
const BOOKING_TIME_SLOTS = ['12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00']
const DEFAULT_BOOKING_DURATION_MINUTES = 180
const TAIPEI_OFFSET = '+08:00'

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

  const prompt = buildAIPrompt(feature, input, userPlan)
  if (!prompt) return err('Unsupported AI feature', 400)

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || 'gpt-4.1-mini',
      input: [
        {
          role: 'system',
          content: '你是 TOP LEVEL TRAFFIC 的自媒體策略 AI。請使用繁體中文，回覆要具體、可拍攝、適合短影音創作者。只輸出使用者要求的 JSON，不要加 Markdown。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.85,
    }),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    return err(data.error?.message || 'OpenAI generation failed', response.status)
  }

  const outputText = extractOpenAIText(data)
  const result = parseAIResult(outputText)

  return json({ success: true, result, provider: 'openai' })
}

function buildAIPrompt(feature, input, userPlan) {
  const rawInput = typeof input === 'string' ? input : JSON.stringify(input || {})
  const topicPrompt = `
請根據「${rawInput || '健身'}」產生 8 個爆款短影音選題。

必須回傳 JSON array，每一筆格式：
{
  "element": "奇葩|人群|懷舊|最差|頭牌|荷爾蒙|反差|成本",
  "text": "不含元素括號的選題文字",
  "traffic": "high|medium|low"
}

限制：
- 8 筆元素依序為：奇葩、人群、懷舊、最差、頭牌、荷爾蒙、反差、成本
- 每個選題要具體、有反差、有短影音標題感
- 不要使用 emoji
- 不要輸出 JSON 以外的文字
- 使用者方案：${userPlan}
`

  switch (feature) {
    case 'topics':
      return topicPrompt
    default:
      return null
  }
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
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    throw new Error('Supabase admin verification is not configured')
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
