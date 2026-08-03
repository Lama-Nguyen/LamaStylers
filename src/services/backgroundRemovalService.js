import { callApi } from './callApi'
import { isCallableErrorCode } from './errorMessages'

const BG_TIMEOUT_MS = 30_000

export const removeBackground = async (imageUrl, itemId) => {
  try {
    const result = await callApi(
      'removeBackground',
      { imageUrl, itemId },
      { timeout: BG_TIMEOUT_MS, retry: false }
    )
    return { success: true, imageUrl: result.imageUrl, imagePublicId: result.imagePublicId }
  } catch (error) {
    console.error('removeBackground error:', error)

    const isTimeout     = isCallableErrorCode(error, 'deadline-exceeded')
    const isUnavailable = isCallableErrorCode(error, 'internal') &&
      error.message?.includes('chưa sẵn sàng')

    return {
      success: false,
      error: isTimeout
        ? 'Tách nền mất quá nhiều thời gian — vui lòng thử lại'
        : isUnavailable
          ? 'Tính năng tách nền chưa được bật. Liên hệ admin để cấu hình FAL_API_KEY.'
          : (error.message || 'Không thể tách nền ảnh lúc này.'),
      code: error.code,
      unavailable: isUnavailable,
    }
  }
}
