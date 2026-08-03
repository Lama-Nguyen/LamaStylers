'use strict'
const { runOutfitProviderChain } = require('../aiProviderChain')
const { computeOutfitOccasion, computeOutfitSeason } = require('./resultParser')

async function generateOutfitsWithAI(items, userText, context = {}) {
  const {
    userApiKey,
    isPremium,
    likedOutfits = [],
    recentOutfitSummaries = [],
    preferenceSummary = null,
  } = context

  const { outfits, providerUsed, attempted } = await runOutfitProviderChain({
    items,
    userText,
    bodyInfo: context.bodyInfo || 'Không có số đo',
    isPremium,
    userApiKey,
    likedOutfits,
    recentOutfitSummaries,
    preferenceSummary,
  })

  if (!Array.isArray(outfits) || outfits.length === 0) {
    throw new Error(`AI không tạo được outfit (provider: ${providerUsed ?? 'none'}, attempts: ${attempted?.length ?? 0})`)
  }

  return outfits.map(outfit => {
    const outfitItems = (outfit.items || [])
      .map(id => items.find(i => i.id === id))
      .filter(Boolean)
    return {
      ...outfit,
      occasion:           computeOutfitOccasion(outfitItems),
      recommended_season: computeOutfitSeason(outfitItems),
    }
  })
}

async function editOutfitWithAI(allItems, { currentOutfit, lockedItemIds, candidateItemIds, styleShift, userApiKey, isPremium, preferenceSummary }) {
  const { runEditOutfitProviderChain } = require('../aiProviderChain')

  const slim = (i) => ({
    id: i.id, type: i.type,
    color: typeof i.color === 'object' ? i.color.primary : (i.color || 'unknown'),
    fit: i.fit || 'regular',
  })
  const lockedItems    = allItems.filter(i => lockedItemIds.includes(i.id)).map(slim)
  const candidateItems = allItems.filter(i => candidateItemIds.includes(i.id)).map(slim)

  const { outfit, providerUsed, attempted } = await runEditOutfitProviderChain({
    isPremium, userApiKey, currentOutfit, lockedItems, candidateItems, styleShift, preferenceSummary,
  })

  if (!outfit) {
    throw new Error(`AI không chỉnh sửa được outfit (provider: ${providerUsed ?? 'none'}, attempts: ${attempted?.length ?? 0})`)
  }

  const outfitItems = (outfit.items || [])
    .map(id => allItems.find(i => i.id === id))
    .filter(Boolean)

  return {
    ...outfit,
    occasion:           computeOutfitOccasion(outfitItems),
    recommended_season: computeOutfitSeason(outfitItems),
  }
}

module.exports = { generateOutfitsWithAI, editOutfitWithAI }
