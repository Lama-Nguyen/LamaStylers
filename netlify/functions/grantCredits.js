'use strict'

/**
 * grantCredits — Cộng credit cho user (daily login, first upload)
 *
 * Client KHÔNG được ghi credits trực tiếp vào Firestore (rules chặn).
 * Gọi endpoint này thay thế: POST /api/grantCredits { type: 'daily_login' | 'first_upload' }
 *
 * Server kiểm tra idempotency trước khi cộng — safe để retry.
 */

const { withAuth, HttpsError, admin } = require('./lib/withAuth')
const { toNetlifyHandler }            = require('./lib/netlifyAdapter')
const { logInfo, logWarn }            = require('./lib/logger')
const { getVietnamDateKey }           = require('./lib/rateLimits')

const db = admin.firestore()

const GRANT_AMOUNTS = {
  daily_login:  2,
  first_upload: 3,
}

const handler = withAuth(async (request) => {
  const { uid } = request.auth
  const body    = request.data || {}
  const type    = body.type

  if (!GRANT_AMOUNTS[type])
    throw new HttpsError('invalid-argument', `Loại credit không hợp lệ: ${type}`)

  const amount   = GRANT_AMOUNTS[type]
  const userRef  = db.collection('users').doc(uid)
  const dateKey  = getVietnamDateKey()

  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef)
    if (!snap.exists) throw new HttpsError('not-found', 'User không tồn tại')

    const data = snap.data()

    if (type === 'daily_login') {
      if (data.lastCreditDate === dateKey)
        return { granted: false, reason: 'already_claimed_today' }

      tx.update(userRef, {
        credits:        admin.firestore.FieldValue.increment(amount),
        lastCreditDate: dateKey,
      })
      return { granted: true, amount }
    }

    if (type === 'first_upload') {
      if (data.firstUploadCredited)
        return { granted: false, reason: 'already_credited' }

      tx.update(userRef, {
        credits:             admin.firestore.FieldValue.increment(amount),
        firstUploadCredited: true,
      })
      return { granted: true, amount }
    }
  })

  if (result.granted) {
    logInfo('grantCredits', uid, `Cộng ${amount} credit (${type})`)
  } else {
    logWarn('grantCredits', uid, `Bỏ qua grant: ${result.reason}`, { type })
  }

  return result
})

exports.handler = toNetlifyHandler(handler)
