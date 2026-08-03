import { useState, useEffect, useRef } from 'react'
import { useNavigate }                  from 'react-router-dom'
import { useAuth }                      from '../hooks/useAuth.jsx'

const LOW_CREDIT_WARNED_KEY = 'lama_low_credit_warned'

export default function CreditBadge() {
  const { profile, isPremium } = useAuth()
  const navigate               = useNavigate()
  const credits = profile?.credits ?? 0

  const prevCreditsRef  = useRef(credits)
  const [delta, setDelta]     = useState(null)
  const [shake, setShake]     = useState(false)
  const [pulse, setPulse]     = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)

  useEffect(() => {
    const prev = prevCreditsRef.current
    if (prev === credits) return
    prevCreditsRef.current = credits

    const diff = credits - prev
    if (diff !== 0) {
      setDelta(diff > 0 ? `+${diff}` : `${diff}`)
      setPulse(true)
      const t = setTimeout(() => { setDelta(null); setPulse(false) }, 1800)
      return () => clearTimeout(t)
    }
  }, [credits])

  useEffect(() => {
    if (isPremium) return
    if (credits < 3 && credits >= 0) {
      setShake(true)
      const t = setTimeout(() => setShake(false), 600)

      if (!sessionStorage.getItem(LOW_CREDIT_WARNED_KEY)) {
        sessionStorage.setItem(LOW_CREDIT_WARNED_KEY, '1')

        setTimeout(() => {

          window.dispatchEvent(new CustomEvent('lama:lowCredit', { detail: { credits } }))
        }, 1000)
      }

      return () => clearTimeout(t)
    }
  }, [credits, isPremium])

  if (isPremium) {
    return (
      <div style={badgeContainerStyle}>
        <div style={{ ...badgeStyle, background: 'linear-gradient(135deg, #7C3AED, #6D28D9)', color: '#fff', cursor: 'default' }}>
          ✦ Premium
        </div>
      </div>
    )
  }

  const isLow   = credits < 3
  const isMid   = credits >= 3 && credits < 10
  const color   = isLow ? '#EF4444' : isMid ? '#F59E0B' : '#10B981'
  const bg      = isLow ? 'rgba(239,68,68,0.12)' : isMid ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)'

  return (
    <div style={badgeContainerStyle}>
      {}
      {showTooltip && (
        <div style={{
          position: 'absolute', right: 0, top: '110%', marginTop: 4,
          background: '#1E1535', border: '1px solid rgba(139,92,246,0.3)',
          borderRadius: 10, padding: 12, minWidth: 200, zIndex: 100,
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          pointerEvents: 'auto',
        }}>
          <p style={{ color: '#A78BFA', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>⚡ Kiếm thêm credit:</p>
          <ul style={{ color: '#A598C7', fontSize: 11, paddingLeft: 14, margin: 0, lineHeight: 1.9 }}>
            <li>Đăng nhập mỗi ngày: +2</li>
            <li>Upload quần áo đầu tiên: +3</li>
            <li>Xem quảng cáo: +5</li>
          </ul>
          <button
            onClick={() => { setShowTooltip(false); navigate('/settings') }}
            style={{
              marginTop: 8, width: '100%', padding: '6px 0',
              background: 'linear-gradient(135deg,#8B5CF6,#6D28D9)',
              border: 'none', borderRadius: 6, color: '#fff',
              fontSize: 11, fontWeight: 600, cursor: 'pointer',
            }}
          >
            👑 Nâng cấp Premium
          </button>
          <button
            onClick={() => setShowTooltip(false)}
            style={{ position: 'absolute', top: 6, right: 8, background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', fontSize: 14 }}
          >×</button>
        </div>
      )}

      <div
        onClick={() => setShowTooltip(v => !v)}
        style={{
          ...badgeStyle,
          background: bg,
          border: `1px solid ${color}40`,
          color,
          animation: shake ? 'creditShake 0.5s ease' : pulse ? 'creditPulse 0.3s ease' : undefined,
          cursor: 'pointer',
          pointerEvents: 'auto',
        }}
        title={isLow ? 'Sắp hết credit — bấm để xem cách kiếm thêm' : 'Credit còn lại'}
      >
        <span style={{ fontSize: 12 }}>⚡</span>
        <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, fontSize: 13 }}>
          {credits}
        </span>
        {isLow && (
          <span style={{ fontSize: 10, fontWeight: 600, color: '#EF4444', marginLeft: 2 }}>
            sắp hết
          </span>
        )}

        {}
        {delta && (
          <span style={{
            position: 'absolute', top: -18, right: 0,
            fontSize: 12, fontWeight: 700,
            color: delta.startsWith('+') ? '#10B981' : '#EF4444',
            animation: 'creditDelta 1.6s ease forwards',
            whiteSpace: 'nowrap', pointerEvents: 'none',
          }}>
            {delta}
          </span>
        )}
      </div>

      <style>{`
        @keyframes creditShake {
          0%,100% { transform: translateX(0); }
          20%      { transform: translateX(-4px); }
          40%      { transform: translateX(4px); }
          60%      { transform: translateX(-3px); }
          80%      { transform: translateX(3px); }
        }
        @keyframes creditPulse {
          0%   { transform: scale(1); }
          50%  { transform: scale(1.18); }
          100% { transform: scale(1); }
        }
        @keyframes creditDelta {
          0%   { opacity: 1; transform: translateY(0); }
          70%  { opacity: 1; transform: translateY(-14px); }
          100% { opacity: 0; transform: translateY(-20px); }
        }
      `}</style>
    </div>
  )
}

const badgeContainerStyle = {
  position: 'fixed', top: 12, right: 14, zIndex: 50,
}
const badgeStyle = {
  position: 'relative', display: 'inline-flex', alignItems: 'center',
  gap: 5, borderRadius: 20, padding: '5px 10px',
  backdropFilter: 'blur(8px)', boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
  transition: 'color 0.4s, background 0.4s', userSelect: 'none',
}
