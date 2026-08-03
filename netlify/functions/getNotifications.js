'use strict'
const { withAuth, admin } = require('./lib/withAuth')
const { toNetlifyHandler } = require('./lib/netlifyAdapter')
const db = admin.firestore()

const handler = withAuth(async (request) => {
  const { uid } = request.auth
  const page  = Math.max(1, parseInt(request.data.page)  || 1)
  const limit = Math.min(50,  Math.max(1, parseInt(request.data.limit) || 15))
  const base  = db.collection('notifications').where('userId', '==', uid)

  const [countSnap, docsSnap] = await Promise.all([
    base.count().get(),
    base.orderBy('createdAt', 'desc').offset((page - 1) * limit).limit(limit).get(),
  ])

  const total = countSnap.data().count
  return {
    notifications: docsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit), hasNext: page * limit < total, hasPrev: page > 1 },
  }
})
exports.handler = toNetlifyHandler(handler)
