'use strict'

const { withAuth, HttpsError, admin } = require('./lib/withAuth')
const { toNetlifyHandler }            = require('./lib/netlifyAdapter')
const { logInfo, logWarn }            = require('./lib/logger')

const db = admin.firestore()

// Server-side map: reason → credit cost (client không được tự chọn amount)
// Phải khớp với CREDIT_COSTS trong creditService.js
const REASON_COST = {
  generate_outfit:   3,
  remove_background: 5,
  analyze_clothing:  1,
  enhance_analysis:  1,
  style_insight:     2,
  havy_per_10_msg:   1,
}

const handler = withAuth(async (request) => {
  const { uid }  = request.auth
  const body     = request.data || {}
  const reason   = String(body.reason || '').slice(0, 50)

  const amount = REASON_COST[reason]
  if (!amount)
    throw new HttpsError('invalid-argument', `reason không hợp lệ: ${reason}. Hợp lệ: ${Object.keys(REASON_COST).join(', ')}`)

  const userRef = db.collection('users').doc(uid)

  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef)
    if (!snap.exists) throw new HttpsError('not-found', 'User không tồn tại')

    const current = snap.data().credits ?? 0
    if (current < amount) return { success: false, reason: 'insufficient', current }

    tx.update(userRef, { credits: admin.firestore.FieldValue.increment(-amount) })
    return { success: true, remaining: current - amount }
  })

  if (result.success) {
    logInfo('deductCredits', uid, `Trừ ${amount} credit (${reason})`, { remaining: result.remaining })
  } else {
    logWarn('deductCredits', uid, 'Không đủ credit', { needed: amount, current: result.current })
  }

  return result
})

exports.handler = toNetlifyHandler(handler)
