'use strict'

const crypto = require('crypto')
const { withAuth, HttpsError } = require('./lib/withAuth')

const vercelHandler = withAuth(async (request) => {
  const uid = request.auth.uid
  const { kind, itemId } = request.data

  if (!kind || (kind !== 'clothing' && kind !== 'avatar')) {
    throw new HttpsError('invalid-argument', 'kind phải là "clothing" hoặc "avatar"')
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET

  if (!cloudName || !apiKey || !apiSecret) {
    throw new HttpsError(
      'internal',
      'Thiếu cấu hình Cloudinary (cloud_name, api_key, api_secret)'
    )
  }

  const timestamp = Math.floor(Date.now() / 1000)

  let folder, publicId, overwrite
  if (kind === 'avatar') {

    folder = 'avatars'
    publicId = uid
    overwrite = true
  } else {

    folder = `lama_stylers/${uid}/clothing`
    publicId = null
    overwrite = false
  }

  // Chuẩn Cloudinary: sort params theo key alphabet, nối key=value&..., rồi sha1(string + apiSecret)
  const paramMap = { folder, timestamp: String(timestamp) }
  if (publicId)  paramMap.public_id = publicId
  if (overwrite) paramMap.overwrite  = 'true'

  const stringToSign = Object.keys(paramMap)
    .sort()
    .map(k => `${k}=${paramMap[k]}`)
    .join('&')

  const signature = crypto
    .createHash('sha1')
    .update(stringToSign + apiSecret)
    .digest('hex')

  return {
    signature,
    timestamp,
    apiKey,
    cloudName,
    folder,
    publicId: publicId || undefined,
    overwrite: overwrite || undefined,
  }
})

const { toNetlifyHandler } = require('./lib/netlifyAdapter')
exports.handler = toNetlifyHandler(vercelHandler)
