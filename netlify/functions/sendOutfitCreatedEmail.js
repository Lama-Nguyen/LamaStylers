'use strict'

const { withAuth, HttpsError, admin } = require('./lib/withAuth')
const { getVNDate } = require('./lib/dateUtils')

const db = admin.firestore()

function outfitCreatedHtml(userName, outfitCount) {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;background:#0F0A1E;color:#F8F5FF}</style></head>
    <body>
      <div style="max-width:600px;margin:40px auto;background:#1A1230;border-radius:16px;padding:32px">
        <h2 style="color:#A78BFA">✨ ${outfitCount} outfit mới đã được tạo!</h2>
        <p>Chào <strong>${userName}</strong>,</p>
        <p style="color:#A598C7">AI vừa tạo ${outfitCount} gợi ý outfit mới cho bạn. Mở app để xem ngay nha~</p>
        <p style="color:#6B5E8A;font-size:12px;margin-top:32px">© 2026 Lama Stylers</p>
      </div>
    </body>
    </html>
  `
}

async function sendEmailViaResend(to, subject, html) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('RESEND_API_KEY chưa set — bỏ qua gửi email')
    return
  }
  const from = process.env.EMAIL_FROM || 'Lama Stylers <no-reply@lamastylers.com>'

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    console.error('Resend lỗi:', response.status, err)
  }
}

const vercelHandler = withAuth(async (request) => {

  const userEmail = request.auth.token.email
  const { userName, outfitCount = 1 } = request.data

  if (!userEmail) {
    throw new HttpsError('failed-precondition', 'Tài khoản chưa có email')
  }

  const today = getVNDate()
  const rateLimitRef = db.collection('rate_limits').doc(`${request.auth.uid}_sendOutfitEmail_${today}`)
  const DAILY_EMAIL_LIMIT = 10

  const rateCheck = await db.runTransaction(async (tx) => {
    const snap = await tx.get(rateLimitRef)
    const count = snap.exists ? (snap.data().count || 0) : 0
    if (count >= DAILY_EMAIL_LIMIT) {
      return { allowed: false }
    }
    tx.set(rateLimitRef, {
      count: count + 1,
      uid: request.auth.uid,
      date: today,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true })
    return { allowed: true }
  })

  if (!rateCheck.allowed) {
    throw new HttpsError(
      'resource-exhausted',
      `Đã đạt giới hạn ${DAILY_EMAIL_LIMIT} email/ngày cho tính năng này`
    )
  }

  try {
    await sendEmailViaResend(
      userEmail,
      `✨ ${outfitCount} outfit mới đã được tạo!`,
      outfitCreatedHtml(userName || 'bạn', outfitCount)
    )
    return { success: true }
  } catch (err) {
    console.error('sendOutfitCreatedEmail thất bại:', err)
    throw new HttpsError('internal', 'Không thể gửi email lúc này')
  }
})

const { toNetlifyHandler } = require('./lib/netlifyAdapter')
exports.handler = toNetlifyHandler(vercelHandler)
