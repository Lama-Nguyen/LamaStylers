'use strict'

// KHÔNG được import ở đâu hiện tại — cố tình giữ lại, không xoá.
// Đây là lớp rule-based chấm điểm phối màu/chất liệu hoàn chỉnh, xây để dùng
// làm lớp validate/re-rank deterministic cho output của Gemini (AI đôi khi phối
// màu sai logic cơ bản, ví dụ đỏ đô + cam đất không phải luôn hợp). Hiện outfit
// generation phó thác 100% cho AI, chưa có bước chặn nào sau khi AI trả kết quả.
// Xem FEATURE_POTENTIAL_AUDIT.md mục #5 trước khi xoá file này.
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0))
    else if (max === g) h = ((b - r) / d + 2)
    else h = ((r - g) / d + 4)
    h *= 60
  }
  return { h, s: s * 100, l: l * 100 }
}

function hslToColorName(h, s, l) {

  if (l >= 96) return 'Trắng'
  if (l >= 90 && s <= 40) return 'Trắng'
  if (l <= 4) return 'Đen'
  if (l <= 12 && s <= 40) return 'Đen'
  if (s <= 12) return 'Xám'

  if (l >= 65 && s >= 15 && s <= 78 && h >= 15 && h <= 50) return 'Be'

  if (l <= 45 && s >= 25 && h >= 10 && h <= 55) return 'Nâu'

  if (h < 12 || h >= 350) return 'Đỏ'
  if (h < 45) return 'Cam'
  if (h < 65) return 'Vàng'
  if (h < 150) return 'Xanh lá'
  if (h < 195) return 'Xanh ngọc'
  if (h < 250) return l <= 40 ? 'Xanh navy' : 'Xanh dương'
  if (h < 320) return 'Tím'
  if (h < 350) return 'Hồng'
  return 'Không rõ'
}

function rgbToColorNameV2(r, g, b) {
  const { h, s, l } = rgbToHsl(r, g, b)
  return hslToColorName(h, s, l)
}

const HUE_MAP = {
  'Đỏ': 0, 'Cam': 30, 'Vàng': 55, 'Xanh lá': 110,
  'Xanh ngọc': 175, 'Xanh dương': 220, 'Xanh navy': 220,
  'Tím': 270, 'Hồng': 320,
}
const NEUTRALS = new Set(['Trắng', 'Đen', 'Xám', 'Be', 'Nâu'])

function pairColorScore(colorA, colorB) {
  if (colorA === colorB) return 88
  const aNeutral = NEUTRALS.has(colorA)
  const bNeutral = NEUTRALS.has(colorB)
  if (aNeutral || bNeutral) return 90

  const hueA = HUE_MAP[colorA]
  const hueB = HUE_MAP[colorB]

  if (hueA == null || hueB == null) return 80

  let diff = Math.abs(hueA - hueB)
  if (diff > 180) diff = 360 - diff

  if (diff < 30) return 85
  if (diff < 80) return 75
  if (diff >= 80 && diff < 140) return 80
  if (diff >= 140 && diff <= 180) return 82
  return 65
}

function outfitColorScore(colors) {
  const uniq = [...new Set(colors.filter(Boolean))]
  if (uniq.length <= 1) return 80
  let total = 0, count = 0
  for (let i = 0; i < uniq.length; i++) {
    for (let j = i + 1; j < uniq.length; j++) {
      total += pairColorScore(uniq[i], uniq[j])
      count++
    }
  }
  return count > 0 ? Math.round(total / count) : 80
}

const MATERIAL_WARMTH = {
  'Len': 'ấm', 'Len đan': 'ấm', 'Da': 'ấm', 'Denim': 'trung tính',
  'Cotton': 'mát', 'Linen': 'mát', 'Lụa': 'mát', 'Polyester': 'trung tính',
  'Không rõ': 'trung tính',
}

function materialWarmth(material) {
  return MATERIAL_WARMTH[material] || 'trung tính'
}

function outfitMaterialScore(materials) {
  const warmths = materials.filter(Boolean).map(materialWarmth)
  const uniq = new Set(warmths)
  if (uniq.size <= 1) return 85
  if (uniq.has('ấm') && uniq.has('mát') && !uniq.has('trung tính') && uniq.size === 2) {
    return 60
  }
  return 75
}

module.exports = {
  rgbToHsl,
  hslToColorName,
  rgbToColorNameV2,
  pairColorScore,
  outfitColorScore,
  materialWarmth,
  outfitMaterialScore,
  NEUTRALS,
  HUE_MAP,
}
