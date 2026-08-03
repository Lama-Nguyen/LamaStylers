import { useState, useEffect } from 'react'
import { submitOutfitFeedback, getOutfitFeedback, markOutfitWorn } from '../../services/outfitService'
import { showToast } from '../notifications/ToastNotification'

const s = {
  row: { display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' },
  btn: (active, color) => ({
    display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 10,
    border: `1px solid ${active ? color : '#3A3350'}`, background: active ? `${color}22` : 'transparent',
    color: active ? color : '#8B7FA8', fontSize: 13, cursor: 'pointer',
  }),
  wornBtn: {
    marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px',
    borderRadius: 10, border: '1px solid #3A3350', background: 'transparent', color: '#8B7FA8',
    fontSize: 12.5, cursor: 'pointer',
  },
}

export default function OutfitFeedbackBar({ uid, outfit }) {
  const [vote, setVote]         = useState(null) // true | false | null
  const [worn, setWorn]         = useState(outfit.wornCount || 0)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    getOutfitFeedback(uid, outfit.id).then(fb => {
      if (!cancelled && fb) setVote(fb.liked)
    })
    return () => { cancelled = true }
  }, [uid, outfit.id])

  const handleVote = async (liked) => {
    if (submitting) return
    const previous = vote
    setVote(liked) // optimistic
    setSubmitting(true)
    try {
      await submitOutfitFeedback(outfit.id, liked)
    } catch (e) {
      setVote(previous)
      showToast.error(e.message || 'Không gửi được đánh giá')
    } finally {
      setSubmitting(false)
    }
  }

  const handleWorn = async () => {
    setWorn(w => w + 1) // optimistic
    try {
      await markOutfitWorn(outfit.id)
      showToast.success('Đã ghi nhận — hôm nay mặc bộ này 🎉')
    } catch (e) {
      setWorn(w => Math.max(0, w - 1))
      console.error('markOutfitWorn lỗi:', e)
    }
  }

  return (
    <div style={s.row}>
      <div style={s.btn(vote === true, '#22C55E')} onClick={() => handleVote(true)}>👍 Thích</div>
      <div style={s.btn(vote === false, '#F43F5E')} onClick={() => handleVote(false)}>👎 Không hợp</div>
      <div style={s.wornBtn} onClick={handleWorn}>
        👕 Đã mặc{worn > 0 ? ` (${worn})` : ''}
      </div>
    </div>
  )
}
