import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'
import { useNavigate } from 'react-router-dom'
import { getClothingItems } from '../services/wardrobeService'
import { getOutfits } from '../services/outfitService'

export default function HomePage() {
  const { user, profile, isPremium } = useAuth()
  const navigate = useNavigate()

  const displayName = profile?.name || user?.displayName || 'bạn'

  const [recentOutfit, setRecentOutfit] = useState(null)
  const [itemCount, setItemCount]       = useState(null)

  useEffect(() => {
    if (!user?.uid) return
    let active = true

    Promise.all([getClothingItems(user.uid), getOutfits(user.uid)])
      .then(([items, outfits]) => {
        if (!active) return
        setItemCount(items.length)
        setRecentOutfit(outfits[0] || null)
      })
      .catch((e) => {

        console.error('Lỗi tải dữ liệu HomePage:', e)
      })

    return () => { active = false }
  }, [user?.uid])

  const cards = [
    { icon: '👗', label: 'Tủ đồ', desc: 'Quản lý quần áo', path: '/wardrobe', color: '#8B5CF6' },
    { icon: '✨', label: 'Phối đồ AI', desc: 'Gợi ý outfit', path: '/outfits', color: '#EC4899' },
    { icon: '❤️', label: 'Yêu thích', desc: 'Outfit đã lưu', path: '/favorites', color: '#F43F5E' },
    { icon: '📊', label: 'Phân tích', desc: 'Style của bạn', path: '/style-analysis', color: '#06B6D4' },
  ]

  return (
    <div style={{ padding: '24px 16px 100px', minHeight: '100vh', background: '#0F0A1E' }}>
      {}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: '#A78BFA', marginBottom: 4 }}>Xin chào,</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#F3E8FF', margin: 0 }}>
          {displayName} {isPremium && <span style={{ fontSize: 14, background: 'linear-gradient(90deg,#F59E0B,#EF4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>✦ Premium</span>}
        </h1>
        <p style={{ fontSize: 14, color: '#6B7280', marginTop: 6 }}>
          Hôm nay bạn muốn mặc gì?
        </p>
      </div>

      {}
      {itemCount === 0 && (
        <div
          onClick={() => navigate('/wardrobe')}
          style={{
            background: 'linear-gradient(135deg, #8B5CF622, #EC489911)',
            border: '1px dashed rgba(139,92,246,0.5)',
            borderRadius: 16, padding: '20px', marginBottom: 20,
            textAlign: 'center', cursor: 'pointer',
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}>📸</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#F3E8FF', marginBottom: 4 }}>
            Tủ đồ đang trống
          </div>
          <div style={{ fontSize: 13, color: '#A78BFA' }}>
            Chụp món đồ đầu tiên để bắt đầu →
          </div>
        </div>
      )}

      {}
      {recentOutfit && (
        <div
          onClick={() => navigate('/outfits')}
          style={{
            background: '#1A1230', border: '1px solid rgba(139,92,246,0.25)',
            borderRadius: 16, padding: 16, marginBottom: 20, cursor: 'pointer',
          }}
        >
          <div style={{ fontSize: 12, color: '#A78BFA', marginBottom: 10, fontWeight: 600 }}>
            ✨ Outfit gần đây của bạn
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {}
            <div style={{ display: 'flex', gap: -8 }}>
              {(recentOutfit.itemImages || []).slice(0, 4).map((url, i) => (
                <img key={i} src={url} alt=""
                  style={{
                    width: 44, height: 44, borderRadius: 10, objectFit: 'cover',
                    border: '2px solid #1A1230', marginLeft: i > 0 ? -14 : 0,
                  }} />
              ))}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#F3E8FF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {recentOutfit.routeName || 'Outfit của bạn'}
              </div>
              {typeof recentOutfit.matchPercentage === 'number' && (
                <div style={{ fontSize: 12, color: '#10B981', marginTop: 2 }}>
                  {recentOutfit.matchPercentage}% phù hợp
                </div>
              )}
            </div>
            <span style={{ color: '#A78BFA', fontSize: 18 }}>›</span>
          </div>
        </div>
      )}

      {}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
        {cards.map(c => (
          <button
            key={c.path}
            onClick={() => navigate(c.path)}
            style={{
              background: `linear-gradient(135deg, ${c.color}22, ${c.color}11)`,
              border: `1px solid ${c.color}44`,
              borderRadius: 16, padding: '20px 16px',
              cursor: 'pointer', textAlign: 'left',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.boxShadow = `0 4px 20px ${c.color}33` }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
          >
            <div style={{ fontSize: 28, marginBottom: 8 }}>{c.icon}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#F3E8FF' }}>{c.label}</div>
            <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
              {}
              {c.path === '/wardrobe' && itemCount !== null
                ? `${itemCount} món đồ`
                : c.desc}
            </div>
          </button>
        ))}
      </div>

      {}
      {!isPremium && (
        <div
          onClick={() => navigate('/settings')}
          style={{
            background: 'linear-gradient(135deg, #7C3AED22, #EC489922)',
            border: '1px solid rgba(139,92,246,0.4)',
            borderRadius: 16, padding: '16px 20px',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
          }}
        >
          <span style={{ fontSize: 28 }}>✦</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#E9D5FF' }}>Nâng lên Premium</div>
            <div style={{ fontSize: 12, color: '#9CA3AF' }}>Mở khóa AI nâng cao & không giới hạn</div>
          </div>
          <span style={{ marginLeft: 'auto', color: '#A78BFA', fontSize: 18 }}>›</span>
        </div>
      )}
    </div>
  )
}
