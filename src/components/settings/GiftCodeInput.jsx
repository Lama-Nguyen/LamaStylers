import { useState } from 'react'
import { redeemGiftCode } from '../../services/giftCodeService'
import { showToast }      from '../notifications/ToastNotification'
import { trackUpgradePremium } from '../../services/analyticsService'

const s = {
  wrap: {
    marginTop: 16,
    borderTop: '1px solid rgba(139,92,246,0.15)',
    paddingTop: 16,
  },
  label: {
    fontSize: 12,
    color: '#6B5E8A',
    marginBottom: 8,
    display: 'block',
    fontWeight: 500,
    letterSpacing: '0.03em',
  },
  row: {
    display: 'flex',
    gap: 8,
  },
  input: {
    flex: 1,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(139,92,246,0.25)',
    borderRadius: 10,
    padding: '10px 14px',
    color: '#F8F5FF',
    fontSize: 14,
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'border-color 0.2s',
    letterSpacing: '0.04em',
  },
  inputFocus: {
    borderColor: '#8B5CF6',
  },
  btn: {
    background: 'linear-gradient(135deg,#8B5CF6,#7C3AED)',
    border: 'none',
    borderRadius: 10,
    padding: '10px 18px',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'opacity 0.2s, transform 0.15s',
    fontFamily: 'inherit',
    flexShrink: 0,
  },
  btnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  success: {
    marginTop: 12,
    background: 'rgba(16,185,129,0.1)',
    border: '1px solid rgba(16,185,129,0.25)',
    borderRadius: 10,
    padding: '12px 14px',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    animation: 'fadeUp 0.3s ease',
  },
  successIcon: { fontSize: 22 },
  successTitle: { fontSize: 13, fontWeight: 700, color: '#10B981' },
  successSub:   { fontSize: 12, color: '#A598C7', marginTop: 2 },
  error: {
    marginTop: 8,
    fontSize: 12,
    color: '#F87171',
    paddingLeft: 2,
  },
}

const ERROR_MESSAGES = {
  'not-found':         'Code không tồn tại hoặc đã hết hiệu lực.',
  'already-exists':    'Code này đã được kích hoạt trên tài khoản của bạn.',
  'invalid-argument':  'Vui lòng nhập gift code hợp lệ.',
  'unauthenticated':   'Cần đăng nhập để sử dụng tính năng này.',
  'unavailable':       'Không thể kết nối. Kiểm tra internet và thử lại.',

  'resource-exhausted':'Đã thử quá nhiều lần. Vui lòng đợi vài phút rồi thử lại.',
}

export default function GiftCodeInput({ onSuccess }) {
  const [code,    setCode]    = useState('')
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState(null)
  const [error,   setError]   = useState('')
  const [focused, setFocused] = useState(false)

  async function handleRedeem() {
    if (!code.trim() || loading) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await redeemGiftCode(code)
      setResult(res)
      setCode('')
      trackUpgradePremium()
      showToast.success(`🎉 Đã kích hoạt ${res.label}!`, 4000)
      onSuccess?.()
    } catch (e) {
      setError(ERROR_MESSAGES[e.code] || e.message || 'Có lỗi xảy ra. Thử lại sau.')
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter') handleRedeem()
  }

  return (
    <div style={s.wrap}>
      <span style={s.label}>🎁 Gift Code</span>

      <div style={s.row}>
        <input
          type="text"
          value={code}
          onChange={e => { setCode(e.target.value); setError('') }}
          onKeyDown={handleKey}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Nhập code tại đây..."
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          disabled={loading}
          style={{
            ...s.input,
            ...(focused ? s.inputFocus : {}),
            ...(loading ? { opacity: 0.6 } : {}),
          }}
        />
        <button
          onClick={handleRedeem}
          disabled={!code.trim() || loading}
          style={{
            ...s.btn,
            ...(!code.trim() || loading ? s.btnDisabled : {}),
          }}
          onMouseDown={e => { if (!loading) e.currentTarget.style.transform = 'scale(0.97)' }}
          onMouseUp={e => { e.currentTarget.style.transform = '' }}
          onMouseLeave={e => { e.currentTarget.style.transform = '' }}
        >
          {loading ? '...' : 'Kích hoạt'}
        </button>
      </div>

      {error && <p style={s.error}>⚠ {error}</p>}

      {result && (
        <div style={s.success}>
          <span style={s.successIcon}>
            {result.type === 'lifetime' ? '♾️' : '⏱️'}
          </span>
          <div>
            <div style={s.successTitle}>{result.label} đã được kích hoạt!</div>
            <div style={s.successSub}>
              {result.type === 'lifetime'
                ? 'Hưởng Premium không giới hạn thời gian'
                : `Có hiệu lực trong ${result.days} ngày tới`}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
