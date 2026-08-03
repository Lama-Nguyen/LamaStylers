const TOP_K = 8
const CACHE_TTL = 5 * 60 * 1000

const COLOR_ALIASES = {
  'xanh':    ['xanh', 'xanh lam', 'xanh navy', 'xanh dương', 'xanh lá', 'xanh rêu', 'xanh mint', 'xanh ngọc'],
  'đỏ':      ['đỏ', 'đỏ đô', 'đỏ tươi', 'đỏ trầm', 'cam đỏ', 'hồng đỏ'],
  'hồng':    ['hồng', 'hồng nhạt', 'hồng phấn', 'hồng đậm', 'hồng baby'],
  'vàng':    ['vàng', 'vàng đồng', 'vàng nhạt', 'be', 'kem', 'nude'],
  'nâu':     ['nâu', 'nâu đất', 'camel', 'chocolate', 'cà phê'],
  'xám':     ['xám', 'xám nhạt', 'xám đậm', 'bạc', 'ghi'],
  'đen':     ['đen', 'đen tuyền'],
  'trắng':   ['trắng', 'trắng sữa', 'kem', 'off-white'],
  'tím':     ['tím', 'tím nhạt', 'lavender', 'tím than', 'tím pastel'],
  'cam':     ['cam', 'cam đất', 'cam nhạt', 'terracotta'],
}

const OCCASION_INTENTS = {
  'đi làm':    ['đi làm', 'công sở', 'văn phòng', 'họp', 'meeting', 'formal'],
  'đi chơi':   ['đi chơi', 'dạo phố', 'café', 'cà phê', 'gặp bạn', 'shopping', 'casual'],
  'dự tiệc':   ['tiệc', 'party', 'dự tiệc', 'đám cưới', 'sinh nhật', 'sự kiện', 'event'],
  'thể thao':  ['thể thao', 'gym', 'tập gym', 'chạy bộ', 'yoga', 'thể dục', 'sport'],
  'ở nhà':     ['ở nhà', 'nhà', 'nghỉ', 'thoải mái', 'casual', 'mặc nhà'],
  'đi học':    ['đi học', 'học', 'trường', 'lớp', 'sinh viên'],
}

const SEASON_INTENTS = {
  'hè':   ['hè', 'mùa hè', 'nóng', 'heo may', 'nắng', 'mát'],
  'đông': ['đông', 'mùa đông', 'lạnh', 'rét', 'ấm'],
  'xuân': ['xuân', 'mùa xuân', 'tết', 'se lạnh'],
  'thu':  ['thu', 'mùa thu', 'se lạnh', 'vừa vừa'],
}

function scoreItem(item, queryLower, queryWords) {
  let score = 0

  const fields = [
    item.type,
    item.color,
    item.pattern,
    item.material,
    item.fit,
    item.notes,
    item.season,
    item.occasion,
    ...(Array.isArray(item.tags) ? item.tags : []),
  ].filter(Boolean).map(f => f.toLowerCase())

  const searchableText = fields.join(' ')

  for (const word of queryWords) {
    if (word.length < 2) continue

    const matches = searchableText.match(new RegExp(word, 'g')) || []
    if (matches.length > 0) {

      const tf = Math.log(matches.length + 1)
      score += tf * 2
    }
  }

  const itemType = (item.type || '').toLowerCase()
  if (queryWords.some(w => itemType.includes(w))) {
    score += 10
  }

  const itemColor = (item.color || '').toLowerCase()
  for (const [alias, variants] of Object.entries(COLOR_ALIASES)) {
    if (queryLower.includes(alias)) {
      if (variants.some(v => itemColor.includes(v))) {
        score += 4
      }
    }
  }
  if (queryLower.includes(itemColor) && itemColor.length > 1) {
    score += 3
  }

  const itemOccasion = (item.occasion || '').toLowerCase()
  const itemSeason = (item.season || '').toLowerCase()

  for (const [occasion, keywords] of Object.entries(OCCASION_INTENTS)) {
    if (keywords.some(kw => queryLower.includes(kw))) {
      if (itemOccasion === occasion || !itemOccasion) {
        score += 2
      }
    }
  }

  for (const [season, keywords] of Object.entries(SEASON_INTENTS)) {
    if (keywords.some(kw => queryLower.includes(kw))) {
      if (itemSeason === season || !itemSeason) {
        score += 2
      }
    }
  }

  if (item.createdAt) {
    const daysOld = (Date.now() - new Date(item.createdAt).getTime()) / (24 * 60 * 60 * 1000)
    const freshnessBoost = Math.max(0, 2 - daysOld / 30)
    score += freshnessBoost
  }

  return score
}

export function retrieveRelevantItems(query, allItems, topK = TOP_K) {
  if (!allItems?.length) return []
  if (!query?.trim()) return allItems.slice(0, topK)

  const queryLower = query.toLowerCase()
  const queryWords = queryLower.split(/[\s,./!?]+/).filter(w => w.length > 1)

  const withRagScore = allItems.map(item => ({
    ...item,
    _ragScore: scoreItem(item, queryLower, queryWords),
  }))

  // "không thích màu đen" / "tránh giày cao gót" → trừ điểm những món khớp
  // từ khoá phủ định, để HaVy không đưa chúng vào ngữ cảnh gợi ý.
  const negatives = extractNegativeKeywords(query)
  const scored = negatives.length
    ? applyNegativeFiltering(withRagScore, query).map((item, i) => ({
        ...item,
        _ragScore: withRagScore[i]._ragScore + item._scoreAdjust,
      }))
    : withRagScore

  const maxScore = Math.max(...scored.map(i => i._ragScore))

  // Chỉ dùng fallback "trả về top-K thô, không sort" khi thực sự không có
  // tín hiệu nào — kể cả tín hiệu phủ định. Nếu có negatives, vẫn phải sort
  // để đẩy các món bị loại trừ xuống dưới dù điểm dương bằng 0.
  if (maxScore <= 0 && negatives.length === 0) {
    return allItems.slice(0, topK)
  }

  return scored
    .sort((a, b) => b._ragScore - a._ragScore)
    .slice(0, topK)
    .map(({ _ragScore, _scoreAdjust, ...item }) => item)
}

export function serializeForPrompt(items, total = 0) {
  if (!items?.length) {
    return 'TỦ ĐỒ THẬT CỦA ANH/CHỊ: (chưa có món nào — tủ đồ đang trống)'
  }

  const lines = items.map(item => {
    const parts = [`Loại: ${item.type || '?'}`]
    if (item.color && item.color !== 'Khác')    parts.push(`màu ${item.color}`)
    if (item.pattern && item.pattern !== 'Trơn') parts.push(`họa tiết ${item.pattern}`)
    if (item.material) parts.push(`chất liệu ${item.material}`)
    if (item.fit)      parts.push(`form ${item.fit}`)
    if (item.occasion && item.occasion !== 'Bất kỳ') parts.push(`dịp ${item.occasion}`)
    if (item.season && item.season !== 'Bất kỳ')    parts.push(`mùa ${item.season}`)
    return `- ${parts.join(', ')}`
  })

  const header = total > items.length
    ? `TỦ ĐỒ CỦA ANH/CHỊ (hiển thị ${items.length}/${total} món liên quan nhất):`
    : `TỦ ĐỒ CỦA ANH/CHỊ (${items.length} món):`

  return `${header}\n${lines.join('\n')}`
}

export function extractNegativeKeywords(query) {
  const negationPatterns = [
    /(?:không|ko|chẳng|không thích)\s+(\w+)/gi,
    /(?:tránh|bỏ)\s+(\w+)/gi,
  ]
  const negatives = []
  for (const pattern of negationPatterns) {
    let match
    while ((match = pattern.exec(query))) {
      negatives.push(match[1].toLowerCase())
    }
  }
  return negatives
}

export function applyNegativeFiltering(items, query, negativeBonus = -30) {
  const negatives = extractNegativeKeywords(query)
  return items.map(item => ({
    ...item,
    _scoreAdjust: negatives.some(neg =>
      (item.color || '').toLowerCase().includes(neg) ||
      (item.type || '').toLowerCase().includes(neg) ||
      (item.pattern || '').toLowerCase().includes(neg)
    ) ? negativeBonus : 0,
  }))
}

const _retrievalCache = new Map()

export function getCachedResults(uid, query, maxAge = CACHE_TTL) {
  const userCache = _retrievalCache.get(uid)
  if (!userCache) return null

  const cached = userCache[query]
  if (!cached) return null

  if (Date.now() - cached.timestamp > maxAge) {
    delete userCache[query]
    return null
  }

  return cached.results
}

export function setCachedResults(uid, query, results) {
  if (!_retrievalCache.has(uid)) {
    _retrievalCache.set(uid, {})
  }
  _retrievalCache.get(uid)[query] = { results, timestamp: Date.now() }
}

setInterval(() => {
  for (const [uid, cache] of _retrievalCache) {
    const now = Date.now()
    Object.keys(cache).forEach(query => {
      if (now - cache[query].timestamp > 30 * 60 * 1000) {
        delete cache[query]
      }
    })
  }
}, 60 * 1000)
