import { useState, useRef } from 'react'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { useAuth } from '../../hooks/useAuth.jsx'
import { callApi } from '../../services/callApi'
import { trackFeedbackSent } from '../../services/analyticsService'

const FEEDBACK_TYPES = ['🐛 Bug', '💡 Góp ý', '❤️ Khen ngợi', '❓ Khác']

export default function FeedbackButton() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState(FEEDBACK_TYPES[0])
  const [content, setContent] = useState('')
  const [email, setEmail] = useState(user?.email || '')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const textareaRef = useRef(null)

  const handleOpen = () => {
    setOpen(true)
    setSent(false)
    setError('')
    setTimeout(() => textareaRef.current?.focus(), 100)
  }

  const handleClose = () => {
    setOpen(false)
    setContent('')
    setType(FEEDBACK_TYPES[0])
    setError('')
  }

  const handleSend = async () => {
    if (!content.trim()) {
      setError('Vui lòng nhập nội dung feedback')
      return
    }
    if (content.trim().length < 5) {
      setError('Feedback quá ngắn (ít nhất 5 ký tự)')
      return
    }

    setSending(true)
    setError('')

    const feedbackData = {
      type,
      content: content.trim(),
      email: email.trim() || null,
      userId: user?.uid || null,
      userEmail: user?.email || null,
      createdAt: serverTimestamp(),
      platform: 'web',
      userAgent: navigator.userAgent,
      url: window.location.pathname,
    }

    try {
      let persisted = false
      let notified = false

      // Ghi Firestore chỉ khi đã đăng nhập (rules yêu cầu userId == auth.uid)
      if (user?.uid) {
        await addDoc(collection(db, 'feedbacks'), feedbackData)
        persisted = true
      }

      try {
        await callApi('sendFeedback', {
          type,
          content: content.trim(),
          email: email.trim() || user?.email || 'Ẩn danh',
          userId: user?.uid || 'anonymous',
          url: window.location.pathname,
        })
        notified = true
      } catch (telegramErr) {
        console.warn('Gửi Telegram thất bại:', telegramErr.message)
      }

      // Chỉ báo thành công nếu ít nhất 1 kênh thành công
      // (login: Firestore; anonymous: bắt buộc Telegram)
      if (persisted || notified) {
        setSent(true)
        setContent('')
        trackFeedbackSent()
        setTimeout(handleClose, 2500)
      } else {
        setError('Không thể gửi feedback lúc này. Vui lòng thử lại.')
      }
    } catch (err) {
      console.error('Lưu feedback thất bại:', err)
      setError('Không thể gửi feedback lúc này. Vui lòng thử lại.')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {}
      <button
        onClick={handleOpen}
        title="Gửi feedback / báo lỗi"
        className="fixed bottom-20 right-4 z-40 w-10 h-10 rounded-full bg-gray-800/90 border border-gray-600 text-lg flex items-center justify-center shadow-lg hover:bg-gray-700 hover:border-purple-500 transition-all active:scale-95"
        aria-label="Gửi feedback"
      >
        🐞
      </button>

      {}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={e => e.target === e.currentTarget && handleClose()}
        >
          {}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {}
          <div className="relative w-full max-w-md bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
            {}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
              <h3 className="font-semibold text-white text-base">Gửi Feedback</h3>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-white text-xl leading-none"
              >
                ✕
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {sent ? (
                <div className="text-center py-6">
                  <div className="text-4xl mb-3">🎉</div>
                  <p className="text-white font-medium">Đã gửi feedback!</p>
                  <p className="text-gray-400 text-sm mt-1">Cảm ơn bạn đã góp ý cho Lama Stylers</p>
                </div>
              ) : (
                <>
                  {}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Loại feedback</label>
                    <div className="flex flex-wrap gap-2">
                      {FEEDBACK_TYPES.map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setType(t)}
                          className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                            type === t
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">
                      Nội dung <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      ref={textareaRef}
                      value={content}
                      onChange={e => { setContent(e.target.value); setError('') }}
                      placeholder={
                        type.includes('Bug')
                          ? 'Mô tả lỗi bạn gặp phải, các bước tái hiện...'
                          : type.includes('Góp ý')
                          ? 'Tính năng bạn muốn thấy, cải tiến bạn đề xuất...'
                          : 'Nhập nội dung...'
                      }
                      rows={4}
                      maxLength={1000}
                      className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
                    />
                    <div className="text-right text-xs text-gray-500 mt-1">
                      {content.length}/1000
                    </div>
                  </div>

                  {}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">
                      Email phản hồi <span className="text-gray-500">(tuỳ chọn)</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  {error && (
                    <p className="text-red-400 text-sm bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>
                  )}

                  {}
                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="flex-1 py-2.5 rounded-xl bg-gray-700 text-gray-300 text-sm hover:bg-gray-600 transition-colors"
                    >
                      Huỷ
                    </button>
                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={sending || !content.trim()}
                      className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {sending ? 'Đang gửi...' : 'Gửi feedback'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
