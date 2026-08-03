'use strict'

let Sentry
try {
  Sentry = require('@sentry/node')
  Sentry.init({
    dsn: process.env.SENTRY_DSN_SERVER,
    environment: process.env.NODE_ENV || 'production',
    tracesSampleRate: 0.1,
    beforeSend(event) { return event },
  })
} catch (_) {

  Sentry = {
    captureException: (e) => console.error('[Sentry stub]', e?.message),
    captureMessage: (m) => console.warn('[Sentry stub]', m),
    wrapAsyncFunction: (fn) => fn,
  }
}

function captureException(error, context = {}) {
  Sentry.captureException(error, { tags: context.tags || {}, extra: context.extra || {} })
}

function captureAIError(provider, error, promptLength = 0) {
  const msg = error?.message || String(error)
  if (msg.includes('@') || msg.includes('api_key')) return
  Sentry.captureException(error, {
    tags: { error_type: 'ai_provider_error', provider },
    extra: { provider, error_message: msg, prompt_length: promptLength, timestamp: new Date().toISOString() },
  })
}

const _errorCounters = {}

function captureAPIError(endpoint, statusCode, error, userId) {
  const key = `${endpoint}_${statusCode}`
  if (!_errorCounters[key]) _errorCounters[key] = { count: 0, resetAt: Date.now() + 3600_000 }
  if (Date.now() > _errorCounters[key].resetAt) {
    _errorCounters[key] = { count: 0, resetAt: Date.now() + 3600_000 }
  }
  _errorCounters[key].count++
  if (_errorCounters[key].count > 3) _alertOnHighErrorRate(endpoint, statusCode, _errorCounters[key].count)
  Sentry.captureException(error, {
    tags: { error_type: 'api_error', endpoint, status_code: statusCode },
    extra: { endpoint, statusCode, userId, error_count_last_hour: _errorCounters[key].count },
  })
}

async function _alertOnHighErrorRate(endpoint, statusCode, count) {
  const text = `🚨 High error rate: ${endpoint} (${statusCode}) — ${count} errors/hour`
  const tok = process.env.TELEGRAM_BOT_TOKEN
  const cid = process.env.TELEGRAM_CHAT_ID
  if (!tok || !cid) return
  try {
    await fetch(`https://api.telegram.org/bot${tok}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: cid, text }),
    })
  } catch (e) { console.error('Alert send failed:', e.message) }
}

module.exports = { Sentry, captureException, captureAIError, captureAPIError }
