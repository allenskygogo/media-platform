/**
 * Cloudflare Worker — Media Platform API
 *
 * Required Worker Secrets (set via `wrangler secret put` or the dashboard):
 *   CLOUDFLARE_ACCOUNT_ID       — your Cloudflare account ID
 *   CLOUDFLARE_API_TOKEN        — API token with Stream:Edit permission
 *   CLOUDFLARE_STREAM_KEY_ID    — signing key ID from Stream dashboard
 *   CLOUDFLARE_STREAM_SIGNING_KEY — PEM private key (PKCS#8, BEGIN PRIVATE KEY)
 */

const CF_BASE = 'https://api.cloudflare.com/client/v4/accounts'

// ── CORS ──────────────────────────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
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
        return handleUploadStart(request, env)
      }

      // GET /api/videos  → list all videos in the account
      if (path === '/api/videos' && request.method === 'GET') {
        return handleListVideos(env)
      }

      // GET /api/videos/:uid  → single video details
      if (path.startsWith('/api/videos/') && request.method === 'GET') {
        const uid = path.slice('/api/videos/'.length)
        return handleGetVideo(uid, env)
      }

      // DELETE /api/videos/:uid  → delete video
      if (path.startsWith('/api/videos/') && request.method === 'DELETE') {
        const uid = path.slice('/api/videos/'.length)
        return handleDeleteVideo(uid, env)
      }

      // POST /api/token/:uid  → generate signed playback token
      if (path.startsWith('/api/token/') && request.method === 'POST') {
        const uid = path.slice('/api/token/'.length)
        return handleToken(request, uid, env)
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

  const b64  = s => btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  const b64u = s => b64(unescape(encodeURIComponent(s)))
  const b64b = buf => {
    let s = ''
    new Uint8Array(buf).forEach(b => (s += String.fromCharCode(b)))
    return b64(s)
  }

  const signingInput = `${b64u(JSON.stringify(header))}.${b64u(JSON.stringify(payload))}`

  const privateKey = await importPrivateKey(env.CLOUDFLARE_STREAM_SIGNING_KEY)
  const signature  = await crypto.subtle.sign(
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
