'use strict'

// emailHelper — wrapper gửi email xác nhận premium qua Resend (hoặc fallback log)
// TODO: điền RESEND_API_KEY ở Netlify Dashboard → Environment variables

const { logInfo, logWarn } = require('./logger')

async function sendPremiumConfirmEmail({ to, name, packageId, expiresAt }) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    logWarn('emailHelper', null, 'RESEND_API_KEY chưa set — bỏ qua gửi email', { to, packageId })
    return
  }

  const packageNames = {
    monthly:   '1 tháng',
    quarterly: '3 tháng',
    yearly:    '1 năm',
  }

  const html = `
    <h2>🎉 Chào ${name}!</h2>
    <p>Tài khoản <strong>Lama Stylers Premium</strong> của bạn đã được kích hoạt.</p>
    <p><strong>Gói:</strong> ${packageNames[packageId] || packageId}</p>
    <p><strong>Hết hạn:</strong> ${new Date(expiresAt).toLocaleDateString('vi-VN')}</p>
    <p>Cảm ơn bạn đã ủng hộ Lama Stylers! 💜</p>
  `

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: 'Lama Stylers <noreply@lamastyle.app>',
      to: [to],
      subject: '✅ Lama Stylers Premium đã kích hoạt',
      html,
    }),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => res.status)
    throw new Error(`Resend API error: ${err}`)
  }

  logInfo('emailHelper', null, 'Email xác nhận premium đã gửi', { to, packageId })
}

module.exports = { sendPremiumConfirmEmail }
