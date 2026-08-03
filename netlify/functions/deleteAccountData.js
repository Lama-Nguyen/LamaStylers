'use strict'
const { logError, logInfo, logWarn } = require('./lib/logger')
const { withAuth, HttpsError, admin } = require('./lib/withAuth')
const { deleteImages }                = require('./lib/cloudinary')

const db = admin.firestore()
const BATCH_LIMIT = 400

async function deleteAllMatching(query) {
  const snap = await query.get()
  if (snap.empty) return 0
  // Chia nhỏ batch tránh giới hạn 500 ops
  for (let i = 0; i < snap.docs.length; i += BATCH_LIMIT) {
    const chunk = snap.docs.slice(i, i + BATCH_LIMIT)
    const batch = db.batch()
    chunk.forEach(d => batch.delete(d.ref))
    await batch.commit()
  }
  return snap.size
}

// Collections có field userId
const USER_ID_COLLECTIONS = [
  'clothing_items',
  'outfits',
  'favorites',
  'notifications',
  'feedbacks',
  'transactions',
  'rate_limits',      // ✅ đúng field: rateLimits.js ghi `userId`
]

// Collections có field uid
const UID_COLLECTIONS = [
  'pending_uploads',
  'generation_locks',
  'bonus_grants',
  'processed_webhooks',  // không quan trọng nhưng dọn sạch
]

const vercelHandler = withAuth(async (request) => {
  const uid = request.auth.uid

  // ── 1. Thu thập public_id Cloudinary trước khi xóa docs ───────────
  const imagePublicIds = []

  try {
    const userSnap = await db.collection('users').doc(uid).get()
    if (userSnap.exists) {
      const avatarId = userSnap.data()?.avatarPublicId
      if (avatarId) imagePublicIds.push(avatarId)
    }
  } catch (e) {
    logWarn('deleteAccountData', uid, 'Không đọc được users doc cho Cloudinary cleanup', { error: e.message })
  }

  try {
    const clothingSnap = await db.collection('clothing_items')
      .where('userId', '==', uid)
      .select('imagePublicId')
      .get()
    clothingSnap.forEach(d => {
      const pid = d.data().imagePublicId
      if (pid) imagePublicIds.push(pid)
    })
  } catch (e) {
    logWarn('deleteAccountData', uid, 'Không đọc được clothing_items cho Cloudinary cleanup', { error: e.message })
  }

  // ── 2. Xóa từng collection ────────────────────────────────────────
  const results = {}

  for (const col of USER_ID_COLLECTIONS) {
    try {
      results[col] = await deleteAllMatching(
        db.collection(col).where('userId', '==', uid)
      )
    } catch (e) {
      logError('deleteAccountData', uid, `Lỗi xóa ${col}`, { error: e.message })
      results[col] = -1
    }
  }

  for (const col of UID_COLLECTIONS) {
    try {
      results[col] = await deleteAllMatching(
        db.collection(col).where('uid', '==', uid)
      )
    } catch (e) {
      logError('deleteAccountData', uid, `Lỗi xóa ${col}`, { error: e.message })
      results[col] = -1
    }
  }

  // havy_quota là subcollection: /havy_quota/{uid}/daily/{dateKey}
  try {
    const quotaSnap = await db.collection('havy_quota').doc(uid).collection('daily').get()
    if (!quotaSnap.empty) {
      const batch = db.batch()
      quotaSnap.docs.forEach(d => batch.delete(d.ref))
      await batch.commit()
    }
    results.havy_quota = quotaSnap.size
  } catch (e) {
    logError('deleteAccountData', uid, 'Lỗi xóa havy_quota', { error: e.message })
    results.havy_quota = -1
  }

  // ── 3. Xóa user doc ───────────────────────────────────────────────
  try {
    await db.collection('users').doc(uid).delete()
    results.users = 1
  } catch (e) {
    logError('deleteAccountData', uid, 'Lỗi xóa users doc', { error: e.message })
    results.users = -1
  }

  // ── 4. Xóa ảnh Cloudinary (non-blocking) ─────────────────────────
  if (imagePublicIds.length > 0) {
    try {
      await deleteImages(imagePublicIds)
      logInfo('deleteAccountData', uid, `Đã xóa ${imagePublicIds.length} ảnh Cloudinary`)
      results.cloudinary = imagePublicIds.length
    } catch (e) {
      logWarn('deleteAccountData', uid, 'Cloudinary cleanup thất bại (không chặn flow)', { error: e.message })
      results.cloudinary = -1
    }
  }

  logInfo('deleteAccountData', uid, 'Xóa tài khoản hoàn tất', results)
  return { success: true, deleted: results }
})

const { toNetlifyHandler } = require('./lib/netlifyAdapter')
exports.handler = toNetlifyHandler(vercelHandler)
