'use strict'

const { logInfo, logError, logWarn }     = require('./lib/logger')
const { withAuth, HttpsError, admin }    = require('./lib/withAuth')
const { getVNDate }                      = require('./lib/dateUtils')
const { withTimeoutGuard }               = require('./lib/withTimeout')
const { GoogleGenerativeAI }             = require('@google/generative-ai')
const { callGeminiWithRetry }            = require('./lib/geminiService')
const { buildGenerateStyleInsightPrompt } = require('./lib/aiPrompts')

const db = admin.firestore()
const DAILY_LIMIT = 15

async function readIsPremium(uid) {
  try {
    const snap = await db.collection('users').doc(uid).get()
    if (!snap.exists) return false
    const data = snap.data()
    const expiry = data.premiumExpiry
    const expired = expiry?.toDate?.() instanceof Date && expiry.toDate() < new Date()
    return data.isPremium === true && !expired
  } catch (e) {
    logWarn('generateStyleInsight', uid, 'Không đọc được users doc, fallback Free', { error: e.message })
    return false
  }
}

async function checkRateLimit(uid) {
  const today = getVNDate()
  const ref   = db.collection('rate_limits').doc(`${uid}_styleInsight_${today}`)
  const snap  = await ref.get()
  const count = snap.exists ? (snap.data().count || 0) : 0
  return { allowed: count < DAILY_LIMIT, count, limit: DAILY_LIMIT, ref, today }
}

async function consumeRateLimit(ref, today, uid) {
  return db.runTransaction(async (tx) => {
    const snap  = await tx.get(ref)
    const count = snap.exists ? (snap.data().count || 0) : 0
    if (count >= DAILY_LIMIT) return { allowed: false }
    tx.set(ref, {
      count: admin.firestore.FieldValue.increment(1),
      uid, date: today,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true })
    return { allowed: true }
  })
}

function parseStyleJson(rawText) {
  const cleaned = String(rawText || '').replace(/```json|```/g, '').trim()
  const start = cleaned.indexOf('{')
  const end   = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('Không tìm thấy JSON trong phản hồi AI')
  return JSON.parse(cleaned.slice(start, end + 1))
}

const vercelHandler = withAuth(async (request) => {
  const uid = request.auth.uid
  const { items, outfits, userApiKey } = request.data

  if (!Array.isArray(items) || items.length === 0) {
    throw new HttpsError('invalid-argument', 'Tủ đồ trống, chưa có gì để phân tích')
  }

  const rateCheck = await checkRateLimit(uid)
  if (!rateCheck.allowed) {
    throw new HttpsError(
      'resource-exhausted',
      `Bạn đã dùng hết ${rateCheck.limit} lượt phân tích phong cách hôm nay. Reset lúc 00:00 giờ VN 🌙`
    )
  }

  const isPremium = await readIsPremium(uid)
  const prompt = buildGenerateStyleInsightPrompt(items, Array.isArray(outfits) ? outfits : [])

  let parsed
  try {
    const rawText = await withTimeoutGuard(
      async () => {
        const hasUserKey = typeof userApiKey === 'string' && userApiKey.trim().length > 10
        if (hasUserKey) {
          // User dùng API key cá nhân — gọi trực tiếp, không qua chuỗi model chung
          const genAI = new GoogleGenerativeAI(userApiKey.trim())
          const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            generationConfig: { temperature: 0.6, maxOutputTokens: 800, responseMimeType: 'application/json' },
          })
          const result = await model.generateContent(prompt)
          return result.response.text()
        }
        // Dùng đúng chuỗi model + fallback chuẩn của hệ thống (GEMINI_CONFIGS.style_insight)
        // thay vì gọi thẳng 1 model cố định như trước — nếu model đầu bận/lỗi sẽ tự chuyển tiếp.
        if (!process.env.GEMINI_API_KEY) {
          throw new Error('Dịch vụ AI chưa sẵn sàng')
        }
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
        return await callGeminiWithRetry(genAI, 'style_insight', isPremium, async (model) => {
          const result = await model.generateContent(prompt)
          return result.response.text()
        })
      },
      8_500,
      'Phân tích phong cách mất quá nhiều thời gian. Vui lòng thử lại sau nhé!'
    )
    parsed = parseStyleJson(rawText)
  } catch (e) {
    if (e.code === 'deadline-exceeded') throw new HttpsError('deadline-exceeded', e.message)
    logError('generateStyleInsight', uid, 'Unexpected error', { error: e.message })
    throw new HttpsError('internal', 'Không thể phân tích phong cách lúc này. Thử lại sau nhé!')
  }

  let consumeResult
  try {
    consumeResult = await consumeRateLimit(rateCheck.ref, rateCheck.today, uid)
  } catch (e) {
    console.warn('[generateStyleInsight] consumeRateLimit thất bại:', e.message)
    consumeResult = { allowed: true }
  }

  if (!consumeResult.allowed) {
    throw new HttpsError(
      'resource-exhausted',
      `Đã đạt giới hạn ${DAILY_LIMIT} lượt phân tích hôm nay (có yêu cầu khác vừa dùng hết quota)`
    )
  }

  logInfo('generateStyleInsight', uid, 'Phân tích thành công', { styleConclusion: parsed.style_conclusion })

  return {
    style_conclusion:    parsed.style_conclusion    || null,
    description:         parsed.description         || null,
    color_palette:        Array.isArray(parsed.color_palette) ? parsed.color_palette : [],
    key_characteristics:  Array.isArray(parsed.key_characteristics) ? parsed.key_characteristics : [],
    recommendations:      parsed.recommendations     || null,
    // Giữ field `insight` để tương thích ngược với bất kỳ chỗ nào frontend cũ còn đọc field này
    insight:              parsed.description         || null,
  }
})

const { toNetlifyHandler } = require('./lib/netlifyAdapter')
exports.handler = toNetlifyHandler(vercelHandler)
