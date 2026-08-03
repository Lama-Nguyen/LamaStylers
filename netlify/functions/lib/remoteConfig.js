'use strict'

// KHÔNG được require ở đâu hiện tại — cố tình giữ lại, không xoá.
// Server-side counterpart của src/services/firebase.js (client Remote Config
// cũng khởi tạo default nhưng chưa từng gọi fetchAndActivate()). Ý định ban đầu:
// tune trọng số chấm điểm outfit (và cả prompt_version để A/B test) qua Firebase
// Console mà không cần redeploy — rất hợp ràng buộc Free Tier/hạn chế deploy lại.
// Hiện itemSelector.js đang dùng giá trị hardcode. Cần quyết định kiến trúc trước
// khi nối lại (ai gọi fetchAndActivate, cache ở đâu, tie vào request nào).
// Xem FEATURE_POTENTIAL_AUDIT.md mục #2 trước khi xoá file này.
const { admin } = require('./withAuth')

const DEFAULT_WEIGHTS = { color: 30, proportion: 25, material: 25, style: 20 }

let cachedTemplate = null
let cachedAt = 0
const CACHE_TTL_MS = 60_000

async function getOutfitScoringWeights() {
  const now = Date.now()

  if (!cachedTemplate || now - cachedAt > CACHE_TTL_MS) {
    try {
      const rc = admin.remoteConfig()
      cachedTemplate = await rc.getServerTemplate({
        defaultConfig: {
          color_weight: DEFAULT_WEIGHTS.color,
          proportion_weight: DEFAULT_WEIGHTS.proportion,
          material_weight: DEFAULT_WEIGHTS.material,
          style_weight: DEFAULT_WEIGHTS.style,
        },
      })
      cachedAt = now
    } catch (e) {

      console.warn('remoteConfig: không lấy được server template, dùng giá trị mặc định:', e.message)
      return DEFAULT_WEIGHTS
    }
  }

  try {
    const config = cachedTemplate.evaluate()
    const color = Number(config.getNumber('color_weight'))
    const proportion = Number(config.getNumber('proportion_weight'))
    const material = Number(config.getNumber('material_weight'))
    const style = Number(config.getNumber('style_weight'))

    const weights = { color, proportion, material, style }
    const allValid = Object.values(weights).every(w => Number.isFinite(w) && w >= 0)
    const total = color + proportion + material + style

    if (!allValid || total <= 0) {
      console.warn('remoteConfig: giá trị weights không hợp lệ trên Console, dùng giá trị mặc định:', weights)
      return DEFAULT_WEIGHTS
    }

    return weights
  } catch (e) {
    console.warn('remoteConfig: lỗi evaluate template, dùng giá trị mặc định:', e.message)
    return DEFAULT_WEIGHTS
  }
}

module.exports = { getOutfitScoringWeights, DEFAULT_WEIGHTS }
