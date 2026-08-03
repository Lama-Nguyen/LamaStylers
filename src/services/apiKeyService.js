import { toVietnameseErrorMessage } from './errorMessages'

const STORAGE_KEYS = {
  GEMINI: 'lama_stylers_gemini_api_key',
}

export const setGeminiApiKey    = (key) => {
  if (key) localStorage.setItem(STORAGE_KEYS.GEMINI, key)
  else     localStorage.removeItem(STORAGE_KEYS.GEMINI)
}
export const getGeminiApiKey    = () => localStorage.getItem(STORAGE_KEYS.GEMINI) || null
export const clearApiKeys       = () => localStorage.removeItem(STORAGE_KEYS.GEMINI)
export const hasValidApiKeys    = () => !!getGeminiApiKey()

export const setVisionApiKey    = () => {}
export const getVisionApiKey    = () => null

export function isValidGeminiKeyFormat(key) {
  if (typeof key !== 'string') return false
  const trimmed = key.trim()
  return trimmed.length >= 30 && trimmed.startsWith('AIza')
}

export async function saveGeminiKeyToFirestore(key, uid) {
  if (!uid) return

  setGeminiApiKey(key || null)

  try {
    const { doc, updateDoc } = await import('firebase/firestore')
    const { db }             = await import('./firebase')

    await updateDoc(doc(db, 'users', uid), {

      userGeminiKey: key || null,
    })
  } catch (e) {

    console.warn('[apiKeyService] Không sync key lên Firestore:', e.message)
    throw new Error('Lưu key thất bại. Vui lòng thử lại.')
  }
}

export async function loadGeminiKeyFromFirestore(uid) {
  if (!uid) return null

  try {
    const { doc, getDoc } = await import('firebase/firestore')
    const { db }          = await import('./firebase')

    const snap = await getDoc(doc(db, 'users', uid))
    if (!snap.exists()) return null

    const key = snap.data()?.userGeminiKey || null
    if (key) {
      setGeminiApiKey(key)
    }
    return key
  } catch (e) {
    console.warn('[apiKeyService] Không đọc key từ Firestore:', e.message)

    return getGeminiApiKey()
  }
}

export async function clearGeminiKeyFromFirestore(uid) {
  clearApiKeys()
  if (uid) {
    try {
      const { doc, updateDoc, deleteField } = await import('firebase/firestore')
      const { db }                          = await import('./firebase')
      await updateDoc(doc(db, 'users', uid), { userGeminiKey: deleteField() })
    } catch (e) {
      console.warn('[apiKeyService] Không xóa key khỏi Firestore:', e.message)
    }
  }
}

export const testApiKeys = async (geminiKey) => {
  if (!geminiKey || !isValidGeminiKeyFormat(geminiKey)) {
    return { valid: false, error: 'Key Gemini không đúng định dạng (phải bắt đầu bằng "AIza")' }
  }

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'Hi' }] }] }),
      }
    )
    if (!r.ok) {
      let errorMsg = 'Gemini API Key không hợp lệ'
      try {
        const e = await r.json()
        errorMsg = e.error?.message || errorMsg
      } catch (_) {}
      return { valid: false, error: errorMsg }
    }
    return { valid: true, error: '' }
  } catch (e) {
    return { valid: false, error: toVietnameseErrorMessage(e, 'Không thể kết nối để kiểm tra API Key.') }
  }
}
