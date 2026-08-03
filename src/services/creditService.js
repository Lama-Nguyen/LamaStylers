import { doc, getDoc } from 'firebase/firestore'
import { db } from './firebase'
import { callApi } from './callApi'

export const CREDIT_COSTS = {
  generate_outfit:    3,
  havy_per_10_msg:    1,
  remove_background:  5,
  analyze_clothing:   1,
  enhance_analysis:   1,
  style_insight:      2,
}

export const CREDIT_GRANTS = {
  daily_login:   2,
  first_upload:  3,
  invite_friend: 10,
  watch_ad:      5,
}

export const PREMIUM_DAILY_CREDITS = 100

// ── Grant (server-only) ───────────────────────────────────────────────────────
// Client KHÔNG ghi credits trực tiếp — Firestore rules chặn.
// Dùng Netlify Function grantCredits để server cộng qua Admin SDK.

export const claimDailyLoginCredits = async (_uid) => {
  try {
    const result = await callApi('grantCredits', { type: 'daily_login' }, { retry: false })
    return { granted: !!result.granted, amount: CREDIT_GRANTS.daily_login }
  } catch (e) {
    console.error('claimDailyLoginCredits lỗi:', e)
    return { granted: false }
  }
}

export const checkAndGrantFirstUpload = async (_uid) => {
  try {
    const result = await callApi('grantCredits', { type: 'first_upload' }, { retry: false })
    return !!result.granted
  } catch (e) {
    console.error('checkAndGrantFirstUpload lỗi:', e)
    return false
  }
}

// ── Deduct (client transaction — Firestore rules cho phép update credits field qua deductCredits) ──
// Lưu ý: rules hiện chặn toàn bộ credits field. Nếu cần client deduct, chuyển sang server function.
// Hiện tại: deductCredits cũng gọi server để nhất quán.
export const deductCredits = async (_uid, amount, isPremium = false, reason = 'feature') => {
  if (isPremium) return true

  try {
    const result = await callApi('deductCredits', { amount, reason }, { retry: false })
    return !!result.success
  } catch (e) {
    console.error('deductCredits lỗi:', e)
    return false
  }
}

export const getCredits = async (uid) => {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? (snap.data().credits ?? 0) : 0
}
