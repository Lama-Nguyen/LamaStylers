'use strict'

const { withAuth, HttpsError, admin } = require('./lib/withAuth')
const { toNetlifyHandler }            = require('./lib/netlifyAdapter')
const { runHavyProviderChain }        = require('./lib/aiProviderChain')
const { cleanGeminiResponse }         = require('./lib/geminiService')
const { sanitizeText }                = require('./lib/inputSanitizer')
const { withTimeoutGuard }            = require('./lib/withTimeout')
const { logWarn }                     = require('./lib/logger')

const db = admin.firestore()

const HAVY_QUOTA = { free: 15, premium: 100 }

async function readIsPremium(uid) {
  try {
    const snap = await db.collection('users').doc(uid).get()
    if (!snap.exists) return false
    const data   = snap.data()
    const expiry = data.premiumExpiry
    const expired = expiry?.toDate?.() instanceof Date && expiry.toDate() < new Date()
    return data.isPremium === true && !expired
  } catch (e) {
    logWarn('havySuggestOutfit', uid, 'Không đọc được users doc, fallback Free', { error: e.message })
    return false
  }
}

function getTodayKeyVN() {
  const vnOffset = 7 * 60 * 60 * 1000
  return new Date(Date.now() + vnOffset).toISOString().split('T')[0]
}

async function checkHavyQuota(uid, quotaLimit) {
  const dateKey  = getTodayKeyVN()
  const quotaRef = db.collection('havy_quota').doc(uid).collection('daily').doc(dateKey)
  const snap     = await quotaRef.get()
  const used     = snap.exists ? (snap.data().count || 0) : 0
  return { allowed: used < quotaLimit, used, limit: quotaLimit }
}

async function consumeHavyQuota(uid, quotaLimit) {
  const dateKey  = getTodayKeyVN()
  const quotaRef = db.collection('havy_quota').doc(uid).collection('daily').doc(dateKey)
  return db.runTransaction(async (tx) => {
    const snap    = await tx.get(quotaRef)
    const used    = snap.exists ? (snap.data().count || 0) : 0
    if (used >= quotaLimit) return { used, limit: quotaLimit, raceCondition: true }
    const newUsed = used + 1
    tx.set(quotaRef, {
      count: newUsed,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      uid, date: dateKey,
    }, { merge: true })
    return { used: newUsed, limit: quotaLimit, raceCondition: false }
  })
}

const HAVY_SYSTEM_PROMPT = `Bạn là Hạ Vy, trợ lý thời trang AI thông minh và thân thiện của ứng dụng Lama Stylers.

NHIỆM VỤ CỦA BẠN:
- Tư vấn phối đồ, gợi ý outfit dựa theo tủ đồ user
- Phân tích phong cách cá nhân
- Gợi ý mua sắm bổ sung tủ đồ
- Hướng dẫn cách phối màu, chọn đồ theo dịp, thời tiết
- Trả lời câu hỏi về chăm sóc quần áo, xu hướng thời trang

GIỚI HẠN QUAN TRỌNG:
- Nếu user hỏi về chủ đề KHÔNG LIÊN QUAN đến thời trang → Từ chối lịch sự: "Hạ Vy chỉ am hiểu về thời trang thôi, bạn thông cảm nhé 💜 Bạn có muốn mình tư vấn về phối đồ không?"
- KHÔNG cung cấp thông tin y tế, pháp lý, tài chính
- KHÔNG viết code, giải toán, hay tác vụ không liên quan thời trang

PHONG CÁCH TRẢ LỜI:
- Thân thiện, gần gũi, dùng "bạn/mình"
- Ngắn gọn, đúng trọng tâm (không quá 200 từ trừ khi cần liệt kê chi tiết)
- Dùng emoji phù hợp để sinh động
- Cuối câu trả lời có thể dùng: <(\`^´)>, (;＞_＜;), [~_~], [(￣3￣)], (  -_・)?, (;-ω-)ノ

Hãy trả lời bằng tiếng Việt.`

const havyHandler = withAuth(async (request) => {
  const { uid }                          = request.auth
  const { message, history = [], userApiKey, wardrobeContext } = request.data

  if (!message || typeof message !== 'string' || message.trim().length === 0)
    throw new HttpsError('invalid-argument', 'Tin nhắn không được để trống')
  if (message.trim().length > 2000)
    throw new HttpsError('invalid-argument', 'Tin nhắn quá dài (tối đa 2000 ký tự)')

  const isPremium  = await readIsPremium(uid)
  const quotaLimit = isPremium ? HAVY_QUOTA.premium : HAVY_QUOTA.free
  const quotaCheck = await checkHavyQuota(uid, quotaLimit)

  if (!quotaCheck.allowed) {
    const msg = isPremium
      ? `Bạn đã dùng hết ${quotaLimit} lượt chat hôm nay rồi nè [~_~] Quota reset lúc 00:00 giờ VN nhé!`
      : `Bạn đã hết ${quotaLimit} lượt chat hôm nay 😢 Nâng cấp Premium để chat thêm nhé! [(￣3￣)]`
    throw new HttpsError('resource-exhausted', msg)
  }

  const trimmedUserApiKey = (typeof userApiKey === 'string' && userApiKey.trim().length > 10)
    ? userApiKey.trim()
    : null

  // wardrobeContext build ở client (ragService.retrieveRelevantItems + serializeForPrompt)
  // để tránh phải gửi cả tủ đồ lớn lên server — chặn độ dài phòng payload bất thường
  // (không đi qua UI thật) và strip HTML như mọi input khác.
  const safeWardrobeContext = sanitizeText(wardrobeContext || '', 3000)
  const systemPromptWithContext = safeWardrobeContext
    ? `${HAVY_SYSTEM_PROMPT}\n\n${safeWardrobeContext}\n\nHãy tham khảo đúng những món đồ thật ở trên khi gợi ý phối đồ, đừng bịa ra món không có trong tủ đồ.`
    : HAVY_SYSTEM_PROMPT

  const safeHistory = Array.isArray(history) ? history.slice(-10) : []
  let replyText
  let modelUsed

  try {
    const chainResult = await withTimeoutGuard(
      () => runHavyProviderChain({
        systemPrompt: systemPromptWithContext,
        history:      safeHistory,
        userMessage:  message.trim(),
        userApiKey:   trimmedUserApiKey,
      }),
      8_500,
      'Hạ Vy đang bận xíu, bạn thử lại sau 1-2 giây nhé! (;＞_＜;)'
    )
    modelUsed = chainResult.providerUsed
    replyText = cleanGeminiResponse(chainResult.raw)
      || 'Em chưa hiểu ý bạn, thử hỏi lại nhé? (  -_・)?'
  } catch (e) {
    if (e.code === 'deadline-exceeded')
      throw new HttpsError('deadline-exceeded', e.message)
    if (e.code === 'content_unsafe')
      throw new HttpsError('invalid-argument', e.message)
    console.error('[havySuggestOutfit] Provider chain error:', e.message, e.attempted)
    replyText = 'Em đang gặp sự cố kỹ thuật, bạn thử lại sau nhé! (;＞_＜;)'
  }

  const quotaResult = await consumeHavyQuota(uid, quotaLimit)

  return {
    content:         replyText,
    quota_used:      quotaResult.used,
    quota_limit:     quotaResult.limit,
    quota_remaining: Math.max(0, quotaResult.limit - quotaResult.used),
    model:           modelUsed,
  }
})

exports.handler = toNetlifyHandler(havyHandler)
