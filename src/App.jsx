import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth.jsx'
import { OnlineStatusProvider } from './hooks/useOnlineStatus.jsx'
import ErrorBoundary from './components/ErrorBoundary'
import OfflineBanner from './components/OfflineBanner'
import BottomNav from './components/layout/BottomNav'
import HaVyCompanion from './components/companion/HaVyCompanion'
import { ToastProvider } from './components/notifications/ToastNotification'
import Onboarding, { isOnboardingDone } from './components/Onboarding'
import PWAInstallPrompt from './components/PWAInstallPrompt'
import FeedbackButton from './components/feedback/FeedbackButton'
import CreditBadge from './components/CreditBadge'
import AuthPage from './pages/AuthPage'
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'
import TermsOfServicePage from './pages/TermsOfServicePage'
import HomePage from './pages/HomePage'
import WardrobePage from './pages/WardrobePage'
import OutfitsPage from './pages/OutfitsPage'
import FavoritesPage from './pages/FavoritesPage'
import StyleAnalysisPage from './pages/StyleAnalysisPage'
import SettingsPage from './pages/SettingsPage'
import NotificationsPage from './pages/NotificationsPage'
import { countUnreadNotifications, checkDailySuggestion } from './services/notificationService'
import './styles/global.css'

// Ripple effect cho tất cả .btn-primary
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn-primary')
  if (!btn) return
  const r = document.createElement('span')
  r.className = 'ripple'
  const rect = btn.getBoundingClientRect()
  const size = Math.max(rect.width, rect.height)
  r.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX-rect.left-size/2}px;top:${e.clientY-rect.top-size/2}px`
  btn.appendChild(r)
  r.addEventListener('animationend', () => r.remove())
})

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <div style={{ fontSize: 40, color: '#8B5CF6', filter: 'drop-shadow(0 0 12px rgba(139,92,246,0.5))' }}>✦</div>
      <div className="spinner" />
    </div>
  )
  return user ? children : <Navigate to="/" replace />
}

function AppRoutes() {
  const { user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    if (user && !isOnboardingDone(user.uid)) {
      setShowOnboarding(true)
    }
  }, [user])

  const uid = user?.uid
  useEffect(() => {
    if (!uid) return
    checkDailySuggestion(uid).catch(e =>
      console.warn('checkDailySuggestion failed:', e)
    )
    countUnreadNotifications(uid)
      .then(setUnreadCount)
      .catch(e => console.warn('countUnreadNotifications failed:', e))
    const t = setInterval(() =>
      countUnreadNotifications(uid)
        .then(setUnreadCount)
        .catch(e => console.warn('countUnreadNotifications interval failed:', e))
    , 120000)
    return () => clearInterval(t)
  }, [uid])

  return (
    <>
      {}
      {showOnboarding && (
        <Onboarding userId={user?.uid} onDone={() => setShowOnboarding(false)} />
      )}

      <div className="page-enter">
        <Routes>
          {}
          <Route path="/privacy-policy"    element={<PrivacyPolicyPage />} />
          <Route path="/terms-of-service"  element={<TermsOfServicePage />} />

          {}
          <Route path="/" element={user ? <Navigate to="/home" /> : <AuthPage />} />
          <Route path="/home"           element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/wardrobe"       element={<ProtectedRoute><WardrobePage /></ProtectedRoute>} />
          <Route path="/outfits"        element={<ProtectedRoute><OutfitsPage /></ProtectedRoute>} />
          <Route path="/favorites"      element={<ProtectedRoute><FavoritesPage /></ProtectedRoute>} />
          <Route path="/style-analysis" element={<ProtectedRoute><StyleAnalysisPage /></ProtectedRoute>} />
          <Route path="/settings"       element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/notifications"  element={
            <ProtectedRoute>
              <NotificationsPage onUnreadChange={setUnreadCount} />
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      {user && <BottomNav unreadCount={unreadCount} />}
      {user && <CreditBadge />}
      {user && <HaVyCompanion />}
      {}
      {user && <FeedbackButton />}
      {}
      <PWAInstallPrompt />
      <ToastProvider />
    </>
  )
}

export default function App() {
  return (

    <ErrorBoundary>
      {}
      <OnlineStatusProvider>
        <OfflineBanner />
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </OnlineStatusProvider>
    </ErrorBoundary>
  )
}
