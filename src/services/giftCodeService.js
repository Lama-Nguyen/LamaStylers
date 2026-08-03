import { callApi } from './callApi'

export async function redeemGiftCode(code) {
  return callApi('redeemGiftCode', { code }, { timeout: 15_000, retry: false })
}

export function isPremiumExpired(expiry) {
  if (!expiry) return false
  const ts = expiry?.toDate?.()
  return ts instanceof Date && ts < new Date()
}
