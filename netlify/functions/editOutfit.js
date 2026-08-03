'use strict'

const { withAuth, HttpsError, admin }     = require('./lib/withAuth')
const { checkAndConsumeRateLimit,
        refundRateLimit }                  = require('./lib/rateLimits')
const { editOutfitWithAI }                = require('./lib/outfit/aiOrchestrator')
const { sanitizeText }                    = require('./lib/inputSanitizer')
const { logInfo, logWarn, logError }      = require('./lib/logger')
const { toNetlifyHandler }                = require('./lib/netlifyAdapter')
const { withTimeoutGuard }                = require('./lib/withTimeout')

const db = admin.firestore()

async function readUserContext(uid) {
  try {
    const snap = await db.collection('users').doc(uid).get()
    if (!snap.exists) return { isPremium: false, stylePreferences: null }
    const data    = snap.data()
    const expiry  = data.premiumExpiry
    const expired = expiry?.toDate?.() instanceof Date && expiry.toDate() < new Date()
    return {
      isPremium: data.isPremium === true && !expired,
      stylePreferences: data.stylePreferences || null,
    }
  } catch (e) {
    logWarn('editOutfit', uid, 'Không đọc được users doc, fallback Free', { error: e.message })
    return { isPremium: false, stylePreferences: null }
  }
}

const handler = withAuth(async (request) => {
  const { uid } = request.auth
  const { outfitId, lockedItemIds, styleShift, userApiKey } = request.data

  if (!outfitId || typeof outfitId !== 'string')
    throw new HttpsError('invalid-argument', 'Thiếu outfitId')
  if (!Array.isArray(lockedItemIds))
    throw new HttpsError('invalid-argument', 'lockedItemIds phải là mảng (có thể rỗng)')

  const cleanStyleShift = styleShift ? sanitizeText(styleShift, 200) : null

  const { isPremium, stylePreferences } = await readUserContext(uid)
  const { buildPreferenceSummary } = require('./lib/outfit/preferenceSummary')
  const preferenceSummary = buildPreferenceSummary(stylePreferences)

  // ── Lấy outfit + xác nhận đúng chủ sở hữu ──
  const outfitRef  = db.collection('outfits').doc(outfitId)
  const outfitSnap = await outfitRef.get()
  if (!outfitSnap.exists)
    throw new HttpsError('not-found', 'Không tìm thấy outfit')
  const currentOutfit = outfitSnap.data()
  if (currentOutfit.userId !== uid)
    throw new HttpsError('permission-denied', 'Không có quyền sửa outfit này')

  const outfitItemIds = Array.isArray(currentOutfit.items) ? currentOutfit.items : []

  // Chỉ chấp nhận khoá món thực sự nằm trong outfit hiện tại — chặn client
  // gửi id lạ không liên quan.
  const validLockedIds = lockedItemIds.filter(id => outfitItemIds.includes(id))

  if (validLockedIds.length === outfitItemIds.length && !cleanStyleShift)
    throw new HttpsError('invalid-argument', 'Toàn bộ món đã bị khoá và không có yêu cầu điều chỉnh — không còn gì để sửa')

  // ── Lấy toàn bộ tủ đồ làm nguồn ứng viên thay thế ──
  const itemsSnap = await db.collection('clothing_items')
    .where('userId', '==', uid)
    .where('deletedAt', '==', null)
    .get()
  const allItems = itemsSnap.docs.map(d => ({ id: d.id, ...d.data() }))

  const candidateItemIds = allItems
    .map(i => i.id)
    .filter(id => !validLockedIds.includes(id))

  if (candidateItemIds.length === 0)
    throw new HttpsError('failed-precondition', 'Không còn món nào khác trong tủ đồ để thay thế')

  // ── Lock (chặn 2 request sửa cùng outfit song song) ──
  const lockRef = db.collection('generation_locks').doc(`${uid}_editOutfit`)
  const lockResult = await db.runTransaction(async (tx) => {
    const snap = await tx.get(lockRef)
    const now  = Date.now()
    if (snap.exists && snap.data().lockedUntil > now) return { acquired: false }
    tx.set(lockRef, { lockedUntil: now + 60_000, uid, createdAt: new Date() })
    return { acquired: true }
  })
  if (!lockResult.acquired)
    throw new HttpsError('already-exists', 'Đang có yêu cầu chỉnh sửa khác. Vui lòng chờ.')

  let rateConsumed = false

  try {
    const rateCheck = await checkAndConsumeRateLimit(uid, 'EDIT_OUTFIT', isPremium)
    if (!rateCheck.allowed) {
      throw new HttpsError('resource-exhausted',
        `Đã hết lượt chỉnh sửa outfit hôm nay (${rateCheck.limit}/ngày). Lượt mới lúc nửa đêm (giờ VN).`)
    }
    rateConsumed = true

    const editedOutfit = await withTimeoutGuard(
      () => editOutfitWithAI(allItems, {
        currentOutfit,
        lockedItemIds: validLockedIds,
        candidateItemIds,
        styleShift: cleanStyleShift,
        userApiKey: userApiKey || null,
        isPremium: !!isPremium,
        preferenceSummary,
      }),
      8_500,
      'AI đang xử lý quá lâu. Vui lòng thử lại sau.'
    )

    const itemImages = (editedOutfit.items || [])
      .map(id => allItems.find(i => i.id === id)?.imageUrl)
      .filter(Boolean)

    // Lưu thành bản ghi MỚI, giữ liên kết về outfit gốc — không ghi đè outfit cũ,
    // để user có thể xem lại/so sánh các phiên bản trước đó.
    const rootOutfitId = currentOutfit.rootOutfitId || outfitId
    if (!currentOutfit.rootOutfitId) {
      // Lần đầu outfit này được sửa — outfit gốc chưa có field rootOutfitId,
      // tự vá để query lấy toàn bộ version sau này tìm được cả bản gốc.
      await outfitRef.update({ rootOutfitId, versionNumber: 1 }).catch(() => {})
    }
    const versionsSnap = await db.collection('outfits')
      .where('rootOutfitId', '==', rootOutfitId)
      .get()
    const versionNumber = versionsSnap.size + 1 // versionsSnap giờ đã gồm cả bản gốc (vừa tự vá ở trên)

    const newRef = db.collection('outfits').doc()
    await newRef.set({
      userId: uid,
      ...editedOutfit,
      itemImages,
      rootOutfitId,
      parentOutfitId: outfitId,
      versionNumber,
      createdAt:  admin.firestore.FieldValue.serverTimestamp(),
      isFavorite: false,
    })

    rateConsumed = false

    logInfo('editOutfit', uid, 'Chỉnh sửa thành công', {
      outfitId, newOutfitId: newRef.id, lockedCount: validLockedIds.length, versionNumber,
    })

    return { outfit: editedOutfit, outfitId: newRef.id, versionNumber, rootOutfitId }

  } catch (e) {
    if (e instanceof HttpsError) throw e

    if (e.code === 'quota_exceeded' || e.message === 'quota_exceeded') {
      throw new HttpsError('resource-exhausted',
        'Hệ thống AI đang quá tải. Bạn có thể dùng Gemini API Key cá nhân trong phần Cài đặt để tiếp tục.')
    }
    if (e.code === 'all_providers_failed' || e.message === 'all_providers_failed') {
      throw new HttpsError('unavailable',
        'Tất cả nhà cung cấp AI đều không phản hồi. Thử lại sau ít phút hoặc dùng API Key cá nhân.')
    }
    if (e.code === 'content_unsafe') {
      throw new HttpsError('invalid-argument', 'Yêu cầu điều chỉnh chứa nội dung không phù hợp')
    }
    if (e.code === 'deadline-exceeded') {
      throw new HttpsError('deadline-exceeded', e.message)
    }

    logError('editOutfit', uid, 'Chỉnh sửa thất bại', { error: e.message, code: e.code })
    throw new HttpsError('internal', 'Không thể chỉnh sửa outfit. Vui lòng thử lại.')
  } finally {
    await lockRef.delete().catch(() => {})
    if (rateConsumed) {
      refundRateLimit(uid, 'EDIT_OUTFIT').catch(err =>
        logWarn('editOutfit', uid, 'refundRateLimit thất bại (không chặn)', { error: err.message })
      )
    }
  }
})

exports.handler = toNetlifyHandler(handler)
