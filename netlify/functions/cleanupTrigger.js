'use strict'

/**
 * cleanupTrigger — Endpoint dọn dẹp định kỳ
 *
 * Được gọi bởi Cloudflare Workers Cron (cf-workers/cleanup-cron.js) mỗi đêm 01:00 giờ VN.
 * Xác thực qua header X-Cleanup-Secret (phải khớp env CLEANUP_SECRET).
 *
 * Để test thủ công:
 *   curl -X POST https://<site>.netlify.app/.netlify/functions/cleanupTrigger \
 *     -H "X-Cleanup-Secret: <CLEANUP_SECRET>"
 *
 * Env cần set:
 *   CLEANUP_SECRET           = <random 32-char> — tạo bằng: openssl rand -hex 16
 *   CLOUDINARY_CLOUD_NAME    = (để xóa ảnh mồ côi)
 *   CLOUDINARY_API_KEY       = (để xóa ảnh mồ côi)
 *   CLOUDINARY_API_SECRET    = (để xóa ảnh mồ côi)
 */

const { admin }                    = require('./lib/withAuth')
const { logInfo, logWarn, logError } = require('./lib/logger')

const db = admin.firestore()

const BATCH_LIMIT     = 400
const STALE_DAYS      = 2
const TXN_TIMEOUT_MIN = 20
const ORPHAN_LIMIT    = 20

function daysAgo(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000)
}

async function cleanupRateLimits() {
  const snap = await db.collection('rate_limits')
    .where('expiresAt', '<', daysAgo(STALE_DAYS))
    .limit(BATCH_LIMIT)
    .get()
  if (snap.empty) return { deleted: 0 }
  const batch = db.batch()
  snap.docs.forEach(d => batch.delete(d.ref))
  await batch.commit()
  return { deleted: snap.size }
}

async function cleanupHavyQuota() {
  const cutoffStr = daysAgo(STALE_DAYS).toISOString().split('T')[0]
  const snap = await db.collectionGroup('daily')
    .where('date', '<', cutoffStr)
    .limit(BATCH_LIMIT)
    .get()
  if (snap.empty) return { deleted: 0 }
  const batch = db.batch()
  snap.docs.forEach(d => batch.delete(d.ref))
  await batch.commit()
  return { deleted: snap.size }
}

async function cleanupProcessedWebhooks() {
  const snap = await db.collection('processed_webhooks')
    .where('expiresAt', '<', new Date())
    .limit(BATCH_LIMIT)
    .get()
  if (snap.empty) return { deleted: 0 }
  const batch = db.batch()
  snap.docs.forEach(d => batch.delete(d.ref))
  await batch.commit()
  return { deleted: snap.size }
}

async function cleanupStalePendingTransactions() {
  const cutoff = new Date(Date.now() - TXN_TIMEOUT_MIN * 60 * 1000)
  const snap = await db.collection('transactions')
    .where('status', '==', 'pending')
    .where('createdAt', '<', cutoff)
    .limit(50)
    .get()
  if (snap.empty) return { expired: 0 }
  const batch = db.batch()
  snap.docs.forEach(d => batch.update(d.ref, {
    status: 'expired',
    expiredAt: admin.firestore.FieldValue.serverTimestamp(),
  }))
  await batch.commit()
  return { expired: snap.size }
}

/**
 * Xóa ảnh mồ côi trên Cloudinary.
 *
 * Tìm clothing_items đã bị xóa (deletedAt != null) nhưng vẫn còn imagePublicId
 * → gọi Cloudinary API xóa ảnh → xóa imagePublicId khỏi Firestore.
 *
 * Giới hạn ORPHAN_LIMIT (20) mỗi lần chạy để tránh timeout 10s.
 * Các ảnh còn lại sẽ được xử lý ở lần chạy tiếp theo (mỗi đêm).
 */
async function cleanupOrphanedCloudinaryImages() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey    = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET

  if (!cloudName || !apiKey || !apiSecret) {
    return { skipped: true, reason: 'Cloudinary env not set' }
  }

  const snap = await db.collection('clothing_items')
    .where('deletedAt', '!=', null)
    .where('imagePublicId', '!=', null)
    .limit(ORPHAN_LIMIT)
    .get()

  if (snap.empty) return { deleted: 0 }

  const crypto       = require('crypto')
  const toDelete     = []
  const firestoreBatch = db.batch()

  for (const docSnap of snap.docs) {
    const { imagePublicId } = docSnap.data()
    if (!imagePublicId) continue

    const timestamp = Math.round(Date.now() / 1000)
    const signature = crypto
      .createHash('sha1')
      .update(`public_id=${imagePublicId}&timestamp=${timestamp}${apiSecret}`)
      .digest('hex')

    try {
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ public_id: imagePublicId, signature, api_key: apiKey, timestamp }),
        }
      )
      const data = await res.json()
      if (data.result === 'ok' || data.result === 'not found') {
        firestoreBatch.update(docSnap.ref, {
          imagePublicId: admin.firestore.FieldValue.delete(),
          imageUrl:      admin.firestore.FieldValue.delete(),
          cleanedAt:     admin.firestore.FieldValue.serverTimestamp(),
        })
        toDelete.push(imagePublicId)
      } else {
        logWarn('cleanupTrigger', null, 'Cloudinary destroy unexpected result', { imagePublicId, result: data.result })
      }
    } catch (e) {
      logWarn('cleanupTrigger', null, 'Cloudinary destroy failed', { imagePublicId, error: e.message })
    }
  }

  if (toDelete.length > 0) await firestoreBatch.commit()
  return { deleted: toDelete.length, attempted: snap.size }
}

/**
 * Xóa ảnh Cloudinary mồ côi do upload thành công nhưng lưu Firestore thất bại.
 *
 * uploadClothingImage() ghi 1 doc pending_uploads/{publicId} ngay sau khi upload
 * lên Cloudinary xong, kèm expiresAt = +7 ngày. saveClothingItem() xoá doc này
 * NGAY khi ghi clothing_items thành công. Vậy nếu 1 doc pending_uploads vẫn còn
 * tồn tại SAU expiresAt → chắc chắn bước ghi Firestore đã thất bại giữa chừng
 * (mất mạng, lỗi client, đóng app giữa chừng...) — ảnh trên Cloudinary bị mồ côi,
 * an toàn để xoá.
 */
async function cleanupOrphanedPendingUploads() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey    = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET

  if (!cloudName || !apiKey || !apiSecret) {
    return { skipped: true, reason: 'Cloudinary env not set' }
  }

  const snap = await db.collection('pending_uploads')
    .where('expiresAt', '<', new Date())
    .limit(ORPHAN_LIMIT)
    .get()

  if (snap.empty) return { deleted: 0 }

  const crypto = require('crypto')
  const batch  = db.batch()
  let deleted  = 0

  for (const docSnap of snap.docs) {
    const { publicId } = docSnap.data()
    if (!publicId) { batch.delete(docSnap.ref); continue }

    const timestamp = Math.round(Date.now() / 1000)
    const signature = crypto
      .createHash('sha1')
      .update(`public_id=${publicId}&timestamp=${timestamp}${apiSecret}`)
      .digest('hex')

    try {
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ public_id: publicId, signature, api_key: apiKey, timestamp }),
        }
      )
      const data = await res.json()
      if (data.result === 'ok' || data.result === 'not found') {
        batch.delete(docSnap.ref)
        deleted++
      } else {
        logWarn('cleanupTrigger', null, 'Cloudinary destroy (pending_uploads) unexpected result', { publicId, result: data.result })
      }
    } catch (e) {
      logWarn('cleanupTrigger', null, 'Cloudinary destroy (pending_uploads) failed', { publicId, error: e.message })
    }
  }

  if (deleted > 0) await batch.commit()
  return { deleted, attempted: snap.size }
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  const secret   = process.env.CLEANUP_SECRET
  const provided = event.headers['x-cleanup-secret'] || event.headers['X-Cleanup-Secret']
  if (!secret || !provided || provided !== secret) {
    return { statusCode: 401, body: 'Unauthorized' }
  }

  const startTime = Date.now()
  const results   = {}

  try {
    results.rateLimits   = await cleanupRateLimits()
    results.havyQuota    = await cleanupHavyQuota()
    results.webhooks     = await cleanupProcessedWebhooks()
    results.transactions = await cleanupStalePendingTransactions()
    results.orphanImages   = await cleanupOrphanedCloudinaryImages()
    results.pendingUploads = await cleanupOrphanedPendingUploads()
  } catch (e) {
    logError('cleanupTrigger', null, 'Cleanup error', { error: e.message })
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: e.message }),
    }
  }

  const elapsed = Date.now() - startTime
  logInfo('cleanupTrigger', null, 'Cleanup hoàn thành', { elapsed, results })

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: true, elapsed, results }),
  }
}
