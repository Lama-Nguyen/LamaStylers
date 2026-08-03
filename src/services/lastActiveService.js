import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

const MIN_INTERVAL_MS = 60 * 60 * 1000
let lastTouchedAtByUid = {}

export async function touchLastActive(uid) {
  if (!uid) return

  const now = Date.now()
  const lastTouched = lastTouchedAtByUid[uid] || 0
  if (now - lastTouched < MIN_INTERVAL_MS) {
    return
  }

  try {
    await setDoc(
      doc(db, 'users', uid),
      { lastActiveAt: serverTimestamp() },
      { merge: true }
    )
    lastTouchedAtByUid[uid] = now
  } catch (e) {

    console.error('touchLastActive: ghi lastActiveAt thất bại (không chặn luồng chính):', e.message)
  }
}
