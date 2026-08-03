'use strict'
const { withAuth, HttpsError, admin } = require('./lib/withAuth')
const { toNetlifyHandler }            = require('./lib/netlifyAdapter')

const db = admin.firestore()

const RATE_WINDOW_SECONDS = 10 * 60
const MAX_ATTEMPTS        = 5

async function checkRateLimit(uid) {
  const ref = db.collection('gift_code_attempts').doc(uid)
  const now = admin.firestore.Timestamp.now()

  const result = await db.runTransaction(async (tx) => {
    const snap  = await tx.get(ref)
    const data  = snap.exists ? snap.data() : null
    const since = data?.windowStart

    const windowExpired = !since || (now.seconds - since.seconds) >= RATE_WINDOW_SECONDS
    const attempts      = windowExpired ? 0 : (data?.attempts ?? 0)

    if (attempts >= MAX_ATTEMPTS) {
      const retryAfterSecs = RATE_WINDOW_SECONDS - (now.seconds - since.seconds)
      return { allowed: false, retryAfterSecs: Math.max(0, retryAfterSecs) }
    }

    tx.set(ref, {
      attempts:    attempts + 1,
      windowStart: windowExpired ? now : since,
      lastAttempt: now,
    })
    return { allowed: true }
  })
  return result
}

async function resetAttempts(uid) {

  await db.collection('gift_code_attempts').doc(uid).delete().catch(() => {})
}

function loadGiftCodes() {
  if (process.env.GIFT_CODES_JSON) {
    try {
      return JSON.parse(process.env.GIFT_CODES_JSON)
    } catch (e) {
      console.error('[redeemGiftCode] GIFT_CODES_JSON parse error:', e.message)
    }
  }

  // Dev codes chỉ khi bật tường minh GIFT_CODES_ALLOW_DEV=1
  // KHÔNG tự load theo NODE_ENV để tránh lộ lên prod nếu quên set env
  if (process.env.GIFT_CODES_ALLOW_DEV === '1') {
    return {
      'DEV_3DAY':    { label: 'Dev — 3 ngày Premium', type: 'timed',    days: 3,  credits: 100 },
      'DEV_FOREVER': { label: 'Dev — Lifetime',        type: 'lifetime',           credits: 100 },
    }
  }

  return {}
}

const handler = withAuth(async (request) => {
  const { uid }  = request.auth
  const { code } = request.data

  if (!code || typeof code !== 'string' || code.trim().length === 0)
    throw new HttpsError('invalid-argument', 'Vui lòng nhập gift code.')

  const { allowed, retryAfterSecs } = await checkRateLimit(uid)
  if (!allowed) {
    const mins = Math.ceil(retryAfterSecs / 60)
    throw new HttpsError(
      'resource-exhausted',
      `Đã thử quá nhiều lần. Vui lòng đợi ${mins} phút trước khi thử lại.`
    )
  }

  const trimmed = code.trim()
  const CODES   = loadGiftCodes()
  const config  = CODES[trimmed]

  if (!config)
    throw new HttpsError('not-found', 'Gift code không tồn tại hoặc đã hết hiệu lực.')

  const userRef  = db.collection('users').doc(uid)
  const userSnap = await userRef.get()

  const userData = userSnap.exists ? userSnap.data() : {}
  const used     = userData.usedGiftCodes ?? []

  if (used.includes(trimmed))
    throw new HttpsError('already-exists', 'Code này đã được kích hoạt trên tài khoản của bạn.')

  const update = {
    isPremium:     true,
    // Cộng dồn credits, không overwrite — tránh mất credits hiện có
    credits:       admin.firestore.FieldValue.increment(config.credits),
    premiumSource: 'gift_code',
    usedGiftCodes: admin.firestore.FieldValue.arrayUnion(trimmed),
  }

  if (config.type === 'timed') {
    // Hết hạn cuối ngày (23:59:59.999) theo Asia/Ho_Chi_Minh, sau config.days ngày
    // Nếu user đang Premium còn hạn, cộng dồn từ hạn hiện tại thay vì reset từ hôm nay
    const VN_OFFSET_MS = 7 * 60 * 60 * 1000
    const currentExpiry = userData.premiumExpiry?.toDate?.()
    const baseInstantMs = (currentExpiry && currentExpiry.getTime() > Date.now())
      ? currentExpiry.getTime()
      : Date.now()
    const vnBase = new Date(baseInstantMs + VN_OFFSET_MS)
    const endOfDayVnUtcMs = Date.UTC(
      vnBase.getUTCFullYear(),
      vnBase.getUTCMonth(),
      vnBase.getUTCDate() + config.days,
      23, 59, 59, 999
    )
    const expiry = new Date(endOfDayVnUtcMs - VN_OFFSET_MS)
    update.premiumExpiry = admin.firestore.Timestamp.fromDate(expiry)
  } else {
    update.premiumExpiry = admin.firestore.FieldValue.delete()
  }

  await userRef.set(update, { merge: true })

  await resetAttempts(uid)

  return {
    success: true,
    label:   config.label,
    type:    config.type,
    days:    config.days ?? null,
  }
})

exports.handler = toNetlifyHandler(handler)
