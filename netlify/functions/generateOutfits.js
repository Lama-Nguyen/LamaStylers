'use strict'

const { withAuth, HttpsError, admin }     = require('./lib/withAuth')
const { checkAndConsumeRateLimit,
        refundRateLimit }                  = require('./lib/rateLimits')
const { generateOutfitsWithAI }           = require('./lib/outfit/aiOrchestrator')
const { selectItems }                     = require('./lib/outfit/itemSelector')
const { deduplicateOutfits,
        summarizeRecentOutfits }          = require('./lib/outfit/outfitDeduplicator')
const { sanitizeText }                    = require('./lib/inputSanitizer')
const { logInfo, logWarn, logError }      = require('./lib/logger')
const { toNetlifyHandler }                = require('./lib/netlifyAdapter')
const { withTimeoutGuard }                = require('./lib/withTimeout')

const db = admin.firestore()

/**
 * Đọc isPremium từ Firestore thay vì Firebase Custom Claims.
 *
 * Lý do không dùng Custom Claims: app không set claims sau khi user upgrade,
 * và token cache 1 giờ nên sẽ delay sau khi Premium thay đổi trạng thái.
 * Firestore là nguồn sự thật duy nhất cho Premium status.
 */
async function readUserContext(uid) {
  try {
    const snap = await db.collection('users').doc(uid).get()
    if (!snap.exists) return { isPremium: false, stylePreferences: null, bodyMeasurements: null }
    const data   = snap.data()
    const expiry = data.premiumExpiry
    const expired = expiry?.toDate?.() instanceof Date && expiry.toDate() < new Date()
    return {
      isPremium: data.isPremium === true && !expired,
      stylePreferences: data.stylePreferences || null,
      bodyMeasurements: data.bodyMeasurements || null,
    }
  } catch (e) {
    logWarn('generateOutfits', uid, 'Không đọc được users doc, fallback Free', { error: e.message })
    return { isPremium: false, stylePreferences: null, bodyMeasurements: null }
  }
}

const handler = withAuth(async (request) => {
  const { uid }                          = request.auth
  const { userId, userText, userApiKey } = request.data

  if (!userId || userId !== uid)
    throw new HttpsError('permission-denied', 'Không có quyền')

  const cleanText = sanitizeText(userText || '', 500)

  const { isPremium, stylePreferences, bodyMeasurements } = await readUserContext(uid)
  const { buildPreferenceSummary } = require('./lib/outfit/preferenceSummary')
  const preferenceSummary = buildPreferenceSummary(stylePreferences)
  const { buildBodyMeasurementsSummary } = require('./lib/outfit/bodyMeasurementsSummary')
  const bodyInfo = buildBodyMeasurementsSummary(bodyMeasurements)

  // ── Validate wardrobe TRƯỚC khi consume rate (tránh trừ lượt oan) ──
  const itemsSnap = await db.collection('clothing_items')
    .where('userId', '==', userId)
    .where('deletedAt', '==', null)
    .get()

  if (itemsSnap.size < 2)
    throw new HttpsError('failed-precondition', 'Cần ít nhất 2 món quần áo để tạo outfit')

  // ── Acquire lock TRƯỚC khi consume (tránh trừ lượt khi đang có request khác) ──
  const lockRef = db.collection('generation_locks').doc(`${uid}_generateOutfits`)
  const lockResult = await db.runTransaction(async (tx) => {
    const snap = await tx.get(lockRef)
    const now  = Date.now()
    if (snap.exists && snap.data().lockedUntil > now) return { acquired: false }
    tx.set(lockRef, { lockedUntil: now + 60_000, uid, createdAt: new Date() })
    return { acquired: true }
  })

  if (!lockResult.acquired)
    throw new HttpsError('already-exists', 'Đang có yêu cầu tạo outfit khác. Vui lòng chờ.')

  // Flag: true = đã consume, cần refund nếu fail trước khi hoàn tất
  let rateConsumed = false

  try {
    // Consume sau validate + lock → race vẫn được chặn bởi lock;
    // checkAndConsume vẫn atomic trên Firestore transaction.
    const finalRateCheck = await checkAndConsumeRateLimit(uid, 'GENERATE_OUTFITS', isPremium)
    if (!finalRateCheck.allowed) {
      throw new HttpsError('resource-exhausted',
        `Đã hết lượt tạo outfit hôm nay (${finalRateCheck.limit}/ngày). Lượt mới lúc nửa đêm (giờ VN).`)
    }
    rateConsumed = true

    const allItems = itemsSnap.docs.map(d => ({ id: d.id, ...d.data() }))

    // Recent outfits để dedupe + selectItems scoring
    const recentSnap = await db.collection('outfits')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get()
    const recentOutfits = recentSnap.docs.map(d => ({ id: d.id, ...d.data() }))

    // B8: Giới hạn số món gửi AI (max 25), ưu tiên theo context + điểm
    const { selected: items, contextFallback } = selectItems(allItems, cleanText, recentOutfits)
    if (contextFallback) {
      logInfo('generateOutfits', uid, 'selectItems context fallback — dùng full list (không đủ đồ phù hợp context)')
    }

    const recentOutfitSummaries = summarizeRecentOutfits(recentOutfits, 10)

    // Outfit user đã đánh dấu yêu thích gần đây — nuôi vào fewShotBlock (học PHONG CÁCH,
    // không sao chép y hệt). Trước đây tham số này luôn rỗng vì không nơi nào cấp dữ liệu.
    const likedOutfits = recentOutfits.filter(o => o.isFavorite === true).slice(0, 3)

    const rawOutfits = await withTimeoutGuard(
      () => generateOutfitsWithAI(items, cleanText, {
        userApiKey: userApiKey || null,
        isPremium:  !!isPremium,
        recentOutfitSummaries,
        likedOutfits,
        preferenceSummary,
        bodyInfo,
      }),
      8_500,
      'AI đang xử lý quá lâu. Vui lòng thử lại sau.'
    )

    if (!rawOutfits || rawOutfits.length === 0)
      throw new HttpsError('internal', 'AI không tạo được outfit nào. Thử lại sau.')

    // Dedupe: lọc bỏ outfit trùng với outfits đã tạo trước đây
    const outfits = deduplicateOutfits(rawOutfits, recentOutfits)
    if (outfits.length === 0) {
      // Tất cả đề xuất đều trùng — trả về raw (không refund, AI đã chạy)
      logWarn('generateOutfits', uid, 'Tất cả outfit AI đề xuất đều trùng recent — trả về raw')
    }

    const finalOutfits = outfits.length > 0 ? outfits : rawOutfits

    const batch     = db.batch()
    const outfitIds = []
    for (const outfit of finalOutfits) {
      const ref = db.collection('outfits').doc()
      const itemImages = (outfit.items || [])
        .map(id => allItems.find(i => i.id === id)?.imageUrl)
        .filter(Boolean)
      batch.set(ref, {
        userId,
        ...outfit,
        itemImages,
        createdAt:  admin.firestore.FieldValue.serverTimestamp(),
        isFavorite: false,
      })
      outfitIds.push(ref.id)
    }
    await batch.commit()

    // Chỉ đánh dấu thành công SAU khi ghi Firestore xong
    rateConsumed = false

    logInfo('generateOutfits', uid, 'Generation completed', {
      total: allItems.length, selected: items.length,
      count: outfitIds.length, isPremium,
    })

    return { outfits: finalOutfits, outfitIds, count: outfitIds.length }

  } catch (e) {
    if (e instanceof HttpsError) throw e

    if (e.code === 'quota_exceeded' || e.message === 'quota_exceeded') {
      throw new HttpsError('resource-exhausted',
        'Hệ thống AI đang quá tải. Bạn có thể dùng Gemini API Key cá nhân trong phần Cài đặt để tiếp tục.'
      )
    }
    if (e.code === 'all_providers_failed' || e.message === 'all_providers_failed') {
      throw new HttpsError('unavailable',
        'Tất cả nhà cung cấp AI đều không phản hồi. Thử lại sau ít phút hoặc dùng API Key cá nhân.'
      )
    }
    if (e.code === 'deadline-exceeded') {
      throw new HttpsError('deadline-exceeded', e.message)
    }

    logError('generateOutfits', uid, 'Generation failed', { error: e.message, code: e.code })
    throw new HttpsError('internal', 'Không thể tạo outfit. Vui lòng thử lại.')
  } finally {
    await lockRef.delete().catch(() => {})

    // Hoàn lượt nếu đã consume nhưng chưa hoàn tất (AI error, timeout, batch fail, …)
    if (rateConsumed) {
      refundRateLimit(uid, 'GENERATE_OUTFITS').catch(err =>
        logWarn('generateOutfits', uid, 'refundRateLimit thất bại (không chặn)', { error: err.message })
      )
    }
  }
})

exports.handler = toNetlifyHandler(handler)
