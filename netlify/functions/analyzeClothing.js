'use strict'

const { withAuth, HttpsError, admin }    = require('./lib/withAuth')
const { checkAndConsumeRateLimit }       = require('./lib/rateLimits')
const { buildAnalyzeClothingPrompt }     = require('./lib/aiPrompts')
const { callGeminiWithRetry }            = require('./lib/geminiService')
const { GoogleGenerativeAI }             = require('@google/generative-ai')
const { logInfo, logWarn, logError }     = require('./lib/logger')
const { withTimeoutGuard }               = require('./lib/withTimeout')
const { COLORS, MATERIALS }              = require('./lib/constants')

const COLORS_LIST    = Object.values(COLORS)
const MATERIALS_LIST = Object.values(MATERIALS)

const db = admin.firestore()

const SUPPORTED_MIME_TYPES = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
])

function detectMimeType(imageBase64) {
  if (typeof imageBase64 !== 'string') {
    return { mimeType: 'image/jpeg', isDetected: false }
  }
  const dataUriMatch = imageBase64.match(
    /^data:([a-zA-Z0-9][a-zA-Z0-9!#$&\-^_]+\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-^_.+]+);base64,/
  )
  if (dataUriMatch) {
    const detected   = dataUriMatch[1].toLowerCase()
    const normalized = detected === 'image/jpg' ? 'image/jpeg' : detected
    if (SUPPORTED_MIME_TYPES.has(normalized)) return { mimeType: normalized, isDetected: true }
    return { mimeType: 'image/jpeg', isDetected: false }
  }
  return { mimeType: 'image/jpeg', isDetected: false }
}

async function readIsPremium(uid) {
  try {
    const snap = await db.collection('users').doc(uid).get()
    if (!snap.exists) return false
    const data = snap.data()
    const expiry = data.premiumExpiry
    const expired = expiry?.toDate?.() instanceof Date && expiry.toDate() < new Date()
    return data.isPremium === true && !expired
  } catch (e) {
    logWarn('analyzeClothing', uid, 'Không đọc được users doc, fallback Free', { error: e.message })
    return false
  }
}

async function callOpenRouterVision(prompt, base64Data, mimeType) {
  const { fetchOpenRouter } = require('./lib/aiProviderChain')
  const data = await fetchOpenRouter({
    model: 'meta-llama/llama-3.2-11b-vision-instruct:free',
    messages: [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Data}` } },
        { type: 'text', text: prompt },
      ],
    }],
    max_tokens: 500,
  }, { label: 'analyze-vision' })
  const text = data?.choices?.[0]?.message?.content
  if (!text) throw new Error('OpenRouter Vision trả về nội dung rỗng')
  return text
}

function tryParseJSON(text) {
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/, '')
    .replace(/```\s*$/, '')
    .trim()
  return JSON.parse(cleaned)
}

const vercelHandler = withAuth(async (request) => {
  const { uid } = request.auth

  // Chống spam: chặn 2 request phân tích ảnh cùng lúc từ chính user này
  // (trước đây chỉ generateOutfits/editOutfit có khoá này, analyzeClothing thì không).
  const lockRef = db.collection('generation_locks').doc(`${uid}_analyzeClothing`)
  const lockResult = await db.runTransaction(async (tx) => {
    const snap = await tx.get(lockRef)
    const now  = Date.now()
    if (snap.exists && snap.data().lockedUntil > now) return { acquired: false }
    tx.set(lockRef, { lockedUntil: now + 30_000, uid, createdAt: new Date() })
    return { acquired: true }
  })
  if (!lockResult.acquired) {
    throw new HttpsError('already-exists', 'Đang có yêu cầu phân tích ảnh khác. Vui lòng chờ.')
  }

  try {
    return await analyzeClothingCore(request)
  } finally {
    await lockRef.delete().catch(() => {})
  }
})

const analyzeClothingCore = async (request) => {
  const { uid } = request.auth

  const rateCheck = await checkAndConsumeRateLimit(uid, 'ANALYZE_CLOTHING')
  if (!rateCheck.allowed) {
    throw new HttpsError(
      'resource-exhausted',
      `Bạn đã dùng hết lượt phân tích ảnh hôm nay (${rateCheck.limit}/ngày). Lượt mới lúc 00:00 giờ VN nhé 🌙`
    )
  }

  const { imageBase64, userApiKey } = request.data
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    throw new HttpsError('invalid-argument', 'Thiếu imageBase64')
  }

  const isPremium = await readIsPremium(uid)

  const apiKey = (typeof userApiKey === 'string' && userApiKey.trim().length > 10)
    ? userApiKey.trim()
    : process.env.GEMINI_API_KEY

  if (!apiKey && !process.env.OPENROUTER_API_KEY) {
    throw new HttpsError('internal', 'Dịch vụ AI chưa sẵn sàng. Vui lòng thử lại sau.')
  }

  const { mimeType, isDetected } = detectMimeType(imageBase64)
  if (!isDetected) {
    logWarn('analyzeClothing', uid, 'MIME type không detect được, fallback image/jpeg', {
      prefix: imageBase64.substring(0, 30),
    })
  }

  const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64
  if (!base64Data || base64Data.length < 100) {
    throw new HttpsError('invalid-argument', 'Ảnh không hợp lệ hoặc quá nhỏ')
  }

  let analysis
  try {
    analysis = await withTimeoutGuard(
      async () => {
        const prompt = buildAnalyzeClothingPrompt()
        const imageData = { inlineData: { data: base64Data, mimeType } }

        let rawText
        try {
          if (!apiKey) throw new Error('GEMINI_API_KEY missing')
          const genAI = new GoogleGenerativeAI(apiKey)
          rawText = await callGeminiWithRetry(genAI, 'analyze_clothing', isPremium, async (model) => {
            const result = await model.generateContent([prompt, imageData])
            return result.response.text()
          })
        } catch (geminiError) {
          logWarn('analyzeClothing', uid, 'Gemini Vision error', {
            error: geminiError.message, mimeType, isPremium,
          })
          if (process.env.OPENROUTER_API_KEY) {
            try {
              logWarn('analyzeClothing', uid, 'Gemini thất bại, thử OpenRouter Vision')
              rawText = await callOpenRouterVision(prompt, base64Data, mimeType)
            } catch (orError) {
              logError('analyzeClothing', uid, 'Cả Gemini và OpenRouter đều thất bại', {
                gemini: geminiError.message, openrouter: orError.message,
              })
              throw new HttpsError('internal', 'Không thể phân tích ảnh. Vui lòng thử lại.')
            }
          } else {
            throw new HttpsError('internal', 'Không thể phân tích ảnh. Vui lòng thử lại.')
          }
        }

        try {
          return tryParseJSON(rawText)
        } catch (_) {
          logWarn('analyzeClothing', uid, 'JSON parse lần 1 thất bại, retry strict prompt')
          try {
            if (!apiKey) throw new Error('no gemini key for retry')
            const genAI = new GoogleGenerativeAI(apiKey)
            const retryText = await callGeminiWithRetry(genAI, 'analyze_clothing', isPremium, async (model) => {
              const result = await model.generateContent([
                prompt + '\n\nIMPORTANT: Your ENTIRE response must be ONLY the raw JSON object. No markdown, no text before/after.',
                imageData,
              ])
              return result.response.text()
            })
            return tryParseJSON(retryText)
          } catch (e2) {
            // Thử parse lại rawText nếu đã có từ OpenRouter
            try {
              return tryParseJSON(rawText)
            } catch (_) {
              logError('analyzeClothing', uid, 'JSON retry thất bại', { error: e2.message })
              throw new HttpsError('internal', 'AI trả về dữ liệu không hợp lệ. Thử lại hoặc dùng ảnh JPG/PNG.')
            }
          }
        }
      },
      8_500,
      'Phân tích ảnh mất quá nhiều thời gian. Vui lòng thử lại với ảnh nhỏ hơn hoặc kết nối tốt hơn 📸'
    )
  } catch (e) {
    if (e.code === 'deadline-exceeded') throw new HttpsError('deadline-exceeded', e.message)
    throw e
  }

  const colorField     = analysis.color
  const colorPrimary   = typeof colorField === 'object'
    ? (colorField?.primary   || 'Không rõ')
    : (colorField            || 'Không rõ')
  const colorSecondary = typeof colorField === 'object'
    ? (colorField?.secondary || null)
    : null

  // Defense-in-depth: dù prompt đã ép enum, AI đôi khi vẫn lệch — validate lại,
  // nếu không khớp danh sách đóng thì tìm giá trị gần nhất thay vì chấp nhận
  // chuỗi tự do (nguồn dao động lớn nhất giữa các lần phân tích).
  function closestFromList(value, list, fallback) {
    if (!value) return fallback
    if (list.includes(value)) return value
    const v = String(value).toLowerCase()
    const match = list.find(item => item.toLowerCase() === v)
      || list.find(item => v.includes(item.toLowerCase()) || item.toLowerCase().includes(v))
    return match || fallback
  }

  function clampScore(n, min, max, fallback) {
    const num = Number(n)
    if (!Number.isFinite(num)) return fallback
    return Math.min(max, Math.max(min, Math.round(num)))
  }

  function roundConfidence(n) {
    const num = Number(n)
    if (!Number.isFinite(num)) return 0.85
    const clamped = Math.min(0.95, Math.max(0.5, num))
    return Math.round(clamped * 20) / 20 // bucket theo bước 0.05
  }

  logInfo('analyzeClothing', uid, 'Phân tích thành công', {
    mimeType, type: analysis.type, category: analysis.category, isPremium,
  })

  return {
    type:           analysis.type          || 'Không xác định',
    category:       analysis.category      || 'tops',
    fit:            analysis.fit           || 'Regular',
    custom_type:    analysis.custom_type   || null,
    display_name:   analysis.display_name  || analysis.type || 'Không xác định',
    color:          closestFromList(colorPrimary, COLORS_LIST, colorPrimary || 'Không rõ'),
    secondaryColor: colorSecondary ? closestFromList(colorSecondary, COLORS_LIST, colorSecondary) : null,
    pattern:        analysis.pattern       || 'Trơn',
    material:       closestFromList(analysis.material, MATERIALS_LIST, analysis.material || 'Không rõ'),
    season_suggestion:  Array.isArray(analysis.season_suggestion)  ? analysis.season_suggestion  : [],
    season_flexibility: analysis.season_flexibility  || null,
    occasion_tags:      Array.isArray(analysis.occasion_tags)       ? analysis.occasion_tags       : [],
    occasion_primary:   analysis.occasion_primary    || null,
    description:        analysis.description         || null,
    versatility_score:  clampScore(analysis.versatility_score, 1, 10, null),
    confidence:         roundConfidence(analysis.confidence),
  }
}

const { toNetlifyHandler } = require('./lib/netlifyAdapter')
exports.handler = toNetlifyHandler(vercelHandler)
