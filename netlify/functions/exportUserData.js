const { initializeApp, getApps, cert } = require('firebase-admin/app')
const { getFirestore, Timestamp } = require('firebase-admin/firestore')
const { getAuth } = require('firebase-admin/auth')
const AdmZip = require('adm-zip')

if (!getApps().length) {
  initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) })
}

const db = getFirestore()
const auth = getAuth()

exports.handler = async (request) => {
  if (request.httpMethod !== 'POST') return { statusCode: 405 }

  try {

    const token = request.headers.authorization?.split(' ')[1]
    if (!token) return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }

    const decodedToken = await auth.verifyIdToken(token)
    const uid = decodedToken.uid
    const email = decodedToken.email

    const { format = 'json' } = JSON.parse(request.body || '{}')
    if (!['json', 'csv'].includes(format)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid format. Use json or csv.' }) }
    }

    const userData = await fetchUserData(uid, email)

    let exportContent, filename, contentType

    if (format === 'json') {
      exportContent = JSON.stringify(userData, null, 2)
      filename = `${email.split('@')[0]}_data_${new Date().toISOString().slice(0, 10)}.json`
      contentType = 'application/json'
    } else {

      const csv = buildExportCSV(userData)
      exportContent = csv
      filename = `${email.split('@')[0]}_data_${new Date().toISOString().slice(0, 10)}.csv`
      contentType = 'text/csv'
    }

    await db.collection('export_requests').add({
      uid,
      email,
      format,
      exportedAt: Timestamp.now(),
      ip: request.headers['client-ip'] || request.headers['x-forwarded-for'] || 'unknown',
    })

    const size = new Blob([exportContent]).size
    if (size < 5 * 1024 * 1024) {

      const base64 = Buffer.from(exportContent).toString('base64')
      return {
        statusCode: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
        body: exportContent,
      }
    } else {

      return {
        statusCode: 413,
        body: JSON.stringify({
          error: 'Export quá lớn. Liên hệ support@example.com để xin file qua email.',
        }),
      }
    }
  } catch (e) {
    logError('exportUserData', null, 'Unexpected error', { error: e.message })
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) }
  }
}

async function fetchUserData(uid, email) {
  const data = {
    export_date: new Date().toISOString(),
    user_account: null,
    clothing_items: [],
    outfits: [],
    favorites: [],
    notifications: [],
    transactions: [],
  }

  const userDoc = await db.collection('users').doc(uid).get()
  if (userDoc.exists()) {
    data.user_account = {
      uid,
      email,
      ...userDoc.data(),

    }
  }

  const clothingSnap = await db.collection('clothing_items').where('userId', '==', uid).get()
  clothingSnap.forEach(d => {
    data.clothing_items.push({
      id: d.id,
      ...d.data(),

    })
  })

  const outfitsSnap = await db.collection('outfits').where('userId', '==', uid).get()
  outfitsSnap.forEach(d => {
    data.outfits.push({ id: d.id, ...d.data() })
  })

  const favSnap = await db.collection('favorites').where('userId', '==', uid).get()
  favSnap.forEach(d => {
    data.favorites.push({ id: d.id, ...d.data() })
  })

  const notifSnap = await db.collection('notifications').where('userId', '==', uid).get()
  notifSnap.forEach(d => {
    data.notifications.push({ id: d.id, ...d.data() })
  })

  try {
    const txSnap = await db.collection('transactions').where('userId', '==', uid).get()
    txSnap.forEach(d => {
      data.transactions.push({ id: d.id, ...d.data() })
    })
  } catch (e) {

  }

  return data
}

function buildExportCSV(userData) {
  const lines = []

  lines.push('=== USER ACCOUNT ===')
  if (userData.user_account) {
    const u = userData.user_account
    lines.push(`UID,${u.uid}`)
    lines.push(`Email,${u.email}`)
    lines.push(`Name,${u.displayName || ''}`)
    lines.push(`Premium,${u.isPremium ? 'Yes' : 'No'}`)
    lines.push(`Created,${u.createdAt}`)
  }

  lines.push('')
  lines.push('=== CLOTHING ITEMS ===')
  lines.push('ID,Type,Color,Pattern,Material,Fit,Season,Occasion,Uploaded')
  userData.clothing_items.forEach(item => {
    lines.push(
      `${item.id},"${item.type || ''}","${item.color || ''}","${item.pattern || ''}",` +
      `"${item.material || ''}","${item.fit || ''}","${item.season || ''}","${item.occasion || ''}","${item.createdAt || ''}"`
    )
  })

  lines.push('')
  lines.push('=== OUTFITS ===')
  lines.push('ID,Occasion,Season,Notes,Created')
  userData.outfits.forEach(o => {
    lines.push(`${o.id},"${o.occasion || ''}","${o.season || ''}","${o.notes || ''}","${o.createdAt || ''}"`)
  })

  lines.push('')
  lines.push('=== TRANSACTIONS ===')
  lines.push('ID,Package,Amount,Status,CreatedAt')
  userData.transactions.forEach(t => {
    lines.push(`${t.id},"${t.package || ''}","${t.amount || ''}","${t.status || ''}","${t.createdAt || ''}"`)
  })

  lines.push('')
  lines.push(`Export Date: ${userData.export_date}`)
  lines.push('For privacy concerns, contact: support@example.com')

  return lines.join('\n')
}
