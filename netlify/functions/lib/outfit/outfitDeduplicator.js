'use strict'

function fingerprint(itemIds) {
  if (!Array.isArray(itemIds) || itemIds.length === 0) return ''
  return [...itemIds].sort().join('|')
}

function deduplicateOutfits(candidates, existingOutfits = []) {

  const seen = new Set(
    existingOutfits
      .map(o => fingerprint(o.items || o.itemIds || []))
      .filter(Boolean)
  )

  const result = []
  for (const candidate of candidates) {
    const fp = fingerprint(candidate.items || [])
    if (!fp) {

      continue
    }
    if (seen.has(fp)) {

      continue
    }
    seen.add(fp)
    result.push(candidate)
  }
  return result
}

function summarizeRecentOutfits(recentOutfits, limit = 10) {
  return recentOutfits
    .slice(0, limit)
    .map(o => ({
      routeName: o.routeName || 'Outfit',
      items: o.items || o.itemIds || [],
    }))
}

module.exports = { deduplicateOutfits, summarizeRecentOutfits, fingerprint }
