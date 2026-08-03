export const SEASONS    = { SPRING: 'Xuân', SUMMER: 'Hè', AUTUMN: 'Thu', WINTER: 'Đông' }
export const OCCASIONS  = {
  OFFICE: 'Công sở', DATE: 'Hẹn hò', CASUAL: 'Dạo phố', SPORTS: 'Thể thao',
  BEACH: 'Đi biển', PARTY: 'Tiệc tối', HOME: 'Ở nhà', TRAVEL: 'Du lịch',
  FORMAL: 'Lễ tân', OTHER: 'Khác',
}
export const STYLE_TAGS = {
  MINIMAL: 'minimal', CASUAL: 'casual', SMART_CASUAL: 'smart-casual',
  STREETWEAR: 'streetwear', PREPPY: 'preppy', WORKWEAR: 'workwear',
  TECHWEAR: 'techwear', VINTAGE: 'vintage', ATHLEISURE: 'athleisure',
  BOHEMIAN: 'bohemian', CLASSIC: 'classic',
}
export const FITS       = { BOXY: 'boxy', REGULAR: 'regular', SLIM: 'slim', OVERSIZED: 'oversized', BAGGY: 'baggy' }
export const PATTERNS   = { SOLID: 'solid', STRIPES: 'stripes', PLAID: 'plaid', FLORAL: 'floral', GEOMETRIC: 'geometric', OTHER: 'other' }

const SEASONS_LIST    = Object.values(SEASONS)
const OCCASIONS_LIST  = Object.values(OCCASIONS)
const STYLE_TAGS_LIST = Object.values(STYLE_TAGS)
const STYLE_CONCLUSIONS = [
  'Streetwear', 'Minimal', 'Smart Casual', 'Preppy', 'Workwear',
  'Techwear', 'Vintage', 'Athleisure', 'Bohemian', 'Classic',
  'Streetwear + Minimal',
]

export const HAVY_SYSTEM_PROMPT = `Bạn là Hạ Vy, trợ lý thời trang AI thông minh và thân thiện của ứng dụng Lama Stylers.

NHIỆM VỤ CỦA BẠN:
- Tư vấn phối đồ, gợi ý outfit dựa theo tủ đồ user
- Phân tích phong cách cá nhân
- Gợi ý mua sắm bổ sung tủ đồ
- Hướng dẫn cách phối màu, chọn đồ theo dịp, thời tiết
- Trả lời câu hỏi về chăm sóc quần áo, xu hướng thời trang

GIỚI HẠN QUAN TRỌNG:
- Nếu user hỏi về chủ đề KHÔNG LIÊN QUAN đến thời trang (lập trình, y tế, chính trị, tài chính, lịch sử, khoa học, nấu ăn, v.v.) → Từ chối lịch sự với: "Hạ Vy chỉ am hiểu về thời trang thôi, bạn thông cảm nhé 💜 Bạn có muốn mình tư vấn về phối đồ không?"
- KHÔNG cung cấp thông tin y tế, pháp lý, tài chính dù được hỏi dưới bất kỳ hình thức nào
- KHÔNG viết code, giải toán, hay làm các tác vụ không liên quan thời trang

PHONG CÁCH TRẢ LỜI:
- Thân thiện, gần gũi, dùng "bạn/mình" hoặc "anh/chị/em" tuỳ context
- Ngắn gọn, đúng trọng tâm (không quá 200 từ trừ khi cần liệt kê chi tiết)
- Dùng emoji phù hợp để sinh động
- Cuối câu trả lời có thể dùng 1 trong các emote: <(\`^´)>, (;＞_＜;), [~_~], [(￣3￣)], (  -_・)?, (;-ω-)ノ

Hãy trả lời bằng tiếng Việt.`

export const AI_PROMPTS = {

  measurementEnhance: `Bạn là chuyên gia thời trang. Dựa trên thông tin:
- Loại: {{type}}
- Màu: {{color}}
- Họa tiết: {{pattern}}
- Chất liệu: {{material}}
- Form dáng: {{fit}}

Hãy bổ sung chi tiết thời trang chuyên sâu.

TRẢ VỀ JSON THUẦN (không markdown, không backtick):
{
  "highlights":  "Điểm nhấn thiết kế (cổ áo, tay áo, chi tiết đặc biệt, v.v.)",
  "style":       "Phong cách phù hợp (tối giản, cổ điển, hiện đại, streetwear, ...)",
  "occasion":    "Dịp phù hợp (công sở, dạo phố, tiệc tùng, ...)",
  "season":      "Mùa phù hợp (xuân/hè, thu/đông, cả năm)",
  "care_tips":   "Cách giặt, bảo quản đặc thù của chất liệu này",
  "styling_tip": "1 gợi ý phối đồ nhanh cho item này",
  "tags":        ["tag1", "tag2", "tag3"]
}`,

  analyzeClothing: null,

  generateOutfits: null,

  styleInsight: null,

  seasonDetection: `Xác định mùa phù hợp cho món đồ sau:
- Loại đồ: {{type}}
- Chất liệu: {{material}}
- Màu: {{color}}

Mùa có thể chọn: ${SEASONS_LIST.join(', ')}

TRẢ VỀ JSON THUẦN:
{
  "primary_season":   "Xuân",
  "secondary_season": ["Thu"],
  "year_round":       false,
  "reason":           "Lý do ngắn gọn (1-2 câu)"
}`,

  havyChatUser: `{{userMessage}}

{{#wardrobe_context}}
[Tủ đồ của tôi: {{wardrobe_context}}]
{{/wardrobe_context}}`,
}

export function buildAnalyzeClothingPrompt() {
  return `You are a professional fashion analyst. Analyze the clothing item in the image and respond with ONLY valid JSON (no markdown, no code blocks, no explanation).

Respond with this EXACT JSON structure (ALL fields required):
{
  "category": "tops|pants|shoes|accessories|headwear",
  "type": "specific type e.g. t-shirt, jeans, blazer",
  "custom_type": "detailed variant e.g. Boxy oversized t-shirt",
  "display_name": "user-friendly Vietnamese name",
  "color": { "primary": "main color name", "secondary": "secondary color or null" },
  "material": "fabric type e.g. cotton, polyester, silk",
  "fit": "boxy|regular|slim|oversized|baggy",
  "pattern": "solid|stripes|plaid|floral|geometric|other",
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
3. confidence range 0.7-0.95 typical
4. Return ONLY the JSON object — zero markdown, zero prose

JSON only:`
}

export function buildEnhancePrompt({ type, color, pattern, material, fit }) {
  return fillPrompt(AI_PROMPTS.measurementEnhance, { type, color, pattern, material, fit })
}

export function buildGenerateOutfitsPrompt(items, userText = null) {

  const slim = items.map(i => ({
    id:               i.id,
    type:             i.type,
    color:            typeof i.color === 'object' ? i.color.primary : (i.color || 'unknown'),
    fit:              i.fit || 'regular',
    occasion_tags:    i.occasion_tags || [],
    season_suggestion: i.season_suggestion || [],
  }))

  return `You are a professional fashion stylist.
Wardrobe: ${JSON.stringify(slim)}
${userText ? `User request: "${userText}"` : 'Create 3-5 coordinated outfits.'}

Respond with ONLY valid JSON (no markdown):
{
  "outfits": [
    {
      "items": ["item_id_1", "item_id_2"],
      "title": "outfit name",
      "description": "why these items work together",
      "occasion": ["${OCCASIONS_LIST.slice(0, 3).join('","')}"],
      "recommended_season": ["${SEASONS_LIST.slice(0, 2).join('","')}"],
      "color_harmony": {
        "primary_colors": ["color1"],
        "harmony_type": "complementary|analogous|monochromatic|neutral"
      },
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

export function buildGenerateStyleInsightPrompt(items, outfits) {
  const wardrobeSummary = items.map(i => ({
    type:       i.type,
    color:      typeof i.color === 'object' ? i.color.primary : i.color,
    style_tags: i.description?.style_tags || [],
  }))
  const outfitSummary = (outfits || []).map(o => ({
    title:  o.title,
    colors: o.color_harmony?.primary_colors || [],
  }))

  return `You are a professional style analyst.
Wardrobe: ${JSON.stringify(wardrobeSummary)}
Recent outfits: ${JSON.stringify(outfitSummary)}

Respond with ONLY valid JSON:
{
  "style_conclusion": "ONE of: ${STYLE_CONCLUSIONS.join('|')}",
  "description": "paragraph explaining the style",
  "color_palette": ["dominant colors"],
  "key_characteristics": ["trait 1", "trait 2", "trait 3"],
  "recommendations": {
    "strengths": "what works well",
    "improvement_areas": "what to develop"
  },
  "metadata_flexibility": "Phân tích chỉ mang tính đại khái, không chính xác tuyệt đối đâu :^)"
}

CRITICAL: style_conclusion must be EXACTLY one of: ${STYLE_CONCLUSIONS.join(', ')}. Return ONLY JSON.`
}

export function buildSeasonDetectionPrompt({ type, material, color }) {
  return fillPrompt(AI_PROMPTS.seasonDetection, { type, material, color })
}

export function fillPrompt(template, variables = {}) {
  let prompt = template

  prompt = prompt.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, key, inner) => {
    const val = variables[key]
    if (!val && val !== 0 && val !== false) return ''
    return inner.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), serializeValue(val))
  })

  Object.entries(variables).forEach(([key, val]) => {
    prompt = prompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), serializeValue(val))
  })

  prompt = prompt.replace(/\{\{[\w]+\}\}/g, '')

  return prompt.trim()
}

function serializeValue(val) {
  if (val === null || val === undefined) return ''
  if (Array.isArray(val)) return val.join(', ')
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}
