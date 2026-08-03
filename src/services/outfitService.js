import { collection, getDocs, getDoc, doc, updateDoc, query, where, orderBy, increment, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'
import { callApi } from './callApi'

/**
 * Tạo outfit gợi ý bằng AI (sync — server trả kết quả ngay trong response).
 *
 * @param {string}        uid         Firebase user ID
 * @param {string|null}   userText    Ngữ cảnh/dịp user nhập (free-text)
 * @param {Function|null} onProgress  Callback({ status, message }) cho JobStatusPanel
 * @param {AbortSignal|null} signal   Cancel signal
 * @returns {{ outfits, count, outfitIds, isJob: false }}
 */
export const generateOutfits = async (uid, userText = null, onProgress = null, signal = null) => {
  if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError')

  onProgress?.({ status: 'validating', message: 'Đang kiểm tra tủ đồ...' })
  onProgress?.({ status: 'processing', message: 'AI đang phân tích và phối đồ cho bạn...' })

  let result
  try {
    result = await callApi(
      'generateOutfits',
      { userId: uid, userText },
      {
        timeout: 9_000, // 9s client — server timeout là 10s (Netlify Free limit)
        retry: false,
      }
    )
  } catch (error) {
    if (error.name === 'AbortError') throw error
    if (error.code === 'resource-exhausted')
      throw new Error(error.message || 'Đã hết lượt tạo outfit hôm nay.')
    if (error.code === 'failed-precondition')
      throw new Error('Cần ít nhất 2 món quần áo để tạo outfit.')
    if (error.code === 'already-exists')
      throw new Error('Đang có yêu cầu tạo outfit khác. Vui lòng chờ.')
    if (error.code === 'deadline-exceeded')
      throw new Error('AI mất quá nhiều thời gian. Vui lòng thử lại.')
    throw new Error(error.message || 'Không thể tạo outfit lúc này. Vui lòng thử lại.')
  }

  if (!result?.outfits || !Array.isArray(result.outfits)) {
    if (result?.jobId) {
      console.error('[outfitService] Server trả jobId — kiểm tra lại generateOutfits.js server (phải là sync mode)')
      throw new Error('Server configuration mismatch. Liên hệ admin.')
    }
    throw new Error('Server trả về dữ liệu không hợp lệ.')
  }

  const count = result.count ?? result.outfits.length
  onProgress?.({ status: 'completed', message: `Đã tạo xong ${count} outfit!` })

  return {
    outfits:   result.outfits,
    count,
    outfitIds: result.outfitIds ?? result.outfits.map(o => o.id).filter(Boolean),
    isJob:     false,
  }
}

/**
 * Chỉnh sửa 1 outfit đã có — khoá 1 số món, để AI thay phần còn lại.
 * Lưu thành bản ghi MỚI (version), không ghi đè outfit gốc.
 *
 * @param {string}   outfitId       Outfit đang xem
 * @param {string[]} lockedItemIds  Các item ID muốn giữ nguyên
 * @param {string|null} styleShift  Yêu cầu điều chỉnh bằng chữ (VD: "formal hơn"), có thể để trống
 */
export const editOutfit = async (outfitId, lockedItemIds = [], styleShift = null) => {
  try {
    const result = await callApi(
      'editOutfit',
      { outfitId, lockedItemIds, styleShift },
      { timeout: 9_000, retry: false }
    )
    return result
  } catch (error) {
    if (error.code === 'resource-exhausted')
      throw new Error(error.message || 'Đã hết lượt chỉnh sửa outfit hôm nay.')
    if (error.code === 'already-exists')
      throw new Error('Đang có yêu cầu chỉnh sửa khác. Vui lòng chờ.')
    if (error.code === 'deadline-exceeded')
      throw new Error('AI mất quá nhiều thời gian. Vui lòng thử lại.')
    if (error.code === 'failed-precondition')
      throw new Error(error.message || 'Không còn món nào khác để thay thế.')
    throw new Error(error.message || 'Không thể chỉnh sửa outfit lúc này.')
  }
}

/** Lấy toàn bộ các phiên bản (bản gốc + các lần chỉnh sửa) của 1 outfit, mới nhất trước. */
export const getOutfitVersions = async (rootOutfitId) => {
  const snap = await getDocs(query(
    collection(db, 'outfits'),
    where('rootOutfitId', '==', rootOutfitId),
    orderBy('createdAt', 'desc')
  ))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

/**
 * Đánh giá 1 outfit 👍/👎 — hệ thống dùng để học sở thích (màu/phong cách/form/hoạ tiết)
 * và áp dụng nhẹ vào lần tạo/chỉnh sửa outfit tiếp theo.
 */
export const submitOutfitFeedback = async (outfitId, liked) => {
  try {
    return await callApi('submitOutfitFeedback', { outfitId, liked }, { retry: false })
  } catch (error) {
    throw new Error(error.message || 'Không thể gửi đánh giá lúc này.')
  }
}

/** Lấy feedback đã có (nếu có) cho 1 outfit — để hiện đúng trạng thái nút 👍/👎. */
export const getOutfitFeedback = async (uid, outfitId) => {
  try {
    const snap = await getDoc(doc(db, 'outfit_feedback', `${uid}_${outfitId}`))
    return snap.exists() ? snap.data() : null
  } catch (e) {
    console.error('getOutfitFeedback lỗi:', e)
    return null
  }
}

/** Đánh dấu "đã mặc" outfit này hôm nay — tín hiệu hành vi đơn giản, không cần backend. */
export const markOutfitWorn = async (outfitId) => {
  await updateDoc(doc(db, 'outfits', outfitId), {
    wornCount:   increment(1),
    lastWornAt:  serverTimestamp(),
  })
}

export const getOutfits = async (uid) => {
  const snap = await getDocs(query(
    collection(db, 'outfits'),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc')
  ))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export const getFavoriteOutfits = async (uid) => {
  const snap = await getDocs(query(
    collection(db, 'outfits'),
    where('userId', '==', uid),
    where('isFavorite', '==', true),
    orderBy('createdAt', 'desc')
  ))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export const toggleFavorite = async (outfitId, current) => {
  await updateDoc(doc(db, 'outfits', outfitId), { isFavorite: !current })
  return !current
}
