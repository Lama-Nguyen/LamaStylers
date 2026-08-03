'use strict'
const { validateAndParse } = require('../schemas')

async function parseOutfitResponse(aiResponse, retryFn) {
  const stub = { parse: (v) => v }
  return validateAndParse(aiResponse, stub, retryFn)
}

function findDominantItem(items) {
  const priority = { tops: 3, shoes: 2, pants: 1, accessories: 0, headwear: 0 }
  return items.reduce((prev, curr) =>
    (priority[curr.category] || 0) > (priority[prev.category] || 0) ? curr : prev
  )
}

function computeOutfitOccasion(items) {
  if (!items?.length) return []
  let set = new Set(items[0].occasion_tags || [])
  for (let i = 1; i < items.length; i++) {
    const s2 = new Set(items[i].occasion_tags || [])
    set = new Set([...set].filter(x => s2.has(x)))
  }
  if (set.size === 0) return [findDominantItem(items).occasion_primary].filter(Boolean)
  return Array.from(set)
}

function computeOutfitSeason(items) {
  if (!items?.length) return []
  let set = new Set(items[0].season_suggestion || [])
  for (let i = 1; i < items.length; i++) {
    const s2 = new Set(items[i].season_suggestion || [])
    set = new Set([...set].filter(x => s2.has(x)))
  }
  if (set.size === 0) return findDominantItem(items).season_suggestion || []
  return Array.from(set)
}

module.exports = { parseOutfitResponse, computeOutfitOccasion, computeOutfitSeason, findDominantItem }
