'use strict'

const TIMEOUT_MS = 8_500

const DEFAULT_MSG = 'AI mất quá nhiều thời gian xử lý. Vui lòng thử lại sau ít phút.'

class TimeoutError extends Error {
  constructor(message = DEFAULT_MSG) {
    super(message)
    this.name = 'TimeoutError'
    this.code = 'deadline-exceeded'
  }
}

/**
 * Wrap một async function trong race với deadline ms.
 * Dùng ở mọi Netlify Function gọi AI để tránh Netlify hard-kill 502.
 *
 * Netlify Free cắt cứng tại 10s → hàm này timeout sớm ở 8.5s,
 * cho đủ thời gian Firestore quota write + serialize lỗi về client.
 *
 * @param {() => Promise<T>} fn  async function cần guard
 * @param {number}           ms  timeout ms, mặc định 8500
 * @param {string}           msg message tiếng Việt khi timeout
 * @returns {Promise<T>}
 * @throws {TimeoutError}        với code 'deadline-exceeded'
 *
 * @example
 * const text = await withTimeoutGuard(
 *   () => model.generateContent(prompt),
 *   8_500,
 *   'AI mất quá nhiều thời gian. Thử lại sau nhé!'
 * )
 */
function withTimeoutGuard(fn, ms = TIMEOUT_MS, msg = DEFAULT_MSG) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(msg)), ms)
  })
  return Promise.race([
    Promise.resolve().then(fn).finally(() => clearTimeout(timer)),
    timeout,
  ])
}

module.exports = { withTimeoutGuard, TimeoutError, TIMEOUT_MS }
