import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  getAdditionalUserInfo,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  updatePassword,
  deleteUser,
  EmailAuthProvider,
  GoogleAuthProvider,
} from 'firebase/auth'
import {
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore'

import { auth, db } from './firebase'
import { callApi } from './callApi'
import { trackSignup, trackLogin } from './analyticsService'

const googleProvider = new GoogleAuthProvider()

export const AUTH_ERROR_MESSAGES = {
  'auth/email-already-in-use': 'Email này đã được đăng ký',
  'auth/invalid-email': 'Email không hợp lệ',
  'auth/weak-password': 'Mật khẩu phải có ít nhất 6 ký tự',
  'auth/user-not-found': 'Tài khoản không tồn tại',
  'auth/wrong-password': 'Mật khẩu sai',
  'auth/too-many-requests': 'Thử lại quá nhiều lần, hãy chờ vài phút',
  'auth/operation-not-allowed': 'Tính năng này đã bị tắt',
}

/**
 * ensureUserDoc — idempotent: tạo users/{uid} nếu chưa có, hoặc bổ sung field thiếu.
 * Không ghi đè isPremium / credits / premiumExpiry (server-owned).
 */
export async function ensureUserDoc(user, { name } = {}) {
  if (!user?.uid) return
  const userRef = doc(db, 'users', user.uid)
  const existing = await getDoc(userRef)
  const data = existing.exists() ? existing.data() : {}

  const patch = {
    email: user.email || data.email || null,
    name: name || user.displayName || data.name || '',
  }

  // Chỉ set default khi doc mới hoặc field còn thiếu (không đụng premium/credits đã có)
  if (!existing.exists()) {
    patch.isPremium = false
    patch.credits = 0
    patch.createdAt = new Date()
  } else {
    if (data.credits == null) patch.credits = 0
    if (data.isPremium == null) patch.isPremium = false
    if (!data.createdAt) patch.createdAt = new Date()
  }

  await setDoc(userRef, patch, { merge: true })
}

export const register = async (email, password, name) => {
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  await ensureUserDoc(cred.user, { name })
  trackSignup('email')
  return cred.user
}

export const login = async (email, password) => {
  const cred = await signInWithEmailAndPassword(auth, email, password)
  await ensureUserDoc(cred.user)
  trackLogin('email')
  return cred.user
}

export const loginWithGoogle = async () => {
  const cred = await signInWithPopup(auth, googleProvider)
  await ensureUserDoc(cred.user)
  if (getAdditionalUserInfo(cred)?.isNewUser) {
    trackSignup('google')
  } else {
    trackLogin('google')
  }
  return cred.user
}

export const logout = () => {
  return auth.signOut()
}

export const changePassword = async (currentPassword, newPassword) => {
  const user = auth.currentUser
  const providerId = user.providerData[0]?.providerId
  if (providerId === 'google.com') {
    const err = new Error('Tài khoản Google không thể đổi mật khẩu qua ứng dụng')
    err.code = 'auth/google-no-password'
    throw err
  }
  const credential = EmailAuthProvider.credential(user.email, currentPassword)
  await reauthenticateWithCredential(user, credential)
  await updatePassword(user, newPassword)
}

export const deleteAccount = async (password) => {
  const user = auth.currentUser
  const providerId = user.providerData[0]?.providerId

  if (providerId === 'google.com') {
    await reauthenticateWithPopup(user, googleProvider)
  } else {
    if (!password) {
      const err = new Error('Vui lòng nhập mật khẩu để xác nhận')
      err.code = 'auth/missing-password'
      throw err
    }
    const credential = EmailAuthProvider.credential(user.email, password)
    await reauthenticateWithCredential(user, credential)
  }

  // Lấy token trước khi xoá Auth — sau deleteUser(), auth.currentUser sẽ về null
  // nên không thể lấy token mới được nữa.
  const idToken = await user.getIdToken()

  // Xóa Firebase Auth account TRƯỚC — đây là điểm "không thể quay lại": nếu bước
  // cascade Firestore bên dưới có lỗi giữa chừng, user vẫn không đăng nhập lại được
  // nữa (thay vì để lại 1 tài khoản còn sống nhưng dữ liệu đã bị xoá sạch).
  await deleteUser(user)

  // Server cascade (Admin SDK — bypass Firestore rules):
  // xóa clothing_items, outfits, favorites, notifications, feedbacks,
  // transactions, rate_limits, generation_locks, havy_quota, pending_uploads,
  // users doc, + ảnh Cloudinary
  // Idempotent (xoá cái không tồn tại là no-op) nên retry mặc định vẫn an toàn.
  await callApi('deleteAccountData', {}, { idTokenOverride: idToken })
}

export const fetchProfileOnce = async (uid) => {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? snap.data() : null
}
