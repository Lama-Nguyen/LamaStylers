'use strict'

let _sentry = null
function getSentry() {
  if (!_sentry) {
    try { _sentry = require('./sentry') } catch (_) { _sentry = { Sentry: { captureException: () => {}, captureMessage: () => {} }, captureAPIError: () => {} } }
  }
  return _sentry
}

function log(level, module, userId, message, extra = {}) {
  const entry = { timestamp: new Date().toISOString(), level, module, userId: userId || 'system', message, ...extra }
  console.log(JSON.stringify(entry))

  const { Sentry } = getSentry()
  if (level === 'error') {
    Sentry.captureException(new Error(message), { tags: { module }, extra: { userId, ...extra } })
  } else if (level === 'warn') {
    Sentry.captureMessage(message, 'warning', { tags: { module }, extra: { userId, ...extra } })
  }
  return entry
}

const logInfo  = (m, u, msg, ex) => log('info',  m, u, msg, ex)
const logWarn  = (m, u, msg, ex) => log('warn',  m, u, msg, ex)
const logError = (m, u, msg, ex) => log('error', m, u, msg, ex)

function logAPIError(endpoint, statusCode, error, userId, extra = {}) {
  logError('api', userId, `${endpoint} → ${statusCode}`, { endpoint, statusCode, error: error?.message, ...extra })
  getSentry().captureAPIError(endpoint, statusCode, error, userId)
}

module.exports = { log, logInfo, logWarn, logError, logAPIError }
