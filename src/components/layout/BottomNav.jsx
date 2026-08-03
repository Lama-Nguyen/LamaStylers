import { useNavigate, useLocation } from 'react-router-dom'

const TABS = [
  { path: '/home',          label: 'Trang chủ', icon: HomeIcon },
  { path: '/wardrobe',      label: 'Tủ đồ',     icon: WardrobeIcon },
  { path: '/outfits',       label: 'Phối đồ',   icon: OutfitIcon },
  { path: '/favorites',     label: 'Yêu thích', icon: HeartIcon },
  { path: '/notifications', label: 'Thông báo', icon: BellIcon },
  { path: '/settings',      label: 'Cài đặt',   icon: SettingsIcon },
]

export default function BottomNav({ unreadCount = 0 }) {
  const navigate   = useNavigate()
  const { pathname } = useLocation()

  return (
    <nav className="bottom-nav">
      {TABS.map(({ path, label, icon: Icon }) => (
        <button
          key={path}
          className={`nav-item ${pathname === path ? 'active' : ''}`}
          onClick={() => navigate(path)}
        >
          <span style={{ position: 'relative', display: 'inline-flex' }}>
            <Icon />
            {path === '/notifications' && unreadCount > 0 && (
              <span style={badgeStyle}>{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </span>
          {label}
        </button>
      ))}
    </nav>
  )
}

const badgeStyle = {
  position: 'absolute',
  top: -6, right: -8,
  background: '#F43F5E',
  color: '#fff',
  fontSize: 9, fontWeight: 700,
  minWidth: 16, height: 16,
  borderRadius: 8,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '0 3px', lineHeight: 1,
  border: '2px solid #0F0A1E',
}

function HomeIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
}
function WardrobeIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="3" width="20" height="18" rx="2"/><path d="M8 3v18M16 3v18"/>
  </svg>
}
function OutfitIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2L4.5 6.5v4l7.5 4 7.5-4v-4z"/><path d="M4.5 10.5v7L12 22l7.5-4.5v-7"/>
  </svg>
}
function HeartIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
  </svg>
}
function BellIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
  </svg>
}
function SettingsIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
}
