'use strict'

const { logInfo, logWarn, logError } = require('./lib/logger')
const { withAuth, HttpsError, admin } = require('./lib/withAuth')
const { getVNDate }                   = require('./lib/dateUtils')
const { uploadImageFromUrl }          = require('./lib/cloudinary')
const { withTimeoutGuard }            = require('./lib/withTimeout')

const db = admin.firestore()

const FAL_API_KEY   = process.env.FAL_API_KEY || ''
const FAL_ENDPOINT  = 'https://fal.run/fal-ai/imageutils/rembg'
const PREMIUM_DAILY_LIMIT = 30

function getRateLimitRef(uid) {
  const today = getVNDate()
  return db.collection('rate_limits').doc(`${uid}_removeBackground_${today}`)
}

async function checkRateLimit(uid) {
  const ref  = getRateLimitRef(uid)
  const doc  = await ref.get()
  const count = doc.exists ? doc.data().count : 0
  return { allowed: count < PREMIUM_DAILY_LIMIT, count, limit: PREMIUM_DAILY_LIMIT }
}

async function consumeRateLimit(uid) {
  const ref = getRateLimitRef(uid)
  return db.runTransaction(async (tx) => {
    const doc   = await tx.get(ref)
    const count = doc.exists ? doc.data().count : 0
    if (count >= PREMIUM_DAILY_LIMIT) return { allowed: false, count, limit: PREMIUM_DAILY_LIMIT }
    tx.set(ref, {
      count: admin.firestore.FieldValue.increment(1),
      uid, date: getVNDate(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true })
    return { allowed: true, count: count + 1, limit: PREMIUM_DAILY_LIMIT }
  })
}

const vercelHandler = withAuth(async (request) => {
  const { uid } = request.auth

  const userSnap = await db.collection('users').doc(uid).get()
  const userData = userSnap.exists ? userSnap.data() : {}
  const expiry   = userData.premiumExpiry
  const expired  = expiry?.toDate?.() instanceof Date && expiry.toDate() < new Date()
  const isPremium = userData.isPremium === true && !expired
  if (!isPremium) {
    throw new HttpsError(
      'permission-denied',
      'Tách nền ảnh là tính năng Premium. Nâng cấp để sử dụng nhé! 💎'
    )
  }

  const rateCheck = await checkRateLimit(uid)
  if (!rateCheck.allowed) {
    throw new HttpsError(
      'resource-exhausted',
      `Bạn đã dùng hết ${rateCheck.limit} lượt tách nền hôm nay. Reset lúc 00:00 giờ VN nhé 🌙`
    )
  }

  const { imageUrl, itemId } = request.data
  if (!imageUrl) throw new HttpsError('invalid-argument', 'Thiếu imageUrl')
  if (!itemId || typeof itemId !== 'string') throw new HttpsError('invalid-argument', 'Thiếu itemId')

  const itemRef  = db.collection('clothing_items').doc(itemId)
  const itemSnap = await itemRef.get()
  if (!itemSnap.exists) throw new HttpsError('not-found', 'Không tìm thấy món đồ')
  if (itemSnap.data().userId !== uid) {
    throw new HttpsError('permission-denied', 'Không có quyền với món đồ này')
  }

  let isAllowedUrl = false
  try {
    const parsed = new URL(imageUrl)
    isAllowedUrl = parsed.hostname === 'res.cloudinary.com'
  } catch (_) {}
  if (!isAllowedUrl) throw new HttpsError('invalid-argument', 'URL ảnh không hợp lệ')

  if (!FAL_API_KEY) {
    throw new HttpsError('internal', 'Dịch vụ tách nền chưa sẵn sàng. Thử lại sau nhé.')
  }

  let permanentUrl, permanentPublicId
  try {
    const result = await withTimeoutGuard(
      async () => {

        const response = await fetch(FAL_ENDPOINT, {
          method: 'POST',
          headers: { Authorization: `Key ${FAL_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_url: imageUrl }),
        })
        if (!response.ok) {
          logError('removeBackground', uid, 'fal.ai API error', { status: response.status })
          throw new HttpsError('internal', 'Không thể tách nền lúc này. Vui lòng thử lại!')
        }
        const data = await response.json()
        const falResultUrl = data?.image?.url || data?.image_url
        if (!falResultUrl) throw new HttpsError('internal', 'Kết quả tách nền không hợp lệ')

        const cloudResult = await uploadImageFromUrl(falResultUrl, {
          folder:    `lama_stylers/${uid}/clothing`,
          overwrite: false,
        })
        return { url: cloudResult.url, publicId: cloudResult.publicId }
      },
      8_500,
      'Tách nền ảnh mất quá nhiều thời gian. Vui lòng thử lại sau nhé! 📸'
    )
    permanentUrl      = result.url
    permanentPublicId = result.publicId
  } catch (e) {
    if (e.code === 'deadline-exceeded') throw new HttpsError('deadline-exceeded', e.message)
    if (e instanceof HttpsError) throw e
    logError('removeBackground', uid, 'Unexpected error', { error: e.message })
    throw new HttpsError('internal', 'Không thể tách nền ảnh lúc này. Thử lại sau nhé!')
  }

  let consumeResult
  try {
    consumeResult = await consumeRateLimit(uid)
  } catch (err) {
    console.warn('[removeBackground] consumeRateLimit thất bại:', err.message)
    consumeResult = { allowed: true }
  }
  if (!consumeResult.allowed) {
    throw new HttpsError(
      'resource-exhausted',
      'Đã hết lượt tách nền hôm nay (có yêu cầu khác dùng hết quota cùng lúc). Thử lại ngày mai nhé!'
    )
  }

  const previousImageUrl = itemSnap.data().imageUrl
  const previousPublicId = itemSnap.data().imagePublicId
  const alreadyHadBgRemoved = itemSnap.data().backgroundRemoved === true

  await itemRef.update({
    imageUrl:      permanentUrl,
    imagePublicId: permanentPublicId,
    ...(!alreadyHadBgRemoved && previousImageUrl
      ? { originalImageUrl: previousImageUrl, originalImagePublicId: previousPublicId || null }
      : {}),
    backgroundRemoved:   true,
    backgroundRemovedAt: admin.firestore.FieldValue.serverTimestamp(),
  })

  logInfo('removeBackground', uid, 'Tách nền thành công', { publicId: permanentPublicId })
  return { imageUrl: permanentUrl, imagePublicId: permanentPublicId }
})

const { toNetlifyHandler } = require('./lib/netlifyAdapter')
exports.handler = toNetlifyHandler(vercelHandler)
