'use strict'

// Khớp đúng 10 field mà BodyMeasurementsForm.jsx / userService.saveBodyMeasurements
// đang lưu vào users/{uid}.bodyMeasurements (cm, riêng weight là kg).
const LABELS = {
  height:   'Chiều cao',
  weight:   'Cân nặng',
  chest:    'Vòng ngực',
  waist:    'Vòng eo',
  hips:     'Vòng hông',
  shoulder: 'Vai',
  inseam:   'Dài đáy quần',
  neck:     'Vòng cổ',
  thigh:    'Vòng đùi',
  sleeve:   'Dài tay áo',
}

/**
 * Format bodyMeasurements thành 1 dòng text tiếng Việt để chèn vào prompt AI
 * (buildPrompt trong aiProviderChain.js, khối "SỐ ĐO CƠ THỂ").
 *
 * Trả về null nếu user chưa nhập số đo nào hợp lệ — aiOrchestrator sẽ tự
 * fallback về "Không có số đo" cho buildPrompt, không cần xử lý ở đây.
 */
function buildBodyMeasurementsSummary(bodyMeasurements) {
  if (!bodyMeasurements || typeof bodyMeasurements !== 'object') return null

  const parts = []
  for (const [key, label] of Object.entries(LABELS)) {
    const val = bodyMeasurements[key]
    if (typeof val !== 'number' || !isFinite(val) || val <= 0) continue
    const unit = key === 'weight' ? 'kg' : 'cm'
    parts.push(`${label} ${val}${unit}`)
  }

  return parts.length ? parts.join(', ') : null
}

module.exports = { buildBodyMeasurementsSummary }
