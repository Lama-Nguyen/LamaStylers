'use strict'

const { admin } = require('./withAuth')
const { RATE_LIMITS, VIETNAM_TZ } = require('./constants')

const db = admin.firestore()

function getVietnamDateKey() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone: VIETNAM_TZ,
  })
  return formatter.format(new Date())
}

function getLimit(action, isPremium = false) {
  const limits = RATE_LIMITS[action]
  if (!limits) return 10
  return isPremium ? (limits.premium || 20) : (limits.free || 5)
}

async function checkRateLimitOnly(userId, action, isPremium = false) {
  const limit   = getLimit(action, isPremium)
  const dateKey = getVietnamDateKey()
  const snap    = await db.collection('rate_limits').doc(`${userId}_${action}_${dateKey}`).get()
  const used    = snap.data()?.used || 0
  return { allowed: used < limit, used, limit, remaining: Math.max(0, limit - used) }
}

async function checkAndConsumeRateLimit(userId, action, isPremium = false) {
  const limit   = getLimit(action, isPremium)
  const dateKey = getVietnamDateKey()
  const ref     = db.collection('rate_limits').doc(`${userId}_${action}_${dateKey}`)

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const used = snap.data()?.used || 0
    if (used >= limit) return { allowed: false, used, limit }
    tx.set(ref, {
      userId, action, dateKey,
      used: used + 1,
      expiresAt: new Date(Date.now() + 28 * 3600 * 1000),
    }, { merge: true })
    return { allowed: true, used: used + 1, limit }
  })
}

async function refundRateLimit(userId, action) {
  const dateKey = getVietnamDateKey()
  const ref     = db.collection('rate_limits').doc(`${userId}_${action}_${dateKey}`)
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) return
    const used = snap.data()?.used || 0
    if (used <= 0) return
    tx.update(ref, { used: used - 1 })
  })
}

module.exports = { checkRateLimitOnly, checkAndConsumeRateLimit, refundRateLimit, getVietnamDateKey }
