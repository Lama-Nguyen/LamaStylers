'use strict'

function sanitizeText(text, maxLength = 500) {
  if (typeof text !== 'string') return ''

  let s = text.replace(/<[^>]*>/g, '').trim()
  if (s.length > maxLength) s = s.slice(0, maxLength)
  return s
}

function validateEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function validateUrl(url, allowedProtocols = ['https']) {
  try {
    const p = new URL(url)
    return allowedProtocols.includes(p.protocol.replace(':', ''))
  } catch { return false }
}

function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj
  const dangerous = ['__proto__', 'constructor', 'prototype']
  for (const key of dangerous) delete obj[key]
  return obj
}

module.exports = { sanitizeText, validateEmail, validateUrl, sanitizeObject }
