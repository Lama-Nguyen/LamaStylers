'use strict'

let z
try { z = require('zod') } catch (_) {

  z = {
    object: () => ({ parse: (v) => v }),
    string: () => ({ min: () => ({ nullable: () => ({}) }), nullable: () => ({}) }),
    array: () => ({ min: () => ({}) }),
    enum: () => ({}),
    number: () => ({ int: () => ({ min: () => ({ max: () => ({}) }) }), min: () => ({ max: () => ({}) }) }),
    record: () => ({}),
  }
}

async function validateAndParse(rawResponse, schema, retryFn) {
  let json = rawResponse

  const tryParse = (raw) => {
    if (typeof raw !== 'string') return raw

    let s = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    const firstBrace  = s.indexOf('{')
    const firstBracket = s.indexOf('[')
    const start = firstBrace >= 0 && (firstBracket < 0 || firstBrace < firstBracket) ? firstBrace : firstBracket
    if (start > 0) s = s.slice(start)
    return JSON.parse(s)
  }

  try {
    json = tryParse(rawResponse)
    return schema.parse ? schema.parse(json) : json
  } catch (parseError) {
    console.error('[schemas] Parse/validate error:', parseError.message?.slice(0, 200))
    if (!retryFn) throw parseError
    try {
      const retryRaw = await retryFn('Respond ONLY with valid JSON (no markdown, no code blocks):')
      json = tryParse(retryRaw)
      return schema.parse ? schema.parse(json) : json
    } catch (e) {
      throw new Error('AI output validation failed after retry: ' + e.message)
    }
  }
}

module.exports = { validateAndParse }
