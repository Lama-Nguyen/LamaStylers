'use strict'
const { logInfo, logWarn, logError } = require('./lib/logger')

const https = require('https')

function sendTelegramMessage(botToken, chatId, text) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    })

    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${botToken}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          if (!parsed.ok) {
            reject(new Error(`Telegram API error: ${parsed.description || 'Unknown error'}`))
          } else {
            resolve(parsed)
          }
        } catch {
          reject(new Error('Telegram response parse error'))
        }
      })
    })

    req.on('error', reject)
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('Telegram request timeout')) })
    req.write(body)
    req.end()
  })
}

function formatMessage({ type, content, email, userId, url }) {
  const icon = type.includes('Bug') ? '🐛'
    : type.includes('Góp ý') ? '💡'
    : type.includes('Khen') ? '❤️'
    : '❓'

  const timestamp = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })

  return `${icon} <b>[Lama Stylers Feedback]</b>

<b>Loại:</b> ${type}
<b>Nội dung:</b>
${content}

<b>Email:</b> ${email || 'Ẩn danh'}
<b>User ID:</b> <code>${userId || 'anonymous'}</code>
<b>Trang:</b> ${url || '/'}
<b>Thời gian:</b> ${timestamp}`
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  let payload
  try {
    const bodyStr = event.body || '{}'

    const decoded = event.isBase64Encoded
      ? Buffer.from(bodyStr, 'base64').toString('utf8')
      : bodyStr
    const parsed = JSON.parse(decoded)

    payload = parsed.data || parsed
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }
  }

  const { type, content, email, userId, url } = payload

  if (!content || typeof content !== 'string' || content.trim().length < 3) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'invalid-argument', message: 'Nội dung feedback không hợp lệ' }),
    }
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId   = process.env.TELEGRAM_CHAT_ID

  if (!botToken || !chatId) {

    console.warn('sendFeedback: TELEGRAM_BOT_TOKEN hoặc TELEGRAM_CHAT_ID chưa cấu hình')
    return {
      statusCode: 200,
      body: JSON.stringify({ result: { success: true, telegram: false } }),
    }
  }

  try {
    const message = formatMessage({ type, content: content.trim(), email, userId, url })
    await sendTelegramMessage(botToken, chatId, message)

    return {
      statusCode: 200,
      body: JSON.stringify({ result: { success: true, telegram: true } }),
    }
  } catch (err) {

    logError('sendFeedback', null, 'Telegram API error', { error: err.message })
    return {
      statusCode: 200,
      body: JSON.stringify({ result: { success: true, telegram: false, error: err.message } }),
    }
  }
}
