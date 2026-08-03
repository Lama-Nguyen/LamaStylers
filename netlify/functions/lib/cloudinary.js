'use strict'

const { v2: cloudinary } = require('cloudinary')

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

async function uploadImageFromUrl(sourceUrl, { folder, publicId = null, overwrite = false }) {
  const uploadOptions = {
    folder,
    resource_type: 'image',
    overwrite,
  }
  if (publicId) uploadOptions.public_id = publicId

  const result = await cloudinary.uploader.upload(sourceUrl, uploadOptions)

  return { url: result.secure_url, publicId: result.public_id }
}

async function deleteImage(publicId) {
  if (!publicId) return { result: 'skipped_no_public_id' }
  return cloudinary.uploader.destroy(publicId)
}

async function deleteImages(publicIds) {
  const validIds = publicIds.filter(Boolean)
  if (validIds.length === 0) return { deleted: {} }

  const BATCH_SIZE = 100
  const results = {}
  for (let i = 0; i < validIds.length; i += BATCH_SIZE) {
    const chunk = validIds.slice(i, i + BATCH_SIZE)
    const res = await cloudinary.api.delete_resources(chunk)
    Object.assign(results, res.deleted || {})
  }
  return { deleted: results }
}

module.exports = { cloudinary, uploadImageFromUrl, deleteImage, deleteImages }
