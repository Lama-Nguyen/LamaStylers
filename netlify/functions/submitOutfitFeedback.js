'use strict'

const { withAuth, HttpsError, admin } = require('./lib/withAuth')
const { logInfo, logWarn }            = require('./lib/logger')
const { toNetlifyHandler }            = require('./lib/netlifyAdapter')

const db = admin.firestore()

// Ngưỡng để 1 giá trị được coi là "đủ tín hiệu" đưa vào prompt gợi ý outfit sau —
// tránh việc mới có 1-2 lượt vote đã vội kết luận sở thích.
const MIN_VOTES_FOR_SIGNAL   = 3
const MIN_TOTAL_FOR_SUMMARY  = 5

function extractAttributes(items) {
  const colors = [], styles = [], fits = [], patterns = []
  items.forEach(i => {
    const color = typeof i.color === 'object' ? i.color?.primary : i.color
    if (color) colors.push(color)
    if (i.fit) fits.push(i.fit)
    if (i.pattern) patterns.push(i.pattern)
    const tags = i.description?.style_tags
    if (Array.isArray(tags)) styles.push(...tags)
  })
  return { colors, styles, fits, patterns }
}

function applyDelta(bucket, key, field, delta) {
  if (!bucket[key]) bucket[key] = { liked: 0, disliked: 0 }
  bucket[key][field] = Math.max(0, (bucket[key][field] || 0) + delta)
}

const handler = withAuth(async (request) => {
  const { uid } = request.auth
  const { outfitId, liked } = request.data

  if (!outfitId || typeof outfitId !== 'string')
    throw new HttpsError('invalid-argument', 'Thiếu outfitId')
  if (typeof liked !== 'boolean')
    throw new HttpsError('invalid-argument', 'liked phải là true/false')

  const outfitSnap = await db.collection('outfits').doc(outfitId).get()
  if (!outfitSnap.exists) throw new HttpsError('not-found', 'Không tìm thấy outfit')
  const outfit = outfitSnap.data()
  if (outfit.userId !== uid) throw new HttpsError('permission-denied', 'Không có quyền')

  const itemIds = Array.isArray(outfit.items) ? outfit.items : []
  const itemsSnap = await db.getAll(...itemIds.map(id => db.collection('clothing_items').doc(id)))
  const items = itemsSnap.filter(d => d.exists).map(d => d.data())
  const { colors, styles, fits, patterns } = extractAttributes(items)

  const feedbackRef = db.collection('outfit_feedback').doc(`${uid}_${outfitId}`)
  const userRef      = db.collection('users').doc(uid)

  const result = await db.runTransaction(async (tx) => {
    const feedbackSnap = await tx.get(feedbackRef)
    const userSnap     = await tx.get(userRef)
    const prefs = userSnap.data()?.stylePreferences || {
      colors: {}, styles: {}, fits: {}, patterns: {}, totalFeedback: 0,
    }

    const previousVote = feedbackSnap.exists ? feedbackSnap.data().liked : null

    // Nếu vote y hệt lần trước (bấm 👍 lại khi đã 👍) → không tính thêm, tránh cộng dồn sai
    if (previousVote === liked) {
      return { changed: false, prefs, totalFeedback: prefs.totalFeedback || 0 }
    }

    // Nếu đổi vote (👍 → 👎 hoặc ngược lại) → trừ phiếu cũ trước khi cộng phiếu mới
    const applyVote = (isLike, sign) => {
      const field = isLike ? 'liked' : 'disliked'
      colors.forEach(c   => applyDelta(prefs.colors,   c, field, sign))
      styles.forEach(s   => applyDelta(prefs.styles,   s, field, sign))
      fits.forEach(f     => applyDelta(prefs.fits,     f, field, sign))
      patterns.forEach(p => applyDelta(prefs.patterns, p, field, sign))
    }

    if (previousVote !== null) applyVote(previousVote, -1)
    applyVote(liked, +1)

    prefs.totalFeedback = (previousVote === null) ? (prefs.totalFeedback || 0) + 1 : (prefs.totalFeedback || 0)

    tx.set(userRef, { stylePreferences: prefs }, { merge: true })
    tx.set(feedbackRef, {
      uid, outfitId, liked,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true })

    return { changed: true, prefs, totalFeedback: prefs.totalFeedback }
  })

  logInfo('submitOutfitFeedback', uid, 'Đã ghi nhận feedback', { outfitId, liked, changed: result.changed })

  return { success: true, totalFeedback: result.totalFeedback }
})

exports.handler = toNetlifyHandler(handler)
