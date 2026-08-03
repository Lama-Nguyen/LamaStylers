'use strict'

const VN_OFFSET_MINUTES = 7 * 60

function getVNDate() {
  const local = new Date(Date.now() + VN_OFFSET_MINUTES * 60 * 1000)
  return local.toISOString().slice(0, 10)
}

module.exports = { getVNDate, VN_OFFSET_MINUTES }
