import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getUserNotifications,
  countUnreadNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '../../services/notificationService'

function relativeTime(isoStr) {
  if (!isoStr) return ''
  const diff = Date.now() - new Date(isoStr).getTime()
  if (diff < 60_000)  return 'Vừa xong'
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} phút trước`
  if (diff < 86400_000) {
    const h = Math.floor(diff / 3600_000)
    return `${h} giờ trước`
  }
  return new Date(isoStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
}

export default function NotificationBell({ userId }) {
  const [notifs, setNotifs]       = useState([])
  const [unread, setUnread]       = useState(0)
  const [open, setOpen]           = useState(false)
  const [loading, setLoading]     = useState(false)
  const [markingAll, setMarkingAll] = useState(false)

  const dropRef    = useRef(null)
  const pollRef    = useRef(null)
  const errorCount = useRef(0)
  const navigate   = useNavigate()

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const [data, count] = await Promise.all([
        getUserNotifications(userId, 30),
        countUnreadNotifications(userId),
      ])
      setNotifs(data)
      setUnread(count)
      errorCount.current = 0
    } catch (e) {
      console.error('[NotificationBell] load:', e)
      errorCount.current++
    } finally {
      setLoading(false)
    }
  }, [userId])

  const pollUnread = useCallback(async () => {
    if (!userId || document.hidden) return
    try {
      const count = await countUnreadNotifications(userId)
      setUnread(count)
      errorCount.current = 0
    } catch {
      errorCount.current++
    }
  }, [userId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!userId) return

    function getInterval() {
      if (errorCount.current > 0) {
        return Math.min(errorCount.current * errorCount.current * 60_000, 300_000)
      }
      return unread > 0 ? 60_000 : 180_000
    }

    let cancelled = false

    const stopPoll = () => {
      if (pollRef.current) {
        clearTimeout(pollRef.current)
        pollRef.current = null
      }
    }

    // Recursive setTimeout — tránh clear+recreate interval mỗi tick (drift/leak)
    const scheduleNext = () => {
      stopPoll()
      if (cancelled) return
      pollRef.current = setTimeout(async () => {
        if (cancelled) return
        if (!document.hidden) await pollUnread()
        scheduleNext()
      }, getInterval())
    }

    scheduleNext()
    const onVisibility = () => {
      if (document.hidden) {
        stopPoll()
      } else {
        pollUnread()
        scheduleNext()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelled = true
      stopPoll()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [userId, unread, pollUnread])

  useEffect(() => {
    const handler = e => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleClick = (n) => {
    if (!n.isRead) {
      markNotificationRead(n.id).catch(() => {})
      setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, isRead: true } : x))
      setUnread(u => Math.max(0, u - 1))
    }
    setOpen(false)
    if (n.link) navigate(n.link)
  }

  const handleMarkAll = async () => {
    if (!userId || markingAll) return
    setMarkingAll(true)
    try {
      await markAllNotificationsRead(userId)
      setNotifs(prev => prev.map(n => ({ ...n, isRead: true })))
      setUnread(0)
    } catch (e) {
      console.error('[NotificationBell] markAll:', e)
    } finally {
      setMarkingAll(false)
    }
  }

  const handleDelete = async (e, n) => {
    e.stopPropagation()
    try {
      await deleteNotification(n.id)
      setNotifs(prev => prev.filter(x => x.id !== n.id))
      if (!n.isRead) setUnread(u => Math.max(0, u - 1))
    } catch {}
  }

  return (
    <div ref={dropRef} style={{ position: 'relative' }}>
      {}
      <button
        onClick={() => { setOpen(o => !o); if (!open) load() }}
        style={{
          position: 'relative', background: 'none', border: 'none',
          fontSize: 22, cursor: 'pointer', color: '#E5E7EB', padding: '4px 6px',
        }}
        title="Thông báo"
      >
        🔔
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 0, right: 0,
            background: '#EF4444', color: '#fff', borderRadius: '50%',
            minWidth: 16, height: 16, fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {}
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '100%', marginTop: 8,
          width: 320, maxHeight: 440, overflowY: 'auto',
          background: '#1E1535', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', zIndex: 100,
        }}>
          {}
          <div style={{
            padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontWeight: 600, color: '#fff', fontSize: 14 }}>
              Thông báo {loading && <span style={{ fontSize: 11, color: '#9CA3AF' }}>⏳</span>}
            </span>
            {unread > 0 && (
              <button
                onClick={handleMarkAll}
                disabled={markingAll}
                style={{
                  background: 'none', border: 'none', color: '#8B5CF6',
                  fontSize: 12, cursor: 'pointer', padding: '2px 6px',
                  borderRadius: 4,
                }}
              >
                {markingAll ? '...' : '✓ Đọc hết'}
              </button>
            )}
          </div>

          {}
          {notifs.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🔕</div>
              <p style={{ color: '#6B7280', fontSize: 13 }}>Không có thông báo nào</p>
            </div>
          ) : (
            notifs.map(n => (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                style={{
                  padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)',
                  cursor: 'pointer',
                  background: n.isRead ? 'transparent' : 'rgba(167,139,250,0.06)',
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                onMouseLeave={e => e.currentTarget.style.background = n.isRead ? 'transparent' : 'rgba(167,139,250,0.06)'}
              >
                {}
                <div style={{
                  width: 6, height: 6, borderRadius: '50%', flexShrink: 0, marginTop: 5,
                  background: n.isRead ? 'transparent' : '#8B5CF6',
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  {n.title && (
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#E5E7EB', marginBottom: 2 }}>
                      {n.title}
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: n.isRead ? '#9CA3AF' : '#E5E7EB', lineHeight: 1.4 }}>
                    {n.message}
                  </div>
                  <div style={{ fontSize: 10, color: '#6B7280', marginTop: 4 }}>
                    {relativeTime(n.createdAt)}
                  </div>
                </div>
                {}
                <button
                  onClick={(e) => handleDelete(e, n)}
                  style={{
                    background: 'none', border: 'none', color: '#4B5563',
                    cursor: 'pointer', fontSize: 14, padding: '0 2px', flexShrink: 0,
                    lineHeight: 1,
                  }}
                  title="Xóa"
                >
                  ×
                </button>
              </div>
            ))
          )}

          {}
          {notifs.length > 0 && (
            <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.07)', textAlign: 'center' }}>
              <button
                onClick={() => { setOpen(false); navigate('/notifications') }}
                style={{ background: 'none', border: 'none', color: '#8B5CF6', fontSize: 12, cursor: 'pointer' }}
              >
                Xem tất cả →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
