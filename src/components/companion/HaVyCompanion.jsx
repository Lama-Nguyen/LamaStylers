import { useState, useRef, useEffect, useCallback } from 'react'
import { callApi }                                    from '../../services/callApi'
import { useAuth }                                    from '../../hooks/useAuth.jsx'
import { isCallableErrorCode }                        from '../../services/errorMessages'
import { useOnlineStatus }                            from '../../hooks/useOnlineStatus.jsx'
import { getClothingItems }                           from '../../services/wardrobeService'
import { retrieveRelevantItems, serializeForPrompt }  from '../../services/ragService'
import { deductCredits, CREDIT_COSTS }                from '../../services/creditService'
import { getGeminiApiKey }                            from '../../services/apiKeyService'
import { showToast }                                  from '../notifications/ToastNotification'
import { trackChatHavy }                              from '../../services/analyticsService'

const EMOTE_MAP = {
  '<(`^´)>':    '/havy_happy.png',
  '(;＞_＜;)':  '/havy_panic.png',
  '[~_~]':      '/havy_thinking.png',
  '[(￣3￣)]':  '/havy_love.png',
  '(  -_・)?':  '/havy_confused.png',
  '(;-ω-)ノ':   '/havy_love.png',
  '(。-ω-)zzz': '/havy_thinking.png',
}
function detectEmote(content) {
  for (const [icon, img] of Object.entries(EMOTE_MAP)) {
    if (content.includes(icon)) return img
  }
  return null
}

const OFF_TOPIC_KEYWORDS = [
  'viết code', 'lập trình', 'python', 'javascript', 'html', 'css', 'sql',
  'chính trị', 'bầu cử', 'chính phủ', 'tổng thống',
  'bệnh', 'thuốc', 'bác sĩ', 'y tế', 'triệu chứng',
  'đầu tư', 'chứng khoán', 'crypto', 'bitcoin',
  'nấu ăn', 'công thức nấu',
  'toán', 'vật lý', 'hóa học', 'sinh học',
  'lịch sử', 'địa lý',
]
function detectOffTopic(text) {
  const lower = text.toLowerCase()
  return OFF_TOPIC_KEYWORDS.some(kw => lower.includes(kw))
}

const PROMPT_SUGGESTIONS = [
  { label: '✨ Gợi ý outfit hôm nay',          text: 'Hạ Vy gợi ý cho mình outfit hôm nay nhé?' },
  { label: '🔍 Tìm đồ phù hợp',               text: 'Tìm đồ trong tủ phù hợp để mình mặc đi làm/đi chơi?' },
  { label: '🎨 Mẹo phối màu',                   text: 'Mẹo phối màu cơ bản cho người mới bắt đầu?' },
  { label: '📊 Phân tích phong cách',           text: 'Phân tích phong cách thời trang hiện tại của mình dựa vào tủ đồ?' },
  { label: '🛍️ Nên mua thêm gì?',              text: 'Tủ đồ mình đang thiếu gì, nên mua thêm gì?' },
  { label: '🌤️ Mặc gì phù hợp thời tiết?',   text: 'Hôm nay trời nắng/mưa, mình nên mặc gì?' },
]

function QuotaBadge({ used, limit }) {
  if (used == null || limit == null) return null
  const remaining = limit - used
  const pct       = used / limit
  const color     = pct >= 1 ? '#EF4444' : pct >= 0.8 ? '#F59E0B' : '#10B981'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
      <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(pct * 100, 100)}%`, height: '100%', background: color, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: 10, color, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
        {remaining}/{limit}
      </span>
    </div>
  )
}

function TypingIndicator({ emote }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 8 }}>
      <img src={emote || '/havy_thinking.png'} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
      <div style={{
        background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.2)',
        borderRadius: '16px 16px 16px 4px', padding: '10px 16px',
        display: 'flex', gap: 4, alignItems: 'center',
      }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{
            width: 6, height: 6, borderRadius: '50%', background: '#A78BFA',
            animation: 'havyDot 1.4s ease-in-out infinite',
            animationDelay: `${i * 0.2}s`,
          }} />
        ))}
        <span style={{ fontSize: 11, color: '#6B5E8A', marginLeft: 4 }}>Hạ Vy đang nghĩ...</span>
      </div>
      <style>{`
        @keyframes havyDot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40%            { transform: scale(1);   opacity: 1;   }
        }
      `}</style>
    </div>
  )
}

function renderHighlighted(text) {
  const parts = text.split(/(\(gợi ý mua thêm\))/g)
  return parts.map((part, i) =>
    part === '(gợi ý mua thêm)' ? (
      <span key={i} style={{ display: 'inline-block', background: 'rgba(245,158,11,0.2)', color: '#F59E0B', borderRadius: 4, padding: '0 4px', fontSize: '0.85em', fontWeight: 500 }}>
        (gợi ý mua thêm)
      </span>
    ) : part
  )
}

export default function HaVyCompanion() {
  const { user, isPremium, credits } = useAuth()
  const isOnline                     = useOnlineStatus()

  const [open, setOpen]               = useState(false)
  const [messages, setMessages]       = useState([])
  const [input, setInput]             = useState('')
  const [loading, setLoading]         = useState(false)
  const [quota, setQuota]             = useState({ used: null, limit: null })
  const [emote, setEmote]             = useState('/havy_happy.png')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [offTopicWarning, setOffTopicWarning] = useState(false)

  const [wardrobeItems, setWardrobeItems] = useState([])
  const wardrobeLoadedRef = useRef(false)
  const msgCountRef       = useRef(0)
  const messagesRef       = useRef([])
  const messagesEndRef    = useRef(null)
  const inputRef          = useRef(null)

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 200) }, [open])
  useEffect(() => { messagesRef.current = messages }, [messages])

  useEffect(() => {
    if (!open || !user || wardrobeLoadedRef.current) return
    getClothingItems(user.uid)
      .then(items => { setWardrobeItems(items); wardrobeLoadedRef.current = true })
      .catch(e => console.warn('HaVy: fetch wardrobe:', e))
  }, [open, user])

  const sendMessage = useCallback(async (text, skipOffTopicCheck = false) => {
    const trimmed = (text || input).trim()
    if (!trimmed || loading) return

    if (!skipOffTopicCheck && detectOffTopic(trimmed)) {
      setOffTopicWarning(true)
      return
    }

    const nextMsgNum      = msgCountRef.current + 1
    // Ước lượng phía client chỉ để cảnh báo sớm — quyết định trừ credit thật sự
    // dựa trên quota_used server trả về sau khi gọi API (xem bên dưới), vì server
    // đếm theo ngày và không reset khi refresh trang.
    const willDeductGuess = !isPremium && nextMsgNum % 10 === 0
    if (willDeductGuess && !isPremium && (credits ?? 0) < CREDIT_COSTS.havy_per_10_msg) {
      showToast.warning(`Sắp hết credit ⚡ (còn ${credits ?? 0}) — đăng nhập hàng ngày để nhận thêm`)
    }

    setOffTopicWarning(false)
    setInput('')
    setLoading(true)
    setShowSuggestions(false)
    msgCountRef.current = nextMsgNum

    const userApiKey = getGeminiApiKey() || undefined

    const currentMessages = messagesRef.current
    const userMsg         = { role: 'user', content: trimmed }
    const nextMessages    = [...currentMessages, userMsg]
    setMessages(nextMessages)

    const MAX_HISTORY = 10
    const history = currentMessages
      .slice(-MAX_HISTORY)
      .map(m => ({ role: m.role, content: m.content }))

    const relevantItems   = retrieveRelevantItems(trimmed, wardrobeItems)
    const wardrobeContext = serializeForPrompt(relevantItems, wardrobeItems.length)

    let aiSucceeded = false
    let willDeduct   = false
    try {
      const result = await callApi('havySuggestOutfit', {
        message:   trimmed,
        history,
        wardrobeContext,
        userApiKey,
      }, { retry: false })

      aiSucceeded = true
      trackChatHavy(result?.quota_used ?? nextMsgNum)

      // quota_used là số đếm phía server (theo ngày, không reset khi F5) —
      // dùng số này để quyết định có trừ credit hay không, tránh bị bypass.
      willDeduct = !isPremium
        && typeof result?.quota_used === 'number'
        && result.quota_used % 10 === 0

      const replyText = result?.content || 'Em chưa hiểu ý bạn, thử hỏi lại nhé? (  -_・)?'
      const emoteImg  = detectEmote(replyText) || '/havy_happy.png'

      setEmote(emoteImg)
      setQuota({ used: result?.quota_used ?? null, limit: result?.quota_limit ?? null })
      setMessages(prev => [...prev, { role: 'assistant', content: replyText, emote: emoteImg }])

    } catch (err) {
      const isQuotaError   = isCallableErrorCode(err, 'resource-exhausted')
      const isTimeoutError = isCallableErrorCode(err, 'deadline-exceeded')

      let errText
      if (isQuotaError) {
        errText = isPremium
          ? `Bạn đã hết lượt chat hôm nay. Quota reset lúc 00:00 giờ VN nhé [~_~]`
          : `Bạn đã hết ${quota.limit || 15} lượt chat hôm nay 😢 Nâng cấp Premium để chat nhiều hơn nhé! [(￣3￣)]`
      } else if (isTimeoutError) {

        errText = 'Hạ Vy mất nhiều thời gian suy nghĩ quá, bạn thử hỏi lại nhé! (  -_・)?'
        aiSucceeded = false
      } else {
        errText = 'Em đang gặp sự cố kỹ thuật, bạn thử lại sau nhé! (;＞_＜;)'
      }

      const errEmote = isQuotaError ? '/havy_love.png' : '/havy_panic.png'
      setEmote(errEmote)
      setMessages(prev => [...prev, { role: 'assistant', content: errText, emote: errEmote, isError: true }])
    } finally {
      setLoading(false)
    }

    if (aiSucceeded && willDeduct) {
      deductCredits(user.uid, CREDIT_COSTS.havy_per_10_msg, isPremium, 'havy_per_10_msg').catch((e) => {
        console.error('[HaVy] deductCredits thất bại — lượt chat không bị trừ:', e?.message)
      })
    }
  }, [input, loading, isPremium, user, credits, quota.limit, wardrobeItems])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (offTopicWarning) sendMessage(input, true)
      else sendMessage()
    }
    if (e.key === 'Escape') setShowSuggestions(false)
  }

  const handleInputChange = (e) => {
    setInput(e.target.value)
    if (offTopicWarning) setOffTopicWarning(false)
  }

  const handleSuggestionClick = (text) => {
    setInput(text)
    setShowSuggestions(false)
    sendMessage(text)
  }

  return (
    <>
      {}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed', bottom: 80, right: 16, zIndex: 40, cursor: 'pointer',
          width: 52, height: 52, borderRadius: '50%',
          background: 'linear-gradient(135deg, #7C3AED, #4C1D95)',
          boxShadow: '0 4px 20px rgba(124,58,237,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 0.2s',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        title="Chat với Hạ Vy"
      >
        <img src={emote} alt="Hạ Vy" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
      </div>

      {}
      {open && (
        <div style={{
          position: 'fixed', bottom: 140, right: 16, zIndex: 50,
          width: 'min(340px, calc(100vw - 32px))',
          height: 'min(480px, calc(100vh - 200px))',
          background: '#1A1230', border: '1px solid rgba(139,92,246,0.3)',
          borderRadius: 16, boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src={emote} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#F8F5FF' }}>Hạ Vy</div>
              <QuotaBadge used={quota.used} limit={quota.limit} />
            </div>
            <button
              onClick={() => setShowSuggestions(s => !s)}
              style={{ background: 'none', border: 'none', color: '#A78BFA', cursor: 'pointer', fontSize: 18 }}
              title="Gợi ý câu hỏi"
            >💡</button>
            <button
              onClick={() => setOpen(false)}
              style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', fontSize: 18 }}
            >✕</button>
          </div>

          {}
          {!isOnline && (
            <div style={{ padding: '8px 16px', background: 'rgba(245,158,11,0.15)', borderBottom: '1px solid rgba(245,158,11,0.2)', fontSize: 12, color: '#F59E0B', textAlign: 'center' }}>
              📡 Mất kết nối — Hạ Vy không thể trả lời lúc này
            </div>
          )}

          {}
          {showSuggestions && (
            <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(139,92,246,0.05)' }}>
              <p style={{ fontSize: 11, color: '#6B5E8A', marginBottom: 6 }}>Bạn có thể hỏi Hạ Vy:</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {PROMPT_SUGGESTIONS.map((s, i) => (
                  <button key={i} onClick={() => handleSuggestionClick(s.text)} style={{
                    background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)',
                    borderRadius: 8, padding: '5px 10px', color: '#C4B5FD', fontSize: 12, cursor: 'pointer', textAlign: 'left',
                  }}>{s.label}</button>
                ))}
              </div>
            </div>
          )}

          {}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 8px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px 16px', color: '#6B5E8A', fontSize: 13 }}>
                <p style={{ fontSize: 24, marginBottom: 8 }}>👗</p>
                Xin chào! Mình là Hạ Vy, trợ lý thời trang của bạn ✨<br />
                Bấm 💡 để xem gợi ý câu hỏi nhé!
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{
                display: 'flex', gap: 6,
                flexDirection: m.role === 'user' ? 'row-reverse' : 'row',
                alignItems: 'flex-end',
              }}>
                {m.role === 'assistant' && (
                  <img src={m.emote || '/havy_happy.png'} alt="" style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                )}
                <div style={{
                  maxWidth: '78%', padding: '8px 12px', borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: m.role === 'user' ? 'linear-gradient(135deg,#7C3AED,#5B21B6)' : 'rgba(255,255,255,0.06)',
                  color: m.role === 'user' ? '#fff' : (m.isError ? '#F59E0B' : '#E5E7EB'),
                  fontSize: 13, lineHeight: 1.5, wordBreak: 'break-word',
                  border: m.isError ? '1px solid rgba(245,158,11,0.3)' : 'none',
                }}>
                  {m.role === 'assistant' ? renderHighlighted(m.content) : m.content}
                </div>
              </div>
            ))}

            {}
            {loading && <TypingIndicator emote={emote} />}
            <div ref={messagesEndRef} />
          </div>

          {}
          {offTopicWarning && (
            <div style={{ padding: '8px 12px', background: 'rgba(245,158,11,0.1)', borderTop: '1px solid rgba(245,158,11,0.2)', fontSize: 12, color: '#F59E0B', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ flex: 1 }}>⚠️ Câu hỏi có vẻ ngoài thời trang. Vẫn gửi?</span>
              <button onClick={() => sendMessage(input, true)} style={{ padding: '3px 10px', background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 6, color: '#F59E0B', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' }}>
                Vẫn gửi
              </button>
            </div>
          )}

          {}
          <div style={{ padding: '8px 12px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={isOnline ? 'Hỏi Hạ Vy về thời trang...' : 'Mất kết nối...'}
              disabled={loading || !isOnline}
              rows={1}
              style={{
                flex: 1, resize: 'none', background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(139,92,246,0.3)', borderRadius: 10,
                color: '#E5E7EB', padding: '8px 12px', fontSize: 13,
                outline: 'none', fontFamily: 'inherit', maxHeight: 100, overflowY: 'auto',
              }}
            />
            <button
              onClick={() => offTopicWarning ? sendMessage(input, true) : sendMessage()}
              disabled={loading || !input.trim() || !isOnline}
              style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: loading || !input.trim() ? 'rgba(139,92,246,0.2)' : 'linear-gradient(135deg,#8B5CF6,#6D28D9)',
                border: 'none', color: '#fff', fontSize: 16, cursor: loading ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.2s',
              }}
            >
              {loading ? '⏳' : '➤'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
