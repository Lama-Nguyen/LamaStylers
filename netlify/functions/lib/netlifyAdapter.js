'use strict'

const { Readable } = require('stream')

function buildFakeReq(event) {

  const rawBodyBuffer = event.body
    ? Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf-8')
    : Buffer.alloc(0)

  const headers = {}
  for (const [key, value] of Object.entries(event.headers || {})) {
    headers[key.toLowerCase()] = value
  }

  let parsedBody = undefined
  const contentType = headers['content-type'] || ''
  if (rawBodyBuffer.length > 0 && contentType.includes('application/json')) {
    try {
      parsedBody = JSON.parse(rawBodyBuffer.toString('utf-8'))
    } catch {

      parsedBody = undefined
    }
  }

  const bodyStream = Readable.from(
    rawBodyBuffer.length > 0 ? [rawBodyBuffer] : []
  )

  const remoteAddress =
    headers['x-nf-client-connection-ip'] ||
    (headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    null

  const req = Object.assign(bodyStream, {
    method: event.httpMethod,
    headers,
    body: parsedBody,
    url: event.path || event.rawUrl || '/',
    socket: { remoteAddress },

    __rawBodyBuffer: rawBodyBuffer,
  })

  return req
}

function buildFakeRes() {
  const state = {
    statusCode: 200,
    headers: {},
    body: '',
    ended: false,
  }

  const res = {
    setHeader(name, value) {
      state.headers[name] = value
      return res
    },
    status(code) {
      state.statusCode = code
      return res
    },
    json(payload) {
      state.headers['Content-Type'] = 'application/json'
      state.body = JSON.stringify(payload)
      state.ended = true
      return res
    },
    end(payload) {
      if (payload !== undefined) state.body = payload
      state.ended = true
      return res
    },
  }

  return {
    res,
    getResult() {
      return {
        statusCode: state.statusCode,
        headers: state.headers,
        body: state.body,
      }
    },
  }
}

function toNetlifyHandler(vercelStyleHandler) {
  return async function netlifyHandler(event, context) {
    const req = buildFakeReq(event)
    const { res, getResult } = buildFakeRes()

    try {
      await vercelStyleHandler(req, res)
    } catch (e) {

      console.error('[netlifyAdapter] Unhandled exception thoát khỏi handler:', e)
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: { code: 'internal', message: 'Đã có lỗi xảy ra, vui lòng thử lại sau.' }
        }),
      }
    }

    return getResult()
  }
}

module.exports = { toNetlifyHandler, buildFakeReq, buildFakeRes }
