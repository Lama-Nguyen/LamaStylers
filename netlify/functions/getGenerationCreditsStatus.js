'use strict'

const { withAuth, admin }    = require('./lib/withAuth')
const { checkRateLimitOnly } = require('./lib/rateLimits')

const db = admin.firestore()

const vercelHandler = withAuth(async (request) => {
  const { uid } = request.auth

  // Đọc isPremium + kiểm tra expiry (giống readIsPremium trong generateOutfits)
  let isPremium = false
  try {
    const snap = await db.collection('users').doc(uid).get()
    if (snap.exists) {
      const data   = snap.data()
      const expiry = data.premiumExpiry
      const expired = expiry?.toDate?.() instanceof Date && expiry.toDate() < new Date()
      isPremium = data.isPremium === true && !expired
    }
  } catch (e) {
    // Fallback Free nếu không đọc được — không chặn luồng
  }

  const [analyzeStatus, outfitStatus] = await Promise.all([
    checkRateLimitOnly(uid, 'ANALYZE_CLOTHING',  isPremium),
    checkRateLimitOnly(uid, 'GENERATE_OUTFITS', isPremium),
  ])

  return { analyzeClothing: analyzeStatus, generateOutfits: outfitStatus }
})

const { toNetlifyHandler } = require('./lib/netlifyAdapter')
exports.handler = toNetlifyHandler(vercelHandler)
