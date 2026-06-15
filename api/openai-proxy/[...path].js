const OPENAI_BASE_URL = 'https://api.openai.com/v1'

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', chunk => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  const requestUrl = new URL(req.url || '/', `https://${req.headers.host || 'localhost'}`)
  const pathFromUrl = requestUrl.pathname.replace(/^\/api\/openai-proxy\/?/, '')
  const path = Array.isArray(req.query.path) ? req.query.path.join('/') : req.query.path || pathFromUrl
  if (!path) {
    res.status(400).json({ error: { message: 'Missing OpenAI proxy path' } })
    return
  }

  const authorization = req.headers.authorization
  if (!authorization) {
    res.status(401).json({ error: { message: 'Missing Authorization header' } })
    return
  }

  try {
    const upstreamUrl = new URL(`${OPENAI_BASE_URL}/${path}`)
    for (const [key, value] of requestUrl.searchParams.entries()) {
      if (key === 'path') continue
      upstreamUrl.searchParams.append(key, value)
    }

    const body = ['GET', 'HEAD'].includes(req.method) ? undefined : await readRawBody(req)
    const headers = {
      Authorization: authorization,
      Accept: req.headers.accept || 'application/json',
    }
    if (req.headers['content-type']) headers['Content-Type'] = req.headers['content-type']
    if (req.headers['openai-beta']) headers['OpenAI-Beta'] = req.headers['openai-beta']

    const upstream = await fetch(upstreamUrl.toString(), {
      method: req.method,
      headers,
      body,
    })

    const responseBody = Buffer.from(await upstream.arrayBuffer())
    res.status(upstream.status)
    const contentType = upstream.headers.get('content-type')
    if (contentType) res.setHeader('Content-Type', contentType)
    res.send(responseBody)
  } catch (error) {
    res.status(502).json({
      error: {
        message: error?.message || 'OpenAI proxy request failed',
      },
    })
  }
}
