import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  clearAllNotifications,
  deleteNotification,
  checkDailySuggestion
} from '../services/notificationService'
import { showToast } from '../components/notifications/ToastNotification'
import { ListRowSkeletonGroup } from '../components/SkeletonCard'

const TYPE_COLORS = { success: '#10B981', info: '#8B5CF6', warning: '#F59E0B', error: '#F43F5E' }
const TYPE_ICONS  = { success: '✅', info: 'ℹ️', warning: '⚠️', error: '❌' }

const timeAgo = (iso) => {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (m < 1) return 'Vừa xong'
  if (m < 60) return `${m} phút trước`
  if (h < 24) return `${h} giờ trước`
  return `${d} ngày trước`
}

export default function NotificationsPage({ onUnreadChange }) {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const [notifs, setNotifs]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState('all')
  const [hoveredId, setHoveredId] = useState(null)
  const [confirmClear, setConfirmClear] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {

      await checkDailySuggestion(user.uid)
      const data = await getUserNotifications(user.uid, 100)
      setNotifs(data)
      const unread = data.filter(n => !n.isRead).length
      onUnreadChange?.(unread)
    } finally {
      setLoading(false)
    }
  }, [user, onUnreadChange])

  useEffect(() => { load() }, [load])

  const handleRead = async (notif) => {
    if (!notif.isRead) {
      await markAsRead(notif.id, user.uid)
      setNotifs(prev => {
        const next = prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n)

        onUnreadChange?.(next.filter(n => !n.isRead).length)
        return next
      })
    }
    if (notif.link) navigate(notif.link)
  }

  const handleReadAll = async () => {
    await markAllAsRead(user.uid)
    setNotifs(prev => prev.map(n => ({ ...n, isRead: true })))
    onUnreadChange?.(0)
    showToast.success('Đã đánh dấu tất cả đã đọc')
  }

  const handleDelete = async (e, notifId) => {
    e.stopPropagation()
    await deleteNotification(notifId, user.uid)
    const next = notifs.filter(n => n.id !== notifId)
    setNotifs(next)
    onUnreadChange?.(next.filter(n => !n.isRead).length)
  }

  const handleClearAll = async () => {

    if (!confirmClear) { setConfirmClear(true); return }
    setConfirmClear(false)
    await clearAllNotifications(user.uid)
    setNotifs([])
    onUnreadChange?.(0)
    showToast.info('Đã xóa tất cả thông báo')
  }

  const displayed = filter === 'unread' ? notifs.filter(n => !n.isRead) : notifs
  const unreadCount = notifs.filter(n => !n.isRead).length

  return (
    <div style={{ paddingBottom: 90 }}>
      {}
      <div className="page-header">
        <h2>Thông báo</h2>
        {notifs.length > 0 && (
          confirmClear ? (

            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#A598C7' }}>Xóa tất cả?</span>
              <button onClick={handleClearAll} style={{ ...s.clearBtn, color: '#F43F5E', fontWeight: 700 }}>Xóa</button>
              <button onClick={() => setConfirmClear(false)} style={{ ...s.clearBtn, color: '#6B5E8A' }}>Hủy</button>
            </div>
          ) : (
            <button onClick={handleClearAll} style={s.clearBtn}>🗑️ Xóa tất cả</button>
          )
        )}
      </div>

      {}
      <div style={s.filterRow}>
        {[
          { key: 'all',    label: `Tất cả (${notifs.length})` },
          { key: 'unread', label: `Chưa đọc (${unreadCount})` },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              ...s.filterBtn,
              background: filter === f.key ? 'rgba(139,92,246,0.2)' : 'transparent',
              color: filter === f.key ? '#A78BFA' : '#6B5E8A',
              border: filter === f.key ? '1px solid rgba(139,92,246,0.4)' : '1px solid transparent',
            }}
          >
            {f.label}
          </button>
        ))}
        {unreadCount > 0 && (
          <button onClick={handleReadAll} style={s.readAllBtn}>✓ Đọc tất cả</button>
        )}
      </div>

      {}
      {loading ? (
        <ListRowSkeletonGroup count={5} />
      ) : displayed.length === 0 ? (
        <div style={s.empty}>
          <p style={{ fontSize: 52, marginBottom: 12 }}>📭</p>
          <p style={{ color: '#A598C7', fontSize: 16 }}>
            {filter === 'unread' ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo nào'}
          </p>
          <p style={{ color: '#6B5E8A', fontSize: 13, marginTop: 6 }}>
            Thông báo sẽ xuất hiện khi bạn tạo outfit hoặc nâng cấp tài khoản
          </p>
        </div>
      ) : (
        <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {displayed.map(n => (
            <div
              key={n.id}
              role="button"
              tabIndex={0}
              aria-label={`${n.isRead ? '' : 'Chưa đọc: '}${n.title}`}
              onClick={() => handleRead(n)}
              onKeyDown={e => e.key === 'Enter' && handleRead(n)}
              onMouseEnter={() => setHoveredId(n.id)}
              onMouseLeave={() => setHoveredId(null)}
              className="card"
              style={{
                ...s.item,
                background: hoveredId === n.id
                  ? 'rgba(139,92,246,0.14)'
                  : n.isRead
                    ? 'rgba(255,255,255,0.02)'
                    : 'rgba(139,92,246,0.08)',
                borderLeft: `4px solid ${TYPE_COLORS[n.type] || '#8B5CF6'}`,
              }}
            >
              <span style={{ fontSize: 22, flexShrink: 0 }}>
                {TYPE_ICONS[n.type] || 'ℹ️'}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={s.itemHead}>
                  <span style={{
                    ...s.itemTitle,
                    color: n.isRead ? '#A598C7' : '#F8F5FF'
                  }}>
                    {n.title}
                  </span>
                  {!n.isRead && <span style={s.dot} />}
                </div>
                <p style={s.itemMsg}>{n.message}</p>
                <span style={s.itemTime}>{timeAgo(n.createdAt)}</span>
              </div>
              {}
              <button
                onClick={(e) => handleDelete(e, n.id)}
                onMouseEnter={e => { e.currentTarget.style.color = '#F43F5E'; e.currentTarget.style.background = 'rgba(244,63,94,0.1)' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#A598C7'; e.currentTarget.style.background = 'none' }}
                style={s.deleteBtn}
                title="Xóa thông báo"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const s = {
  clearBtn: {
    background: 'none', border: 'none',
    color: '#F43F5E', fontSize: 13, cursor: 'pointer',
    padding: '6px 10px', borderRadius: 8,
  },
  filterRow: {
    display: 'flex', gap: 8, alignItems: 'center',
    padding: '8px 16px 12px',
    overflowX: 'auto',
  },
  filterBtn: {
    borderRadius: 50,
    padding: '6px 14px',
    fontSize: 13, fontWeight: 500,
    cursor: 'pointer', flexShrink: 0,
    transition: 'all 0.2s',
  },
  readAllBtn: {
    background: 'none', border: 'none',
    color: '#A78BFA', fontSize: 12,
    cursor: 'pointer', marginLeft: 'auto',
    flexShrink: 0, padding: '6px 8px',
  },
  empty: {
    textAlign: 'center',
    padding: '60px 24px',
  },
  item: {
    display: 'flex', alignItems: 'flex-start', gap: 12,
    padding: '14px 14px 14px 12px',
    cursor: 'pointer',
    borderRadius: 12,
    transition: 'background 0.15s',
  },
  itemHead: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 4,
    minWidth: 0,
  },
  itemTitle: {
    fontWeight: 600, fontSize: 14,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    flex: 1,
    minWidth: 0,
  },
  dot: {
    width: 8, height: 8, borderRadius: '50%',
    background: '#8B5CF6', flexShrink: 0, marginLeft: 6,
  },
  itemMsg: {
    fontSize: 13, color: '#A598C7',
    margin: '0 0 6px', lineHeight: 1.4,
  },
  itemTime: { fontSize: 11, color: '#6B5E8A' },
  deleteBtn: {
    background: 'none', border: 'none',
    color: '#A598C7', fontSize: 16,
    cursor: 'pointer', padding: '4px 6px',
    flexShrink: 0, alignSelf: 'center',
    borderRadius: 6, transition: 'color 0.2s, background 0.2s',
  },
}
