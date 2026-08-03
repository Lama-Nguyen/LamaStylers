import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../../hooks/useAuth.jsx'
import { AdSenseBanner, isAdSenseConfigured } from './AdSenseBanner'
import { callApi } from '../../services/callApi'

const REWARD_COUNT = 2
const AD_DURATION  = 10

const FREE_DAILY_LIMIT    = 5
const PREMIUM_DAILY_LIMIT = 20

export const useGenerationCredits = (actionName) => {
  const { user, isPremium } = useAuth()
  const dailyLimit = isPremium ? PREMIUM_DAILY_LIMIT : FREE_DAILY_LIMIT
  const action     = actionName || 'generateOutfits'

  const [credits, setCredits] = useState(dailyLimit)
  const [synced,  setSynced]  = useState(false)

  const syncFromServer = useCallback(async () => {
    if (!user?.uid) return
    try {
      const result = await callApi('getGenerationCreditsStatus')
      const status = result?.[action]
      if (status) setCredits(status.remaining)
    } catch (e) {
      console.warn(`[credits] sync thất bại (${action}):`, e.message)
    } finally {
      setSynced(true)
    }
  }, [user?.uid, action])

  useEffect(() => { syncFromServer() }, [syncFromServer])

  useEffect(() => {
    setCredits(dailyLimit)
    setSynced(false)
    syncFromServer()
  }, [isPremium])

  // Trả true nếu còn credits và đã trừ, false nếu hết
  const consume = () => {
    let ok = false
    setCredits(n => {
      if (n <= 0) return n
      ok = true
      return n - 1
    })
    return ok
  }

  const refund = () => {
    setCredits(n => n + 1)
  }

  // add(n): cộng n lượt (dùng sau khi huỷ, lỗi, hoặc nhận thưởng quảng cáo)
  const add = (n = 1) => {
    setCredits(c => c + n)
  }

  const syncAfterGenerate = () => {
    setTimeout(syncFromServer, 500)
  }

  return { credits, dailyLimit, isPremium, synced, consume, refund, add, syncAfterGenerate }
}

export const RewardedAd = ({ trigger, onReward, onClose }) => {
  const { user, isPremium }           = useAuth()
  const [visible, setVisible]         = useState(false)
  const [countdown, setCountdown]     = useState(AD_DURATION)
  const [done, setDone]               = useState(false)
  const [claiming, setClaiming]       = useState(false)
  const [adAvailable]                 = useState(isAdSenseConfigured)
  const intervalRef                   = useRef(null)

  useEffect(() => {
    if (!trigger) return

    if (isPremium) {
      onReward?.(REWARD_COUNT)
      return
    }

    setVisible(true)
    setCountdown(AD_DURATION)
    setDone(false)
    setClaiming(false)

    intervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current)
          setDone(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(intervalRef.current)
  }, [trigger])

  const handleCollect = async () => {
    if (claiming) return
    setClaiming(true)
    try {
      const result = await callApi('grantBonusGeneration', {}, { retry: false })
      setVisible(false)
      onReward?.(result.bonusAmount ?? REWARD_COUNT)
    } catch (e) {
      setVisible(false)
      onClose?.()
      if (e.code === 'resource-exhausted') {
        import('../notifications/ToastNotification').then(m =>
          m.showToast?.error(e.message)
        )
      } else {
        console.error('[RewardedAd] grantBonusGeneration lỗi:', e.message)
      }
    }
  }

  const handleSkip = () => {
    clearInterval(intervalRef.current)
    setVisible(false)
    onClose?.()
  }

  if (!visible) return null

  const progress = ((AD_DURATION - countdown) / AD_DURATION) * 100

  return (
    <div style={s.overlay}>
      <div style={s.card}>
        {done && <button onClick={handleSkip} style={s.skipX} aria-label="Đóng">✕</button>}

        <h3 style={s.adTitle}>{adAvailable ? 'Quảng cáo' : 'Chờ để nhận lượt'}</h3>
        <p style={s.adSub}>
          {adAvailable
            ? <>Xem để nhận <strong style={{ color: '#F59E0B' }}>{REWARD_COUNT} lượt tạo outfit</strong> miễn phí</>
            : <>Chờ {AD_DURATION}s để nhận <strong style={{ color: '#F59E0B' }}>{REWARD_COUNT} lượt</strong></>
          }
        </p>

        <div style={s.adSlotWrap}>
          {adAvailable
            ? <AdSenseBanner adSlot={import.meta.env.VITE_ADSENSE_REWARDED_SLOT} style={{ minHeight: 100 }} />
            : (
              <div style={s.adPlaceholder}>
                <p style={{ color: '#6B5E8A', fontSize: 13, margin: 0 }}>
                  Tính năng quảng cáo sắp ra mắt ✨
                </p>
              </div>
            )
          }
        </div>

        <div style={s.countWrap}>
          <svg width="72" height="72" viewBox="0 0 72 72">
            <circle cx="36" cy="36" r="30" fill="none" stroke="#241848" strokeWidth="6"/>
            <circle
              cx="36" cy="36" r="30" fill="none"
              stroke="url(#ring)" strokeWidth="6"
              strokeDasharray={`${2 * Math.PI * 30}`}
              strokeDashoffset={`${2 * Math.PI * 30 * (1 - progress / 100)}`}
              strokeLinecap="round"
              transform="rotate(-90 36 36)"
              style={{ transition: 'stroke-dashoffset 0.8s linear' }}
            />
            <defs>
              <linearGradient id="ring" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#8B5CF6"/>
                <stop offset="100%" stopColor="#F43F5E"/>
              </linearGradient>
            </defs>
          </svg>
          <span style={s.countNum}>{done ? '✓' : countdown}</span>
        </div>

        <div style={s.barBg}>
          <div style={{ ...s.barFill, width: `${progress}%`, transition: 'width 0.8s linear' }} />
        </div>

        <div style={s.rewardBadge}>
          <span style={{ fontSize: 18 }}>⭐</span>
          <span style={{ color: '#F8F5FF', fontSize: 13 }}>
            Phần thưởng: <strong style={{ color: '#F59E0B' }}>+{REWARD_COUNT} lượt tạo outfit</strong>
          </span>
        </div>

        {done ? (
          <button onClick={handleCollect} style={s.collectBtn} disabled={claiming}>
            {claiming ? '⏳ Đang xác nhận...' : '🎁 Nhận thưởng & Tạo outfit ngay!'}
          </button>
        ) : (
          <p style={{ color: '#6B5E8A', fontSize: 12, marginTop: 12 }}>
            Vui lòng chờ {countdown}s để nhận thưởng...
          </p>
        )}
      </div>
    </div>
  )
}

const s = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)',
    zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  card: {
    background: '#1A1230', border: '1px solid rgba(139,92,246,0.3)',
    borderRadius: 20, padding: '28px 24px',
    width: '100%', maxWidth: 360, textAlign: 'center', position: 'relative',
    boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
  },
  skipX: {
    position: 'absolute', top: 12, right: 14,
    background: 'none', border: 'none', color: '#6B5E8A', fontSize: 18, cursor: 'pointer', padding: 4,
  },
  adSlotWrap: { width: '100%', minHeight: 100, marginBottom: 16, borderRadius: 10, overflow: 'hidden', background: 'rgba(255,255,255,0.03)' },
  adPlaceholder: { minHeight: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  adTitle: { fontSize: 20, fontWeight: 700, marginBottom: 6 },
  adSub: { color: '#A598C7', fontSize: 14, marginBottom: 20 },
  countWrap: { position: 'relative', width: 72, height: 72, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  countNum: { position: 'absolute', fontSize: 22, fontWeight: 700, color: '#A78BFA' },
  barBg: { width: '100%', height: 4, background: '#241848', borderRadius: 2, overflow: 'hidden', marginBottom: 18 },
  barFill: { height: '100%', borderRadius: 2, background: 'linear-gradient(90deg, #8B5CF6, #F43F5E)' },
  rewardBadge: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
    borderRadius: 10, padding: '10px 16px', marginBottom: 16,
  },
  collectBtn: {
    width: '100%', background: 'linear-gradient(135deg, #8B5CF6, #F43F5E)',
    border: 'none', borderRadius: 50, padding: '14px 20px',
    color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(139,92,246,0.4)',
    opacity: 1, transition: 'opacity 0.2s',
  },
}
