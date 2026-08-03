'use strict'

const MAX_ITEMS_IN_PROMPT = 25

const BASIC_COLOR_TERMS = ['đen', 'den', 'trắng', 'trang', 'xám', 'xam', 'be', 'kem', 'nude', 'nâu nhạt']

function isBasicColor(color) {
  if (!color) return true
  const c = color.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')
  return BASIC_COLOR_TERMS.some(b => c.includes(b))
}

function hasPattern(pattern) {
  if (!pattern) return false
  return !['trơn', 'tron', 'plain', 'solid'].includes(
    pattern.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  )
}

const SEASON_RULES = [
  { textHints: ['lạnh', 'rét', 'đông'],    fieldHints: ['thu/đông', 'thu đông', 'winter', 'fall', 'cả năm', 'all year'] },
  { textHints: ['nóng', 'hè', 'mùa hè'],  fieldHints: ['xuân/hè', 'xuan he', 'summer', 'spring', 'cả năm', 'all year'] },
  { textHints: ['mưa'],                    fieldHints: ['thu/đông', 'cả năm', 'all year'] },
]
const OCCASION_RULES = [
  { textHints: ['làm', 'công sở', 'office'], fieldHints: ['công sở', 'cong so', 'work', 'office'] },
  { textHints: ['tiệc', 'party', 'sự kiện'], fieldHints: ['tiệc', 'party', 'sự kiện', 'event'] },
  { textHints: ['chơi', 'dạo', 'dão phố'],   fieldHints: ['dạo phố', 'casual', 'dạo', 'đi chơi'] },
]

function textIncludes(text, hints) {
  return hints.some(h => text.includes(h))
}

function itemFieldIncludes(fieldValue, hints) {
  const f = (fieldValue || '').toLowerCase()
  return !f || hints.some(h => f.includes(h))
}

function applyContextFilter(items, userText) {
  if (!userText) return { filtered: items, contextFallback: false }

  const text = userText.toLowerCase()

  const activeSeasonRule  = SEASON_RULES.find(r => textIncludes(text, r.textHints))
  const activeOccasionRule = OCCASION_RULES.find(r => textIncludes(text, r.textHints))

  if (!activeSeasonRule && !activeOccasionRule) {
    return { filtered: items, contextFallback: false }
  }

  const filtered = items.filter(i => {
    const seasonOk   = !activeSeasonRule  || itemFieldIncludes(i.season || i.recommended_season, activeSeasonRule.fieldHints)
    const occasionOk = !activeOccasionRule || itemFieldIncludes(i.occasion, activeOccasionRule.fieldHints)
    return seasonOk && occasionOk
  })

  if (filtered.length < 4) {
    return { filtered: items, contextFallback: true }
  }
  return { filtered, contextFallback: false }
}

function scoreItem(item, usageCount) {
  let score = 50

  const uses = Math.min(usageCount[item.id] || 0, 5)
  score -= uses * 3

  if (!isBasicColor(item.color)) score += 10
  if (hasPattern(item.pattern))   score += 8
  if (uses === 0)                 score += 5

  const isFootwear = item.category === 'footwear' || item.category === 'shoes'
  if (isFootwear)                  score += 15
  if (item.category === 'accessories') score += 4

  return score
}

function selectItems(items, userText = null, recentOutfits = []) {
  if (!items?.length) return { selected: [], contextFallback: false }

  const usageCount = {}
  for (const outfit of recentOutfits) {
    for (const id of (outfit.items || outfit.itemIds || [])) {
      usageCount[id] = (usageCount[id] || 0) + 1
    }
  }

  const { filtered, contextFallback } = applyContextFilter(items, userText)

  const scored = filtered.map(item => ({ ...item, _score: scoreItem(item, usageCount) }))
  scored.sort((a, b) => b._score - a._score)

  let selected = scored.slice(0, MAX_ITEMS_IN_PROMPT).map(({ _score, ...i }) => i)

  const isFootwearItem = i => i.category === 'footwear' || i.category === 'shoes'
  if (selected.every(i => !isFootwearItem(i))) {
    const bestFootwear = scored.find(i => isFootwearItem(i))
    if (bestFootwear) {
      const { _score, ...fw } = bestFootwear
      selected = [...selected.slice(0, MAX_ITEMS_IN_PROMPT - 1), fw]
    }
  }

  return { selected, contextFallback }
}

module.exports = { selectItems, MAX_ITEMS_IN_PROMPT }
