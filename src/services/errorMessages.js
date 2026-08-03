const GENERIC_CODE_MESSAGES = {
  'functions/internal':            'Có lỗi xảy ra ở máy chủ. Vui lòng thử lại sau ít phút.',
  'internal':                      'Có lỗi xảy ra ở máy chủ. Vui lòng thử lại sau ít phút.',
  'functions/deadline-exceeded':   'Yêu cầu mất quá nhiều thời gian. Vui lòng thử lại.',
  'deadline-exceeded':             'Yêu cầu mất quá nhiều thời gian. Vui lòng thử lại.',
  'functions/unavailable':         'Không thể kết nối tới máy chủ. Kiểm tra mạng và thử lại.',
  'unavailable':                   'Không thể kết nối tới máy chủ. Kiểm tra mạng và thử lại.',
  'functions/unauthenticated':     'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  'unauthenticated':               'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  'functions/cancelled':           'Yêu cầu đã bị huỷ. Vui lòng thử lại.',

  'storage/unauthorized':          'Không có quyền tải ảnh lên. Vui lòng đăng nhập lại rồi thử.',
  'storage/quota-exceeded':        'Dung lượng lưu trữ đã đầy. Vui lòng liên hệ hỗ trợ.',
  'storage/retry-limit-exceeded':  'Tải ảnh lên thất bại do mạng không ổn định. Vui lòng thử lại.',
  'storage/canceled':              'Đã huỷ tải ảnh lên.',
  'storage/invalid-checksum':      'Ảnh bị lỗi trong lúc tải lên. Vui lòng thử chọn lại ảnh.',
  'storage/server-file-wrong-size':'Ảnh bị lỗi trong lúc tải lên. Vui lòng thử chọn lại ảnh.',

  'permission-denied':             'Không có quyền thực hiện thao tác này. Vui lòng đăng nhập lại.',
  'resource-exhausted':            'Hệ thống đang quá tải. Vui lòng thử lại sau ít phút.',
  'unimplemented':                 'Tính năng này hiện chưa khả dụng.',
  'not-found':                     'Không tìm thấy dữ liệu cần thiết. Vui lòng tải lại trang.',
}

const NETWORK_ERROR_PATTERNS = [
  { match: /failed to fetch/i,        vi: 'Không có kết nối mạng. Vui lòng kiểm tra internet và thử lại.' },
  { match: /network.?request.?failed/i, vi: 'Không có kết nối mạng. Vui lòng kiểm tra internet và thử lại.' },
  { match: /networkerror/i,           vi: 'Không có kết nối mạng. Vui lòng kiểm tra internet và thử lại.' },
]

export function toVietnameseErrorMessage(error, fallback = 'Đã có lỗi xảy ra. Vui lòng thử lại.') {
  if (!error) return fallback

  if (error.code && GENERIC_CODE_MESSAGES[error.code]) {
    return GENERIC_CODE_MESSAGES[error.code]
  }

  const hasVietnameseDiacritics = /[àáảãạăâđêôơưếềểễệ]/i.test(error.message || '')
  if (hasVietnameseDiacritics) {
    return error.message
  }

  for (const { match, vi } of NETWORK_ERROR_PATTERNS) {
    if (match.test(error.message || '')) return vi
  }

  return fallback
}

export function isCallableErrorCode(error, code) {
  if (!error?.code) return false
  return error.code === code || error.code === `functions/${code}`
}
