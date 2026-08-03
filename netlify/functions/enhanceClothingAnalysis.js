'use strict'

const { withAuth, HttpsError, admin } = require('./lib/withAuth')
const { runEnhanceProviderChain, parseJson } = require('./lib/aiProviderChain')
const { getVNDate } = require('./lib/dateUtils')
const { withTimeoutGuard } = require('./lib/withTimeout')

const db = admin.firestore()
const PREMIUM_DAILY_LIMIT = 30

// Dùng chung logic với generateOutfits — check cả isPremium lẫn premiumExpiry
async function readIsPremium(uid) {
  try {
    const snap    = await db.collection('users').doc(uid).get()
    if (!snap.exists) return false
    const data    = snap.data()
    const expiry  = data.premiumExpiry
    const expired = expiry?.toDate?.() instanceof Date && expiry.toDate() < new Date()
    return data.isPremium === true && !expired
  } catch (e) {
    return false
  }
}

async function checkEnhanceLimitOnly(uid) {
  const today = getVNDate()
  const ref   = db.collection('rate_limits').doc(`${uid}_enhance_${today}`)
  const snap  = await ref.get()
  const count = snap.exists ? (snap.data().count || 0) : 0
  return { allowed: count < PREMIUM_DAILY_LIMIT, count, limit: PREMIUM_DAILY_LIMIT }
}

async function consumeEnhanceLimitOnly(uid) {
  const today = getVNDate()
  const ref   = db.collection('rate_limits').doc(`${uid}_enhance_${today}`)
  return db.runTransaction(async (tx) => {
    const snap  = await tx.get(ref)
    const count = snap.exists ? (snap.data().count || 0) : 0
    if (count >= PREMIUM_DAILY_LIMIT) return { allowed: false, count, limit: PREMIUM_DAILY_LIMIT }
    tx.set(ref, {
      count: admin.firestore.FieldValue.increment(1),
      uid, date: today,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true })
    return { allowed: true, count: count + 1, limit: PREMIUM_DAILY_LIMIT }
  })
}

const vercelHandler = withAuth(async (request) => {
  const uid = request.auth.uid

  const isPremium = await readIsPremium(uid)
  if (!isPremium) {
    throw new HttpsError('permission-denied', 'Tính năng này chỉ dành cho tài khoản Premium 💎')
  }

  const { itemId, isPreview: isPreviewFlag, type, color, pattern, material, fit, userApiKey } = request.data

  if (!itemId || !type || !color) {
    throw new HttpsError('invalid-argument', 'Thiếu thông tin món đồ (itemId, type, color)')
  }

  const isPreview = isPreviewFlag === true || itemId === '_preview'

  if (!isPreview) {
    const itemSnap = await db.collection('clothing_items').doc(itemId).get()
    if (!itemSnap.exists) {
      throw new HttpsError('not-found', 'Không tìm thấy món đồ')
    }
    if (itemSnap.data().userId !== uid) {
      throw new HttpsError('permission-denied', 'Không có quyền với món đồ này')
    }
  }

  const rateCheck = await checkEnhanceLimitOnly(uid)
  if (!rateCheck.allowed && !userApiKey) {
    throw new HttpsError(
      'resource-exhausted',
      `Bạn đã dùng hết ${rateCheck.limit} lượt phân tích chi tiết hôm nay. Reset lúc 00:00 giờ VN 🌙`
    )
  }

  let raw, providerUsed
  try {
    const result = await withTimeoutGuard(
      () => runEnhanceProviderChain({ type, color, pattern, material, fit, userApiKey: userApiKey || null }),
      8_500,
      'Phân tích chi tiết mất quá nhiều thời gian. Vui lòng thử lại sau nhé!'
    )
    raw          = result.raw
    providerUsed = result.providerUsed
  } catch (e) {
    if (e.code === 'deadline-exceeded') throw new HttpsError('deadline-exceeded', e.message)
    console.error('[enhanceClothingAnalysis] error:', e)
    throw new HttpsError('internal', 'Không thể phân tích chi tiết lúc này. Thử lại sau nhé!')
  }

  if (providerUsed !== 'user-key') {
    const consumeResult = await consumeEnhanceLimitOnly(uid)
    if (!consumeResult.allowed) {
      throw new HttpsError(
        'resource-exhausted',
        `Đã đạt giới hạn ${PREMIUM_DAILY_LIMIT} lượt phân tích chi tiết hôm nay`
      )
    }
  }

  let enhancedMetadata
  try {
    enhancedMetadata = parseJson(raw)
  } catch (_) {
    throw new HttpsError('internal', 'AI trả về dữ liệu không hợp lệ. Thử lại nhé!')
  }

  if (!enhancedMetadata.style && !enhancedMetadata.occasion) {
    throw new HttpsError('internal', 'Kết quả phân tích không đầy đủ. Thử lại sau nhé!')
  }

  if (!isPreview) {
    await db.collection('clothing_items').doc(itemId).update({
      enhancedMetadata: {
        ...enhancedMetadata,
        tags:       Array.isArray(enhancedMetadata.tags) ? enhancedMetadata.tags.slice(0, 5) : [],
        analyzedAt: admin.firestore.FieldValue.serverTimestamp(),
        providerUsed,
      },
      analysisType: 'detailed',
    })
  }

  return { success: true, enhancedMetadata, providerUsed }
})

const { toNetlifyHandler } = require('./lib/netlifyAdapter')
exports.handler = toNetlifyHandler(vercelHandler)
