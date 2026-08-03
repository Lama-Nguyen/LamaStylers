'use strict'

// Ngưỡng để 1 giá trị được coi là đủ tín hiệu — tránh kết luận vội từ 1-2 vote.
const MIN_VOTES_FOR_SIGNAL  = 3
const MIN_TOTAL_FOR_SUMMARY = 5
const MAX_LIKED_SHOWN       = 3
const MAX_DISLIKED_SHOWN    = 2

/**
 * Từ counters {liked, disliked} của từng giá trị trong 1 nhóm (màu/style/fit/pattern),
 * chọn ra top "thích" và top "không thích" — chỉ giữ giá trị có đủ vote (MIN_VOTES_FOR_SIGNAL)
 * và có xu hướng RÕ (liked/disliked lệch hẳn, không phải 50-50).
 */
function topSignals(bucket = {}) {
  const scored = Object.entries(bucket).map(([key, v]) => {
    const total = (v.liked || 0) + (v.disliked || 0)
    const net   = (v.liked || 0) - (v.disliked || 0)
    return { key, total, net }
  }).filter(x => x.total >= MIN_VOTES_FOR_SIGNAL)

  const liked    = scored.filter(x => x.net > 0).sort((a, b) => b.net - a.net).slice(0, MAX_LIKED_SHOWN).map(x => x.key)
  const disliked = scored.filter(x => x.net < 0).sort((a, b) => a.net - b.net).slice(0, MAX_DISLIKED_SHOWN).map(x => x.key)
  return { liked, disliked }
}

/**
 * Trả về 1 câu ngắn tiếng Việt để chèn vào prompt AI, hoặc null nếu chưa đủ dữ liệu
 * (dưới MIN_TOTAL_FOR_SUMMARY lượt feedback thì bỏ qua — tránh AI "học" từ 1-2 outfit đầu).
 */
function buildPreferenceSummary(stylePreferences) {
  if (!stylePreferences || (stylePreferences.totalFeedback || 0) < MIN_TOTAL_FOR_SUMMARY) return null

  const colors   = topSignals(stylePreferences.colors)
  const styles   = topSignals(stylePreferences.styles)
  const fits     = topSignals(stylePreferences.fits)
  const patterns = topSignals(stylePreferences.patterns)

  const likedParts = [
    colors.liked.length   && `màu ${colors.liked.join('/')}`,
    styles.liked.length   && `phong cách ${styles.liked.join('/')}`,
    fits.liked.length     && `form ${fits.liked.join('/')}`,
    patterns.liked.length && `hoạ tiết ${patterns.liked.join('/')}`,
  ].filter(Boolean)

  const dislikedParts = [
    colors.disliked.length   && `màu ${colors.disliked.join('/')}`,
    styles.disliked.length   && `phong cách ${styles.disliked.join('/')}`,
    fits.disliked.length     && `form ${fits.disliked.join('/')}`,
    patterns.disliked.length && `hoạ tiết ${patterns.disliked.join('/')}`,
  ].filter(Boolean)

  if (!likedParts.length && !dislikedParts.length) return null

  let summary = 'Dựa trên lịch sử đánh giá outfit của user: '
  if (likedParts.length)    summary += `thường THÍCH ${likedParts.join(', ')}. `
  if (dislikedParts.length) summary += `thường KHÔNG THÍCH ${dislikedParts.join(', ')}. `
  summary += '(Ưu tiên nhẹ theo xu hướng này, không bắt buộc tuyệt đối — vẫn cần hợp dịp/thời tiết yêu cầu.)'
  return summary
}

module.exports = { buildPreferenceSummary }
