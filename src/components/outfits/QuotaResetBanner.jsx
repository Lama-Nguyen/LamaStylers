import { useState, useEffect } from 'react'

function getVNMidnight() {
  // Dùng Intl để lấy ngày hiện tại theo giờ VN (tránh lỗi DST/boundary khi dùng offset thủ công)
  const now = new Date()
  const vnDateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now)

  // Tạo nửa đêm VN ngày hôm nay rồi cộng 1 ngày
  const midnightVN = new Date(`${vnDateStr}T00:00:00+07:00`)
  midnightVN.setDate(midnightVN.getDate() + 1)
  return midnightVN.getTime()
}

function formatCountdown(msLeft) {
  if (msLeft <= 0) return '00:00:00'
  const totalSecs = Math.floor(msLeft / 1000)
  const h = Math.floor(totalSecs / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = totalSecs % 60
  return [h, m, s].map(n => String(n).padStart(2, '0')).join(':')
}

function useCountdown() {
  const [msLeft, setMsLeft] = useState(() => getVNMidnight() - Date.now())

  useEffect(() => {
    const tick = () => {
      const remaining = getVNMidnight() - Date.now()
      setMsLeft(remaining < 0 ? 0 : remaining)
    }
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])

  return msLeft
}

export default function QuotaResetBanner({ onWatchAd, onUpgrade }) {
  const msLeft = useCountdown()

  return (
    <div style={s.wrap} role="status" aria-label="Thông báo hết lượt">

      {}
      <div style={s.header}>
        <span style={s.icon} aria-hidden="true">⏰</span>
        <div>
          <p style={s.title}>Hết lượt tạo outfit hôm nay</p>
          <p style={s.sub}>Lượt mới sẽ được làm mới lúc nửa đêm (giờ VN)</p>
        </div>
      </div>

      {}
      <div style={s.countdownBox} aria-live="polite">
        <span style={s.countdownLabel}>Reset sau</span>
        <span style={s.countdownValue}>{formatCountdown(msLeft)}</span>
      </div>

      {}
      <div style={s.actions}>
        <button onClick={onWatchAd} style={s.adBtn} aria-label="Xem quảng cáo để nhận thêm 2 lượt">
          🎬 Xem quảng cáo +2 lượt
        </button>
        <button onClick={onUpgrade} style={s.premiumBtn} aria-label="Nâng cấp Premium để nhận thêm lượt mỗi ngày">
          ⭐ Nâng cấp Premium
        </button>
      </div>

      <p style={s.hint}>Premium: 10 lượt/ngày + không quảng cáo</p>
    </div>
  )
}

const s = {
  wrap: {
    margin: '0 16px 16px',
    padding: '16px',
    background: 'rgba(244,63,94,0.07)',
    border: '1px solid rgba(244,63,94,0.2)',
    borderRadius: 14,
  },
  header: {
    display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12,
  },
  icon: { fontSize: 24, flexShrink: 0, lineHeight: 1 },
  title: { fontWeight: 700, fontSize: 14, color: '#F43F5E', margin: 0 },
  sub:   { fontSize: 12, color: '#A598C7', margin: '3px 0 0' },

  countdownBox: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: 'rgba(255,255,255,0.04)', borderRadius: 10,
    padding: '10px 14px', marginBottom: 12,
  },
  countdownLabel: { fontSize: 12, color: '#A598C7' },
  countdownValue: {
    fontSize: 20, fontWeight: 800, color: '#F43F5E',
    fontVariantNumeric: 'tabular-nums', letterSpacing: 2,
  },

  actions: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 },
  adBtn: {
    padding: '11px 16px', borderRadius: 50, cursor: 'pointer',
    fontSize: 13, fontWeight: 700,
    background: 'rgba(245,158,11,0.15)', color: '#F59E0B',
    border: '1px solid rgba(245,158,11,0.3)',
  },
  premiumBtn: {
    padding: '11px 16px', borderRadius: 50, border: 'none', cursor: 'pointer',
    fontSize: 13, fontWeight: 700,
    background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
    color: '#fff', boxShadow: '0 4px 14px rgba(124,58,237,0.4)',
  },
  hint: { fontSize: 11, color: '#6B5E8A', textAlign: 'center', margin: 0 },
}
