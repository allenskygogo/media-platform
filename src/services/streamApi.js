import * as tus from 'tus-js-client'

/**
 * Frontend API client — talks to the Cloudflare Worker backend.
 * When VITE_WORKER_URL is not configured the module still exports all functions
 * but they will throw "Worker not configured" so callers can show appropriate UI.
 */

const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'https://media-platform-api.allen-a76.workers.dev'

export const isConfigured = () => Boolean(WORKER_URL)

function workerFetch(path, options = {}) {
  if (!WORKER_URL) throw new Error('Worker not configured — set VITE_WORKER_URL in .env.local')
  return fetch(`${WORKER_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  }).then(async r => {
    const data = await r.json().catch(() => ({}))
    if (!r.ok || data.success === false) {
      const message = data.errors?.[0]?.message || data.error || data.message || `Worker request failed: ${r.status}`
      throw new Error(message)
    }
    return data
  }).catch(error => {
    if (/Failed to fetch|NetworkError|Load failed/i.test(error?.message || '')) {
      throw new Error('連不上影片上傳服務，請重新整理頁面後再試一次。')
    }
    throw error
  })
}

// ── Upload ─────────────────────────────────────────────────────────────────

/**
 * Step 1: Ask the worker for a one-time direct-upload URL.
 * Returns { result: { uploadURL, uid } }
 */
export function getUploadUrl(name, size, options = {}) {
  return workerFetch('/api/upload/start', {
    method: 'POST',
    body: JSON.stringify({ name, size, ...options }),
  }).catch(error => {
    if (/Storage capacity exceeded/i.test(error.message)) {
      throw new Error('Cloudflare Stream 容量已滿，請先刪除舊影片或升級 Stream 額度後再上傳。')
    }
    throw error
  })
}

/**
 * Step 2: Upload the file directly to Cloudflare Stream.
 * Uses XHR so progress events work.
 * Returns a Promise that resolves when the upload is complete.
 */
export function uploadFileToCF(uploadURL, file, onProgress, options = {}) {
  if (options.tus === false) {
    return uploadFileToCFForm(uploadURL, file, onProgress)
  }

  return new Promise((resolve, reject) => {
    const upload = new tus.Upload(file, {
      uploadUrl: uploadURL,
      chunkSize: 8 * 1024 * 1024,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      removeFingerprintOnSuccess: true,
      metadata: {
        filename: file.name,
        filetype: file.type || 'video/mp4',
      },
      onError: error => {
        const status = error?.originalResponse?.getStatus?.()
        const body = error?.originalResponse?.getBody?.()
        const detail = [status && `HTTP ${status}`, body].filter(Boolean).join('：')
        reject(new Error(detail || error?.message || '影片上傳失敗，請確認網路連線後再重試。'))
      },
      onProgress: (bytesUploaded, bytesTotal) => {
        if (bytesTotal > 0 && onProgress) {
          onProgress(Math.round((bytesUploaded / bytesTotal) * 100))
        }
      },
      onSuccess: () => resolve(),
    })

    upload.start()
  })
}

function uploadFileToCFForm(uploadURL, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const formData = new FormData()
    formData.append('file', file, file.name)

    xhr.open('POST', uploadURL)
    xhr.upload.onprogress = event => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
        return
      }
      reject(new Error(xhr.responseText || `Cloudflare Stream 表單上傳失敗：HTTP ${xhr.status}`))
    }
    xhr.onerror = () => reject(new Error('影片上傳網路連線失敗，請換一個網路或重新整理後再試。'))
    xhr.send(formData)
  })
}

export async function uploadVideoToCF(name, file, onProgress) {
  const formFirstLimit = 200 * 1024 * 1024
  if (file.size > 0 && file.size <= formFirstLimit) {
    let formUpload = null
    try {
      formUpload = await getUploadUrl(name || file.name, file.size, { uploadMethod: 'form' })
      if (!formUpload?.result?.uploadURL || !formUpload?.result?.uid) {
        throw new Error('無法取得上傳連結')
      }
      await uploadFileToCF(formUpload.result.uploadURL, file, onProgress, { tus: false })
      return { uid: formUpload.result.uid, uploadMethod: 'form' }
    } catch (formError) {
      if (onProgress) onProgress(0)
      if (formUpload?.result?.uid) {
        await deleteVideo(formUpload.result.uid).catch(() => {})
      }
      if (/連不上影片上傳服務/.test(formError?.message || '')) {
        throw formError
      }
    }
  }

  const tusUpload = await getUploadUrl(name || file.name, file.size, { uploadMethod: 'tus' })
  if (!tusUpload?.result?.uploadURL || !tusUpload?.result?.uid) {
    throw new Error('無法取得上傳連結')
  }

  try {
    await uploadFileToCF(tusUpload.result.uploadURL, file, onProgress, { tus: true })
    return { uid: tusUpload.result.uid, uploadMethod: 'tus' }
  } catch (tusError) {
    if (onProgress) onProgress(0)
    if (tusUpload.result.uid) {
      await deleteVideo(tusUpload.result.uid).catch(() => {})
    }

    const formUpload = await getUploadUrl(name || file.name, file.size, { uploadMethod: 'form' })
    if (!formUpload?.result?.uploadURL || !formUpload?.result?.uid) {
      throw tusError
    }
    await uploadFileToCF(formUpload.result.uploadURL, file, onProgress, { tus: false })
    return { uid: formUpload.result.uid, uploadMethod: 'form' }
  }
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
