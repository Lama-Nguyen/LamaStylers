'use strict'
const { SEASONS, OCCASIONS, STYLE_TAGS, FITS, PATTERNS, MATERIALS, COLORS } = require('./constants')

const SEASONS_LIST    = Object.values(SEASONS)
const OCCASIONS_LIST  = Object.values(OCCASIONS)
const STYLE_TAGS_LIST = Object.values(STYLE_TAGS)
const FITS_LIST       = Object.values(FITS)
const PATTERNS_LIST   = Object.values(PATTERNS)
const MATERIALS_LIST  = Object.values(MATERIALS)
const COLORS_LIST     = Object.values(COLORS)

function buildAnalyzeClothingPrompt() {
  return `You are a professional fashion analyst. Analyze the clothing item in the image and respond with ONLY valid JSON (no markdown, no code blocks, no explanation).

Respond with this EXACT JSON structure (ALL fields required):
{
  "category": "tops|pants|shoes|accessories|headwear",
  "type": "specific type e.g. t-shirt, jeans, blazer",
  "custom_type": "detailed variant e.g. Boxy oversized t-shirt",
  "display_name": "user-friendly Vietnamese name",
  "color": { "primary": "one of: ${COLORS_LIST.join(', ')}", "secondary": "one of the same list, or null" },
  "material": "one of: ${MATERIALS_LIST.join(', ')}",
  "fit": "${FITS_LIST.join('|')}",
  "pattern": "${PATTERNS_LIST.join('|')}",
  "season_suggestion": ["array of seasons — can be 2-3"],
  "season_flexibility": "note about wearing outside suggested season",
  "occasion_tags": ["array from: ${OCCASIONS_LIST.join(', ')}"],
  "occasion_primary": "one of occasion_tags",
  "measurements": { "length_cm": null, "chest_cm": null },
  "description": {
    "overall": "2-3 sentence summary",
    "strengths": ["advantage 1", "advantage 2"],
    "limitations": ["limitation 1"],
    "style_tags": ["from: ${STYLE_TAGS_LIST.join(', ')}"],
    "sizing_note": "fit & size guidance",
    "fabric_care": "washing instructions"
  },
  "versatility_score": 7,
  "confidence": 0.85
}

CRITICAL RULES:
1. season_suggestion MUST be an array — light jackets → ["Xuân","Thu"], t-shirts → ["Hè","Xuân","Thu"]
2. occasion_tags must use only: ${OCCASIONS_LIST.join(', ')}
3. color.primary and color.secondary MUST be exactly one of the listed color names — pick the CLOSEST match, never invent a new color name
4. material MUST be exactly one of the listed material names — pick the CLOSEST match, never invent a new material name
5. confidence range 0.7-0.95 typical
6. versatility_score MUST be an integer from 1-10 (no decimals)
7. Return ONLY the JSON object — zero markdown, zero prose

JSON only:`
}

function buildGenerateOutfitsPrompt(items, userText = null) {
  const slim = items.map(i => ({
    id: i.id,
    type: i.type,
    color: typeof i.color === 'object' ? i.color.primary : (i.color || 'unknown'),
    fit: i.fit || 'regular',
    occasion_tags: i.occasion_tags || [],
    season_suggestion: i.season_suggestion || [],
  }))

  return `You are a professional fashion stylist.
Wardrobe: ${JSON.stringify(slim)}
${userText ? `User request: "${userText}"` : 'Create 3-5 coordinated outfits.'}

Respond with ONLY valid JSON (no markdown):
{
  "outfits": [
    {
      "items": ["item_id_1","item_id_2"],
      "title": "outfit name",
      "description": "why these items work together",
      "occasion": ["${OCCASIONS_LIST.slice(0,3).join('","')}"],
      "recommended_season": ["${SEASONS_LIST.slice(0,2).join('","')}"],
      "color_harmony": { "primary_colors": ["color1"], "harmony_type": "complementary|analogous|monochromatic|neutral" },
      "styling_notes": "accessory or adjustment tips",
      "fit_adjustments": { "item_id": "specific tailoring note" },
      "versatility": "how to adapt for different occasions",
      "overall_rating": 8,
      "confidence": 0.9
    }
  ]
}

RULES:
1. occasion = intersection of all item occasion_tags; if empty → use primary occasion of dominant item
2. fit_adjustments must be specific with measurements when possible
3. Return ONLY JSON, no markdown

JSON only:`
}

function buildGenerateStyleInsightPrompt(items, outfits) {
  const wardrobeSummary = items.map(i => ({
    type: i.type,
    color: typeof i.color === 'object' ? i.color.primary : i.color,
    style_tags: i.description?.style_tags || [],
  }))
  const outfitSummary = outfits.map(o => ({
    title: o.title,
    colors: o.color_harmony?.primary_colors || [],
  }))

  return `You are a professional style analyst.
Wardrobe: ${JSON.stringify(wardrobeSummary)}
Recent outfits: ${JSON.stringify(outfitSummary)}

Respond with ONLY valid JSON:
{
  "style_conclusion": "ONE of: Streetwear|Minimal|Smart Casual|Preppy|Workwear|Techwear|Vintage|Athleisure|Bohemian|Classic|Streetwear + Minimal",
  "description": "paragraph explaining the style",
  "color_palette": ["dominant colors"],
  "key_characteristics": ["trait 1","trait 2","trait 3"],
  "recommendations": { "strengths": "what works well", "improvement_areas": "what to develop" },
  "metadata_flexibility": "Phân tích chỉ mang tính đại khái, không chính xác tuyệt đối đâu :^)"
}

CRITICAL: style_conclusion must be EXACTLY one of the listed values. Return ONLY JSON.`
}

function buildEditOutfitPrompt({ currentOutfit, lockedItems, candidateItems, styleShift, preferenceSummary }) {
  return `Bạn là stylist AI chuyên nghiệp người Việt Nam, đang CHỈNH SỬA lại 1 outfit có sẵn — không phải tạo mới từ đầu.

Outfit hiện tại: "${currentOutfit.routeName || currentOutfit.title || 'Outfit'}" — ${currentOutfit.description || ''}

CÁC MÓN BẮT BUỘC GIỮ NGUYÊN (không được bỏ, không được thay):
${JSON.stringify(lockedItems)}

CÁC MÓN CÓ THỂ CHỌN để lấp vào phần còn lại (chỉ được chọn trong danh sách này):
${JSON.stringify(candidateItems)}

${styleShift ? `YÊU CẦU ĐIỀU CHỈNH: ${styleShift}` : 'Giữ nguyên tinh thần chung của outfit — chỉ làm mới phần chưa khoá cho hài hoà hơn.'}
${preferenceSummary ? `\n${preferenceSummary}\n` : ''}

TRẢ VỀ JSON THUẦN (không markdown, không backtick, không text ngoài JSON) — dạng mảng chỉ có đúng 1 phần tử:
[
  {
    "items": ["itemId1", "itemId2"],
    "routeName": "Tên phong cách",
    "description": "1-2 câu: đã đổi gì, vì sao vẫn hợp",
    "scores": {"color": 85, "proportion": 80, "material": 75, "style": 88}
  }
]

QUY TẮC BẮT BUỘC:
1. MỌI id trong danh sách "giữ nguyên" PHẢI xuất hiện trong "items" — tuyệt đối không bỏ, không thay.
2. Mọi id KHÁC trong "items" phải lấy từ danh sách "có thể chọn" — không được bịa id không có trong 2 danh sách trên.
3. Chỉ trả về mảng JSON, không kèm gì khác.`
}

module.exports = { buildAnalyzeClothingPrompt, buildGenerateOutfitsPrompt, buildGenerateStyleInsightPrompt, buildEditOutfitPrompt, SEASONS_LIST, OCCASIONS_LIST }
