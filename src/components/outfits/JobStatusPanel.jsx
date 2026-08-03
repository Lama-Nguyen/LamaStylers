import { useEffect, useState } from 'react'

const STEPS = [
  { id: 'validating', label: 'Kiểm tra tủ đồ',  emoji: '👗' },
  { id: 'processing', label: 'AI đang phối đồ',  emoji: '🤖' },
  { id: 'completed',  label: 'Hoàn thành!',      emoji: '✨' },
]
const STATUS_ORDER = STEPS.map(s => s.id)

function stepState(stepId, currentStatus) {
  const si = STATUS_ORDER.indexOf(stepId)
  const ci = STATUS_ORDER.indexOf(currentStatus)
  if (ci < 0) return 'pending'
  if (si < ci)  return 'done'
  if (si === ci) return 'active'
  return 'pending'
}

function useElapsed(active) {
  const [s, setS] = useState(0)
  useEffect(() => {
    if (!active) { setS(0); return }
    setS(0)
    const t = setInterval(() => setS(n => n + 1), 1000)
    return () => clearInterval(t)
  }, [active])
  return s
}

export default function JobStatusPanel({ visible, status, message, onCancel }) {
  const elapsed    = useElapsed(visible)
  const activeStep = STEPS.find(s => s.id === status)

  const canCancel  = status === 'validating'

  if (!visible) return null

  return (
    <div className="card" style={s.panel} role="status" aria-live="polite" aria-label="Tiến trình tạo outfit">

      {}
      <div style={s.header}>
        <span style={s.dot} aria-hidden="true" />
        <span style={s.title}>{activeStep?.emoji ?? '⏳'} {activeStep?.label ?? 'Đang xử lý...'}</span>
        <span style={s.elapsed}>{elapsed}s</span>
        {onCancel && canCancel && (
          <button onClick={onCancel} style={s.cancelBtn} aria-label="Huỷ tạo outfit">
            Huỷ
          </button>
        )}
      </div>

      {}
      <ol style={s.track} aria-label="Các bước xử lý">
        {STEPS.map((step, i) => {
          const state    = stepState(step.id, status)
          const isActive = state === 'active'
          const isDone   = state === 'done'
          return (
            <li key={step.id} style={s.row} aria-current={isActive ? 'step' : undefined}>
              {}
              {i > 0 && (
                <div style={{ ...s.line, background: isDone || isActive ? '#8B5CF6' : 'rgba(255,255,255,0.07)' }} />
              )}
              {}
              <div style={{ ...s.circle, ...(isDone ? s.cDone : isActive ? s.cActive : s.cPending) }}>
                {isDone ? '✓' : i + 1}
              </div>
              {}
              <span style={{
                ...s.label,
                color:      isActive ? '#E9D5FF' : isDone ? '#A78BFA' : '#4B3E6A',
                fontWeight: isActive ? 600 : 400,
              }}>
                {step.label}
              </span>
              {}
              {isActive && <span style={s.spin} aria-hidden="true" />}
            </li>
          )
        })}
      </ol>

      {}
      {message && <p style={s.msg}>{message}</p>}

      {}
      {elapsed >= 6 && status === 'processing' && (
        <p style={s.hint}>AI đang phân tích tủ đồ của bạn — sắp xong rồi! 😊</p>
      )}
    </div>
  )
}

const s = {
  panel: { margin: '0 16px 12px', padding: '14px 16px' },
  header: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 },
  dot: {
    width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
    background: '#8B5CF6', animation: 'pulse-ring 1.4s ease-out infinite',
  },
  title:   { flex: 1, fontSize: 14, fontWeight: 700, color: '#E9D5FF' },
  elapsed: { fontSize: 12, color: '#6B5E8A', fontVariantNumeric: 'tabular-nums' },
  cancelBtn: {
    padding: '4px 12px', borderRadius: 50, fontSize: 12, fontWeight: 600,
    background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)',
    color: '#F43F5E', cursor: 'pointer', flexShrink: 0,
  },

  track: { listStyle: 'none', padding: 0, margin: '0 0 10px', display: 'flex', flexDirection: 'column', gap: 0 },
  row:   { display: 'flex', alignItems: 'center', gap: 10, position: 'relative', minHeight: 36 },
  line:  { position: 'absolute', left: 13, top: -18, width: 2, height: 18, borderRadius: 1 },

  circle:   { width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 },
  cDone:    { background: 'rgba(139,92,246,0.2)', border: '1.5px solid #8B5CF6', color: '#A78BFA' },
  cActive:  { background: 'rgba(139,92,246,0.3)', border: '2px solid #A78BFA', color: '#E9D5FF', boxShadow: '0 0 0 3px rgba(139,92,246,0.18)' },
  cPending: { background: 'rgba(255,255,255,0.03)', border: '1.5px solid rgba(255,255,255,0.08)', color: '#3A3060' },

  label: { flex: 1, fontSize: 13, lineHeight: 1.3 },
  spin: {
    width: 14, height: 14, flexShrink: 0,
    border: '2px solid rgba(167,139,250,0.25)', borderTopColor: '#A78BFA',
    borderRadius: '50%', animation: 'spin 0.7s linear infinite',
  },

  msg:  { fontSize: 12, color: '#A598C7', margin: '4px 0 0', lineHeight: 1.5, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 },
  hint: { fontSize: 11.5, color: '#6B5E8A', margin: '6px 0 0', fontStyle: 'italic', lineHeight: 1.5 },
}
