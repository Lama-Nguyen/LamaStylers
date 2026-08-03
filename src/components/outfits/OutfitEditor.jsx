import { useState, useEffect, useCallback } from 'react'
import { editOutfit, getOutfitVersions } from '../../services/outfitService'
import { showToast } from '../notifications/ToastNotification'

const STYLE_SHIFT_CHIPS = [
  { emoji: '👔', label: 'Formal hơn',  value: 'làm outfit formal/chỉnh chu hơn' },
  { emoji: '👕', label: 'Casual hơn',  value: 'làm outfit thoải mái/đời thường hơn' },
  { emoji: '✨', label: 'Nổi bật hơn', value: 'chọn món nổi bật, táo bạo hơn về màu sắc hoặc form' },
  { emoji: '🩶', label: 'An toàn hơn', value: 'chọn phối màu trung tính, an toàn, dễ mặc hơn' },
]

const s = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(10,8,20,0.75)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200,
  },
  sheet: {
    width: '100%', maxWidth: 520, maxHeight: '88vh', overflowY: 'auto',
    background: '#1A1625', borderRadius: '20px 20px 0 0', padding: '20px 18px 28px',
  },
  handle: { width: 40, height: 4, borderRadius: 2, background: '#3A3350', margin: '0 auto 16px' },
  title: { fontSize: 17, fontWeight: 700, color: '#F8F5FF', margin: '0 0 4px' },
  sub: { fontSize: 13, color: '#8B7FA8', margin: '0 0 18px' },
  itemGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))', gap: 10, marginBottom: 20 },
  itemCard: {
    position: 'relative', borderRadius: 12, overflow: 'hidden', aspectRatio: '1',
    border: '2px solid transparent', cursor: 'pointer', background: '#241E36',
  },
  itemImg: { width: '100%', height: '100%', objectFit: 'cover' },
  lockBadge: {
    position: 'absolute', top: 5, right: 5, width: 24, height: 24, borderRadius: '50%',
    background: 'rgba(10,8,20,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12,
  },
  sectionLabel: { fontSize: 12.5, fontWeight: 600, color: '#A598C7', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: 0.4 },
  chipRow: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: (active) => ({
    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 13px', borderRadius: 20,
    fontSize: 13, cursor: 'pointer', border: `1px solid ${active ? '#8B5CF6' : '#3A3350'}`,
    background: active ? 'rgba(139,92,246,0.18)' : 'transparent', color: active ? '#C9B8F5' : '#B8AED0',
  }),
  input: {
    width: '100%', background: '#241E36', border: '1px solid #3A3350', borderRadius: 10,
    padding: '10px 12px', color: '#F8F5FF', fontSize: 13.5, marginBottom: 20, boxSizing: 'border-box',
  },
  applyBtn: {
    width: '100%', padding: '13px', borderRadius: 12, border: 'none', fontSize: 15, fontWeight: 700,
    background: 'linear-gradient(135deg,#8B5CF6,#6D28D9)', color: '#fff', cursor: 'pointer',
  },
  applyBtnDisabled: { opacity: 0.5, cursor: 'not-allowed' },
  closeBtn: { position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: '#8B7FA8', fontSize: 20, cursor: 'pointer' },
  versionStrip: { display: 'flex', gap: 8, overflowX: 'auto', marginTop: 22, paddingTop: 16, borderTop: '1px dashed #3A3350' },
  versionChip: (active) => ({
    flex: '0 0 auto', padding: '7px 12px', borderRadius: 10, fontSize: 12, cursor: 'pointer',
    border: `1px solid ${active ? '#8B5CF6' : '#3A3350'}`, color: active ? '#C9B8F5' : '#8B7FA8',
    background: active ? 'rgba(139,92,246,0.12)' : 'transparent',
  }),
  errorBox: { background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: '#F87171', marginBottom: 16 },
}

export default function OutfitEditor({ outfit, allItems, onClose, onSaved }) {
  const [lockedIds, setLockedIds]   = useState(() => new Set())
  const [styleShift, setStyleShift] = useState('')
  const [activeChip, setActiveChip] = useState(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [versions, setVersions]     = useState([])
  const [loadingVersions, setLoadingVersions] = useState(false)

  const outfitItems = (outfit.items || [])
    .map(id => allItems.find(i => i.id === id))
    .filter(Boolean)

  const loadVersions = useCallback(async () => {
    const rootId = outfit.rootOutfitId || outfit.id
    setLoadingVersions(true)
    try {
      const list = await getOutfitVersions(rootId)
      setVersions(list)
    } catch (e) {
      console.error('getOutfitVersions lỗi:', e)
    } finally {
      setLoadingVersions(false)
    }
  }, [outfit.rootOutfitId, outfit.id])

  useEffect(() => { loadVersions() }, [loadVersions])

  const toggleLock = (itemId) => {
    setLockedIds(prev => {
      const next = new Set(prev)
      next.has(itemId) ? next.delete(itemId) : next.add(itemId)
      return next
    })
  }

  const pickChip = (chip) => {
    if (activeChip === chip.value) {
      setActiveChip(null); setStyleShift('')
    } else {
      setActiveChip(chip.value); setStyleShift(chip.value)
    }
  }

  const handleApply = async () => {
    setLoading(true); setError('')
    try {
      const result = await editOutfit(outfit.id, [...lockedIds], styleShift || null)
      showToast.success('Đã tạo phiên bản mới cho outfit ✨')
      onSaved?.(result)
      await loadVersions()
    } catch (e) {
      setError(e.message || 'Không thể chỉnh sửa outfit lúc này.')
    } finally {
      setLoading(false)
    }
  }

  const allLocked = lockedIds.size === outfitItems.length
  const applyDisabled = loading || (allLocked && !styleShift)

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.sheet} onClick={(e) => e.stopPropagation()}>
        <div style={s.handle} />
        <button style={s.closeBtn} onClick={onClose} aria-label="Đóng">✕</button>
        <h3 style={s.title}>Chỉnh sửa outfit</h3>
        <p style={s.sub}>Khoá món muốn giữ, AI sẽ chỉ thay phần còn lại — lưu thành phiên bản mới, không mất bản gốc.</p>

        <p style={s.sectionLabel}>Chạm để khoá / mở khoá</p>
        <div style={s.itemGrid}>
          {outfitItems.map(item => {
            const locked = lockedIds.has(item.id)
            return (
              <div
                key={item.id}
                style={{ ...s.itemCard, borderColor: locked ? '#8B5CF6' : 'transparent' }}
                onClick={() => toggleLock(item.id)}
              >
                {item.imageUrl && <img src={item.imageUrl} alt={item.type} style={s.itemImg} />}
                <div style={s.lockBadge}>{locked ? '🔒' : '🔓'}</div>
              </div>
            )
          })}
        </div>

        <p style={s.sectionLabel}>Điều chỉnh (tuỳ chọn)</p>
        <div style={s.chipRow}>
          {STYLE_SHIFT_CHIPS.map(chip => (
            <div key={chip.label} style={s.chip(activeChip === chip.value)} onClick={() => pickChip(chip)}>
              <span>{chip.emoji}</span><span>{chip.label}</span>
            </div>
          ))}
        </div>
        <input
          style={s.input}
          placeholder="Hoặc tự mô tả điều chỉnh muốn AI làm..."
          value={activeChip ? '' : styleShift}
          onChange={(e) => { setStyleShift(e.target.value); setActiveChip(null) }}
        />

        {error && <div style={s.errorBox}>{error}</div>}

        <button
          style={{ ...s.applyBtn, ...(applyDisabled ? s.applyBtnDisabled : {}) }}
          onClick={handleApply}
          disabled={applyDisabled}
        >
          {loading ? 'AI đang chỉnh sửa...' : 'Áp dụng, tạo phiên bản mới'}
        </button>

        {(versions.length > 1 || loadingVersions) && (
          <div style={s.versionStrip}>
            {loadingVersions && <span style={{ fontSize: 12, color: '#8B7FA8' }}>Đang tải phiên bản...</span>}
            {versions.map(v => (
              <div key={v.id} style={s.versionChip(v.id === outfit.id)}>
                V{v.versionNumber || 1}{v.id === outfit.id ? ' (đang xem)' : ''}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
