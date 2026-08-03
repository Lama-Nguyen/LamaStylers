'use strict'
const { logWarn } = require('./lib/logger')

const { withAuth, HttpsError } = require('./lib/withAuth')

const vercelHandler = withAuth(async (request) => {

  logWarn('uploadImage', null,
    `[DEPRECATED] uploadImage called by uid=${request.auth?.uid || 'unknown'} — ` +
    `client cần cập nhật sang flow getCloudinarySignature + upload trực tiếp Cloudinary.`
  )

  throw new HttpsError(
    'failed-precondition',
    'API này đã ngừng hoạt động. Vui lòng cập nhật ứng dụng lên phiên bản mới nhất ' +
    '(flow upload ảnh đã thay đổi để hỗ trợ ảnh dung lượng lớn hơn).'
  )
})

const { toNetlifyHandler } = require('./lib/netlifyAdapter')
exports.handler = toNetlifyHandler(vercelHandler)
