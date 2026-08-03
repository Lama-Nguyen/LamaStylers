'use strict'

const CLOTHING_TYPES = {
  TSHIRT: 'Áo thun', BUTTON_UP: 'Áo sơ mi', JACKET: 'Áo khoác',
  HOODIE: 'Áo hoodie', CARDIGAN: 'Áo len', TANK: 'Áo ba lỗ',
  POLO: 'Áo polo', BLAZER: 'Áo blazer', JEANS: 'Quần jeans',
  TROUSERS: 'Quần tây', SHORTS: 'Quần short', JOGGERS: 'Quần jogger',
  SKIRT: 'Váy', DRESS: 'Đầm', SNEAKERS: 'Giày thể thao',
  BOOTS: 'Giày cao cổ', FORMAL_SHOES: 'Giày lịch sự', SANDALS: 'Dép/Sandal',
  BELT: 'Dây lưng', BAG: 'Túi xách', SCARF: 'Khăn', HAT: 'Mũ', GLASSES: 'Kính',
}

const SEASONS = { SPRING: 'Xuân', SUMMER: 'Hè', AUTUMN: 'Thu', WINTER: 'Đông' }

const OCCASIONS = {
  OFFICE: 'Công sở', DATE: 'Hẹn hò', CASUAL: 'Dạo phố', SPORTS: 'Thể thao',
  BEACH: 'Đi biển', PARTY: 'Tiệc tối', HOME: 'Ở nhà', TRAVEL: 'Du lịch',
  FORMAL: 'Lễ tân', OTHER: 'Khác',
}

const FITS = { BOXY: 'boxy', REGULAR: 'regular', SLIM: 'slim', OVERSIZED: 'oversized', BAGGY: 'baggy' }

const PATTERNS = {
  SOLID: 'solid', STRIPES: 'stripes', PLAID: 'plaid',
  FLORAL: 'floral', GEOMETRIC: 'geometric', OTHER: 'other',
}

const STYLE_TAGS = {
  MINIMAL: 'minimal', CASUAL: 'casual', SMART_CASUAL: 'smart-casual',
  STREETWEAR: 'streetwear', PREPPY: 'preppy', WORKWEAR: 'workwear',
  TECHWEAR: 'techwear', VINTAGE: 'vintage', ATHLEISURE: 'athleisure',
  BOHEMIAN: 'bohemian', CLASSIC: 'classic',
}

const RATE_LIMITS = {
  GENERATE_OUTFITS:   { free: 5,  premium: 20 },
  EDIT_OUTFIT:        { free: 10, premium: 40 },
  ANALYZE_CLOTHING:   { free: 10, premium: 30 },
  // Lưu ý: removeBackground.js tự quản lý rate-limit riêng (field/key khác lib/rateLimits.js),
  // KHÔNG đọc entry này. Giữ ở đây chỉ để tham chiếu — số liệu đã khớp thực tế (30/ngày, chỉ Premium).
  REMOVE_BACKGROUND:  { free: 5,  premium: 30 },
}

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean).length
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  : ['http://localhost:5173', 'http://localhost:8888']

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
}

const SOFT_DELETE_RETENTION_DAYS = 30
const VIETNAM_TZ = 'Asia/Ho_Chi_Minh'

const MATERIALS = {
  COTTON: 'cotton', LINEN: 'linen', DENIM: 'denim', WOOL: 'wool',
  POLYESTER: 'polyester', NYLON: 'nylon', SPANDEX: 'spandex',
  SILK: 'silk', SATIN: 'satin', VELVET: 'velvet', LEATHER: 'leather',
  SUEDE: 'suede', KNIT: 'knit', FLEECE: 'fleece', CORDUROY: 'corduroy',
  CHIFFON: 'chiffon', TWEED: 'tweed', CANVAS: 'canvas', MESH: 'mesh',
  RIB_KNIT: 'rib-knit', BLEND: 'blend', OTHER: 'other',
}

const COLORS = {
  BLACK: 'Đen', WHITE: 'Trắng', GRAY: 'Xám', BEIGE: 'Be', BROWN: 'Nâu',
  CREAM: 'Kem', RED: 'Đỏ', MAROON: 'Đỏ đô', ORANGE: 'Cam', YELLOW: 'Vàng',
  OLIVE: 'Xanh rêu', GREEN: 'Xanh lá', MINT: 'Xanh mint', TEAL: 'Xanh ngọc',
  BLUE: 'Xanh dương', NAVY: 'Xanh navy', PURPLE: 'Tím', PINK: 'Hồng',
  PASTEL_PINK: 'Hồng pastel', SILVER: 'Bạc', GOLD: 'Vàng gold',
  KHAKI: 'Kaki', DENIM_BLUE: 'Xanh denim', MULTI: 'Nhiều màu',
}

module.exports = {
  CLOTHING_TYPES, SEASONS, OCCASIONS, FITS,
  PATTERNS, STYLE_TAGS,
  MATERIALS, COLORS,
  RATE_LIMITS, ALLOWED_ORIGINS,
  SECURITY_HEADERS, SOFT_DELETE_RETENTION_DAYS, VIETNAM_TZ,
}
