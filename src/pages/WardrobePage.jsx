import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'
import { useOnlineStatus } from '../hooks/useOnlineStatus.jsx'
import { getClothingItems, deleteClothingItem, updateClothingItem, CLOTHING_TYPES } from '../services/wardrobeService'
import { wardrobeCache } from '../services/offlineCache'
import { removeBackground } from '../services/backgroundRemovalService'
import { WardrobeSkeletonGrid } from '../components/SkeletonCard'
import AddClothingModal from '../components/wardrobe/AddClothingModal'
import { showToast } from '../components/notifications/ToastNotification'

export default function WardrobePage() {
  const { user, isPremium } = useAuth()
  const isOnline = useOnlineStatus()

  const [items, setItems] = useState([])
  const [filter, setFilter] = useState('Tất cả')
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [error, setError] = useState('')
  const [selectedItem, setSelectedItem] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [removingBg, setRemovingBg] = useState(null)
  const [bgError, setBgError] = useState('')

  const [fromCache, setFromCache] = useState(false)

  const load = useCallback(async (bust = false) => {
    if (!user) return
    setLoading(true)
    setError('')
    setFromCache(false)

    if (!isOnline) {
      try {
        const cached = await wardrobeCache.load(user.uid)
        setItems(cached)
        setFromCache(cached.length > 0)
        if (cached.length === 0) setError('Mất kết nối mạng. Chưa có dữ liệu tủ đồ offline.')
      } catch { setError('Mất kết nối và không có dữ liệu cache.') }
      setLoading(false)
      return
    }

    try {
      const data = await getClothingItems(user.uid, { bust })
      setItems(data)
      wardrobeCache.save(user.uid, data).catch(() => {})
    } catch (e) {
      console.error('Load wardrobe error:', e)
      const cached = await wardrobeCache.load(user.uid).catch(() => [])
      if (cached.length > 0) {
        setItems(cached); setFromCache(true)
        setError('Không tải được dữ liệu mới — đang hiển thị bản đã lưu.')
      } else {
        setError('Không thể tải tủ đồ. Vui lòng thử lại.')
      }
    } finally {
      setLoading(false)
    }
  }, [user, isOnline])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    if (filter === 'Tất cả') return items
    return items.filter(i => i.type === filter)
  }, [items, filter])

  const { standardTabs, filterTabs } = useMemo(() => {
    const standard = CLOTHING_TYPES.slice(0, 6)
    const customTypes = [...new Set(
      items
        .map(i => i.type)
        .filter(t => t && !standard.includes(t))
    )].sort((a, b) => a.localeCompare(b, 'vi'))

    return {
      standardTabs: standard,
      filterTabs: ['Tất cả', ...standard, ...customTypes],
    }
  }, [items])

  const handleDeleteRequest = (item) => setConfirmDeleteId(item.id)

  const handleDelete = async (item) => {
    setConfirmDeleteId(null)
    setDeleting(item.id)
    try {
      await deleteClothingItem(item.id, item.imagePublicId)

      setItems(prev => {
        const next = prev.filter(i => i.id !== item.id)
        const isCustomType = filter !== 'Tất cả' && !standardTabs.includes(filter)
        if (isCustomType && !next.some(i => i.type === filter)) {
          setFilter('Tất cả')
        }
        return next
      })

      showToast.success('Đã xóa món đồ')
    } catch (e) {
      console.error('Delete item error:', e)
      showToast.error('Không thể xóa. Vui lòng thử lại.')
    } finally {
      setDeleting(null)
    }
  }

  const handleRemoveBackground = async (item) => {
    if (!isPremium) {
      showToast.warning('Tính năng này chỉ dành cho Premium')
      return
    }

    setRemovingBg(item.id)
    setBgError('')

    try {
      const result = await removeBackground(item.imageUrl, item.id)
      if (!result.success) {
        setBgError(result.error || 'Không thể tách nền. Ảnh quá phức tạp hoặc không hỗ trợ.')
        return
      }
      await updateClothingItem(item.id, { imageUrl: result.imageUrl, imagePublicId: result.imagePublicId })
      setItems(prev =>
        prev.map(i => i.id === item.id ? { ...i, imageUrl: result.imageUrl } : i)
      )
      showToast.success('Đã tách nền ảnh')
      setSelectedItem(null)
    } catch (e) {
      console.error('Remove background error:', e)
      setBgError('Không thể tách nền. Ảnh quá phức tạp hoặc không hỗ trợ.')
    } finally {
      setRemovingBg(null)
    }
  }

  if (!user) return <div>Loading...</div>

  return (
    <div style={s.page}>
      {}
      <div style={s.header}>
        <h1 style={s.title}>👔 Tủ Đồ Của Tôi</h1>
        <div>
          <button onClick={() => setShowAdd(true)} style={s.addBtn}>
            ➕ Thêm Món Đồ
          </button>
          <button onClick={() => load(true)} style={s.refreshBtn} disabled={loading}>
            🔄 Làm mới
          </button>
        </div>
      </div>

      {fromCache && (
        <p style={{ textAlign: 'center', fontSize: 12, color: '#F59E0B', margin: '0 0 4px' }}>
          📦 Đang hiển thị dữ liệu đã lưu offline
        </p>
      )}
      {error && <div style={s.error}>{error}</div>}

      {}
      <div style={s.filterTabs}>
        {filterTabs.map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            style={{
              ...s.tab,
              ...(filter === tab && s.tabActive),
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {}
      {loading ? (
        <WardrobeSkeletonGrid count={6} />
      ) : filtered.length === 0 ? (
        <div style={s.empty}>
          <p>Chưa có món đồ nào {filter !== 'Tất cả' && `loại ${filter}`}</p>
          <button onClick={() => setShowAdd(true)} style={s.addBtn}>
            Thêm ngay
          </button>
        </div>
      ) : (
        <div style={s.grid}>
          {filtered.map(item => (
            <div key={item.id} style={s.card}>
              <img src={item.imageUrl} alt={item.type} style={s.image} />
              <div style={s.info}>
                <p style={s.type}>{item.type}</p>
                <p style={s.color}>{item.color}</p>
              </div>
              <div style={s.actions}>
                <button
                  onClick={() => setSelectedItem(item)}
                  style={s.detailBtn}
                >
                  👁️ Chi tiết
                </button>
                <button
                  onClick={() => handleDeleteRequest(item)}
                  disabled={deleting === item.id}
                  style={{
                    ...s.deleteBtn,
                    opacity: deleting === item.id ? 0.5 : 1,
                  }}
                >
                  {deleting === item.id ? '...' : '🗑️'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {}
      {confirmDeleteId && (
        <div style={s.modal}>
          <div style={s.modalContent}>
            <p>Bạn chắc chắn muốn xóa?</p>
            <div style={s.modalActions}>
              <button onClick={() => setConfirmDeleteId(null)} style={s.cancelBtn}>
                Hủy
              </button>
              <button
                onClick={() => {
                  const item = items.find(i => i.id === confirmDeleteId)
                  handleDelete(item)
                }}
                style={s.confirmBtn}
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {}
      {showAdd && (
        <AddClothingModal
          onClose={() => setShowAdd(false)}
          onSuccess={() => {
            setShowAdd(false)
            load(true)
          }}
        />
      )}

      {}
      {selectedItem && (
        <div style={s.modal}>
          <div style={s.modalContent}>
            <img src={selectedItem.imageUrl} alt="" style={s.largeImage} />
            <p><strong>Loại:</strong> {selectedItem.type}</p>
            <p><strong>Màu:</strong> {selectedItem.color}</p>
            <p><strong>Họa tiết:</strong> {selectedItem.pattern}</p>

            {isPremium && (
              <button
                onClick={() => handleRemoveBackground(selectedItem)}
                disabled={removingBg === selectedItem.id}
                style={s.bgRemoveBtn}
              >
                {removingBg === selectedItem.id ? 'Đang xử lý...' : '✂️ Tách nền'}
              </button>
            )}

            {bgError && <p style={s.bgError}>{bgError}</p>}

            <button onClick={() => setSelectedItem(null)} style={s.closeBtn}>
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  page:         { padding: '16px', minHeight: '100vh', background: '#0F0A1E', color: '#F8F5FF' },
  header:       { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  title:        { fontSize: 24, fontWeight: 700, margin: 0 },
  addBtn:       { background: '#8B5CF6', color: '#fff', border: 'none', borderRadius: 50, padding: '10px 16px', cursor: 'pointer' },
  refreshBtn:   { background: 'transparent', border: '1px solid #8B5CF6', color: '#8B5CF6', borderRadius: 50, padding: '10px 16px', marginLeft: 8, cursor: 'pointer' },
  error:        { background: '#FEE2E2', color: '#991B1B', padding: '12px 16px', borderRadius: 12, marginBottom: 16 },
  filterTabs:   { display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto', paddingBottom: 8 },
  tab:          { background: 'transparent', border: '1px solid #6B5E8A', color: '#A598C7', borderRadius: 50, padding: '8px 14px', cursor: 'pointer', whiteSpace: 'nowrap' },
  tabActive:    { background: '#8B5CF6', borderColor: '#8B5CF6', color: '#fff' },
  empty:        { textAlign: 'center', padding: '40px 20px' },
  grid:         { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 },
  card:         { background: '#1A1230', borderRadius: 12, overflow: 'hidden', cursor: 'pointer' },
  image:        { width: '100%', aspectRatio: '1', objectFit: 'cover' },
  info:         { padding: '8px', fontSize: 12 },
  type:         { margin: 0, fontWeight: 600, color: '#C4B5FD' },
  color:        { margin: 0, fontSize: 11, color: '#6B5E8A' },
  actions:      { display: 'flex', gap: 4, padding: '8px' },
  detailBtn:    { flex: 1, background: 'rgba(139,92,246,0.2)', border: 'none', borderRadius: 8, color: '#8B5CF6', cursor: 'pointer', fontSize: 12 },
  deleteBtn:    { background: 'rgba(239,68,68,0.2)', border: 'none', borderRadius: 8, color: '#EF4444', cursor: 'pointer', fontSize: 12, padding: '4px 8px' },
  modal:        { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modalContent: { background: '#1A1230', borderRadius: 16, padding: 20, maxWidth: 400, maxHeight: '80vh', overflow: 'auto' },
  modalActions: { display: 'flex', gap: 8, marginTop: 16 },
  cancelBtn:    { flex: 1, background: 'transparent', border: '1px solid #8B5CF6', color: '#8B5CF6', borderRadius: 50, padding: '10px 16px', cursor: 'pointer' },
  confirmBtn:   { flex: 1, background: '#EF4444', border: 'none', color: '#fff', borderRadius: 50, padding: '10px 16px', cursor: 'pointer' },
  largeImage:   { width: '100%', borderRadius: 8, marginBottom: 12 },
  bgRemoveBtn:  { width: '100%', background: '#8B5CF6', color: '#fff', border: 'none', borderRadius: 50, padding: '10px 16px', cursor: 'pointer', marginTop: 12 },
  bgError:      { color: '#F87171', fontSize: 12, marginTop: 8 },
  closeBtn:     { width: '100%', background: 'transparent', border: '1px solid #8B5CF6', color: '#8B5CF6', borderRadius: 50, padding: '10px 16px', cursor: 'pointer', marginTop: 8 },
}
