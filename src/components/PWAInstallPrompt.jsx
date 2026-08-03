import { useState, useEffect } from 'react'

const DISMISSED_KEY = 'pwa_install_dismissed'
const SHOW_DELAY_MS = 30_000

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [show, setShow]                     = useState(false)
  const [isIOS, setIsIOS]                   = useState(false)
  const [installed, setInstalled]           = useState(false)

  useEffect(() => {

    if (localStorage.getItem(DISMISSED_KEY)) return
    if (window.matchMedia('(display-mode: standalone)').matches) return
    if (window.navigator.standalone === true) return

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream
    setIsIOS(ios)

    let timer
    if (ios) {

      timer = setTimeout(() => setShow(true), SHOW_DELAY_MS)
    } else {

      const handler = (e) => {
        e.preventDefault()
        setDeferredPrompt(e)
        timer = setTimeout(() => setShow(true), SHOW_DELAY_MS)
      }
      window.addEventListener('beforeinstallprompt', handler)
      window.addEventListener('appinstalled', () => {
        setInstalled(true)
        setShow(false)
      })
      return () => {
        window.removeEventListener('beforeinstallprompt', handler)
        clearTimeout(timer)
      }
    }
    return () => clearTimeout(timer)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setDeferredPrompt(null)
    setShow(false)
  }

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1')
    setShow(false)
  }

  if (!show) return null

  return (
    <>
      {}
      <div
        onClick={handleDismiss}
        style={{
          position: 'fixed', inset: 0, zIndex: 1100,
          background: 'rgba(0,0,0,0.5)',
          animation: 'fadeIn 0.2s ease',
        }}
      />

      {}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1101,
        background: '#1A1030',
        borderTop: '1px solid rgba(139,92,246,0.3)',
        borderRadius: '20px 20px 0 0',
        padding: '20px 20px calc(20px + env(safe-area-inset-bottom))',
        animation: 'slideUp 0.3s ease',
      }}>
        {}
        <div style={{
          width: 40, height: 4, background: 'rgba(255,255,255,0.15)',
          borderRadius: 2, margin: '0 auto 20px',
        }} />

        {}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <img
            src="/icon-192.png"
            alt="Lama Stylers"
            style={{ width: 56, height: 56, borderRadius: 14, border: '2px solid rgba(139,92,246,0.4)' }}
          />
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#F3E8FF' }}>
              Cài Lama Stylers
            </div>
            <div style={{ fontSize: 13, color: '#A78BFA', marginTop: 2 }}>
              Truy cập nhanh hơn từ màn hình chính
            </div>
          </div>
        </div>

        {}
        <div style={{
          background: 'rgba(139,92,246,0.08)',
          borderRadius: 12, padding: '12px 14px', marginBottom: 18,
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          {[
            ['⚡', 'Mở nhanh, không cần gõ URL'],
            ['🔔', 'Nhận thông báo outfit mới mỗi ngày'],
            ['📦', 'Hoạt động offline cơ bản'],
          ].map(([icon, text]) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>{icon}</span>
              <span style={{ fontSize: 13, color: '#D1C7F0' }}>{text}</span>
            </div>
          ))}
        </div>

        {isIOS ? (

          <div style={{ marginBottom: 18 }}>
            <p style={{ fontSize: 13, color: '#A78BFA', marginBottom: 10 }}>
              Trên Safari, bấm:
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {[
                { icon: '⬆️', label: 'Chia sẻ' },
                { icon: '→', label: '' },
                { icon: '➕', label: 'Thêm vào màn hình chính' },
              ].map((s, i) => (
                <span key={i} style={{
                  background: 'rgba(139,92,246,0.15)', borderRadius: 8,
                  padding: '4px 10px', fontSize: 13, color: '#E9D5FF',
                  border: '1px solid rgba(139,92,246,0.3)',
                }}>
                  {s.icon} {s.label}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <button
            onClick={handleInstall}
            style={{
              width: '100%', padding: '14px',
              background: 'linear-gradient(135deg,#8B5CF6,#7C3AED)',
              border: 'none', borderRadius: 14,
              color: '#fff', fontWeight: 700, fontSize: 15,
              cursor: 'pointer', marginBottom: 10,
            }}
          >
            📲 Cài đặt ngay
          </button>
        )}

        <button
          onClick={handleDismiss}
          style={{
            width: '100%', padding: '12px',
            background: 'none', border: 'none',
            color: '#6B5E8A', fontSize: 14, cursor: 'pointer',
          }}
        >
          Không, cảm ơn
        </button>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUp { from { transform:translateY(100%) } to { transform:translateY(0) } }
      `}</style>
    </>
  )
}
