'use strict'

const { withAuth, HttpsError } = require('./lib/withAuth')
const { deleteImage, deleteImages } = require('./lib/cloudinary')
const admin = require('./lib/firebaseAdmin')
const db = admin.firestore()

const vercelHandler = withAuth(async (request) => {
  const { publicId, publicIds } = request.data
  const uid = request.auth.uid

  if (!publicId && (!Array.isArray(publicIds) || publicIds.length === 0)) {
    throw new HttpsError('invalid-argument', 'Thiếu publicId hoặc publicIds')
  }

  const allIds = publicId ? [publicId] : publicIds

  const isClothingId = (id) => typeof id === 'string' && id.startsWith(`lama_stylers/${uid}/`)
  const isAvatarId = (id) => id === `avatars/${uid}`
  const validPattern = (id) => isClothingId(id) || isAvatarId(id)

  const invalidId = allIds.find(id => !validPattern(id))
  if (invalidId) {
    console.warn(`[deleteImage] Permission denied: user ${uid} tried public_id với pattern sai: ${invalidId}`)
    throw new HttpsError('permission-denied', 'Không có quyền xoá ảnh này')
  }

  const clothingIds = allIds.filter(isClothingId)
  if (clothingIds.length > 0) {
    try {

      const clothingRef = db.collection('clothing_items').where('userId', '==', uid)

      const snapshot = await clothingRef.select('imagePublicId').get()
      const ownedIds = new Set(
        snapshot.docs.map(doc => doc.data().imagePublicId).filter(Boolean)
      )

      const notOwned = clothingIds.filter(id => !ownedIds.has(id))
      if (notOwned.length > 0) {
        console.warn(
          `[deleteImage] Firestore verify thất bại: user ${uid} — ` +
          `${notOwned.length} public_id không khớp document nào: ${notOwned.join(', ')}`
        )
        throw new HttpsError('permission-denied', 'Ảnh không tồn tại hoặc không thuộc về bạn')
      }
    } catch (e) {

      if (e instanceof HttpsError) throw e

      console.error('[deleteImage] Firestore verify error (non-fatal, fallback to Layer 1 only):', e.message)
    }
  }

  try {
    if (publicIds) {
      const result = await deleteImages(publicIds)
      return { success: true, deleted: result.deleted }
    }
    const result = await deleteImage(publicId)
    return { success: true, result: result.result }
  } catch (e) {

    console.error('deleteImage error:', e)
    throw new HttpsError('internal', 'Không thể xoá ảnh lúc này.')
  }
})

const { toNetlifyHandler } = require('./lib/netlifyAdapter')
exports.handler = toNetlifyHandler(vercelHandler)
