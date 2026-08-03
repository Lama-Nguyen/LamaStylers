import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'
import { getFavoriteOutfits, toggleFavorite } from '../services/outfitService'
import { showToast } from '../components/notifications/ToastNotification'
import { OutfitSkeletonList } from '../components/SkeletonCard'

export default function FavoritesPage() {
  const { user } = useAuth()
  const [outfits, setOutfits] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const load = () => {
    if (!user) return
    setLoading(true)
    setLoadError('')
    getFavoriteOutfits(user.uid)
      .then(data => setOutfits(data))
      .catch(e => {
        console.error('Lỗi tải danh sách yêu thích:', e)

        setLoadError('Không thể tải danh sách yêu thích. Vui lòng thử lại.')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [user])

  const handleUnfav = async (outfit) => {

    setOutfits(prev => prev.filter(o => o.id !== outfit.id))
    try {
      await toggleFavorite(outfit.id, true)
    } catch (e) {
      console.error('Bỏ yêu thích thất bại:', e)

      setOutfits(prev => {
        const idx = prev.findIndex(o => o.id > outfit.id)
        const next = [...prev]
        if (idx === -1) next.push(outfit)
        else next.splice(idx, 0, outfit)
        return next
      })
      showToast.error('Không thể bỏ yêu thích. Thử lại.')
    }
  }

  const getMatchColor = (pct) => pct >= 80 ? '#10B981' : pct >= 60 ? '#F59E0B' : '#F43F5E'

  const getMatchPct = (outfit) => {
    const pct = Number(outfit.matchPercentage)
    if (pct >= 0 && pct <= 100) return pct
    if (outfit.scores) {
      const vals = Object.values(outfit.scores).map(Number).filter(n => !isNaN(n))
      if (vals.length) return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
    }
    return 0
  }

  return (
    <div style={{ paddingBottom: 80 }}>
      <div className="page-header">
        <h2>Yêu thích</h2>
        <span style={{ color: '#A598C7', fontSize: 14 }}>{outfits.length} outfit</span>
      </div>

      {}
      {loading ? (
        <div style={{ padding: '0 0 16px' }}><OutfitSkeletonList count={3} /></div>
      ) : loadError ? (

        <div style={{ textAlign: 'center', padding: '60px 24px' }}>
          <p style={{ fontSize: 36, marginBottom: 12 }}>😕</p>
          <p style={{ color: '#F43F5E', marginBottom: 12 }}>{loadError}</p>
          <button className="btn-primary" onClick={load} style={{ maxWidth: 200, margin: '0 auto' }}>
            Thử lại
          </button>
        </div>
      ) : outfits.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px' }}>
          <p style={{ fontSize: 48, marginBottom: 12 }}>🤍</p>
          <p style={{ color: '#A598C7' }}>Chưa có outfit yêu thích</p>
          <p style={{ color: '#6B5E8A', fontSize: 13, marginTop: 6 }}>Nhấn ❤️ trên outfit bạn thích</p>
        </div>
      ) : (
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {outfits.map(outfit => (
            <div key={outfit.id} className="card" style={{ padding: 14 }}>
              {}
              <div style={{
                display: 'flex', gap: 8, marginBottom: 12,
                overflowX: 'auto',
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none',
              }}>
                {(outfit.itemImages || []).slice(0, 4).map((img, i) => (
                  <img
                    key={i} src={img} alt={`Món đồ ${i + 1}`}
                    style={{ width: 70, height: 70, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
                    onError={e => { e.currentTarget.style.display = 'none' }}
                  />
                ))}
                {(!outfit.itemImages || outfit.itemImages.length === 0) && (
                  <div style={{
                    width: 70, height: 70, borderRadius: 8, flexShrink: 0,
                    background: '#241848', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
                  }}>👗</div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontWeight: 700, fontSize: 15,
                    fontFamily: 'Playfair Display, serif',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    marginBottom: 3,
                  }}>
                    {outfit.routeName}
                  </p>
                  <p style={{ color: '#A598C7', fontSize: 12, marginTop: 0, lineHeight: 1.4 }}>{outfit.description}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, paddingLeft: 8 }}>
                  <span style={{ color: getMatchColor(getMatchPct(outfit)), fontWeight: 700, fontSize: 18 }}>
                    {getMatchPct(outfit)}%
                  </span>
                  <button
                    onClick={() => handleUnfav(outfit)}
                    aria-label="Bỏ yêu thích"
                    style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', lineHeight: 1, padding: 0 }}
                  >
                    ❤️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
