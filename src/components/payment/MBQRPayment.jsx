import { useState, useEffect, useRef, useCallback } from 'react'
import { generateMBQR, createPendingTransaction, cancelTransaction } from '../../services/mbBankService'
import { showToast } from '../notifications/ToastNotification'
import { trackUpgradePremium } from '../../services/analyticsService'

const TIMEOUT_SECONDS = 15 * 60

function PaymentSteps({ status }) {
  const steps = [
    { key: 'create', label: 'Tạo QR',       done: true },
    { key: 'wait',   label: 'Chờ thanh toán', done: status === 'completed' || status === 'underpaid' },
    { key: 'done',   label: 'Kích hoạt',     done: status === 'completed' },
  ]
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 16 }}>
      {steps.map((s, i) => (
        <div key={s.key} style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700,
            background: s.done ? '#8B5CF6' : 'rgba(139,92,246,0.15)',
            color:      s.done ? '#fff'    : '#6B5E8A',
            border:     s.done ? 'none'    : '1px solid rgba(139,92,246,0.3)',
            transition: 'all 0.3s',
          }}>
            {s.done ? '✓' : i + 1}
          </div>
          <span style={{ fontSize: 10, color: s.done ? '#A78BFA' : '#6B5E8A', marginLeft: 4 }}>{s.label}</span>
          {i < steps.length - 1 && (
            <div style={{
              width: 24, height: 1, margin: '0 6px',
              background: steps[i + 1].done ? '#8B5CF6' : 'rgba(139,92,246,0.2)',
              transition: 'background 0.3s',
            }} />
          )}
        </div>
      ))}
    </div>
  )
}

function PaymentSkeleton() {
  return (
    <div style={st.container}>
      <div style={{ ...st.header, opacity: 0.5 }}>
        <span style={st.bankIcon}>🏦</span>
        <h3 style={st.title}>Thanh toán qua MB Bank</h3>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '16px 0' }}>
        {}
        <div style={{ width: 200, height: 200, borderRadius: 12, background: 'rgba(139,92,246,0.08)', animation: 'skeletonPulse 1.5s ease-in-out infinite' }} />
        {}
        {[80, 60, 70, 90].map((w, i) => (
          <div key={i} style={{ width: `${w}%`, height: 12, borderRadius: 6, background: 'rgba(255,255,255,0.06)', animation: 'skeletonPulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.1}s` }} />
        ))}
        <p style={{ color: '#A598C7', fontSize: 13, marginTop: 8 }}>Đang tạo mã QR...</p>
      </div>
      <style>{`@keyframes skeletonPulse { 0%,100%{opacity:0.5} 50%{opacity:1} }`}</style>
    </div>
  )
}

export const MBQRPayment = ({
  amount, userId, userEmail, userName,
  packageId, packageName, onSuccess, onCancel, onRetry
}) => {
  const [qrData, setQRData]               = useState(null)
  const [initError, setInitError]         = useState('')
  const [qrBroken, setQrBroken]           = useState(false)
  const [status, setStatus]               = useState('waiting')
  const [countdown, setCountdown]         = useState(TIMEOUT_SECONDS)
  const [copiedStk, setCopiedStk]         = useState(false)
  const [copiedContent, setCopiedContent] = useState(false)
  const [cancelConfirm, setCancelConfirm] = useState(false)

  const unsubRef      = useRef(null)
  const timeoutRef    = useRef(null)
  const intervalRef   = useRef(null)
  const cancelledRef  = useRef(false)
  const deadlineRef   = useRef(null)
  const orderCodeRef  = useRef(null)

  const clearAll = useCallback(() => {
    if (unsubRef.current)   { unsubRef.current(); unsubRef.current = null }
    if (timeoutRef.current) { clearTimeout(timeoutRef.current);   timeoutRef.current = null }
    if (intervalRef.current){ clearInterval(intervalRef.current); intervalRef.current = null }
  }, [])

  const init = useCallback(async () => {
    if (cancelledRef.current) return

    setInitError('')
    setQRData(null)
    setQrBroken(false)
    setStatus('waiting')
    setCountdown(TIMEOUT_SECONDS)
    setCopiedStk(false)
    setCopiedContent(false)
    setCancelConfirm(false)
    clearAll()

    try {
      const { orderCode } = await createPendingTransaction(userId, {
        amount, packageId, packageName, userEmail, userName
      })
      if (cancelledRef.current) return

      orderCodeRef.current = orderCode
      const data = generateMBQR(amount, packageName, orderCode)
      setQRData(data)

      const { db } = await import('../../services/firebase')
      const { doc, onSnapshot } = await import('firebase/firestore')
      // docId = orderCode → 1 doc xác định, không cần limit/orderBy
      const txnRef = doc(db, 'transactions', orderCode)
      unsubRef.current = onSnapshot(txnRef, (snap) => {
        if (cancelledRef.current || !snap.exists()) return
        const txn = snap.data()

        if (txn.status === 'completed') {
          if (cancelledRef.current) return
          setStatus('completed')
          clearAll()
          trackUpgradePremium()
          showToast.success('✅ Đã nhận thanh toán! Đang kích hoạt Premium...')
          onSuccess?.({ amount, packageName })

        } else if (txn.status === 'underpaid') {
          if (cancelledRef.current) return
          setStatus('underpaid')
          if (unsubRef.current) { unsubRef.current(); unsubRef.current = null }
          if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
          showToast.error('⚠️ Số tiền chuyển chưa đủ. Vui lòng liên hệ hỗ trợ.')
        }
      })

      deadlineRef.current = Date.now() + TIMEOUT_SECONDS * 1000
      intervalRef.current = setInterval(() => {
        if (cancelledRef.current) return
        const remaining = Math.max(0, Math.round((deadlineRef.current - Date.now()) / 1000))
        setCountdown(remaining)
        if (remaining <= 0) { clearInterval(intervalRef.current); intervalRef.current = null }
      }, 1000)

      timeoutRef.current = setTimeout(() => {
        if (cancelledRef.current) return
        setStatus(s => s === 'waiting' ? 'timeout' : s)
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
      }, TIMEOUT_SECONDS * 1000)

    } catch (err) {
      console.error('[MBQRPayment] init error:', err)
      if (!cancelledRef.current) {
        setInitError('Không thể tạo giao dịch. Vui lòng thử lại.')
      }
    }
  }, [userId, amount, packageId, packageName, userEmail, userName, clearAll, onSuccess])

  useEffect(() => {
    cancelledRef.current = false
    init()
    return () => {
      cancelledRef.current = true
      clearAll()
    }
  }, [init, clearAll])

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden || status !== 'waiting' || !deadlineRef.current) return
      const remaining = Math.max(0, Math.round((deadlineRef.current - Date.now()) / 1000))
      setCountdown(remaining)
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [status])

  const copySTK = () => {
    if (!qrData) return
    navigator.clipboard.writeText(qrData.accountNumber)
      .then(() => { setCopiedStk(true); setTimeout(() => setCopiedStk(false), 2000); showToast.success('📋 Đã copy số tài khoản!') })
      .catch(() => showToast.error('⚠️ Không thể copy. Vui lòng bôi đen và copy thủ công.'))
  }

  const copyContent = () => {
    if (!qrData) return
    navigator.clipboard.writeText(qrData.orderInfo)
      .then(() => { setCopiedContent(true); setTimeout(() => setCopiedContent(false), 2000); showToast.success('📋 Đã copy nội dung chuyển khoản!') })
      .catch(() => showToast.error('⚠️ Không thể copy. Vui lòng bôi đen và copy thủ công nội dung.'))
  }

  const fmtCountdown = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  const handleRetryQR = () => {
    orderCodeRef.current = null
    showToast.success('Đang tạo mã QR mới...')
    if (onRetry) onRetry()
    else init()
  }

  const handleCancel = async () => {
    if (status === 'waiting' && !cancelConfirm) {

      setCancelConfirm(true)
      setTimeout(() => setCancelConfirm(false), 5000)
      return
    }

    cancelledRef.current = true
    clearAll()

    if (orderCodeRef.current) {
      cancelTransaction(orderCodeRef.current).catch(() => {})
    }
    onCancel?.()
  }

  if (initError) {
    return (
      <div style={st.container}>
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <p style={{ fontSize: 36, marginBottom: 12 }}>😕</p>
          <p style={{ color: '#F43F5E', fontSize: 14, marginBottom: 16 }}>{initError}</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button onClick={init} style={st.btnRetry}>🔄 Thử lại</button>
            <button onClick={onCancel} style={st.btnCancel}>Hủy</button>
          </div>
        </div>
      </div>
    )
  }

  if (!qrData) return <PaymentSkeleton />

  return (
    <div style={st.container}>
      {}
      <div style={st.header}>
        <span style={st.bankIcon}>🏦</span>
        <h3 style={st.title}>Thanh toán qua MB Bank</h3>
        <p style={st.subtitle}>Ngân hàng Quân Đội (MB Bank)</p>
      </div>

      {}
      <PaymentSteps status={status} />

      {}
      <div style={st.qrWrapper}>
        {qrBroken ? (
          <div style={st.qrFallback}>
            <p style={{ fontSize: 28, marginBottom: 8 }}>⚠️</p>
            <p style={{ color: '#F59E0B', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Không tải được mã QR</p>
            <p style={{ color: '#888', fontSize: 12 }}>Vui lòng nhập tay thông tin bên dưới</p>
          </div>
        ) : (
          <img src={qrData.qrUrl} alt="MB Bank QR" style={st.qrImage} onError={() => setQrBroken(true)} />
        )}
        <div style={st.qrLabel}>
          <span style={{ color: '#333' }}>Quét mã QR để thanh toán</span>
          <span style={st.amountLabel}>{amount.toLocaleString('vi-VN')}đ</span>
        </div>
        {status === 'waiting' && (
          <div style={{
            ...st.countdownBadge,
            background:   countdown < 120 ? 'rgba(244,63,94,0.15)' : 'rgba(139,92,246,0.1)',
            color:        countdown < 120 ? '#F43F5E'              : '#A78BFA',
            borderColor:  countdown < 120 ? 'rgba(244,63,94,0.3)'  : 'rgba(139,92,246,0.2)',
          }}>
            ⏱️ QR hết hạn sau {fmtCountdown(countdown)}
          </div>
        )}
      </div>

      {}
      <div style={st.infoBox}>
        <InfoRow label="🏦 Ngân hàng"    value={qrData.bankName} />
        <InfoRow label="💳 Số tài khoản" value={<>{qrData.accountNumber} <CopyBtn copied={copiedStk} onClick={copySTK} /></>} />
        <InfoRow label="👤 Chủ tài khoản" value={qrData.accountName} />
        <InfoRow label="💰 Số tiền"       value={<span style={{ color: '#A78BFA', fontWeight: 700 }}>{qrData.amount.toLocaleString('vi-VN')}đ</span>} />
        <div style={{ marginTop: 4, paddingTop: 12, borderTop: '1px dashed rgba(139,92,246,0.2)' }}>
          <div style={{ ...st.infoLabel, textAlign: 'center', marginBottom: 8, marginRight: 0 }}>
            📝 Nội dung chuyển khoản <span style={{ color: '#F43F5E' }}>*bắt buộc</span>
          </div>
          <div style={{ ...st.contentCopyRow, background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 10, padding: '10px 12px' }}>
            <span style={{ ...st.infoValue, fontSize: 13, flex: 1, wordBreak: 'break-all', textAlign: 'center' }}>{qrData.orderInfo}</span>
            <button onClick={copyContent} style={st.copyBtnLarge}>{copiedContent ? '✅ Đã copy' : '📋 Copy'}</button>
          </div>
        </div>
      </div>

      {}
      <div style={st.instruction}>
        <p style={st.instructionTitle}>📌 Quan trọng:</p>
        <ol style={st.instructionList}>
          <li>Quét mã QR hoặc nhập <strong>đúng nội dung</strong> phía trên vào ô ghi chú</li>
          <li>Chuyển <strong>đúng số tiền</strong> — hệ thống tự so khớp</li>
          <li>Sau 5–30 giây sẽ tự động kích hoạt Premium ✨</li>
        </ol>
      </div>

      {}
      <div style={st.statusBox(status)}>
        {status === 'waiting' && (
          <><div className="spinner" style={{ width: 14, height: 14, flexShrink: 0, display: 'inline-block' }} />
          <span>Đang chờ thanh toán... (tự động cập nhật)</span></>
        )}
        {status === 'completed' && <span>✅ Đã xác nhận thanh toán!</span>}
        {status === 'underpaid' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
            <span>⚠️ Số tiền chuyển chưa đủ</span>
            <span style={{ fontSize: 12, opacity: 0.8 }}>
              Vui lòng liên hệ hỗ trợ qua email hoặc nhắn tin fanpage để được xử lý thủ công.
            </span>
          </div>
        )}
        {status === 'timeout' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, width: '100%' }}>
            <span>⏱️ Mã QR đã hết hạn</span>
            <button onClick={handleRetryQR} style={st.btnRetry}>🔄 Tạo QR mới</button>
          </div>
        )}
      </div>

      {}
      {status !== 'completed' && status !== 'timeout' && (
        <div style={st.buttonGroup}>
          {cancelConfirm ? (
            <>
              <span style={{ flex: 1, fontSize: 13, color: '#F59E0B', display: 'flex', alignItems: 'center' }}>
                Bạn chắc chắn muốn hủy?
              </span>
              <button onClick={handleCancel} style={{ ...st.btnCancel, flex: 0.6 }}>✓ Hủy thật</button>
              <button onClick={() => setCancelConfirm(false)} style={{ ...st.btnRetry, flex: 0.6 }}>Tiếp tục</button>
            </>
          ) : (
            <button onClick={handleCancel} style={st.btnCancel}>❌ Hủy giao dịch</button>
          )}
        </div>
      )}

      <p style={st.note}>
        Sau khi chuyển khoản thành công, hệ thống thường mất 5–30 giây xác nhận tự động qua SePay.
      </p>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div style={st.infoRow}>
      <span style={st.infoLabel}>{label}</span>
      <span style={st.infoValue}>{value}</span>
    </div>
  )
}
function CopyBtn({ copied, onClick }) {
  return (
    <button onClick={onClick} style={st.copyBtn} title="Copy">
      {copied ? '✅' : '📋'}
    </button>
  )
}

const st = {
  container:        { background: '#1A1230', padding: '24px 20px', borderRadius: 16, maxWidth: 480, margin: '0 auto' },
  header:           { textAlign: 'center', marginBottom: 16 },
  bankIcon:         { fontSize: 40, display: 'block', marginBottom: 8 },
  title:            { fontSize: 20, fontFamily: 'Playfair Display, serif', marginBottom: 4 },
  subtitle:         { color: '#A598C7', fontSize: 13 },
  qrWrapper:        { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 16, background: 'white', borderRadius: 16, marginBottom: 16 },
  qrImage:          { width: 200, height: 200, objectFit: 'contain' },
  qrFallback:       { width: 200, height: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F5F5F5', borderRadius: 12, textAlign: 'center', padding: 16 },
  qrLabel:          { display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: 10, fontSize: 13 },
  amountLabel:      { fontWeight: 700, color: '#8B5CF6' },
  countdownBadge:   { marginTop: 10, padding: '4px 14px', borderRadius: 50, fontSize: 12, fontWeight: 600, border: '1px solid' },
  infoBox:          { background: '#0F0A1E', padding: '14px 16px', borderRadius: 12, marginBottom: 16 },
  infoRow:          { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid rgba(139,92,246,0.07)' },
  infoLabel:        { color: '#6B5E8A', fontSize: 13, flexShrink: 0, marginRight: 8 },
  infoValue:        { color: '#F8F5FF', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 },
  copyBtn:          { background: 'none', border: 'none', color: '#A78BFA', cursor: 'pointer', fontSize: 15, padding: '0 2px', lineHeight: 1 },
  contentCopyRow:   { display: 'flex', alignItems: 'center', gap: 8, width: '100%' },
  copyBtnLarge:     { flexShrink: 0, padding: '5px 12px', background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 8, color: '#A78BFA', fontWeight: 600, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' },
  instruction:      { background: 'rgba(139,92,246,0.05)', padding: '12px 16px', borderRadius: 10, marginBottom: 16 },
  instructionTitle: { fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#A78BFA' },
  instructionList:  { paddingLeft: 20, color: '#A598C7', fontSize: 13, lineHeight: 1.8, margin: 0 },
  statusBox: (s) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 12, borderRadius: 10, marginBottom: 16,
    fontSize: 13, fontWeight: 500,
    background: s==='completed'?'rgba(16,185,129,0.15)': s==='underpaid'?'rgba(245,158,11,0.15)': s==='timeout'?'rgba(244,63,94,0.12)':'rgba(139,92,246,0.1)',
    color:      s==='completed'?'#10B981': s==='underpaid'?'#F59E0B': s==='timeout'?'#F43F5E':'#A78BFA',
  }),
  buttonGroup: { display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' },
  btnCancel:   { flex: 1, padding: 12, background: 'transparent', border: '1px solid rgba(244,63,94,0.3)', borderRadius: 50, color: '#F43F5E', cursor: 'pointer', fontSize: 14 },
  btnRetry:    { padding: '9px 20px', background: 'linear-gradient(135deg,#8B5CF6,#F43F5E)', border: 'none', borderRadius: 50, color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' },
  note:        { color: '#6B5E8A', fontSize: 12, textAlign: 'center', marginTop: 12 },
}
