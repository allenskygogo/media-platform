/**
 * Frontend API client — talks to the Cloudflare Worker backend.
 * When VITE_WORKER_URL is not configured the module still exports all functions
 * but they will throw "Worker not configured" so callers can show appropriate UI.
 */

const WORKER_URL = import.meta.env.VITE_WORKER_URL || ''

export const isConfigured = () => Boolean(WORKER_URL)

function workerFetch(path, options = {}) {
  if (!WORKER_URL) throw new Error('Worker not configured — set VITE_WORKER_URL in .env.local')
  return fetch(`${WORKER_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  }).then(r => r.json())
}

// ── Upload ─────────────────────────────────────────────────────────────────

/**
 * Step 1: Ask the worker for a one-time direct-upload URL.
 * Returns { result: { uploadURL, uid } }
 */
export function getUploadUrl(name) {
  return workerFetch('/api/upload/start', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

/**
 * Step 2: Upload the file directly to Cloudflare Stream.
 * Uses XHR so progress events work.
 * Returns a Promise that resolves when the upload is complete.
 */
export function uploadFileToCF(uploadURL, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', uploadURL)
    xhr.upload.addEventListener('progress', e => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    })
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new Error(`Upload failed: ${xhr.status}`))
    })
    xhr.addEventListener('error', () => reject(new Error('Network error')))
    const fd = new FormData()
    fd.append('file', file)
    xhr.send(fd)
  })
}

// ── Video library ──────────────────────────────────────────────────────────

/** Fetch all videos in the Cloudflare Stream account. */
export function listVideos() {
  return workerFetch('/api/videos')
}

/** Fetch a single video's details (useful for polling status after upload). */
export function getVideo(uid) {
  return workerFetch(`/api/videos/${uid}`)
}

/** Delete a video from Cloudflare Stream. */
export function deleteVideo(uid) {
  return workerFetch(`/api/videos/${uid}`, { method: 'DELETE' })
}

// ── Signed playback token ──────────────────────────────────────────────────

/**
 * Request a signed playback token from the Worker.
 * @param {string} videoUid  - Cloudflare Stream video UID
 * @param {number} expiresInSeconds - token TTL (default 10800 = 3h)
 * @returns {Promise<string>} JWT token
 */
export async function getSignedToken(videoUid, expiresInSeconds = 10800) {
  const data = await workerFetch(`/api/token/${videoUid}`, {
    method: 'POST',
    body: JSON.stringify({ expiresInSeconds }),
  })
  if (!data.success || !data.token) throw new Error(data.error || 'Token request failed')
  return data.token
}

// ── URL helpers ────────────────────────────────────────────────────────────

/**
 * Build the signed iframe embed URL.
 * customerSubdomain comes from the stored video record
 * (extracted from the HLS playback URL when the video was uploaded).
 */
export function buildSignedEmbedUrl(customerSubdomain, signedToken) {
  return `https://${customerSubdomain}.cloudflarestream.com/${signedToken}/iframe`
}

/**
 * Extract the customer subdomain from a Cloudflare Stream HLS URL.
 * e.g. "https://customer-abc123.cloudflarestream.com/uid/manifest/video.m3u8"
 *   → "customer-abc123"
 */
export function extractCustomerSubdomain(hlsUrl = '') {
  const m = hlsUrl.match(/^https:\/\/(customer-[^.]+)\.cloudflarestream\.com/)
  return m ? m[1] : null
}
