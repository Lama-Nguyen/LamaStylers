import { useState } from 'react'

const DONE_KEY_PREFIX = 'onboarding_done_v1'

function doneKey(uid) {
  return uid ? `${DONE_KEY_PREFIX}_${uid}` : DONE_KEY_PREFIX
}

const STEPS = [
  {
    icon: '👗',
    title: 'Tủ đồ thông minh',
    desc: 'Chụp ảnh hoặc upload quần áo của bạn. AI tự động nhận diện loại, màu sắc, chất liệu.',
    color: '#8B5CF6',
  },
  {
    icon: '✨',
    title: 'AI phối đồ cho bạn',
    desc: 'Hệ thống gợi ý outfit dựa trên đúng những món đồ bạn đang có — không bịa ra đồ không tồn tại.',
    color: '#EC4899',
  },
  {
    icon: '✦',
    title: 'Hỏi Hạ Vy',
    desc: 'Trợ lý thời trang AI Hạ Vy sẵn sàng tư vấn phối đồ, xu hướng, và gợi ý mua thêm khi cần.',
    color: '#A78BFA',
  },
  {
    icon: '📊',
    title: 'Hiểu phong cách của bạn',
    desc: 'Phân tích xu hướng tủ đồ, màu sắc chủ đạo, và các combo được yêu thích nhất.',
    color: '#06B6D4',
  },
]

export function isOnboardingDone(uid) {
  // Ưu tiên key theo uid; fallback key cũ (cùng browser) để không hiện lại onboarding
  if (uid && localStorage.getItem(doneKey(uid))) return true
  if (localStorage.getItem(DONE_KEY_PREFIX)) return true
  return false
}

export default function Onboarding({ onDone, userId }) {
  const [step, setStep] = useState(0)

  const current = STEPS[step]
  const isLast  = step === STEPS.length - 1

  const markDone = () => {
    localStorage.setItem(doneKey(userId), '1')
    // Giữ key cũ để tương thích phiên bản trước
    localStorage.setItem(DONE_KEY_PREFIX, '1')
  }

  const next = () => {
    if (isLast) {
      markDone()
      onDone()
    } else {
      setStep(s => s + 1)
    }
  }

  const skip = () => {
    markDone()
    onDone()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: '#0F0A1E',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '32px 24px',
      userSelect: 'none',
    }}>

      {}
      {!isLast && (
        <button onClick={skip} style={{
          position: 'absolute', top: 20, right: 20,
          background: 'none', border: 'none',
          color: '#6B5E8A', fontSize: 14, cursor: 'pointer',
        }}>
          Bỏ qua
        </button>
      )}

      {}
      <div style={{ display: 'flex', gap: 8, marginBottom: 48 }}>
        {STEPS.map((_, i) => (
          <div key={i} style={{
            width: i === step ? 24 : 8,
            height: 8, borderRadius: 4,
            background: i === step ? current.color : 'rgba(255,255,255,0.15)',
            transition: 'all 0.3s ease',
          }} />
        ))}
      </div>

      {}
      <div style={{
        width: 120, height: 120, borderRadius: 32,
        background: `${current.color}22`,
        border: `2px solid ${current.color}44`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 56, marginBottom: 36,
        animation: 'obPop 0.35s ease',
        boxShadow: `0 0 40px ${current.color}33`,
      }}>
        {current.icon}
      </div>

      {}
      <h2 style={{
        fontSize: 24, fontWeight: 800, color: '#F3E8FF',
        textAlign: 'center', marginBottom: 14, lineHeight: 1.3,
        animation: 'obFade 0.35s ease',
      }}>
        {current.title}
      </h2>
      <p style={{
        fontSize: 15, color: '#9CA3AF',
        textAlign: 'center', lineHeight: 1.7,
        maxWidth: 320, marginBottom: 56,
        animation: 'obFade 0.35s ease',
      }}>
        {current.desc}
      </p>

      {}
      <button
        onClick={next}
        style={{
          width: '100%', maxWidth: 320,
          padding: '16px',
          background: `linear-gradient(135deg, ${current.color}, ${current.color}cc)`,
          border: 'none', borderRadius: 16,
          color: '#fff', fontWeight: 700, fontSize: 16,
          cursor: 'pointer',
          boxShadow: `0 8px 30px ${current.color}44`,
          transition: 'transform 0.15s, box-shadow 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = '' }}
      >
        {isLast ? '🚀 Bắt đầu thôi!' : 'Tiếp theo →'}
      </button>

      <style>{`
        @keyframes obPop {
          0%   { transform: scale(0.8); opacity: 0; }
          70%  { transform: scale(1.05); }
          100% { transform: scale(1);   opacity: 1; }
        }
        @keyframes obFade {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
