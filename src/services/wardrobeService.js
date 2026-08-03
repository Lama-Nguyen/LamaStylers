import {
  collection, addDoc, getDocs, doc, getDoc, setDoc,
  updateDoc, deleteDoc, query, where, orderBy, serverTimestamp, Timestamp
} from 'firebase/firestore'
import { db } from './firebase'
import { trackUploadItem, trackFirstUpload } from './analyticsService'
import { checkAndGrantFirstUpload } from './creditService'
import { callApi } from './callApi'

const _wardrobeCache = { uid: null, items: null, timestamp: 0 }
const WARDROBE_CACHE_TTL = 2 * 60 * 1000

function _getCacheKey(uid) {
  return `wardrobe:${uid}`
}

function _isCacheValid(uid) {
  return (
    _wardrobeCache.uid === uid &&
    Date.now() - _wardrobeCache.timestamp < WARDROBE_CACHE_TTL
  )
}

function _setCache(uid, items) {
  _wardrobeCache.uid = uid
  _wardrobeCache.items = items
  _wardrobeCache.timestamp = Date.now()
}

function _invalidateCache() {
  _wardrobeCache.timestamp = 0
}

export const getClothingItems = async (uid, { bust = false } = {}) => {

  if (!bust && _isCacheValid(uid)) {
    console.debug(`[Cache HIT] wardrobe for ${uid}`)
    return _wardrobeCache.items
  }

  console.debug(`[Cache MISS] wardrobe for ${uid}`)
  try {
    const q = query(
      collection(db, 'clothing_items'),
      where('userId', '==', uid),
      where('deletedAt', '==', null),
      orderBy('createdAt', 'desc')
    )
    const snap = await getDocs(q)
    const items = snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
    }))

    _setCache(uid, items)
    return items
  } catch (e) {
    console.error('getClothingItems error:', e)
    throw e
  }
}

export const resizeImage = (file, maxDim = 1200, maxSizeBytes = 900_000) => {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      let { width, height } = img

      if (width <= maxDim && height <= maxDim && file.size <= maxSizeBytes) {
        return resolve(file)
      }

      if (width > maxDim || height > maxDim) {
        const scale = Math.min(maxDim / width, maxDim / height)
        width  = Math.round(width  * scale)
        height = Math.round(height * scale)
      }

      const canvas = document.createElement('canvas')
      canvas.width  = width
      canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)

      const QUALITY_STEPS = [0.85, 0.72, 0.58, 0.42]
      let stepIdx = 0

      const tryStep = () => {
        const q = QUALITY_STEPS[stepIdx] ?? 0.42
        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error('Canvas toBlob failed'))
          if (blob.size <= maxSizeBytes || stepIdx >= QUALITY_STEPS.length - 1) {
            return resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }))
          }
          stepIdx++
          tryStep()
        }, 'image/jpeg', q)
      }
      tryStep()
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Không thể đọc file ảnh'))
    }

    img.src = objectUrl
  })
}

export const uploadClothingImage = async (uid, file) => {
  // Bước 1: Lấy chữ ký từ server
  const sig = await callApi('getCloudinarySignature', { kind: 'clothing' })

  // Bước 2: Upload trực tiếp lên Cloudinary (signed upload)
  const formData = new FormData()
  formData.append('file',      file)
  formData.append('api_key',   sig.apiKey)
  formData.append('timestamp', String(sig.timestamp))
  formData.append('signature', sig.signature)
  formData.append('folder',    sig.folder)
  if (sig.publicId)  formData.append('public_id', sig.publicId)
  if (sig.overwrite) formData.append('overwrite',  'true')

  const uploadRes = await fetch(
    `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
    { method: 'POST', body: formData }
  )
  if (!uploadRes.ok) {
    const err = await uploadRes.json().catch(() => ({}))
    throw new Error(err?.error?.message || 'Upload ảnh thất bại')
  }
  const uploaded = await uploadRes.json()
  const imageUrl      = uploaded.secure_url
  const imagePublicId = uploaded.public_id

  // Ghi pending_uploads để cron cleanup orphan nếu save thất bại
  setDoc(doc(db, 'pending_uploads', imagePublicId), {
    uid,
    publicId: imagePublicId,
    imageUrl,
    uploadedAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
  }).catch(e => console.warn('pending_uploads write failed:', e.message))

  return { imageUrl, imagePublicId }
}

// Signature mới: (uid, itemData, imageFile)
// AddClothingModal gọi: saveClothingItem(user.uid, { ...itemData, analysisType, ... }, imageFile)
export const saveClothingItem = async (uid, itemData, imageFile) => {
  try {
    // Upload ảnh trước, lấy URL + publicId
    const { imageUrl, imagePublicId } = await uploadClothingImage(uid, imageFile)

    const docRef = await addDoc(collection(db, 'clothing_items'), {
      userId: uid,
      imageUrl,
      imagePublicId,
      ...itemData,
      createdAt: serverTimestamp(),
      deletedAt: null,  // BUG FIX: phải có field này để query .where('deletedAt','==',null) hoạt động
    })

    getClothingItems(uid, { bust: true }).then(items => {
      const isFirst = items.length === 1
      if (isFirst) {
        trackFirstUpload(itemData.type)
        checkAndGrantFirstUpload(uid).catch(e => console.warn('checkAndGrantFirstUpload:', e))
      } else {
        trackUploadItem(itemData.type)
      }
    }).catch(() => {})

    _invalidateCache()

    deleteDoc(doc(db, 'pending_uploads', imagePublicId))
      .catch(e => console.warn('pending_uploads cleanup failed:', e.message))

    return { id: docRef.id, imageUrl, imagePublicId, ...itemData }
  } catch (e) {
    console.error('saveClothingItem error:', e.code, e.message)
    throw e
  }
}

export const deleteClothingItem = async (itemId, imagePublicId) => {
  try {
    // Gọi server soft-delete (set deletedAt) thay vì hard deleteDoc
    // Server cũng xử lý image cleanup qua deleteImage
    await callApi('deleteClothing', { itemId }, { retry: false })
    _invalidateCache()
  } catch (e) {
    console.error('deleteClothingItem error:', e)
    throw e
  }
}

export const updateClothingItem = async (itemId, updates) => {
  try {
    await updateDoc(doc(db, 'clothing_items', itemId), updates)

    _invalidateCache()
  } catch (e) {
    console.error('updateClothingItem error:', e)
    throw e
  }
}

export const CLOTHING_TYPES = [
  'Áo thun', 'Áo sơ mi', 'Áo khoác', 'Áo lót', 'Áo dài',
  'Quần', 'Chân váy', 'Váy'
]

export const FOOTWEAR_KINDS      = ['Giày', 'Dép']
export const FOOTWEAR_SHOE_FORMS = ['Sneaker', 'Oxford/Derby', 'Loafer', 'Boot', 'Heel/Cao gót', 'Slip-on', 'Mule', 'Sandal gót', 'Khác']
export const FOOTWEAR_SANDAL_TYPES = ['Dép tông', 'Dép crocs', 'Dép quai hậu', 'Dép lê', 'Dép sandal', 'Dép bệt', 'Khác']

// Wrapper gọi server analyzeClothing — nhận base64 string (có hoặc không có data: prefix)
export const analyzeClothingImage = async (base64) => {
  return callApi('analyzeClothing', { imageBase64: base64 })
}

// Dùng cho select options trong AddClothingModal
export const SEASONS = ['Xuân', 'Hè', 'Thu', 'Đông']
export const OCCASIONS = ['Công sở', 'Hẹn hò', 'Dạo phố', 'Thể thao', 'Đi biển', 'Tiệc tối', 'Ở nhà', 'Du lịch', 'Lễ tân', 'Khác']
