'use strict'

const GEMINI_MODELS = {
  PRO_2_5:        'gemini-2.5-pro',
  FLASH_2_5:      'gemini-2.5-flash',
  FLASH_2_0:      'gemini-2.0-flash',
  FLASH_1_5:      'gemini-1.5-flash',
  FLASH_LITE_2_0: 'gemini-2.0-flash-lite',
}

const M = GEMINI_MODELS

const GEMINI_CONFIGS = {
  analyze_clothing: {
    free:    [M.FLASH_2_5, M.FLASH_2_0, M.FLASH_1_5, M.FLASH_LITE_2_0],
    premium: [M.PRO_2_5,  M.FLASH_2_5, M.FLASH_2_0, M.FLASH_1_5],
    max_tokens: 500,
    temperature: 0.1,
    responseJson: true,
  },

  generate_outfit: {
    free:    [M.FLASH_2_5, M.FLASH_2_0, M.FLASH_1_5],
    premium: [M.PRO_2_5,  M.FLASH_2_5, M.FLASH_2_0, M.FLASH_1_5],
    max_tokens: 1500,
    temperature: 0.7,
  },

  enhance_clothing: {
    free:    [M.FLASH_2_0, M.FLASH_1_5],
    premium: [M.FLASH_2_5, M.FLASH_2_0, M.FLASH_1_5],
    max_tokens: 300,
    temperature: 0.4,
  },

  havy_chat: {
    free:    [M.FLASH_2_0, M.FLASH_1_5, M.FLASH_LITE_2_0],
    premium: [M.FLASH_2_5, M.FLASH_2_0, M.FLASH_1_5],
    max_tokens: 400,
    temperature: 0.8,
  },

  style_insight: {
    free:    [M.FLASH_2_0, M.FLASH_1_5],
    premium: [M.FLASH_2_5, M.FLASH_2_0, M.FLASH_1_5],
    max_tokens: 800,
    temperature: 0.6,
    responseJson: true,
  },
}

/**
 * Thử lần lượt từng model trong array (mạnh → yếu).
 * Dừng sớm nếu API key invalid.
 */
async function callGeminiWithRetry(genAI, useCase, isPremium, fn) {
  const config    = GEMINI_CONFIGS[useCase] ?? GEMINI_CONFIGS.havy_chat
  const modelList = isPremium ? config.premium : config.free

  let lastError
  for (const modelName of modelList) {
    try {
      // generationConfig set NGAY LÚC TẠO model — đây là default áp dụng cho mọi
      // generateContent()/startChat() gọi trên model này. Callback (fn) vẫn có thể
      // truyền generationConfig riêng cho từng lệnh gọi cụ thể nếu cần (VD: chat
      // cần override system instruction), giá trị đó sẽ ghi đè default này.
      const generativeModel = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature:      config.temperature,
          maxOutputTokens:  config.max_tokens,
          ...(config.responseJson ? { responseMimeType: 'application/json' } : {}),
        },
      })
      const result = await fn(generativeModel, {
        max_tokens:  config.max_tokens,
        temperature: config.temperature,
        model:       modelName,
      })
      console.log(`[Gemini] ${useCase} (${isPremium ? 'premium' : 'free'}) thành công với ${modelName}`)
      return result
    } catch (e) {
      lastError = e
      console.warn(`[Gemini] ${useCase} model ${modelName} thất bại: ${e.message}`)
      if (e.message?.includes('API_KEY_INVALID') || e.status === 401 || e.message?.includes('API key')) {
        break
      }
    }
  }
  throw lastError
}

function cleanGeminiResponse(text) {
  return (text || '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/^#+\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

module.exports = {
  GEMINI_MODELS,
  GEMINI_CONFIGS,
  callGeminiWithRetry,
  cleanGeminiResponse,
}
