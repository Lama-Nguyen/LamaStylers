import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { generateOutfits, getOutfits, toggleFavorite } from '../services/outfitService'
import { getClothingItems } from '../services/wardrobeService'
import OutfitEditor from '../components/outfits/OutfitEditor'
import OutfitFeedbackBar from '../components/outfits/OutfitFeedbackBar'
import { outfitsCache } from '../services/offlineCache'
import { RewardedAd, useGenerationCredits } from '../components/ads/AdManager'
import { showToast } from '../components/notifications/ToastNotification'
import { OutfitSkeletonList } from '../components/SkeletonCard'
import { notifyOutfitCreated, notifyRewardReceived, notifyOutOfGenerations } from '../services/notificationTemplates'
import { toVietnameseErrorMessage } from '../services/errorMessages'
import { trackGenerateOutfit } from '../services/analyticsService'
import { useOnlineStatus } from '../hooks/useOnlineStatus.jsx'
import JobStatusPanel from '../components/outfits/JobStatusPanel'
import QuotaResetBanner from '../components/outfits/QuotaResetBanner'

const OCCASION_CHIPS = [
  { emoji: '💼', label: 'Đi làm',    value: 'đi làm, phong cách công sở lịch sự' },
  { emoji: '☕', label: 'Đi chơi',   value: 'đi chơi cuối tuần, thoải mái năng động' },
  { emoji: '🎉', label: 'Dự tiệc',   value: 'dự tiệc/sự kiện, nổi bật và chỉn chu' },
  { emoji: '🌧️', label: 'Trời mưa', value: 'trời mưa, cần áo khoác hoặc chất liệu không thấm nước' },
  { emoji: '☀️', label: 'Trời nóng', value: 'thời tiết nóng, chất liệu thoáng mát' },
  { emoji: '❄️', label: 'Trời lạnh', value: 'thời tiết lạnh, cần giữ ấm' },
]

const getMatchColor = (p) => p >= 80 ? '#10B981' : p >= 60 ? '#F59E0B' : '#F43F5E'
const getMatchPct  = (o) => {
  const p = Number(o.matchPercentage)
  if (p >= 0 && p <= 100) return p
  if (o.scores) {
    const vals = Object.values(o.scores).map(Number).filter(n => !isNaN(n))
    if (vals.length) return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
  }
  return 0
}
const safeScore = (v) => { const n = Number(v); return isNaN(n) || n < 0 ? 0 : Math.min(n, 100) }

export default function OutfitsPage() {
  const navigate = useNavigate()
  const { user, isPremium } = useAuth()
  const isOnline  = useOnlineStatus()

  const [outfits, setOutfits]               = useState([])
  const [wardrobeItems, setWardrobeItems]   = useState([])
  const [editingOutfit, setEditingOutfit]   = useState(null)
  const [loading, setLoading]               = useState(true)
  const [loadError, setLoadError]           = useState('')
  const [fromCache, setFromCache]           = useState(false)
  const [generating, setGenerating]         = useState(false)
  const [genError, setGenError]             = useState('')
  const [showAd, setShowAd]                 = useState(false)
  const [selectedOccasions, setSelectedOccasions] = useState([])
  const [jobStatus, setJobStatus]           = useState({ status: 'validating', message: '' })

  const abortRef = useRef(null)

  const { credits, dailyLimit, isPremium, consume, refund, synced, syncAfterGenerate } = useGenerationCredits('generateOutfits')

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setLoadError('')
    setFromCache(false)

    if (!isOnline) {

      try {
        const cached = await outfitsCache.load(user.uid)
        setOutfits(cached)
        setFromCache(cached.length > 0)
        if (cached.length === 0) setLoadError('Mất kết nối mạng. Chưa có dữ liệu offline.')
      } catch {
        setLoadError('Mất kết nối mạng và không có dữ liệu cache.')
      }
      setLoading(false)
      return
    }

    try {
      const data = await getOutfits(user.uid)
      setOutfits(data)
      outfitsCache.save(user.uid, data).catch(() => {})
      getClothingItems(user.uid).then(setWardrobeItems).catch(e => console.error('Lỗi tải tủ đồ cho editor:', e))
    } catch (e) {
      console.error('Lỗi tải outfit:', e)

      const cached = await outfitsCache.load(user.uid).catch(() => [])
      if (cached.length > 0) {
        setOutfits(cached)
        setFromCache(true)
        setLoadError('Không tải được dữ liệu mới — đang hiển thị bản lưu cục bộ.')
      } else {
        setLoadError('Không thể tải danh sách outfit. Vui lòng thử lại.')
      }
    } finally {
      setLoading(false)
    }
  }, [user, isOnline])

  useEffect(() => { load() }, [load])

  const handleCancel = () => {
    abortRef.current?.abort()
    setGenerating(false)
    setGenError('')
    showToast.info('Đã huỷ tạo outfit.')
    add(1)
  }

  const doGenerate = async () => {
    if (!isOnline) {
      add(1)
      const msg = 'Không có kết nối mạng. Vui lòng thử lại sau. (Lượt dùng đã được hoàn lại)'
      setGenError(msg); showToast.error(msg)
      return
    }

    const controller = new AbortController()
    abortRef.current = controller

    setGenerating(true)
    setGenError('')
    setJobStatus({ status: 'validating', message: 'Đang kiểm tra tủ đồ...' })

    try {
      const userText = selectedOccasions.length > 0 ? selectedOccasions.join('; ') : null

      const { outfits: syncOutfits, count, contextFallback, isJob } =
        await generateOutfits(
          user.uid,
          userText,
          (progress) => setJobStatus(progress),
          controller.signal
        )

      if (isJob) {
        await load()
      } else {
        setOutfits(prev => [...syncOutfits, ...prev])
        outfitsCache.save(user.uid, [...syncOutfits, ...outfits]).catch(() => {})
      }

      const createdCount = isJob ? count : syncOutfits.length
      trackGenerateOutfit(isPremium)
      showToast.success(`✨ Đã tạo ${createdCount} outfit mới!`)
      if (contextFallback) showToast.info('💡 Tủ đồ chưa đủ gắn nhãn đúng mùa/dịp — outfit lấy từ toàn tủ đồ.')
      await notifyOutfitCreated(user.uid, syncOutfits?.map(o => o.routeName) ?? [])
      setSelectedOccasions([])
    } catch (e) {
      if (e.name === 'AbortError') return
      add(1)
      const msg = e.message?.includes('API Key')
        ? '⚠️ ' + e.message
        : e.message?.includes('ít nhất 2')
          ? 'Tủ đồ cần ít nhất 2 món để phối đồ. (Lượt dùng đã được hoàn lại)'
          : toVietnameseErrorMessage(e, 'Không thể tạo outfit.') + ' (Lượt dùng đã được hoàn lại)'
      setGenError(msg); showToast.error(msg)
    } finally {
      if (!controller.signal.aborted) setGenerating(false)
    }
  }

  const handleGenerate = async () => {
    if (consume()) { await doGenerate() }
    else { setShowAd(true); await notifyOutOfGenerations(user.uid) }
  }

  const handleReward = async (count) => {
    add(count); setShowAd(false)
    showToast.success(`🎁 +${count} lượt! Đang tạo outfit...`)
    await notifyRewardReceived(user.uid, count)
    if (consume()) { await doGenerate() }
    else { showToast.error('Không thể trừ lượt. Vui lòng thử lại.') }
  }

  const handleFav = async (outfit) => {
    const prev = outfit.isFavorite
    setOutfits(list => list.map(o => o.id === outfit.id ? { ...o, isFavorite: !prev } : o))
    try { await toggleFavorite(outfit.id, prev) }
    catch {
      setOutfits(list => list.map(o => o.id === outfit.id ? { ...o, isFavorite: prev } : o))
      showToast.error('Không thể cập nhật yêu thích.')
    }
  }

  const toggleOccasion = (v) =>
    setSelectedOccasions(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v])

  return (
    <div style={{ paddingBottom: 80 }}>

      {}
      <div className="page-header">
        <h2>Phối đồ AI</h2>
        <span className={isPremium ? 'badge-premium' : credits === 0 ? 'badge-empty' : 'badge-default'}>
          {isPremium ? `⭐ ${credits}/${dailyLimit}` : `${credits}/${dailyLimit} lượt`}
        </span>
      </div>

      {}
      {fromCache && (
        <p style={s.cacheBadge}>📦 Đang hiển thị dữ liệu đã lưu offline</p>
      )}

      {}
      {genError && <p style={s.errText}>{genError}</p>}

      {}
      {credits === 0 && !generating ? (
        <QuotaResetBanner
          onWatchAd={() => setShowAd(true)}
          onUpgrade={() => navigate('/settings?section=premium')}
        />
      ) : (
        <>
          {}
          <JobStatusPanel
            visible={generating}
            status={jobStatus.status}
            message={jobStatus.message}
            onCancel={handleCancel}
          />

          {}
          {!generating && (
            <div style={s.chips}>
              {OCCASION_CHIPS.map(chip => {
                const active = selectedOccasions.includes(chip.value)
                return (
                  <button key={chip.value} onClick={() => toggleOccasion(chip.value)}
                    style={{ ...s.chip, ...(active ? s.chipOn : {}) }}>
                    {chip.emoji} {chip.label}
                  </button>
                )
              })}
            </div>
          )}

          {}
          <div style={s.genArea}>
            <button
              className="btn-primary"
              onClick={handleGenerate}
              disabled={generating || !isOnline}
              style={{ maxWidth: 320, margin: '0 auto', opacity: (generating || !isOnline) ? 0.6 : 1 }}
            >
              {generating
                ? <span style={s.btnRow}><span style={s.miniSpin} />Đang xử lý...</span>
                : !isOnline ? '📡 Mất kết nối mạng'
                : '✨ Tạo outfit mới'}
            </button>
          </div>
        </>
      )}

      <RewardedAd trigger={showAd} onReward={handleReward} onClose={() => setShowAd(false)} />

      {}
      {loading ? (
        <div style={{ padding: '0 0 16px' }}><OutfitSkeletonList count={3} /></div>
      ) : loadError && outfits.length === 0 ? (
        <div style={s.empty}>
          <p style={{ fontSize: 36, marginBottom: 12 }}>😕</p>
          <p style={{ color: '#F43F5E', marginBottom: 12 }}>{loadError}</p>
          <button className="btn-primary" onClick={load} style={{ maxWidth: 200, margin: '0 auto' }}>Thử lại</button>
        </div>
      ) : outfits.length === 0 ? (
        <div style={s.empty}>
          <p style={{ fontSize: 48, marginBottom: 12 }}>✨</p>
          <p style={{ color: '#A598C7', marginBottom: 6 }}>Chưa có outfit nào</p>
          <p style={{ color: '#6B5E8A', fontSize: 13 }}>Thêm quần áo vào tủ và tạo outfit đầu tiên</p>
        </div>
      ) : (
        <div style={s.list}>
          {outfits.map(outfit => {
            const matchPct = getMatchPct(outfit)
            return (
              <div key={outfit.id} className="card" style={s.outfitCard}>
                {}
                <div style={s.imgRow}>
                  {(outfit.itemImages || []).slice(0, 4).map((img, i) => (
                    <img key={i} src={img} alt={`Món đồ ${i + 1}`} style={s.itemImg}
                      onError={e => { e.currentTarget.style.display = 'none' }} />
                  ))}
                  {(!outfit.itemImages || outfit.itemImages.length === 0) && (
                    <div style={s.noImg}>👗</div>
                  )}
                </div>

                {}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={s.routeName}>{outfit.routeName}</p>
                    <p style={s.desc}>{outfit.description}</p>
                  </div>
                  <button style={s.favBtn} onClick={() => handleFav(outfit)}
                    aria-label={outfit.isFavorite ? 'Bỏ yêu thích' : 'Yêu thích'}>
                    {outfit.isFavorite ? '❤️' : '🤍'}
                  </button>
                </div>

                {}
                <div style={s.scoreBox}>
                  <div style={s.scoreHeader}>
                    <span style={{ color: '#A598C7', fontSize: 13 }}>Độ phù hợp tổng thể</span>
                    <span style={{ color: getMatchColor(matchPct), fontWeight: 700, fontSize: 20 }}>{matchPct}%</span>
                  </div>
                  {outfit.scores && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {[['color','Màu sắc'],['proportion','Tỉ lệ'],['material','Chất liệu'],['style','Phong cách']].map(([k, l]) => {
                        const sc = safeScore(outfit.scores[k])
                        return (
                          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={s.scoreLabel}>{l}</span>
                            <div className="score-bar" style={{ flex: 1 }}>
                              <div className="score-bar-fill" style={{ width: `${sc}%` }} />
                            </div>
                            <span style={s.scoreVal}>{sc}%</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <OutfitFeedbackBar uid={user.uid} outfit={outfit} />

                <button
                  style={{
                    width: '100%', marginTop: 12, padding: '9px', borderRadius: 10,
                    border: '1px dashed #4A3F6B', background: 'transparent', color: '#A598C7',
                    fontSize: 12.5, cursor: 'pointer',
                  }}
                  onClick={() => setEditingOutfit(outfit)}
                >
                  ✏️ Chỉnh sửa outfit này
                </button>
              </div>
            )
          })}
        </div>
      )}

      {editingOutfit && (
        <OutfitEditor
          outfit={editingOutfit}
          allItems={wardrobeItems}
          onClose={() => setEditingOutfit(null)}
          onSaved={() => { setEditingOutfit(null); load() }}
        />
      )}
    </div>
  )
}

const s = {
  cacheBadge: { textAlign: 'center', fontSize: 12, color: '#F59E0B', margin: '0 16px 8px' },
  errText:    { color: '#F43F5E', fontSize: 13, textAlign: 'center', padding: '0 16px 8px', margin: 0 },

  chips:   { display: 'flex', flexWrap: 'wrap', gap: 8, padding: '0 16px 12px', justifyContent: 'center' },
  chip:    { display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 20, fontSize: 12.5, fontWeight: 600, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#A598C7', cursor: 'pointer' },
  chipOn:  { background: 'rgba(139,92,246,0.25)', border: '1px solid rgba(139,92,246,0.5)', color: '#E9D5FF' },

  genArea:  { padding: '12px 16px', display: 'flex', flexDirection: 'column' },
  btnRow:   { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 },
  miniSpin: { width: 16, height: 16, flexShrink: 0, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.75s linear infinite' },

  empty:     { textAlign: 'center', padding: '60px 24px' },
  list:      { padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 16 },
  outfitCard:{ padding: 16 },

  imgRow:   { display: 'flex', gap: 8, marginBottom: 14, overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' },
  itemImg:  { width: 80, height: 80, borderRadius: 10, objectFit: 'cover', flexShrink: 0 },
  noImg:    { fontSize: 40, width: 80, height: 80, flexShrink: 0, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#241848' },

  routeName:  { fontWeight: 700, fontSize: 16, fontFamily: 'Playfair Display, serif', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  desc:       { color: '#A598C7', fontSize: 13, marginBottom: 12, lineHeight: 1.5 },
  favBtn:     { background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', padding: '0 0 0 8px', flexShrink: 0 },

  scoreBox:    { background: '#241848', borderRadius: 10, padding: 12 },
  scoreHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  scoreLabel:  { width: 70, fontSize: 12, color: '#A598C7', flexShrink: 0 },
  scoreVal:    { width: 32, fontSize: 12, color: '#A78BFA', textAlign: 'right', flexShrink: 0 },
}
