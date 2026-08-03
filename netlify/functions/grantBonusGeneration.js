'use strict'

/**
 * grantBonusGeneration — Cộng lượt generate sau khi xem quảng cáo
 *
 * Giới hạn chống spam: tối đa MAX_BONUS_PER_DAY lần/ngày/user.
 * Server kiểm tra và ghi vào Firestore — client KHÔNG tự cộng localStorage.
 */

const { withAuth, HttpsError, admin } = require('./lib/withAuth')
const { toNetlifyHandler }            = require('./lib/netlifyAdapter')
const { logInfo, logWarn }            = require('./lib/logger')
const { getVietnamDateKey }           = require('./lib/rateLimits')

const db = admin.firestore()

const BONUS_AMOUNT      = 2
const MAX_BONUS_PER_DAY = 3

const handler = withAuth(async (request) => {
  const { uid } = request.auth

  // Dùng cùng dateKey với rateLimits.js (Vietnam timezone)
  const today    = getVietnamDateKey()
  const bonusRef = db.collection('bonus_grants').doc(`${uid}_${today}`)

  const result = await db.runTransaction(async (tx) => {
    const snap  = await tx.get(bonusRef)
    const count = snap.exists ? (snap.data().count || 0) : 0

    if (count >= MAX_BONUS_PER_DAY) {
      return { granted: false, count, limit: MAX_BONUS_PER_DAY }
    }

    // Dùng đúng field `used` như rateLimits.js checkAndConsumeRateLimit
    const rateLimitRef = db.collection('rate_limits').doc(`${uid}_GENERATE_OUTFITS_${today}`)
    const rateSnap     = await tx.get(rateLimitRef)

    const currentUsed  = rateSnap.exists ? (rateSnap.data().used || 0) : 0
    const newUsed      = Math.max(0, currentUsed - BONUS_AMOUNT)

    tx.set(rateLimitRef, { used: newUsed, userId: uid, updatedAt: new Date() }, { merge: true })
    tx.set(bonusRef, { count: count + 1, uid, date: today, updatedAt: new Date() }, { merge: true })

    return { granted: true, bonusAmount: BONUS_AMOUNT, bonusRoundsToday: count + 1, limit: MAX_BONUS_PER_DAY }
  })

  if (!result.granted) {
    logWarn('grantBonusGeneration', uid, 'Đã hết lượt thưởng hôm nay', { count: result.count })
    throw new HttpsError('resource-exhausted',
      `Bạn đã nhận tối đa ${MAX_BONUS_PER_DAY} lượt thưởng hôm nay. Quay lại vào ngày mai nhé!`
    )
  }

  logInfo('grantBonusGeneration', uid, 'Bonus granted', result)
  return result
})

exports.handler = toNetlifyHandler(handler)
