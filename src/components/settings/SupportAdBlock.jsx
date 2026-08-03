import { useState } from 'react'
import { showToast } from '../notifications/ToastNotification'

const ACCOUNT_NUMBER = '0856042868'
const BANK_NAME = 'MB Bank'

export const SupportAdBlock = () => {
  const [copied, setCopied] = useState(false)

  const copyAccount = () => {

    navigator.clipboard.writeText(ACCOUNT_NUMBER).then(() => {
      setCopied(true)
      showToast.success('📋 Đã copy số tài khoản!')
      setTimeout(() => setCopied(false), 2000)
    }).catch((e) => {
      console.error('Copy STK thất bại:', e)
      showToast.error('⚠️ Không thể copy tự động. Vui lòng bôi đen và copy thủ công.')
    })
  }

  return (
    <div style={styles.container}>
      {}
      <p style={{ fontWeight: 600, fontSize: 14, color: '#A78BFA', marginBottom: 14, textAlign: 'center' }}>
        ☕ Ủng hộ tác giả
      </p>
      <div style={styles.qrWrapper}>
        {}
        <img
          src="/vietqr-support.jpg"
          alt="VietQR ủng hộ AD - MB Bank 0856042868"
          style={styles.qrImage}
        />
      </div>

      <div style={styles.copyRow}>
        <div style={styles.copyInfo}>
          <span style={styles.accountNumber}>{ACCOUNT_NUMBER}</span>
          <span style={styles.bankName}>{BANK_NAME}</span>
        </div>
        <button onClick={copyAccount} style={styles.copyBtn}>
          {copied ? '✅ Đã copy' : '📋 Copy STK'}
        </button>
      </div>

      <p style={styles.message}>
        🤓 Nếu app hữu ích, bạn có thể ủng hộ AD để mình tiếp tục phát triển thêm nhé!
      </p>
    </div>
  )
}

const styles = {
  container: {
    background: '#1A1230',
    padding: '24px 20px',
    borderRadius: 16,
    maxWidth: 480,
    margin: '24px auto 0',
    border: '1px solid rgba(139,92,246,0.15)'
  },
  qrWrapper: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: 16
  },
  qrImage: {
    width: '100%',
    maxWidth: 280,
    borderRadius: 12,
    userSelect: 'none',
    WebkitTouchCallout: 'default'
  },
  copyRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#0F0A1E',
    padding: '12px 16px',
    borderRadius: 12,
    marginBottom: 14
  },
  copyInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2
  },
  accountNumber: {
    color: '#F8F5FF',
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: 0.5
  },
  bankName: {
    color: '#A598C7',
    fontSize: 12
  },
  copyBtn: {
    padding: '8px 14px',
    background: 'rgba(139,92,246,0.15)',
    border: '1px solid rgba(139,92,246,0.3)',
    borderRadius: 10,
    color: '#A78BFA',
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },
  message: {
    textAlign: 'center',
    color: '#A598C7',
    fontSize: 13,
    lineHeight: 1.7,
    margin: 0
  }
}
