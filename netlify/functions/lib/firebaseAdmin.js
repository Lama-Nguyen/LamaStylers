const admin = require('firebase-admin')

if (!admin.apps.length) {

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT

  if (!serviceAccountJson) {
    throw new Error(
      'Thiếu biến môi trường FIREBASE_SERVICE_ACCOUNT — Admin SDK không thể ' +
      'khởi tạo trên Vercel nếu thiếu credential này. Xem hướng dẫn trong ' +
      'DEPLOY_VERCEL.md phần "Lấy Service Account JSON".'
    )
  }

  let serviceAccount
  try {
    serviceAccount = JSON.parse(serviceAccountJson)
  } catch (e) {
    throw new Error(
      'Biến môi trường FIREBASE_SERVICE_ACCOUNT không phải JSON hợp lệ — ' +
      'kiểm tra lại bạn đã paste ĐÚNG NGUYÊN VĂN nội dung file .json tải ' +
      'từ Firebase Console, không thiếu/thừa ký tự nào.'
    )
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),

    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  })
}

module.exports = admin
