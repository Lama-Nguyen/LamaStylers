import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'
import { getRemoteConfig } from 'firebase/remote-config'
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check'
import { getPerformance } from 'firebase/performance'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
}

if (!firebaseConfig.apiKey) {
  console.warn(
    '⚠️ Thiếu Firebase config. Copy .env.local.example thành .env.local ' +
    'và điền giá trị thật (Firebase Console > Project Settings > General > Your apps).'
  )
}

export const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)

let db
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  })
} catch (e) {
  console.warn('Offline persistence không khả dụng trên trình duyệt này, dùng chế độ online-only:', e)
  db = initializeFirestore(app, {})
}
export { db }

export const remoteConfig = getRemoteConfig(app)
export const googleProvider = new GoogleAuthProvider()

const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY
if (recaptchaSiteKey) {
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(recaptchaSiteKey),
      isTokenAutoRefreshEnabled: true
    })
  } catch (e) {
    console.error('Khởi tạo App Check thất bại:', e)
  }
} else {
  console.warn(
    '⚠️ Thiếu VITE_RECAPTCHA_SITE_KEY — App Check chưa được kích hoạt. ' +
    'Điều này không còn chặn tính năng nào (App Check không còn được ' +
    'server-side verify trên Netlify Functions — xem comment phía trên).'
  )
}

remoteConfig.defaultConfig = {
  color_weight: 30,
  proportion_weight: 25,
  material_weight: 25,
  style_weight: 20,
  prompt_version: '1.0'
}
remoteConfig.settings.minimumFetchIntervalMillis = 3600000

if (import.meta.env.PROD) {
  try {
    getPerformance(app)
  } catch (e) {
    console.error('Khởi tạo Performance Monitoring thất bại:', e)
  }
}
