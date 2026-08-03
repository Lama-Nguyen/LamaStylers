export const MB_BANK_CONFIG = {
  accountNumber: '0856042868',
  accountName: 'NGUYEN GIA LAM',
  bankName: 'MB Bank',
  bankCode: 'MB',
  bankShortName: 'MB'
}

function generateOrderCode() {
  const ts  = Date.now().toString(36).toUpperCase().slice(-6).padStart(6, '0')
  const rnd = Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, '0')
  return `LS-${ts}${rnd}`
}

export const generateMBQR = (amount, packageName, orderCode) => {
  const { accountNumber, bankCode } = MB_BANK_CONFIG
  const content = `${orderCode} LamaStylers ${packageName}`.slice(0, 50)
  const qrUrl   = `https://img.vietqr.io/image/${bankCode}-${accountNumber}-compact.png?amount=${amount}&addInfo=${encodeURIComponent(content)}`
  return {
    ...MB_BANK_CONFIG,
    amount,
    orderCode,
    orderInfo: content,
    qrUrl,
    copyText: `STK: ${accountNumber}\nNgân hàng: MB Bank\nChủ TK: ${MB_BANK_CONFIG.accountName}\nSố tiền: ${amount.toLocaleString('vi-VN')}đ\nNội dung: ${content}`
  }
}

const PENDING_REUSE_WINDOW_MS = 15 * 60 * 1000

export const createPendingTransaction = async (userId, transactionData) => {
  const { db } = await import('./firebase')
  const { collection, query, where, orderBy, limit, getDocs, serverTimestamp } = await import('firebase/firestore')

  try {
    const existingQuery = query(
      collection(db, 'transactions'),
      where('userId', '==', userId),
      where('packageId', '==', transactionData.packageId),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc'),
      limit(1)
    )
    const existingSnap = await getDocs(existingQuery)
    if (!existingSnap.empty) {
      const existing    = existingSnap.docs[0].data()
      const createdAtMs = existing.createdAt?.toMillis?.() ?? 0
      const ageMs       = Date.now() - createdAtMs
      if (ageMs >= 0 && ageMs < PENDING_REUSE_WINDOW_MS) {
        return { id: existingSnap.docs[0].id, orderCode: existing.orderCode }
      }
    }
  } catch (e) {
    console.warn('createPendingTransaction: không kiểm tra pending cũ, tạo mới:', e)
  }

  // docId = orderCode → unique, onSnapshot/sepay tra cứu xác định 1 doc
  const orderCode = generateOrderCode()
  const { doc, setDoc } = await import('firebase/firestore')
  const txnRef = doc(db, 'transactions', orderCode)
  await setDoc(txnRef, {
    userId,
    orderCode,
    amount:        transactionData.amount,
    packageId:     transactionData.packageId,
    packageName:   transactionData.packageName,
    status:        'pending',
    paymentMethod: 'MB_Bank',
    accountNumber: MB_BANK_CONFIG.accountNumber,
    accountName:   MB_BANK_CONFIG.accountName,
    createdAt:     serverTimestamp(),
    userEmail:     transactionData.userEmail || '',
    userName:      transactionData.userName  || '',
  })
  return { id: orderCode, orderCode }
}

export const cancelTransaction = async (orderCode) => {
  if (!orderCode) return
  try {
    const { db } = await import('./firebase')
    const { doc, getDoc, runTransaction, serverTimestamp,
            collection, query, where, limit, getDocs } = await import('firebase/firestore')

    // Ưu tiên docId = orderCode (schema mới); fallback query field (txn cũ)
    let txnDocRef = doc(db, 'transactions', orderCode)
    const direct = await getDoc(txnDocRef)
    if (!direct.exists()) {
      const q = query(collection(db, 'transactions'), where('orderCode', '==', orderCode), limit(1))
      const snap = await getDocs(q)
      if (snap.empty) return
      txnDocRef = doc(db, 'transactions', snap.docs[0].id)
    }

    await runTransaction(db, async (tx) => {
      const fresh = await tx.get(txnDocRef)
      if (!fresh.exists() || fresh.data().status !== 'pending') return
      tx.update(txnDocRef, {
        status:      'cancelled',
        cancelledAt: serverTimestamp(),
      })
    })
  } catch (e) {
    console.warn('[mbBankService] cancelTransaction lỗi:', e.message)
  }
}
