import { useState, useEffect, useRef } from 'react'
import { useOnlineStatus } from '../hooks/useOnlineStatus.jsx'

export default function OfflineBanner() {
  const isOnline = useOnlineStatus()

  const [visible, setVisible] = useState(!isOnline)
  const [reconnecting, setReconnecting] = useState(false)
  const hideTimer = useRef(null)

  useEffect(() => {
    if (!isOnline) {

      clearTimeout(hideTimer.current)
      setReconnecting(false)
      setVisible(true)
    } else {

      setReconnecting(true)
      hideTimer.current = setTimeout(() => {
        setVisible(false)
        setReconnecting(false)
      }, 1500)
    }
    return () => clearTimeout(hideTimer.current)
  }, [isOnline])

  if (!visible) return null

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
        background: reconnecting ? '#10B981' : '#F59E0B',
        color: '#1A1025',
        padding: '8px 16px',
        textAlign: 'center',
        fontSize: 13,
        fontWeight: 600,
        transition: 'background 0.3s ease',

        paddingTop: 'calc(8px + env(safe-area-inset-top, 0px))',
      }}
    >
      {reconnecting
        ? '✅ Đã kết nối lại — đang đồng bộ dữ liệu...'
        : '📡 Mất kết nối mạng — bạn vẫn xem được dữ liệu đã tải, nhưng không thể thêm đồ mới, tạo outfit hoặc nhắn Hạ Vy lúc này.'}
    </div>
  )
}
