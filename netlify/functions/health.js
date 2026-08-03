'use strict'

const { admin } = require('./lib/withAuth')
const { toNetlifyHandler } = require('./lib/netlifyAdapter')

const REQUIRED_ENV = [
  'FIREBASE_SERVICE_ACCOUNT',
  'GEMINI_API_KEY',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'ALLOWED_ORIGINS',
]

const OPTIONAL_ENV = [
  'OPENROUTER_API_KEY',
  'XTROUTER_API_KEY',
  'SEPAY_WEBHOOK_SECRET',
  'CLEANUP_SECRET',
  'TELEGRAM_BOT_TOKEN',
  'SENTRY_DSN',
  'FAL_API_KEY',
]

async function checkFirestore() {
  const t = Date.now()
  await admin.firestore().collection('_health').doc('ping').get()
  return { ok: true, latencyMs: Date.now() - t }
}

async function checkGemini() {
  const key = process.env.GEMINI_API_KEY
  if (!key) return { ok: false, error: 'GEMINI_API_KEY not set' }

  const t = Date.now()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 3_000)

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${key}&pageSize=1`,
      { signal: controller.signal }
    )
    clearTimeout(timer)
    if (res.status === 400 || res.status === 403)
      return { ok: false, error: `API key invalid (${res.status})`, latencyMs: Date.now() - t }
    if (res.status === 429)
      return { ok: true, warning: 'quota_exceeded', latencyMs: Date.now() - t }
    return { ok: res.ok, latencyMs: Date.now() - t }
  } catch (e) {
    clearTimeout(timer)
    const isTimeout = e.name === 'AbortError'
    return { ok: false, error: isTimeout ? 'timeout_3s' : e.message, latencyMs: Date.now() - t }
  }
}

const handler = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') return res.status(204).end()

  const missing  = REQUIRED_ENV.filter(k => !process.env[k])
  const optional = OPTIONAL_ENV.filter(k =>  process.env[k])

  const checks = {
    env: { ok: missing.length === 0, missing, optional_present: optional },
  }

  const [firestoreResult, geminiResult] = await Promise.allSettled([
    checkFirestore(),
    checkGemini(),
  ])

  checks.firestore = firestoreResult.status === 'fulfilled'
    ? firestoreResult.value
    : { ok: false, error: firestoreResult.reason?.message }

  checks.gemini = geminiResult.status === 'fulfilled'
    ? geminiResult.value
    : { ok: false, error: geminiResult.reason?.message }

  const overallOk = checks.env.ok && checks.firestore.ok && checks.gemini.ok

  // Alert Telegram khi health degraded (silent-fail, không block response)
  if (!overallOk) {
    const tok = process.env.TELEGRAM_BOT_TOKEN
    const cid = process.env.TELEGRAM_CHAT_ID
    if (tok && cid) {
      const failedChecks = Object.entries(checks)
        .filter(([, v]) => !v.ok)
        .map(([k, v]) => `• ${k}: ${v.error || v.missing?.join(', ') || 'failed'}`)
        .join('\n')
      const text = `🚨 [Lama Stylers] Health degraded\n${failedChecks}`
      fetch(`https://api.telegram.org/bot${tok}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: cid, text }),
      }).catch(e => console.error('[health] Telegram alert failed:', e.message))
    }
  }

  return res.status(overallOk ? 200 : 503).json({
    status:    overallOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
  })
}

const { toNetlifyHandler: wrap } = require('./lib/netlifyAdapter')
exports.handler = wrap(handler)
