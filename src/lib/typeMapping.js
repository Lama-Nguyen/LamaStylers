const TYPE_ALIAS_MAP = {

  'boxy tee':           { type: 'Áo thun',    category: 'tops', fit: 'Boxy',      custom_type: 'Boxy tee',       display_name: 'Boxy tee' },
  'boxy t-shirt':       { type: 'Áo thun',    category: 'tops', fit: 'Boxy',      custom_type: 'Boxy tee',       display_name: 'Boxy tee' },
  'boxy':               { type: 'Áo thun',    category: 'tops', fit: 'Boxy',      custom_type: 'Boxy tee',       display_name: 'Boxy tee' },
  'oversized tee':      { type: 'Áo thun',    category: 'tops', fit: 'Oversized', custom_type: 'Oversized tee',  display_name: 'Oversized tee' },
  'oversize tee':       { type: 'Áo thun',    category: 'tops', fit: 'Oversized', custom_type: 'Oversized tee',  display_name: 'Oversized tee' },
  'corset top':         { type: 'Áo ba lỗ',   category: 'tops', fit: 'Ôm',       custom_type: 'Corset top',     display_name: 'Corset top' },
  'corset':             { type: 'Áo ba lỗ',   category: 'tops', fit: 'Ôm',       custom_type: 'Corset top',     display_name: 'Corset top' },
  'crop hoodie':        { type: 'Áo hoodie',  category: 'tops', fit: 'Cropped',  custom_type: 'Crop hoodie',    display_name: 'Crop hoodie' },
  'cropped hoodie':     { type: 'Áo hoodie',  category: 'tops', fit: 'Cropped',  custom_type: 'Crop hoodie',    display_name: 'Crop hoodie' },
  'cropped sweater':    { type: 'Áo len',     category: 'tops', fit: 'Cropped',  custom_type: 'Cropped sweater',display_name: 'Cropped sweater' },
  'crop sweater':       { type: 'Áo len',     category: 'tops', fit: 'Cropped',  custom_type: 'Cropped sweater',display_name: 'Cropped sweater' },
  'cardigan':           { type: 'Áo len',     category: 'tops', fit: 'Regular',  custom_type: 'Cardigan',       display_name: 'Cardigan' },
  'tank top':           { type: 'Áo ba lỗ',   category: 'tops', fit: 'Regular',  custom_type: 'Tank top',       display_name: 'Tank top' },
  'croptop':            { type: 'Áo ba lỗ',   category: 'tops', fit: 'Cropped',  custom_type: 'Crop top',       display_name: 'Crop top' },
  'crop top':           { type: 'Áo ba lỗ',   category: 'tops', fit: 'Cropped',  custom_type: 'Crop top',       display_name: 'Crop top' },
  'áo croptop':         { type: 'Áo ba lỗ',   category: 'tops', fit: 'Cropped',  custom_type: 'Crop top',       display_name: 'Crop top' },
  'polo':               { type: 'Áo polo',    category: 'tops', fit: 'Regular',  custom_type: 'Polo',           display_name: 'Áo Polo' },
  'oxford shirt':       { type: 'Áo sơ mi',   category: 'tops', fit: 'Regular',  custom_type: 'Oxford shirt',   display_name: 'Oxford shirt' },
  'flannel':            { type: 'Áo sơ mi',   category: 'tops', fit: 'Regular',  custom_type: 'Flannel shirt',  display_name: 'Flannel shirt' },
  'flannel shirt':      { type: 'Áo sơ mi',   category: 'tops', fit: 'Regular',  custom_type: 'Flannel shirt',  display_name: 'Flannel shirt' },
  'denim jacket':       { type: 'Áo khoác',   category: 'tops', fit: 'Regular',  custom_type: 'Denim jacket',   display_name: 'Denim jacket' },
  'leather jacket':     { type: 'Áo khoác',   category: 'tops', fit: 'Regular',  custom_type: 'Leather jacket', display_name: 'Leather jacket' },
  'bomber':             { type: 'Áo khoác',   category: 'tops', fit: 'Regular',  custom_type: 'Bomber jacket',  display_name: 'Bomber jacket' },
  'bomber jacket':      { type: 'Áo khoác',   category: 'tops', fit: 'Regular',  custom_type: 'Bomber jacket',  display_name: 'Bomber jacket' },
  'windbreaker':        { type: 'Áo khoác',   category: 'tops', fit: 'Regular',  custom_type: 'Windbreaker',    display_name: 'Windbreaker' },
  'vest':               { type: 'Áo blazer',  category: 'tops', fit: 'Regular',  custom_type: 'Vest',           display_name: 'Vest' },
  'áo gile':            { type: 'Áo blazer',  category: 'tops', fit: 'Regular',  custom_type: 'Áo gile',        display_name: 'Áo gile' },

  'baggy jeans':        { type: 'Quần jeans', category: 'pants', fit: 'Rộng',    custom_type: 'Baggy jeans',    display_name: 'Baggy jeans' },
  'baggy':              { type: 'Quần jeans', category: 'pants', fit: 'Rộng',    custom_type: 'Baggy jeans',    display_name: 'Baggy jeans' },
  'cargo pants':        { type: 'Quần tây',   category: 'pants', fit: 'Regular', custom_type: 'Cargo pants',    display_name: 'Cargo pants' },
  'cargo':              { type: 'Quần tây',   category: 'pants', fit: 'Regular', custom_type: 'Cargo pants',    display_name: 'Cargo pants' },
  'wide leg pants':     { type: 'Quần tây',   category: 'pants', fit: 'Rộng',    custom_type: 'Wide-leg pants', display_name: 'Wide-leg pants' },
  'wide leg':           { type: 'Quần tây',   category: 'pants', fit: 'Rộng',    custom_type: 'Wide-leg pants', display_name: 'Wide-leg pants' },
  'wide-leg pants':     { type: 'Quần tây',   category: 'pants', fit: 'Rộng',    custom_type: 'Wide-leg pants', display_name: 'Wide-leg pants' },
  'quần ống rộng':      { type: 'Quần tây',   category: 'pants', fit: 'Rộng',    custom_type: 'Quần ống rộng',  display_name: 'Quần ống rộng' },
  'skinny jeans':       { type: 'Quần jeans', category: 'pants', fit: 'Ôm',      custom_type: 'Skinny jeans',   display_name: 'Skinny jeans' },
  'slim jeans':         { type: 'Quần jeans', category: 'pants', fit: 'Ôm',      custom_type: 'Slim jeans',     display_name: 'Slim jeans' },
  'flare pants':        { type: 'Quần tây',   category: 'pants', fit: 'Rộng',    custom_type: 'Flare pants',    display_name: 'Flare pants' },
  'flare jeans':        { type: 'Quần jeans', category: 'pants', fit: 'Rộng',    custom_type: 'Flare jeans',    display_name: 'Flare jeans' },
  'palazzo':            { type: 'Quần tây',   category: 'pants', fit: 'Rộng',    custom_type: 'Palazzo',        display_name: 'Palazzo' },
  'sweatpants':         { type: 'Quần jogger',category: 'pants', fit: 'Rộng',    custom_type: 'Sweatpants',     display_name: 'Sweatpants' },
  'track pants':        { type: 'Quần jogger',category: 'pants', fit: 'Regular', custom_type: 'Track pants',    display_name: 'Track pants' },
  'quần lửng':          { type: 'Quần short', category: 'pants', fit: 'Regular', custom_type: 'Quần lửng',      display_name: 'Quần lửng' },
  'quần bermuda':       { type: 'Quần short', category: 'pants', fit: 'Regular', custom_type: 'Bermuda',        display_name: 'Quần Bermuda' },
  'jeans lửng':         { type: 'Quần jeans', category: 'pants', fit: 'Regular', custom_type: 'Jeans lửng',     display_name: 'Jeans lửng' },

  'fanny pack':         { type: 'Túi xách',   category: 'accessories', custom_type: 'Fanny pack',    display_name: 'Fanny pack' },
  'crossbody':          { type: 'Túi xách',   category: 'accessories', custom_type: 'Crossbody bag', display_name: 'Crossbody bag' },
  'tote bag':           { type: 'Túi xách',   category: 'accessories', custom_type: 'Tote bag',      display_name: 'Tote bag' },
  'clutch':             { type: 'Túi xách',   category: 'accessories', custom_type: 'Clutch',        display_name: 'Clutch' },
  'bucket bag':         { type: 'Túi xách',   category: 'accessories', custom_type: 'Bucket bag',    display_name: 'Bucket bag' },
  'minibag':            { type: 'Túi xách',   category: 'accessories', custom_type: 'Mini bag',      display_name: 'Mini bag' },
  'mini bag':           { type: 'Túi xách',   category: 'accessories', custom_type: 'Mini bag',      display_name: 'Mini bag' },
  'sling bag':          { type: 'Balo',       category: 'accessories', custom_type: 'Sling bag',     display_name: 'Sling bag' },
  'choker':             { type: 'Dây chuyền', category: 'accessories', custom_type: 'Choker',        display_name: 'Choker' },
  'cuff':               { type: 'Vòng tay',   category: 'accessories', custom_type: 'Cuff bracelet', display_name: 'Cuff bracelet' },
  'scrunchie':          { type: 'Khăn',       category: 'accessories', custom_type: 'Scrunchie',     display_name: 'Scrunchie' },

  'cap':                { type: 'Baseball cap', category: 'headwear', custom_type: 'Cap',          display_name: 'Cap' },
  'trucker hat':        { type: 'Snapback',     category: 'headwear', custom_type: 'Trucker hat', display_name: 'Trucker hat' },
  'dad hat':            { type: 'Baseball cap', category: 'headwear', custom_type: 'Dad hat',     display_name: 'Dad hat' },
  'visor':              { type: 'Mũ lưỡi trai', category: 'headwear',custom_type: 'Visor',        display_name: 'Visor' },
  'mũ tennis':          { type: 'Mũ lưỡi trai', category: 'headwear',custom_type: 'Mũ tennis',   display_name: 'Mũ tennis' },

  'sneaker':       { type: 'Giày', category: 'footwear', sub_type: 'Sneaker',       custom_type: 'Sneaker',       display_name: 'Sneaker' },
  'sneakers':      { type: 'Giày', category: 'footwear', sub_type: 'Sneaker',       custom_type: 'Sneakers',      display_name: 'Sneakers' },
  'giày thể thao': { type: 'Giày', category: 'footwear', sub_type: 'Sneaker',       custom_type: 'Giày thể thao', display_name: 'Giày thể thao' },
  'oxford':        { type: 'Giày', category: 'footwear', sub_type: 'Oxford/Derby',  custom_type: 'Oxford shoes',  display_name: 'Oxford' },
  'derby':         { type: 'Giày', category: 'footwear', sub_type: 'Oxford/Derby',  custom_type: 'Derby shoes',   display_name: 'Derby' },
  'loafer':        { type: 'Giày', category: 'footwear', sub_type: 'Loafer',        custom_type: 'Loafer',        display_name: 'Loafer' },
  'boot':          { type: 'Giày', category: 'footwear', sub_type: 'Boot',          custom_type: 'Boot',          display_name: 'Boot' },
  'boots':         { type: 'Giày', category: 'footwear', sub_type: 'Boot',          custom_type: 'Boots',         display_name: 'Boots' },
  'chelsea boot':  { type: 'Giày', category: 'footwear', sub_type: 'Boot',          custom_type: 'Chelsea boot',  display_name: 'Chelsea boot' },
  'high heel':     { type: 'Giày', category: 'footwear', sub_type: 'Heel/Cao gót',  custom_type: 'High heel',     display_name: 'Cao gót' },
  'cao gót':       { type: 'Giày', category: 'footwear', sub_type: 'Heel/Cao gót',  custom_type: 'Cao gót',       display_name: 'Cao gót' },
  'slip-on':       { type: 'Giày', category: 'footwear', sub_type: 'Slip-on',       custom_type: 'Slip-on',       display_name: 'Slip-on' },
  'mule':          { type: 'Giày', category: 'footwear', sub_type: 'Mule',          custom_type: 'Mule',          display_name: 'Mule' },
  'dép tông':      { type: 'Dép',  category: 'footwear', sub_type: 'Dép tông',      custom_type: 'Dép tông',      display_name: 'Dép tông' },
  'dép crocs':     { type: 'Dép',  category: 'footwear', sub_type: 'Dép crocs',     custom_type: 'Dép crocs',     display_name: 'Dép crocs' },
  'crocs':         { type: 'Dép',  category: 'footwear', sub_type: 'Dép crocs',     custom_type: 'Dép crocs',     display_name: 'Dép crocs' },
  'dép quai hậu':  { type: 'Dép',  category: 'footwear', sub_type: 'Dép quai hậu', custom_type: 'Dép quai hậu',  display_name: 'Dép quai hậu' },
  'dép lê':        { type: 'Dép',  category: 'footwear', sub_type: 'Dép lê',        custom_type: 'Dép lê',        display_name: 'Dép lê' },
  'flip flop':     { type: 'Dép',  category: 'footwear', sub_type: 'Dép tông',      custom_type: 'Flip flop',     display_name: 'Flip flop' },
  'sandal':        { type: 'Dép',  category: 'footwear', sub_type: 'Dép sandal',    custom_type: 'Sandal',        display_name: 'Sandal' },
}

function normalize(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')

    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
}

export function findTypeMatch(input) {
  if (!input || typeof input !== 'string') return { match: null, score: 0 }

  const normalized = normalize(input)

  for (const [key, value] of Object.entries(TYPE_ALIAS_MAP)) {
    if (normalize(key) === normalized) {
      return { match: value, score: 1.0 }
    }
  }

  let bestMatch = null
  let bestScore = 0

  for (const [key, value] of Object.entries(TYPE_ALIAS_MAP)) {
    const normalKey = normalize(key)
    let score = 0

    if (normalized.includes(normalKey)) {

      score = normalKey.length / normalized.length
    } else if (normalKey.includes(normalized)) {

      score = normalized.length / normalKey.length
    } else {

      const inputWords = normalized.split(' ')
      const keyWords = normalKey.split(' ')
      const commonWords = inputWords.filter(w => keyWords.includes(w))
      if (commonWords.length > 0) {
        score = (commonWords.length * 2) / (inputWords.length + keyWords.length)
      }
    }

    if (score > bestScore && score >= 0.4) {
      bestScore = score
      bestMatch = value
    }
  }

  return { match: bestMatch, score: bestScore }
}

export function getSuggestion(input) {
  const { match, score } = findTypeMatch(input)
  if (!match || score < 0.4) return null

  const parts = [match.type]
  if (match.fit) parts.push(`Dáng ${match.fit}`)

  return {
    text: parts.join(' + '),
    mapping: match,
    score,
  }
}

export function applyTypeMapping(input, forceDirect = false) {
  if (!forceDirect) {
    const { match, score } = findTypeMatch(input)
    if (match && score >= 0.4) {
      return {
        ...match,

        custom_type: match.custom_type || input,
        display_name: match.display_name || input,
      }
    }
  }

  return {
    type: null,
    category: null,
    fit: null,
    custom_type: input,
    display_name: input,
  }
}

export const CATEGORY_DEFAULT_TYPES = {
  tops:        'Áo thun',
  pants:       'Quần jeans',
  accessories: 'Túi xách',
  headwear:    'Baseball cap',
  shoes:       'Giày thể thao',
}

export { TYPE_ALIAS_MAP }
