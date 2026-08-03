'use strict'
const { withAuth, HttpsError, admin } = require('./lib/withAuth')
const { SOFT_DELETE_RETENTION_DAYS }  = require('./lib/constants')
const { toNetlifyHandler }            = require('./lib/netlifyAdapter')
const db = admin.firestore()

const handler = withAuth(async (request) => {
  const { uid } = request.auth
  const { itemId } = request.data
  if (!itemId) throw new HttpsError('invalid-argument', 'Missing itemId')

  const snap = await db.collection('clothing_items').doc(itemId).get()
  if (!snap.exists || snap.data().userId !== uid) throw new HttpsError('not-found', 'Item not found')

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + SOFT_DELETE_RETENTION_DAYS)

  await db.collection('clothing_items').doc(itemId).update({
    deletedAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt,
  })

  return { success: true, itemId, recoveryDeadline: expiresAt.toISOString() }
})
exports.handler = toNetlifyHandler(handler)
