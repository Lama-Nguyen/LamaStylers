'use strict'
const { withAuth, HttpsError, admin } = require('./lib/withAuth')
const { toNetlifyHandler }            = require('./lib/netlifyAdapter')
const db = admin.firestore()

const handler = withAuth(async (request) => {
  const { uid } = request.auth
  const page  = Math.max(1, parseInt(request.data.page)  || 1)
  const limit = Math.min(100, Math.max(1, parseInt(request.data.limit) || 20))

  const baseQuery = db.collection('clothing_items')
    .where('userId', '==', uid)
    .where('deletedAt', '==', null)

  const [countSnap, itemsSnap] = await Promise.all([
    baseQuery.count().get(),
    baseQuery.orderBy('createdAt', 'desc').offset((page - 1) * limit).limit(limit).get(),
  ])

  const total = countSnap.data().count
  return {
    items: itemsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit), hasNext: page * limit < total, hasPrev: page > 1 },
  }
})
exports.handler = toNetlifyHandler(handler)
