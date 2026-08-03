'use strict'

const crypto = require('crypto')
const { admin } = require('./lib/withAuth')
const { getRawBody } = require('./lib/getRawBody')
const { logInfo, logWarn, logError } = require('./lib/logger')

const db = admin.firestore()

const PACKAGES = {
  monthly:   { price: 25000,  days: 30  },
  quarterly: { price: 70000,  days: 92  },
  yearly:    { price: 250000, days: 365 },
}

const PROCESSED_WEBHOOK_TTL_MS = 90 * 24 * 60 * 60 * 1000

const SEPAY_ALLOWED_IPS_V4 = [
  '172.236.138.20',
  '172.233.83.68',
  '171.244.35.2',
  '151.158.108.68',
  '151.158.109.79',
  '103.255.238.139',
]

const SEPAY_ALLOWED_IPS_V6 = [
  '2400:8905::2000:8cff:fe98:45cd',
  '2600:3c15::2000:8aff:fedd:874b',
]

function isIpInCidr(ip, cidr) {
  const [range, bits] = cidr.split('/')
  const mask   = ~(0xFFFFFFFF >>> parseInt(bits)) >>> 0
  const ipInt  = ip.split('.').reduce((acc, oct) => (acc << 8) + parseInt(oct), 0) >>> 0
  const rngInt = range.split('.').reduce((acc, oct) => (acc << 8) + parseInt(oct), 0) >>> 0
  return (ipInt & mask) === (rngInt & mask)
}

function isAllowedIp(rawIp) {
  const ip = rawIp?.split(',')[0]?.trim()
  if (!ip) return false
  if (ip.includes(':')) {
    return SEPAY_ALLOWED_IPS_V6.some(v6 => ip.toLowerCase() === v6.toLowerCase())
  }
  return SEPAY_ALLOWED_IPS_V4.some(entry => {
    if (!entry.includes('/')) return ip === entry
    return isIpInCidr(ip, entry)
  })
}

function verifyHmac(rawBody, receivedSig, secret) {
  if (!secret || !receivedSig) return false
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex')
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(receivedSig.replace(/^sha256=/, ''), 'hex')
    )
  } catch (_) {
    return false
  }
}

function generateOrderCode() {

  return `LS-${crypto.randomUUID().replace(/-/g, '').substring(0, 12).toUpperCase()}`
}

// Check-only (không mark) — dùng trước khi xử lý
async function checkAlreadyProcessed(txnCode) {
  const snap = await db.collection('processed_webhooks').doc(txnCode).get()
  return snap.exists
    ? { alreadyProcessed: true, processedAt: snap.data().processedAt }
    : { alreadyProcessed: false }
}

// Trả về ref để gọi batch.set() bên ngoài (mark trong cùng batch activate)
function getProcessedWebhookRef(txnCode) {
  return db.collection('processed_webhooks').doc(txnCode)
}

function buildProcessedWebhookDoc(txnCode) {
  return {
    txnCode,
    processedAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt:   new Date(Date.now() + PROCESSED_WEBHOOK_TTL_MS),
  }
}

async function handler(event) {

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  // isBase64Encoded cờ chính thức của Netlify (và Lambda) — không dùng heuristic
  const isBase64 = event.isBase64Encoded === true
  const rawBody  = isBase64
    ? Buffer.from(event.body || '', 'base64').toString('utf8')
    : (event.body || '')
  const rawBodyBuffer = Buffer.from(rawBody, 'utf8')

  const rawIp =
    event.headers['x-forwarded-for'] ||
    event.headers['x-real-ip'] ||
    event.requestContext?.identity?.sourceIp ||
    ''

  const receivedSig = event.headers['x-sepay-signature'] || event.headers['x-signature'] || ''
  const hmacSecret  = process.env.SEPAY_WEBHOOK_SECRET
  if (!verifyHmac(rawBodyBuffer, receivedSig, hmacSecret)) {
    logWarn('sepayWebhook', null, 'HMAC signature không hợp lệ', { rawIp })
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid signature' }) }
  }

  if (!isAllowedIp(rawIp)) {
    logWarn('sepayWebhook', null, 'IP ngoài danh sách SePay — từ chối dù HMAC hợp lệ', { rawIp })
    return { statusCode: 403, body: JSON.stringify({ error: 'IP not allowed' }) }
  }

  let payload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }
  }

  const { content, transferAmount, accountNumber, referenceCode } = payload

  const LS_CODE_REGEX = /LS-[A-Z0-9]{12}/
  const match = (content || '').match(LS_CODE_REGEX)
  if (!match) {
    logWarn('sepayWebhook', null, 'Không tìm thấy orderCode LS- trong content', { content })
    return { statusCode: 200, body: JSON.stringify({ success: true, reason: 'no_order_code' }) }
  }
  const txnCode = match[0]

  logInfo('sepayWebhook', null, 'Webhook nhận được', { txnCode, transferAmount })

  let idempotencyResult
  try {
    idempotencyResult = await checkAlreadyProcessed(txnCode)
  } catch (e) {
    logError('sepayWebhook', null, 'Lỗi kiểm tra idempotency', { txnCode, error: e.message })
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal error' }) }
  }

  if (idempotencyResult.alreadyProcessed) {
    logInfo('sepayWebhook', null, 'Webhook đã xử lý trước đó (idempotent return)', { txnCode })
    return { statusCode: 200, body: JSON.stringify({ success: true, reason: 'already_processed' }) }
  }

  // Ưu tiên docId = orderCode (unique); fallback query field cho txn cũ
  let txnDoc = await db.collection('transactions').doc(txnCode).get()
  if (!txnDoc.exists) {
    const txnSnap = await db.collection('transactions')
      .where('orderCode', '==', txnCode)
      .where('status', 'in', ['pending', 'underpaid'])
      .limit(1)
      .get()
    if (!txnSnap.empty) txnDoc = txnSnap.docs[0]
  }

  if (!txnDoc.exists || !['pending', 'underpaid'].includes(txnDoc.data()?.status)) {
    logWarn('sepayWebhook', null, 'Không tìm thấy giao dịch pending/underpaid', { txnCode })
    return { statusCode: 200, body: JSON.stringify({ success: true, reason: 'not_found' }) }
  }

  const txnData = txnDoc.data()
  // Client ghi field `userId` (mbBankService.js); hỗ trợ fallback `uid` cho doc cũ
  const uid = txnData.userId || txnData.uid
  const { packageId } = txnData

  if (!uid) {
    logError('sepayWebhook', null, 'Transaction thiếu userId — không thể kích hoạt Premium', { txnCode })
    await txnDoc.ref.update({
      status: 'failed',
      failReason: 'missing_uid',
      failedAt: admin.firestore.FieldValue.serverTimestamp(),
    })
    return { statusCode: 200, body: JSON.stringify({ success: false, reason: 'missing_uid' }) }
  }

  const pkg = PACKAGES[packageId]
  if (!pkg) {
    logError('sepayWebhook', null, 'packageId không hợp lệ', { txnCode, packageId })
    return { statusCode: 200, body: JSON.stringify({ success: true, reason: 'invalid_package' }) }
  }

  const received = Number(transferAmount) || 0
  let totalReceived = received

  if (txnData.status === 'underpaid') {
    totalReceived = (txnData.amountPaid || 0) + received
  }

  if (totalReceived < pkg.price) {

    logWarn('sepayWebhook', null, 'Thanh toán chưa đủ', {
      txnCode, expected: pkg.price, received: totalReceived,
    })
    await txnDoc.ref.update({
      status: 'underpaid',
      amountPaid: totalReceived,
      lastWebhookAt: admin.firestore.FieldValue.serverTimestamp(),
    })
    return { statusCode: 200, body: JSON.stringify({ success: true, reason: 'underpaid' }) }
  }

  const now = admin.firestore.Timestamp.now()

  const userSnapForExpiry = await db.collection('users').doc(uid).get()
  const currentExpiry = userSnapForExpiry.data()?.premiumExpiry?.toDate?.()
  const extendBaseMs = (currentExpiry && currentExpiry.getTime() > now.toDate().getTime())
    ? currentExpiry.getTime()
    : now.toDate().getTime()
  const expiresAt = new Date(extendBaseMs + pkg.days * 24 * 60 * 60 * 1000)

  const batch = db.batch()

  batch.set(db.collection('users').doc(uid), {
    isPremium:           true,
    premiumExpiry:       admin.firestore.Timestamp.fromDate(expiresAt),
    premiumSource:       'sepay',
    premiumPackage:      packageId,
    premiumActivatedAt:  now,
  }, { merge: true })

  batch.update(txnDoc.ref, {
    status: 'completed',
    amountPaid: totalReceived,
    completedAt: now,
  })

  // Mark idempotency SAU KHI xử lý thành công — tránh nuốt webhook khi txn not_found
  batch.set(getProcessedWebhookRef(txnCode), buildProcessedWebhookDoc(txnCode))

  await batch.commit()

  logInfo('sepayWebhook', uid, 'Premium kích hoạt thành công', {
    txnCode, packageId, days: pkg.days, expiresAt: expiresAt.toISOString(),
  })

  try {
    const userSnap = await db.collection('users').doc(uid).get()
    const userData = userSnap.data() || {}
    const { sendPremiumConfirmEmail } = require('./lib/emailHelper')
    await sendPremiumConfirmEmail({
      to: userData.email || txnData.email,
      name: userData.name || 'bạn',
      packageId,
      expiresAt,
    })
  } catch (e) {
    logWarn('sepayWebhook', uid, 'Gửi email xác nhận thất bại (không chặn flow)', { error: e.message })
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true, reason: 'activated', txnCode }),
  }
}

exports.handler = handler

exports.generateOrderCode = generateOrderCode
