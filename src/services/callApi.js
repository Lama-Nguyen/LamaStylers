import { getAuth } from 'firebase/auth'

// Dev: set VITE_NETLIFY_API_BASE=http://localhost:8888/api trong .env.local
// Production: Netlify redirect /api/* → /.netlify/functions/* (netlify.toml)
const API_BASE =
  import.meta.env.VITE_NETLIFY_API_BASE ||
  '/api'

const RETRYABLE_CODES = new Set(['unavailable', 'resource-exhausted', 'deadline-exceeded', 'internal'])

async function withRetry(fn, { maxAttempts = 3, baseDelayMs = 600 } = {}) {
  let lastErr
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      const isLast = attempt === maxAttempts

      if (isLast || !RETRYABLE_CODES.has(err.code) || err.name === 'AbortError') throw err

      const delay = baseDelayMs * Math.pow(2, attempt - 1) * (0.8 + Math.random() * 0.4)
      console.warn(`callApi: retry ${attempt}/${maxAttempts - 1} sau ${Math.round(delay)}ms (${err.code})`)
      await new Promise(res => setTimeout(res, delay))
    }
  }
  throw lastErr
}

export async function callApi(fnName, data = {}, { timeout = 15_000, retry = true, idTokenOverride = null } = {}) {
  if (retry) {
    return withRetry(() => callApi(fnName, data, { timeout, retry: false, idTokenOverride }), {
      maxAttempts: 3,

      baseDelayMs: fnName === 'generateOutfits' || fnName === 'havySuggestOutfit' ? 1000 : 600,
    })
  }

  let idToken = idTokenOverride
  if (!idToken) {
    const auth = getAuth()
    const user = auth.currentUser
    if (user) {
      try {
        idToken = await user.getIdToken()
      } catch (e) {

        console.warn('callApi: không lấy được ID token:', e.message)
      }
    }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  let response
  try {
    response = await fetch(`${API_BASE}/${fnName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      },

      body: JSON.stringify({ data }),
      signal: controller.signal,
    })
  } catch (err) {
    clearTimeout(timer)
    if (err.name === 'AbortError') {
      const timeoutErr = new Error(`AI đang quá tải, vui lòng thử lại sau ít phút (${fnName} timeout ${timeout / 1000}s)`)
      timeoutErr.code = 'deadline-exceeded'
      throw timeoutErr
    }

    const netErr = new Error('Không thể kết nối máy chủ. Kiểm tra internet của bạn.')
    netErr.code = 'unavailable'
    throw netErr
  }
  clearTimeout(timer)

  let json
  try {
    json = await response.json()
  } catch {

    const parseErr = new Error(`Server trả về dữ liệu không hợp lệ (HTTP ${response.status})`)
    parseErr.code = 'internal'
    throw parseErr
  }

  if (!response.ok || json.error) {
    const errPayload = json.error || {}
    const err = new Error(
      errPayload.message ||
      json.message ||
      `Lỗi không xác định từ ${fnName} (HTTP ${response.status})`
    )
    err.code   = errPayload.code   || statusToCode(response.status)
    err.status = errPayload.status || response.status
    err.details = errPayload.details || null
    throw err
  }

  return json.result ?? json.data ?? json
}

function statusToCode(status) {
  const map = {
    400: 'invalid-argument',
    401: 'unauthenticated',
    403: 'permission-denied',
    404: 'not-found',
    409: 'already-exists',
    429: 'resource-exhausted',
    500: 'internal',
    503: 'unavailable',
  }
  return map[status] || 'unknown'
}
