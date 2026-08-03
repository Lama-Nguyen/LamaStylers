import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, register, loginWithGoogle, AUTH_ERROR_MESSAGES } from '../services/authService'
import { useAuth } from '../hooks/useAuth.jsx'

const injectAuthStyles = () => {
  if (document.getElementById('auth-page-styles')) return
  const el = document.createElement('style')
  el.id = 'auth-page-styles'
  el.textContent = `
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes fadeSlideUp {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .auth-input:focus { outline: none; border-color: #8B5CF6 !important; box-shadow: 0 0 0 2px rgba(139,92,246,0.2); }
    .hint-chip:hover { background: rgba(139,92,246,0.25) !important; transform: translateY(-1px); }
  `
  document.head.appendChild(el)
}
injectAuthStyles()

const COMPANION_HINTS = [
  { icon: '👗', text: 'Gợi ý outfit cho ngày mai' },

  { icon: '💬', text: 'Hỏi Hạ Vy dựa trên tủ đồ thật của bạn' },
  { icon: '💼', text: 'Mix & match đồ đi làm' },
  { icon: '🎉', text: 'Outfit cho buổi tiệc cuối tuần' },
  { icon: '📦', text: 'Tủ đồ còn thiếu gì?' },
  { icon: '🎨', text: 'Phân tích phong cách của tôi' },
]

const SplashScreen = () => (
  <div style={styles.splash}>
    {}
    <img src="/icon-192.png" alt="Lama Stylers" style={styles.splashLogo} />
    <div style={styles.splashSpinner} />
    <p style={styles.splashText}>Đang khởi động...</p>
  </div>
)

export default function AuthPage() {
  const { user, loading: authLoading, setRememberMe } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode]           = useState('login')
  const [form, setForm]           = useState({ name: '', email: '', password: '' })
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [rememberMe, setRemember]   = useState(true)
  const [showPass, setShowPass]     = useState(false)
  const [agreedToTerms, setAgreed]  = useState(false)

  useEffect(() => {
    let active = true
    if (!authLoading && user && active) navigate('/home', { replace: true })
    return () => { active = false }
  }, [user, authLoading, navigate])

  if (authLoading) return <SplashScreen />

  const handleChange = e => {
    setError('')
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async () => {

    if (loading) return
    setError('')
    if (mode === 'register' && !form.name.trim()) return setError('Vui lòng nhập tên của bạn')
    if (mode === 'register' && !agreedToTerms) return setError('Vui lòng đọc và đồng ý với điều khoản dịch vụ')
    if (!form.email || !form.password) return setError('Vui lòng điền đầy đủ thông tin')
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
    if (!emailOk) return setError('Email không hợp lệ')
    if (form.password.length < 6) return setError('Mật khẩu cần ít nhất 6 ký tự')
    setLoading(true)
    try {
      await setRememberMe(rememberMe)
      if (mode === 'login') await login(form.email, form.password)
      else await register(form.email, form.password, form.name)
      navigate('/home', { replace: true })
    } catch (e) {
      setError(AUTH_ERROR_MESSAGES[e.code] || 'Đã có lỗi xảy ra. Thử lại sau.')
    } finally { setLoading(false) }
  }

  const handleGoogle = async () => {
    if (loading) return
    setError('')
    setLoading(true)
    try {
      await setRememberMe(rememberMe)
      await loginWithGoogle()
      navigate('/home', { replace: true })
    } catch (e) {
      setError(AUTH_ERROR_MESSAGES[e.code] || 'Đăng nhập Google thất bại')
    } finally { setLoading(false) }
  }

  return (
    <div style={styles.page}>

      {}
      <div style={styles.logoArea}>
        <div style={styles.logoIconWrap}>
          <img src="/icon-192.png" alt="Lama Stylers" style={styles.logoImage} />
        </div>
        <h1 style={styles.logoText}>Lama Stylers</h1>
        <p style={styles.tagline}>Tủ đồ thông minh của bạn</p>
      </div>

      {}
      {mode === 'login' && (
        <div style={styles.hintsSection}>
          <p style={styles.hintsLabel}>✨ Hạ Vy có thể giúp bạn:</p>
          <div style={styles.hintsGrid}>
            {COMPANION_HINTS.map((h, i) => (
              <div
                key={i}
                className="hint-chip"
                style={{
                  ...styles.hintChip,
                  animation: `fadeSlideUp 0.3s ease ${i * 0.05}s both`,
                }}
              >
                <span style={styles.hintIcon}>{h.icon}</span>
                <span style={styles.hintText}>{h.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {}
      <div style={styles.tabs}>
        {['login', 'register'].map(m => (
          <button key={m}
            style={{ ...styles.tab, ...(mode === m ? styles.tabActive : {}) }}
            onClick={() => {
              setMode(m); setError('')
              setShowPass(false)
              setForm({ name: '', email: '', password: '' })
            }}>
            {m === 'login' ? 'Đăng nhập' : 'Đăng ký'}
          </button>
        ))}
      </div>

      {}
      <div style={styles.form}>
        {mode === 'register' && (
          <div style={styles.field}>
            <label style={styles.label}>Họ và tên</label>
            <input className="input-field" name="name" placeholder="Nguyễn Văn A"
              value={form.name} onChange={handleChange}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
          </div>
        )}
        <div style={styles.field}>
          <label style={styles.label}>Email</label>
          <input className="input-field" name="email" type="email"
            placeholder="email@example.com"
            value={form.email} onChange={handleChange}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Mật khẩu</label>
          <div style={styles.passWrap}>
            <input
              className="input-field"
              name="password"
              type={showPass ? 'text' : 'password'}
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              style={{ flex: 1, minWidth: 0, paddingRight: 44 }}
            />
            <button type="button" style={styles.eyeBtn}
              onClick={() => setShowPass(v => !v)} tabIndex={-1}
              aria-label={showPass ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
              {showPass ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        {mode === 'login' && (
          <label style={styles.rememberRow}>
            <input type="checkbox" checked={rememberMe}
              onChange={e => setRemember(e.target.checked)}
              style={styles.checkbox} />
            <span style={styles.rememberLabel}>Ghi nhớ đăng nhập</span>
          </label>
        )}

        {}
        {mode === 'register' && (
          <label style={{ ...styles.rememberRow, alignItems: 'flex-start', marginTop: 10 }}>
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={e => { setAgreed(e.target.checked); setError('') }}
              style={{ ...styles.checkbox, marginTop: 3, flexShrink: 0 }}
            />
            <span style={{ ...styles.rememberLabel, lineHeight: 1.5 }}>
              Tôi đã đọc và đồng ý với{' '}
              <a href="/terms-of-service" target="_blank" rel="noopener noreferrer"
                style={{ color: '#8B5CF6', textDecoration: 'underline' }}>
                Điều khoản dịch vụ
              </a>
              {' '}và{' '}
              <a href="/privacy-policy" target="_blank" rel="noopener noreferrer"
                style={{ color: '#8B5CF6', textDecoration: 'underline' }}>
                Chính sách bảo mật
              </a>
              {' '}của Lama Stylers.
            </span>
          </label>
        )}

        {error && <p style={styles.errorText}>{error}</p>}

        <button className="btn-primary" onClick={handleSubmit}
          disabled={loading || (mode === 'register' && !agreedToTerms)}
          style={{ marginTop: 8, opacity: (mode === 'register' && !agreedToTerms) ? 0.5 : 1 }}>
          {loading ? 'Đang xử lý...' : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
        </button>
      </div>

      {}
      <div style={styles.divider}>
        <div style={styles.dividerLine} />
        <span style={styles.dividerText}>hoặc</span>
        <div style={styles.dividerLine} />
      </div>

      {}
      <button onClick={handleGoogle} disabled={loading}
        style={{ ...styles.googleBtn, ...(loading ? styles.btnDisabled : {}) }}>
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Đăng nhập với Google
      </button>

    </div>
  )
}

const styles = {

  splash: {
    minHeight: '100vh', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: 16,
    background: '#0F0A1E',
  },

  splashLogo: { width: 88, height: 88, borderRadius: 28, objectFit: 'cover' },
  splashSpinner: {
    width: 36, height: 36, borderRadius: '50%',
    border: '3px solid rgba(139,92,246,0.2)',
    borderTop: '3px solid #8B5CF6',
    animation: 'spin 0.9s linear infinite',
  },
  splashText: { color: '#A598C7', fontSize: 14 },

  page: {
    minHeight: '100vh', display: 'flex', flexDirection: 'column',
    justifyContent: 'center', padding: '32px 24px',
    maxWidth: 420, margin: '0 auto',
  },
  logoArea: { textAlign: 'center', marginBottom: 28 },

  logoIconWrap: {
    display: 'inline-block', borderRadius: 28, marginBottom: 12,
    boxShadow: '0 0 32px rgba(139,92,246,0.45), 0 0 0 1px rgba(139,92,246,0.15)',
  },
  logoImage: {
    width: 88, height: 88, borderRadius: 28,
    objectFit: 'cover', display: 'block',
  },
  logoText: {
    fontSize: 36, fontFamily: 'Playfair Display, serif',
    background: 'linear-gradient(135deg, #8B5CF6, #F43F5E)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
  },
  tagline: { color: '#A598C7', fontSize: 14, marginTop: 6 },

  hintsSection: { marginBottom: 24 },
  hintsLabel: {
    color: '#A598C7', fontSize: 12, fontWeight: 500,
    marginBottom: 10, textAlign: 'center',
  },
  hintsGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
  },
  hintChip: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: 'rgba(139,92,246,0.1)',
    border: '1px solid rgba(139,92,246,0.2)',
    borderRadius: 12, padding: '8px 10px',
    cursor: 'default', transition: 'all 0.2s',
  },
  hintIcon: { fontSize: 16, flexShrink: 0 },
  hintText: { color: '#C4B5FD', fontSize: 11, lineHeight: 1.3 },

  tabs: {
    display: 'flex', background: '#1A1230',
    borderRadius: 12, padding: 4, marginBottom: 20,
  },
  tab: {
    flex: 1, padding: '10px', borderRadius: 10, background: 'none',
    color: '#A598C7', fontWeight: 500, fontSize: 14, transition: 'all 0.2s',
    border: 'none', cursor: 'pointer',
  },
  tabActive: {
    background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
    color: 'white', boxShadow: '0 2px 12px rgba(139,92,246,0.3)',
  },

  form: { display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { color: '#A598C7', fontSize: 13, fontWeight: 500 },
  passWrap: { position: 'relative', display: 'flex', alignItems: 'center' },
  eyeBtn: {
    position: 'absolute', right: 12, background: 'none', border: 'none',
    cursor: 'pointer', fontSize: 16, padding: 0, lineHeight: 1,
  },
  errorText: { color: '#F43F5E', fontSize: 13, margin: 0 },

  rememberRow: { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' },
  checkbox: { accentColor: '#8B5CF6', width: 16, height: 16, cursor: 'pointer' },
  rememberLabel: { color: '#A598C7', fontSize: 13 },

  divider: { display: 'flex', alignItems: 'center', gap: 12, margin: '8px 0' },
  dividerLine: { flex: 1, height: 1, background: 'rgba(139,92,246,0.2)' },
  dividerText: { color: '#6B5E8A', fontSize: 13, whiteSpace: 'nowrap' },

  btnDisabled: { opacity: 0.5, cursor: 'not-allowed', pointerEvents: 'none' },

  googleBtn: {
    width: '100%', padding: '14px',
    background: '#1A1230', border: '1px solid rgba(139,92,246,0.2)',
    borderRadius: 50, color: '#F8F5FF', fontSize: 15, fontWeight: 500,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 10, marginTop: 8, cursor: 'pointer', transition: 'all 0.2s',
  },
}
