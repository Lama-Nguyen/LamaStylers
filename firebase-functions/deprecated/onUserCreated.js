const functions = require('firebase-functions')
const admin = require('firebase-admin')

if (!admin.apps.length) {
  admin.initializeApp()
}

const db = admin.firestore()

const functions = require('firebase-functions')

exports.onUserCreated = functions.auth.user().onCreate(async (user) => {
  const { uid, email, displayName, photoURL, providerData } = user

  const provider = providerData?.[0]?.providerId || 'password'
  const isGoogle  = provider === 'google.com'

  console.log(`[onUserCreated] uid=${uid}, email=${email}, provider=${provider}`)

  try {
    const userRef = db.collection('users').doc(uid)
    const snap    = await userRef.get()

    if (snap.exists) {

      console.log(`[onUserCreated] Document users/${uid} đã tồn tại → merge field thiếu`)
      await userRef.set({

        lastSeen:  admin.firestore.FieldValue.serverTimestamp(),

        ...(!snap.data().hasOwnProperty('isPremium') && { isPremium: false }),
      }, { merge: true })
    } else {

      console.log(`[onUserCreated] Tạo document users/${uid} (client setDoc đã fail)`)
      await userRef.set({
        uid,
        email:     email || null,
        name:      displayName || (email ? email.split('@')[0] : 'User'),
        photoURL:  photoURL || null,
        provider,
        isPremium: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastSeen:  admin.firestore.FieldValue.serverTimestamp(),

        profileIncomplete: true,
      })

      if (isGoogle && displayName) {
        await userRef.update({ profileIncomplete: false })
      }
    }

    console.log(`[onUserCreated] Hoàn thành cho uid=${uid}`)
  } catch (e) {

    console.error(`[onUserCreated] Lỗi tạo document users/${uid}:`, e.message)
    throw e
  }
})
